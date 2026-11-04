import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { randomReference, randomToken } from '../../lib/crypto';
import { getGateway, providerForMethod, isAsyncGateway } from '../../integrations/payments';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { notify } from '../../lib/notifications';

export async function initialize(req: Request, res: Response) {
  const { orderId, method, provider } = req.body;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw ApiError.notFound('Order not found');

  // Only the ordering customer (or guest with matching email) may initialize payment.
  if (req.user?.id && order.customerId && order.customerId !== req.user.id) {
    throw ApiError.forbidden('This order does not belong to you');
  }
  if (!req.user?.id && order.customerId) {
    throw ApiError.unauthorized('Sign in to pay for this order');
  }

  // Idempotency: reuse the payment reference across retries of this order.
  const existing = await prisma.payment.findFirst({
    where: { orderId: order.id, status: { in: ['PENDING', 'AWAITING_CONFIRMATION'] } },
    orderBy: { createdAt: 'desc' },
  });

  const payProvider = provider ?? providerForMethod(method);
  const reference = existing?.reference ?? randomReference('PAY');

  const gateway = await getGateway(payProvider);

  const customerEmail = order.guestEmail ?? (req.user ? await prisma.user.findUnique({ where: { id: req.user.id } }).then((u) => u?.email) : undefined);

  let initResult;
  try {
    initResult = await gateway.init({
      reference,
      amount: Math.round(order.grandTotal.toNumber() * 100),
      currency: order.currency,
      method,
      provider: payProvider,
      description: `Order ${order.orderNumber}`,
      customer: { email: customerEmail ?? 'guest@example.com', firstName: req.body.firstName, lastName: req.body.lastName, phone: req.body.phone },
      returnUrl: req.body.returnUrl ?? `${env.STOREFRONT_URL}/checkout/confirmation`,
      orderId: order.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment gateway error';
    throw new ApiError(502, 'PAYMENT_GATEWAY_ERROR', message);
  }

  if (existing) {
    const updated = await prisma.payment.update({
      where: { id: existing.id },
      data: { gatewayResponse: { initializedAt: new Date().toISOString() } },
    });
    return ok(res, { payment: updated, init: initResult });
  }

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      reference,
      provider: payProvider,
      method,
      amount: order.grandTotal,
      currency: order.currency,
      status: isAsyncGateway(payProvider) ? 'AWAITING_CONFIRMATION' : 'PENDING',
      gatewayResponse: { init: initResult as unknown as Prisma.InputJsonValue },
    },
  });

  await prisma.paymentEvent.create({
    data: {
      paymentId: payment.id,
      status: 'INITIATED',
      payload: { reference, method, provider: payProvider },
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: isAsyncGateway(payProvider) ? 'AWAITING_CONFIRMATION' : 'PENDING' },
  });

  return ok(res, { payment, init: initResult }, undefined, 201);
}

export async function getByReference(req: Request, res: Response) {
  const payment = await prisma.payment.findUnique({
    where: { reference: typeof req.params.reference === 'string' ? req.params.reference : '' },
    include: { events: { orderBy: { createdAt: 'desc' } } },
  });
  if (!payment) throw ApiError.notFound('Payment not found');
  return ok(res, payment);
}

export async function confirmManualPayment(req: Request, res: Response) {
  // Authorized manual-payment workflow: requires an admin with payment permission.
  const { paymentId, status } = req.body;
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });
  if (!payment) throw ApiError.notFound('Payment not found');
  if (status === 'PAID') {
    await markPaid(payment.id, payment.orderId, req.user!.id);
  } else if (status === 'FAILED') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: 'Marked failed by administrator' },
    });
    await prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'FAILED' } });
  }
  return ok(res, { ok: true });
}

export async function markPaid(paymentId: string, orderId: string, userId: string) {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw ApiError.notFound('Payment not found');
    if (payment.status === 'PAID') return; // idempotent
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', paidAt: new Date(), webhookVerifiedAt: new Date() },
    });
    await tx.paymentEvent.create({
      data: { paymentId: payment.id, status: 'SUCCEEDED', payload: { verifiedBy: userId, manual: true } },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
    });
  });
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (order?.guestEmail) {
    void notify({
      email: order.guestEmail,
      channel: 'EMAIL',
      type: 'PAYMENT_CONFIRMED',
      subject: `Payment confirmed for order ${order.orderNumber}`,
      body: `We received your payment for order ${order.orderNumber}.`,
      html: `<p>We received your payment for order <strong>${order.orderNumber}</strong>.</p>`,
    });
  }
}

export async function webhook(req: Request, res: Response) {
  const provider = req.params.provider as string;
  const signature = (req.headers['x-paystack-signature'] as string) || (req.headers['verif-hash'] as string) || (req.headers['stripe-signature'] as string) || undefined;
  const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);

  const gateway = await getGateway(provider as never);

  let verified;
  try {
    verified = await gateway.verifyWebhook({
      provider: provider as never,
      eventId: (req.headers['x-event-id'] as string) ?? randomToken(16),
      type: (req.body as any)?.event ?? (req.body as any)?.type ?? 'unknown',
      payload: req.body as Record<string, unknown>,
      signature,
      rawBody: typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook verification failed';
    throw new ApiError(401, 'INVALID_WEBHOOK_SIGNATURE', message);
  }

  const payment = await prisma.payment.findUnique({ where: { reference: verified.reference } });
  if (!payment) {
    // Idempotent: unknown reference, log and ack.
    return ok(res, { received: true, ignored: 'unknown_reference' });
  }

  // Idempotency: ignore duplicate successful events.
  const duplicate = await prisma.paymentEvent.findUnique({
    where: { providerEventId: (req.headers['x-event-id'] as string) ?? verified.gatewayTransactionId ?? '' },
  });
  if (duplicate) return ok(res, { received: true, duplicate: true });

  await prisma.paymentEvent.create({
    data: {
      paymentId: payment.id,
      status: verified.status === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED',
      providerEventId: verified.gatewayTransactionId ?? (req.headers['x-event-id'] as string),
      payload: req.body as object,
      rawHeaders: {
        signature: signature?.slice(0, 40),
        provider,
      },
    },
  });

  if (verified.status === 'SUCCEEDED') {
    await markPaid(payment.id, payment.orderId, 'SYSTEM');
  } else {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: 'Gateway reported failure' },
    });
    await prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'FAILED' } });
  }

  return ok(res, { received: true });
}

export async function listAdmin(req: Request, res: Response) {
  const payments = await prisma.payment.findMany({
    include: { order: { select: { orderNumber: true, customerName: true, guestEmail: true } }, events: { orderBy: { createdAt: 'desc' }, take: 5 } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return ok(res, payments);
}

export async function refundRequest(req: Request, res: Response) {
  const { paymentId, amount, reason, restock } = req.body;
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.status !== 'PAID') throw new ApiError(400, 'NOT_PAID', 'Only paid orders can be refunded');

  const refundedSoFar = await prisma.refund.aggregate({
    where: { paymentId, status: { in: ['REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED'] } },
    _sum: { amount: true },
  });
  const refundable = payment.amount.toNumber() - (refundedSoFar._sum.amount?.toNumber() ?? 0);
  if (amount > refundable) {
    throw new ApiError(400, 'REFUND_EXCEEDS_BALANCE', `Maximum refundable is ${refundable}`);
  }

  const refund = await prisma.refund.create({
    data: {
      orderId: payment.orderId,
      paymentId: payment.id,
      amount,
      currency: payment.currency,
      reason: 'RETURN_REQUESTED',
      reasonText: reason,
      status: 'REQUESTED',
      requestedBy: req.user!.id,
      restock: restock ?? false,
    },
  });
  await prisma.paymentEvent.create({
    data: { paymentId: payment.id, status: 'REFUND_REQUESTED', payload: { refundId: refund.id, amount } },
  });
  return ok(res, refund, undefined, 201);
}
