import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';

export interface CartContext {
  userId?: string;
  sessionId?: string;
}

async function resolveCart(ctx: CartContext, createIfMissing = false) {
  let cart = ctx.userId
    ? await prisma.cart.findUnique({ where: { userId_status: { userId: ctx.userId, status: 'ACTIVE' } } })
    : ctx.sessionId
      ? await prisma.cart.findFirst({ where: { sessionId: ctx.sessionId, status: 'ACTIVE' } })
      : null;

  if (!cart && createIfMissing) {
    cart = await prisma.cart.create({
      data: { userId: ctx.userId, sessionId: ctx.sessionId },
    });
  }
  return cart;
}

const ITEM_INCLUDE = {
  product: {
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      compareAtPrice: true,
      salePrice: true,
      saleStartAt: true,
      saleEndAt: true,
      status: true,
      images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
    },
  },
  variant: true,
} as const;

export async function getCart(ctx: CartContext, createIfMissing = true) {
  const cart = await resolveCart(ctx, createIfMissing);
  if (!cart) return { items: [], subtotal: 0, itemCount: 0 };
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: ITEM_INCLUDE,
  });
  return { cart, items };
}

export { ITEM_INCLUDE };

export async function addItem(ctx: CartContext, productId: string, variantId: string | null | undefined, quantity: number) {
  const cart = await resolveCart(ctx, true);
  if (!cart) throw new ApiError(500, 'INTERNAL_ERROR', 'Could not create cart');

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });
  if (!product || product.status !== 'ACTIVE' || product.visibility !== 'VISIBLE') {
    throw ApiError.notFound('Product not found or not available');
  }

  let variant = null;
  if (product.type === 'VARIABLE') {
    if (!variantId) throw ApiError.badRequest('Please select a variant');
    variant = product.variants.find((v) => v.id === variantId);
    if (!variant) throw ApiError.badRequest('Variant not found');
  } else if (variantId) {
    throw ApiError.badRequest('This product does not have variants');
  }

  await assertStock(product.id, variant?.id ?? null, quantity);

  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId: variant?.id ?? null },
  });

  if (existing) {
    const newQty = existing.quantity + quantity;
    await assertStock(product.id, variant?.id ?? null, newQty);
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantId: variant?.id ?? null, quantity },
    });
  }

  return getCart(ctx);
}

export async function updateItem(ctx: CartContext, itemId: string, quantity: number) {
  const cart = await resolveCart(ctx);
  if (!cart) throw ApiError.notFound('Cart not found');
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    include: { product: true },
  });
  if (!item) throw ApiError.notFound('Cart item not found');
  await assertStock(item.productId, item.variantId, quantity);
  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  return getCart(ctx);
}

export async function removeItem(ctx: CartContext, itemId: string) {
  const cart = await resolveCart(ctx);
  if (!cart) throw ApiError.notFound('Cart not found');
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  return getCart(ctx);
}

export async function clearCart(ctx: CartContext) {
  const cart = await resolveCart(ctx);
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return { ok: true };
}

export async function mergeGuestCart(userId: string, sessionId: string) {
  const guest = sessionId
    ? await prisma.cart.findFirst({ where: { sessionId, status: 'ACTIVE' } })
    : null;
  if (!guest) return;
  const userCart = await resolveCart({ userId }, true);
  if (!userCart) return;
  const guestItems = await prisma.cartItem.findMany({ where: { cartId: guest.id } });
  for (const gi of guestItems) {
    const existing = await prisma.cartItem.findFirst({
      where: { cartId: userCart.id, productId: gi.productId, variantId: gi.variantId },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + gi.quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: gi.productId,
          variantId: gi.variantId,
          quantity: gi.quantity,
        },
      });
    }
  }
  await prisma.cart.update({ where: { id: guest.id }, data: { status: 'CHECKED_OUT' } });
  return getCart({ userId });
}

export async function applyCoupon(ctx: CartContext, code: string) {
  const cart = await resolveCart(ctx, true);
  if (!cart) throw new ApiError(500, 'INTERNAL_ERROR', 'Could not load cart');
  const coupon = await prisma.promotion.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) throw new ApiError(400, 'INVALID_COUPON', 'Invalid or inactive coupon code');
  const now = new Date();
  if (coupon.startsAt > now) throw new ApiError(400, 'INVALID_COUPON', 'This coupon is not yet active');
  if (coupon.endsAt && coupon.endsAt < now) throw new ApiError(400, 'INVALID_COUPON', 'This coupon has expired');
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: code } });
  return getCart(ctx);
}

export async function assertStock(productId: string, variantId: string | null, quantity: number) {
  const level = await prisma.inventoryLevel.findFirst({
    where: { productId, variantId },
    orderBy: { locationId: 'asc' },
  });
  const available = level ? level.physicalStock - level.reservedStock : 0;
  if (available < quantity) {
    throw new ApiError(409, 'INSUFFICIENT_STOCK', `Only ${Math.max(0, available)} in stock`);
  }
}

export async function cartSummary(ctx: CartContext) {
  const { items } = await getCart(ctx);
  let subtotal = 0;
  for (const item of items) {
    const unit = item.variant?.price ?? item.product.price;
    const onSale =
      item.product.salePrice != null &&
      (!item.product.saleStartAt || item.product.saleStartAt <= new Date()) &&
      (!item.product.saleEndAt || item.product.saleEndAt >= new Date());
    const price = onSale && item.product.salePrice != null ? item.product.salePrice : unit;
    subtotal += price.toNumber() * item.quantity;
  }
  return { subtotal, itemCount: items.reduce((a, i) => a + i.quantity, 0) };
}


