import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { getGateway } from '../../integrations/payments';
import { notify } from '../../lib/notifications';
import { auditLog } from '../../lib/audit';

export async function listAdmin(req: Request, res: Response) {
  const refunds = await prisma.refund.findMany({
    include: {
      order: { select: { orderNumber: true, customerName: true, guestEmail: true } },
      payment: { select: { provider: true, reference: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return ok(res, refunds);
}

export async function processRefund(req: Request, res: Response) {
  const refund = await prisma.refund.findUnique({
    where: { id: typeof req.params.id === 'string' ? req.params.id : '' },
    include: { order: true, payment: true },
  });
  if (!refund) throw ApiError.notFound('Refund not found');
  if (refund.status !== 'APPROVED') {
    throw new ApiError(400, 'REFUND_NOT_APPROVED', 'Refund must be approved before processing');
  }
  if (refund.paymentId && refund.payment?.provider) {
    const gateway = await getGateway(refund.payment.provider);
    try {
      const result = await gateway.refund({
        reference: refund.payment.reference,
        amount: Math.round(refund.amount.toNumber() * 100),
        currency: refund.currency,
        reason: refund.reason === 'DUPLICATE' ? 'duplicate' : 'requested_by_customer',
      });
      await prisma.refund.update({
        where: { id: refund.id },
        data: { status: 'COMPLETED', completedAt: new Date(), gatewayRefundId: result.gatewayRefundId, processedBy: req.user!.id },
      });
      await prisma.paymentEvent.create({
        data: {
          paymentId: refund.paymentId!,
          status: 'REFUND_SUCCEEDED',
          payload: { refundId: refund.id, gatewayRefundId: result.gatewayRefundId },
        },
      });
      await syncOrderRefundStatus(refund.orderId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gateway refund failed';
      await prisma.refund.update({ where: { id: refund.id }, data: { status: 'FAILED' } });
      throw new ApiError(502, 'REFUND_GATEWAY_ERROR', message);
    }
  } else {
    // Manual refund (bank transfer / COD): mark completed.
    await prisma.refund.update({
      where: { id: refund.id },
      data: { status: 'COMPLETED', completedAt: new Date(), processedBy: req.user!.id },
    });
    await syncOrderRefundStatus(refund.orderId);
  }

  const email = refund.order.guestEmail ?? (await prisma.user.findUnique({ where: { id: refund.order.customerId! } }))?.email;
  if (email) {
    void notify({
      email,
      channel: 'EMAIL',
      type: 'REFUND_COMPLETED',
      subject: `Refund processed for order ${refund.order.orderNumber}`,
      body: `A refund of ${refund.amount} ${refund.currency} has been processed for order ${refund.order.orderNumber}.`,
      html: `<p>A refund of <strong>${refund.amount} ${refund.currency}</strong> has been processed for order <strong>${refund.order.orderNumber}</strong>.</p>`,
    });
  }
  return ok(res, { ok: true });
}

export async function approveRefund(req: Request, res: Response) {
  const refund = await prisma.refund.findUnique({ where: { id: typeof req.params.id === 'string' ? req.params.id : '' } });
  if (!refund) throw ApiError.notFound('Refund not found');
  if (refund.status !== 'REQUESTED') {
    throw new ApiError(400, 'INVALID_STATE', 'Only requested refunds can be approved');
  }
  const updated = await prisma.refund.update({
    where: { id: refund.id },
    data: { status: 'APPROVED', processedBy: req.user!.id },
  });
  await auditLog(req, { action: 'refund.approve', entityType: 'refund', entityId: refund.id, before: refund, after: updated });
  return ok(res, updated);
}

export async function rejectRefund(req: Request, res: Response) {
  const refund = await prisma.refund.findUnique({ where: { id: typeof req.params.id === 'string' ? req.params.id : '' } });
  if (!refund) throw ApiError.notFound('Refund not found');
  const updated = await prisma.refund.update({
    where: { id: refund.id },
    data: { status: 'REJECTED', reasonText: req.body.reason ?? refund.reasonText },
  });
  await auditLog(req, { action: 'refund.reject', entityType: 'refund', entityId: refund.id, before: refund, after: updated });
  return ok(res, updated);
}

async function syncOrderRefundStatus(orderId: string) {
  const completed = await prisma.refund.aggregate({
    where: { orderId, status: 'COMPLETED' },
    _sum: { amount: true },
  });
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const totalRefunded = completed._sum.amount?.toNumber() ?? 0;
  const grandTotal = order.grandTotal.toNumber();
  let status: 'REFUNDED' | 'PARTIALLY_REFUNDED' = 'PARTIALLY_REFUNDED';
  if (totalRefunded >= grandTotal) status = 'REFUNDED';
  await prisma.order.update({
    where: { id: orderId },
    data: { status, paymentStatus: status },
  });
}
