import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { pageParams, pageResult } from '../../lib/pagination';
import { auditLog } from '../../lib/audit';
import { inventoryQueue } from '../../jobs/queues';

export async function list(req: Request, res: Response) {
  const { page, pageSize, skip, take } = pageParams(Number(req.query.page), Number(req.query.pageSize));
  const q = (req.query.q as string) ?? '';
  const lowStock = req.query.lowStock === 'true';
  const outOfStock = req.query.outOfStock === 'true';

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { product: { name: { contains: q, mode: 'insensitive' } } },
      { product: { sku: { contains: q, mode: 'insensitive' } } },
      { variant: { sku: { contains: q, mode: 'insensitive' } } },
    ];
  }
  if (lowStock) {
    Object.assign(where, {
      AND: [{ physicalStock: { gt: 0 } }, { reservedStock: { gte: 0 } }],
    });
  }
  if (outOfStock) {
    Object.assign(where, { physicalStock: { lte: 0 } });
  }

  const [total, levels] = await prisma.$transaction([
    prisma.inventoryLevel.count({ where }),
    prisma.inventoryLevel.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        variant: { select: { id: true, sku: true, name: true, attributes: true } },
        location: true,
      },
      orderBy: { product: { name: 'asc' } },
      skip,
      take,
    }),
  ]);

  const rows = levels.map((l) => ({
    ...l,
    availableStock: l.physicalStock - l.reservedStock,
    isLowStock: l.physicalStock - l.reservedStock <= (l.lowStockThreshold ?? 5),
    isOutOfStock: l.physicalStock <= 0,
  }));

  return ok(res, rows, pageResult([], total, page, pageSize).meta);
}

export async function adjust(req: Request, res: Response) {
  const { productId, variantId, quantityChange, reason, reference, type, locationId } = req.body;
  if (quantityChange === 0) throw new ApiError(400, 'INVALID_QUANTITY', 'Quantity change must be non-zero');

  const location = locationId
    ? await prisma.inventoryLocation.findUnique({ where: { id: locationId } })
    : await prisma.inventoryLocation.findFirst({ where: { isDefault: true } });
  if (!location) throw new ApiError(400, 'NO_LOCATION', 'No inventory location configured');

  const level = await prisma.inventoryLevel.findFirst({
    where: { productId, variantId, locationId: location.id },
  });
  if (!level) throw new ApiError(404, 'INVENTORY_NOT_FOUND', 'Inventory level not found for this product/variant');

  const resulting = level.physicalStock + quantityChange;
  if (resulting < 0) throw new ApiError(400, 'INVALID_QUANTITY', 'Resulting stock cannot be negative');

  const updated = await prisma.$transaction(async (tx) => {
    const newLevel = await tx.inventoryLevel.update({
      where: { id: level.id },
      data: { physicalStock: resulting },
    });
    await tx.inventoryMovement.create({
      data: {
        productId,
        variantId,
        locationId: location.id,
        type,
        previousQuantity: level.physicalStock,
        quantityChange,
        resultingQuantity: resulting,
        reason,
        reference,
        userId: req.user!.id,
      },
    });
    return newLevel;
  });

  await auditLog(req, {
    action: 'inventory.adjust',
    entityType: 'inventoryLevel',
    entityId: level.id,
    before: { physicalStock: level.physicalStock },
    after: { physicalStock: updated.physicalStock },
  });

  await inventoryQueue.add('low-stock-check', { productId, variantId }, { attempts: 2 });

  return ok(res, updated);
}

export async function movements(req: Request, res: Response) {
  const { page, pageSize, skip, take } = pageParams(Number(req.query.page), Number(req.query.pageSize));
  const productId = req.query.productId as string | undefined;
  const where = productId ? { productId } : {};

  const [total, rows] = await prisma.$transaction([
    prisma.inventoryMovement.count({ where }),
    prisma.inventoryMovement.findMany({
      where,
      include: {
        product: { select: { name: true, sku: true } },
        variant: { select: { sku: true, name: true } },
        location: { select: { name: true } },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);
  return ok(res, rows, pageResult([], total, page, pageSize).meta);
}

export async function locations(req: Request, res: Response) {
  const locations = await prisma.inventoryLocation.findMany();
  return ok(res, locations);
}

export async function createLocation(req: Request, res: Response) {
  const location = await prisma.inventoryLocation.create({ data: req.body });
  await auditLog(req, { action: 'inventory.location.create', entityType: 'inventoryLocation', entityId: location.id, after: location });
  return ok(res, location, undefined, 201);
}

export async function transfer(req: Request, res: Response) {
  const { productId, variantId, quantity, fromLocationId, toLocationId } = req.body;
  if (quantity <= 0) throw new ApiError(400, 'INVALID_QUANTITY', 'Quantity must be positive');
  if (fromLocationId === toLocationId) throw new ApiError(400, 'SAME_LOCATION', 'Source and destination must differ');

  const fromLevel = await prisma.inventoryLevel.findFirst({ where: { productId, variantId, locationId: fromLocationId } });
  const toLevel = await prisma.inventoryLevel.findFirst({ where: { productId, variantId, locationId: toLocationId } });
  if (!fromLevel) throw new ApiError(404, 'SOURCE_NOT_FOUND', 'Source inventory level not found');
  if (!toLevel) throw new ApiError(404, 'DEST_NOT_FOUND', 'Destination inventory level not found');
  if (fromLevel.physicalStock < quantity) throw new ApiError(400, 'INSUFFICIENT_STOCK', 'Insufficient stock at source');

  await prisma.$transaction([
    prisma.inventoryLevel.update({ where: { id: fromLevel.id }, data: { physicalStock: fromLevel.physicalStock - quantity } }),
    prisma.inventoryLevel.update({ where: { id: toLevel.id }, data: { physicalStock: toLevel.physicalStock + quantity } }),
    prisma.inventoryMovement.create({
      data: {
        productId, variantId, locationId: fromLocationId, type: 'TRANSFER_OUT',
        previousQuantity: fromLevel.physicalStock, quantityChange: -quantity,
        resultingQuantity: fromLevel.physicalStock - quantity,
        reason: `Transfer to ${toLocationId}`, reference: req.body.reference, userId: req.user!.id,
      },
    }),
    prisma.inventoryMovement.create({
      data: {
        productId, variantId, locationId: toLocationId, type: 'TRANSFER_IN',
        previousQuantity: toLevel.physicalStock, quantityChange: quantity,
        resultingQuantity: toLevel.physicalStock + quantity,
        reason: `Transfer from ${fromLocationId}`, reference: req.body.reference, userId: req.user!.id,
      },
    }),
  ]);

  await auditLog(req, { action: 'inventory.transfer', entityType: 'inventoryLevel', entityId: fromLevel.id, after: { quantity, fromLocationId, toLocationId } });
  return ok(res, { ok: true });
}

export async function stockCount(req: Request, res: Response) {
  const { items } = req.body;
  const results: { productId: string; variantId: string | null; expected: number; counted: number; discrepancy: number }[] = [];
  for (const item of items) {
    const level = await prisma.inventoryLevel.findFirst({
      where: { productId: item.productId, variantId: item.variantId },
      orderBy: { locationId: 'asc' },
    });
    if (!level) continue;
    const discrepancy = item.countedQuantity - level.physicalStock;
    if (discrepancy !== 0) {
      await adjust({
        body: {
          productId: item.productId,
          variantId: item.variantId,
          quantityChange: discrepancy,
          reason: 'Stock count reconciliation',
          type: 'COUNT_ADJUSTMENT',
        },
        user: req.user,
      } as never, {
        send: () => {},
      } as never);
      await prisma.inventoryMovement.create({
        data: {
          productId: item.productId,
          variantId: item.variantId,
          locationId: level.locationId,
          type: 'COUNT_ADJUSTMENT',
          previousQuantity: level.physicalStock,
          quantityChange: discrepancy,
          resultingQuantity: item.countedQuantity,
          reason: 'Stock count reconciliation',
          userId: req.user!.id,
        },
      });
    }
    results.push({ productId: item.productId, variantId: item.variantId, expected: level.physicalStock, counted: item.countedQuantity, discrepancy });
  }
  await auditLog(req, { action: 'inventory.count', entityType: 'inventoryLevel', after: { count: results.length } });
  return ok(res, results);
}
