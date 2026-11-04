import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ok, created } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { randomOrderNumber } from '../../lib/crypto';
import { notify } from '../../lib/notifications';
import { auditLog } from '../../lib/audit';

type Tx = Prisma.TransactionClient;

export async function requestReturn(req: Request, res: Response) {
  const { orderId, reason, items } = req.body;
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId: req.user!.id },
    include: { items: true },
  });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status !== 'DELIVERED') {
    throw new ApiError(400, 'RETURN_NOT_ELIGIBLE', 'Only delivered orders may be returned');
  }

  const existingReturn = await prisma.return.findFirst({ where: { orderId, status: { not: 'COMPLETED' } } });
  if (existingReturn) throw new ApiError(409, 'RETURN_EXISTS', 'A return request already exists for this order');

  const returnModel = await prisma.$transaction(async (tx: Tx) => {
    const r = await tx.return.create({
      data: {
        orderId,
        number: randomOrderNumber('RET'),
        status: 'REQUESTED',
        reason,
        requestedBy: req.user!.id,
        items: {
          create: items.map((item: { orderItemId: string; quantity: number }) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    // Mark return items as partially refunded qty (tracking)
    for (const item of items as { orderItemId: string; quantity: number }[]) {
      await tx.orderItem.update({
        where: { id: item.orderItemId },
        data: { refundedQty: { increment: item.quantity } },
      });
    }
    return r;
  });

  await auditLog(req, { action: 'return.request', entityType: 'return', entityId: returnModel.id, after: returnModel });
  return created(res, returnModel);
}

export async function myReturns(req: Request, res: Response) {
  const returns = await prisma.return.findMany({
    where: { order: { customerId: req.user!.id } },
    include: { order: { select: { orderNumber: true } }, items: true },
    orderBy: { createdAt: 'desc' },
  });
  return ok(res, returns);
}

export async function adminList(req: Request, res: Response) {
  const returns = await prisma.return.findMany({
    include: {
      order: { select: { orderNumber: true, customerName: true, guestEmail: true } },
      items: { include: { orderItem: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return ok(res, returns);
}

export async function decide(req: Request, res: Response) {
  const returnModel = await prisma.return.findUnique({
    where: { id: typeof req.params.id === 'string' ? req.params.id : '' },
    include: { items: { include: { orderItem: true } }, order: true },
  });
  if (!returnModel) throw ApiError.notFound('Return not found');
  const before = returnModel;

  const { status, note, restock, refundAmount } = req.body;
  const updated = await prisma.$transaction(async (tx: Tx) => {
    const r = await tx.return.update({
      where: { id: returnModel.id },
      data: {
        status,
        adminNote: note,
        reviewedBy: req.user!.id,
        receivedAt: status === 'RECEIVED' ? new Date() : undefined,
        inspectedAt: status === 'INSPECTED' ? new Date() : undefined,
      },
    });

    if (status === 'INSPECTED' && restock) {
      for (const item of returnModel.items) {
        const orderItem = await tx.orderItem.findUnique({ where: { id: item.orderItemId } });
        if (!orderItem) continue;
        // Restock: add the returned qty back to available inventory.
        const levels = await tx.inventoryLevel.findMany({
          where: { productId: orderItem.productId!, variantId: orderItem.variantId },
        });
        for (const level of levels) {
          await tx.inventoryLevel.update({
            where: { id: level.id },
            data: { physicalStock: level.physicalStock + item.quantity },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: orderItem.productId!,
              variantId: orderItem.variantId,
              locationId: level.locationId,
              type: 'RETURN_TO_STOCK',
              previousQuantity: level.physicalStock,
              quantityChange: item.quantity,
              resultingQuantity: level.physicalStock + item.quantity,
              reason: `Restock from return ${r.number}`,
              reference: r.id,
              userId: req.user!.id,
            },
          });
        }
        await tx.returnItem.update({ where: { id: item.id }, data: { restocked: true } });
      }
    }

    if (status === 'APPROVED') {
      // Create a refund record pending processing.
      const pay = await tx.payment.findFirst({ where: { orderId: returnModel.orderId, status: 'PAID' } });
      const amount = refundAmount ?? refundableReturnAmount(returnModel.items);
      const refund = await tx.refund.create({
        data: {
          orderId: returnModel.orderId,
          paymentId: pay?.id ?? null,
          amount,
          currency: returnModel.order.currency,
          reason: 'RETURN_REQUESTED',
          status: 'REQUESTED',
          requestedBy: req.user!.id,
        },
      });
      await tx.return.update({ where: { id: returnModel.id }, data: { refundId: refund.id } });
    }
    return r;
  });

  const email = returnModel.order.guestEmail ?? (await prisma.user.findUnique({ where: { id: returnModel.order.customerId! } }))?.email;
  if (email) {
    void notify({
      email,
      channel: 'EMAIL',
      type: 'RETURN_DECISION',
      subject: `Return request ${returnModel.number}`,
      body: `Your return ${returnModel.number} is now ${status}.`,
      html: `<p>Your return <strong>${returnModel.number}</strong> is now <strong>${status}</strong>.</p>`,
    });
  }
  await auditLog(req, { action: 'return.decide', entityType: 'return', entityId: returnModel.id, before, after: updated });
  return ok(res, updated);
}

function refundableReturnAmount(items: { orderItem: { totalAmount: unknown; refundedQty: number; quantity: number } | null }[]) {
  const amount = items.reduce((sum, i) => {
    if (!i.orderItem) return sum;
    const unitPrice = Number(i.orderItem.totalAmount) / i.orderItem.quantity || 0;
    const refundableQty = Math.max(0, i.orderItem.quantity - i.orderItem.refundedQty);
    return sum + unitPrice * refundableQty;
  }, 0);
  return Math.round(amount * 100) / 100;
}
