import type { Request, Response } from 'express';
import { ok, created } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { createOrder } from './checkout.service';
import { calculatePricing } from './pricing';
import { prisma } from '../../lib/prisma';

export async function validate(req: Request, res: Response) {
  // Recompute pricing server-side from the customer's cart.
  const cart = await loadCustomerCart(req);
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'EMPTY_CART', 'Your cart is empty');
  }

  const lines = cart.items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    sku: item.variant?.sku ?? item.product.sku,
    name: item.product.name,
    unitPrice: 0,
    quantity: item.quantity,
  }));

  const pricing = await calculatePricing({
    lines,
    country: req.body.customer?.country ?? req.body.delivery?.address?.country ?? 'GH',
    region: req.body.delivery?.address?.region,
    shippingMethodId: req.body.delivery?.shippingMethodId,
    couponCode: req.body.couponCode,
    customerId: req.user?.id,
  });

  return ok(res, pricing);
}

async function loadCustomerCart(req: Request) {
  const userId = req.user?.id;
  const sessionId = (req.headers['x-session-id'] as string) || undefined;
  return prisma.cart.findFirst({
    where: {
      AND: [
        { status: 'ACTIVE' },
        userId ? { userId } : sessionId ? { sessionId } : { id: '' },
      ],
    },
    include: { items: { include: { product: true, variant: true } } },
  });
}

export async function placeOrder(req: Request, res: Response) {
  if (req.body.customer.isGuest) {
    const idResult = await createOrder({
      ...req.body,
      sessionId: (req.headers['x-session-id'] as string) || undefined,
    });
    return created(res, { order: idResult.order, alreadyExists: idResult.alreadyExists });
  }
  const idResult = await createOrder({
    ...req.body,
    userId: req.user!.id,
  });
  return created(res, { order: idResult.order, alreadyExists: idResult.alreadyExists });
}

export async function trackOrderGet(req: Request, res: Response) {
  const { orderNumber, email } = req.query;
  const order = await prisma.order.findFirst({
    where: {
      orderNumber: orderNumber as string,
      OR: [{ guestEmail: email as string }, { customer: { email: email as string } }],
    },
    include: { items: true, addresses: true, shipments: true, payments: true },
  });
  if (!order) throw ApiError.notFound('Order not found. Check the order number and email.');
  return ok(res, order);
}
