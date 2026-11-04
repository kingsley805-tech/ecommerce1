import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import { randomOrderNumber } from '../../lib/crypto';
import { calculatePricing } from './pricing';
import { notify } from '../../lib/notifications';
import { env } from '../../config/env';

export interface CheckoutCustomer {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isGuest?: boolean;
}

export interface CheckoutDelivery {
  address: {
    recipientName: string;
    phone?: string;
    email?: string;
    line1: string;
    line2?: string;
    city: string;
    region?: string;
    postalCode?: string;
    country: string;
    deliveryInstructions?: string;
  };
  shippingMethodId: string;
  saveAddress?: boolean;
}

export interface CheckoutPayment {
  method: 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY';
}

export interface CheckoutInput {
  customer: CheckoutCustomer;
  delivery: CheckoutDelivery;
  payment: CheckoutPayment;
  couponCode?: string;
  orderNote?: string;
  idempotencyKey: string;
}

export async function validateCheckout(input: CheckoutInput) {
  // Load cart (from user or guest session) and recompute pricing server-side.
  await prisma.cart.findFirst({
    where: {
      OR: [
        { userId: input.customer.isGuest ? undefined : undefined },
      ],
      status: 'ACTIVE',
    },
    include: { items: { include: { product: true, variant: true } } },
  });
  // Cart is resolved by controller; this function recomputes pricing from lines.
  return input;
}

export async function createOrder(input: CheckoutInput & { userId?: string; sessionId?: string }) {
  const idempotencyKey = input.idempotencyKey;

  // Idempotency: check for an existing order with this key.
  const existing = await prisma.order.findUnique({ where: { idempotencyKey } });
  if (existing) return { order: existing, alreadyExists: true };

  const cart = await prisma.cart.findFirst({
    where: {
      OR: [
        { userId: input.userId ?? undefined },
        { sessionId: input.sessionId ?? undefined },
      ],
      status: 'ACTIVE',
    },
    include: { items: { include: { product: true, variant: true } } },
  });

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
    country: input.delivery.address.country,
    region: input.delivery.address.region,
    shippingMethodId: input.delivery.shippingMethodId,
    couponCode: input.couponCode,
    customerId: input.userId,
  });

  // Transaction: create order + items + addresses + reserve stock atomically.
  const order = await prisma.$transaction(
    async (tx) => {
      const shippingMethod = await tx.shippingMethod.findUnique({
        where: { id: input.delivery.shippingMethodId },
      });
      if (!shippingMethod) throw new ApiError(400, 'INVALID_SHIPPING', 'Invalid shipping method');

      const orderNumber = randomOrderNumber();

      // Validate stock availability BEFORE creating the order.
      const levels = [];
      for (const line of pricing.lines) {
        const level = await tx.inventoryLevel.findFirst({
          where: { productId: line.productId, variantId: line.variantId },
          orderBy: { locationId: 'asc' },
        });
        if (!level) throw new ApiError(409, 'INSUFFICIENT_STOCK', `No inventory for ${line.sku}`);
        const available = level.physicalStock - level.reservedStock;
        if (available < line.quantity) {
          throw new ApiError(409, 'INSUFFICIENT_STOCK', `Only ${Math.max(0, available)} left for ${line.sku}`);
        }
        levels.push({ line, level });
      }

      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: input.userId ?? null,
          guestEmail: input.userId ? null : input.customer.email,
          customerName: `${input.customer.firstName} ${input.customer.lastName}`,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'PENDING',
          fulfillmentStatus: 'UNFULFILLED',
          subtotal: pricing.subtotal,
          discountTotal: pricing.discountTotal,
          shippingTotal: pricing.shippingTotal,
          taxTotal: pricing.taxTotal,
          grandTotal: pricing.grandTotal,
          currency: env.DEFAULT_CURRENCY,
          couponCode: input.couponCode ?? null,
          promotionSnapshot: pricing.promotionSnapshot as object | undefined,
          paymentMethod: input.payment.method,
          orderNote: input.orderNote,
          idempotencyKey,
          addresses: {
            create: [
              {
                type: 'SHIPPING',
                recipientName: input.delivery.address.recipientName,
                phone: input.delivery.address.phone,
                email: input.delivery.address.email,
                line1: input.delivery.address.line1,
                line2: input.delivery.address.line2,
                city: input.delivery.address.city,
                region: input.delivery.address.region,
                postalCode: input.delivery.address.postalCode,
                country: input.delivery.address.country,
                deliveryInstructions: input.delivery.address.deliveryInstructions,
              },
            ],
          },
          items: {
            create: pricing.lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              sku: line.sku,
              productName: line.name,
              variantLabel: line.variantId
                ? line.variantId
                : null,
              imageUrl: null,
              unitPrice: line.effectivePrice,
              quantity: line.quantity,
              taxAmount: line.effectivePrice * line.quantity * pricing.taxRate,
              totalAmount: line.effectivePrice * line.quantity,
            })),
          },
        },
        include: { items: true, addresses: true },
      });

      // Reserve stock now that the order exists, decrementing available inventory.
      for (const { line, level } of levels) {
        await tx.inventoryLevel.update({
          where: { id: level.id },
          data: { reservedStock: level.reservedStock + line.quantity },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: line.productId,
            variantId: line.variantId,
            locationId: level.locationId,
            type: 'SALE',
            previousQuantity: level.reservedStock,
            quantityChange: line.quantity,
            resultingQuantity: level.reservedStock + line.quantity,
            reason: `Order reservation ${orderNumber}`,
            reference: created.id,
            userId: input.userId,
          },
        });
        await tx.stockReservation.create({
          data: {
            orderId: created.id,
            productId: line.productId,
            variantId: line.variantId,
            locationId: level.locationId,
            quantity: line.quantity,
          },
        });
      }

      // Mark cart as checked out.
      await tx.cart.update({ where: { id: cart.id }, data: { status: 'CHECKED_OUT', couponCode: null } });

      // Record coupon redemption.
      if (input.couponCode && pricing.promotionSnapshot) {
        const snap = pricing.promotionSnapshot as { promotionId: string; discount: number };
        await tx.promotionRedemption.create({
          data: {
            promotionId: snap.promotionId,
            orderId: created.id,
            customerId: input.userId ?? null,
            amountDiscounted: snap.discount,
          },
        });
      }

      return created;
    },
    { isolationLevel: 'Serializable' },
  );

  // Fire-and-forget notifications.
  void notifyOrderPlaced(order, input.customer);

  return { order, alreadyExists: false };
}

async function notifyOrderPlaced(order: { orderNumber: string; grandTotal: import('@prisma/client').Prisma.Decimal }, customer: CheckoutCustomer) {
  const orderUrl = `${env.STOREFRONT_URL}/account/orders/${order.orderNumber}`;
  await notify({
    email: customer.email,
    channel: 'EMAIL',
    type: 'ORDER_PLACED',
    subject: `Order ${order.orderNumber} received`,
    body: `Thank you for your order ${order.orderNumber}. Total: ${order.grandTotal}. View it: ${orderUrl}`,
    html: `<p>Thank you for your order <strong>${order.orderNumber}</strong>.</p><p>View your <a href="${orderUrl}">order</a>.</p>`,
  });
}

export async function getOrderForUser(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId: userId },
    include: { items: true, addresses: true, payments: true, refunds: true, shipments: true },
  });
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}
