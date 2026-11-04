import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { pageParams, pageResult } from '../../lib/pagination';
import { auditLog } from '../../lib/audit';
import { notify } from '../../lib/notifications';

const ORDER_INCLUDE = {
  items: true,
  addresses: true,
  payments: { orderBy: { createdAt: 'desc' } },
  refunds: true,
  shipments: true,
} as const;

export async function myOrders(req: Request, res: Response) {
  const { page, pageSize, skip, take } = pageParams(Number(req.query.page), Number(req.query.pageSize));
  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where: { customerId: req.user!.id } }),
    prisma.order.findMany({
      where: { customerId: req.user!.id },
      include: { items: { take: 5 } },
      orderBy: { placedAt: 'desc' },
      skip,
      take,
    }),
  ]);
  return ok(res, orders, pageResult([], total, page, pageSize).meta);
}

export async function myOrderDetail(req: Request, res: Response) {
  const order = await prisma.order.findFirst({
    where: { id: typeof req.params.id === 'string' ? req.params.id : '', customerId: req.user!.id },
    include: ORDER_INCLUDE,
  });
  if (!order) throw ApiError.notFound('Order not found');
  return ok(res, order);
}

export async function adminList(req: Request, res: Response) {
  const { page, pageSize, skip, take } = pageParams(Number(req.query.page), Number(req.query.pageSize));
  const q = (req.query.q as string) ?? '';
  const status = (req.query.status as string) || undefined;
  const paymentStatus = (req.query.paymentStatus as string) || undefined;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
      { guestEmail: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;


  const total = await prisma.order.count({ where });
  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { take: 3 },
      payments: { select: { status: true, amount: true } },
      _count: { select: { items: true } },
    },
    orderBy: { placedAt: 'desc' },
    skip,
    take,
  });
  return ok(res, orders, pageResult([], total, page, pageSize).meta);
}

export async function adminDetail(req: Request, res: Response) {
  const order = await prisma.order.findUnique({
    where: { id: typeof req.params.id === 'string' ? req.params.id : '' },
    include: ORDER_INCLUDE,
  });
  if (!order) throw ApiError.notFound('Order not found');
  return ok(res, order);
}

export async function updateStatus(req: Request, res: Response) {
  const order = await prisma.order.findUnique({ where: { id: typeof req.params.id === 'string' ? req.params.id : '' } });
  if (!order) throw ApiError.notFound('Order not found');
  const before = order;

  const nextStatus = req.body.status;
  validateStatusTransition(order.status, nextStatus);

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: nextStatus, orderNote: req.body.note },
  });

  await auditLog(req, { action: 'order.status', entityType: 'order', entityId: order.id, before, after: updated });

  // Notify customer.
  if (updated.status === 'SHIPPED' || updated.status === 'DELIVERED' || updated.status === 'CANCELLED') {
    const email = order.guestEmail ?? (await prisma.user.findUnique({ where: { id: order.customerId! } }))?.email;
    if (email) {
      void notify({
        email,
        channel: 'EMAIL',
        type: 'ORDER_STATUS',
        subject: `Order ${order.orderNumber} is now ${updated.status}`,
        body: `Your order ${order.orderNumber} status changed to ${updated.status}.`,
        html: `<p>Your order <strong>${order.orderNumber}</strong> is now <strong>${updated.status}</strong>.</p>`,
      });
    }
  }

  return ok(res, updated);
}

function validateStatusTransition(current: string, next: string) {
  const allowed: Record<string, string[]> = {
    PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['PACKED', 'CANCELLED'],
    PACKED: ['SHIPPED'],
    SHIPPED: ['DELIVERED', 'RETURNED'],
    DELIVERED: ['RETURNED'],
    RETURNED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
    CANCELLED: [],
    PARTIALLY_REFUNDED: ['REFUNDED'],
    REFUNDED: [],
  };
  if (!allowed[current]?.includes(next)) {
    throw new ApiError(400, 'INVALID_STATUS_TRANSITION', `Cannot move order from ${current} to ${next}`);
  }
}

export async function addNote(req: Request, res: Response) {
  const order = await prisma.order.findUnique({ where: { id: typeof req.params.id === 'string' ? req.params.id : '' } });
  if (!order) throw ApiError.notFound('Order not found');
  const note = req.body.note as string;
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { orderNote: note },
  });
  await auditLog(req, { action: 'order.note', entityType: 'order', entityId: order.id, after: { note } });
  return ok(res, updated);
}

export async function createShipment(req: Request, res: Response) {
  const order = await prisma.order.findUnique({ where: { id: req.body.orderId }, include: { items: true } });
  if (!order) throw ApiError.notFound('Order not found');
  const shipment = await prisma.shipment.create({
    data: {
      orderId: order.id,
      carrier: req.body.carrier,
      trackingNumber: req.body.trackingNumber,
      trackingUrl: req.body.trackingUrl,
      status: 'SHIPPED',
      shippedAt: req.body.shippedAt ? new Date(req.body.shippedAt) : new Date(),
    },
  });
  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'SHIPPED', fulfillmentStatus: 'FULFILLED' },
  });
  await auditLog(req, { action: 'order.ship', entityType: 'order', entityId: order.id, after: shipment });
  const email = order.guestEmail ?? (await prisma.user.findUnique({ where: { id: order.customerId! } }))?.email;
  if (email) {
    void notify({
      email,
      channel: 'EMAIL',
      type: 'SHIPMENT_DISPATCH',
      subject: `Order ${order.orderNumber} has shipped`,
      body: `Your order ${order.orderNumber} shipped via ${req.body.carrier}. Tracking: ${req.body.trackingNumber}`,
      html: `<p>Your order <strong>${order.orderNumber}</strong> has shipped.</p><p>Tracking: ${req.body.trackingNumber}</p>`,
    });
  }
  return ok(res, shipment, undefined, 201);
}

export async function cancelOrder(req: Request, res: Response) {
  const order = await prisma.order.findUnique({ where: { id: typeof req.params.id === 'string' ? req.params.id : '' }, include: { items: true } });
  if (!order) throw ApiError.notFound('Order not found');
  if (!['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING'].includes(order.status)) {
    throw new ApiError(400, 'CANNOT_CANCEL', 'This order cannot be cancelled in its current state');
  }
  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
    // Release reservations.
    const reservations = await tx.stockReservation.findMany({ where: { orderId: order.id, status: 'RESERVED' } });
    for (const r of reservations) {
      const level = await tx.inventoryLevel.findUnique({ where: { id: r.locationId! } });
      if (!level) continue;
      await tx.inventoryLevel.update({
        where: { id: level.id },
        data: { reservedStock: Math.max(0, level.reservedStock - r.quantity) },
      });
      await tx.inventoryMovement.create({
        data: {
          productId: r.productId,
          variantId: r.variantId,
          locationId: r.locationId,
          type: 'ADJUSTMENT',
          previousQuantity: level.reservedStock,
          quantityChange: -r.quantity,
          resultingQuantity: Math.max(0, level.reservedStock - r.quantity),
          reason: `Release reservation for cancelled order ${o.orderNumber}`,
          reference: o.id,
          userId: req.user!.id,
        },
      });
      await tx.stockReservation.update({ where: { id: r.id }, data: { status: 'RELEASED', releasedAt: new Date() } });
    }
    return o;
  });
  await auditLog(req, { action: 'order.cancel', entityType: 'order', entityId: order.id, before: order, after: updated });
  return ok(res, updated);
}
