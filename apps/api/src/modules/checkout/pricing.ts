import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';

export interface PriceBreakdown {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  couponDiscount: number;
  freeShipping: boolean;
}

export interface PricingLine {
  productId: string;
  variantId: string | null;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

/**
 * Server-authoritative pricing. Never trusts values from the browser.
 * Applies active sale prices, promotion discounts, tax, and shipping.
 */
export async function calculatePricing(params: {
  lines: PricingLine[];
  country: string;
  region?: string;
  shippingMethodId?: string;
  couponCode?: string;
  customerId?: string | null;
}) {
  const { lines, country, shippingMethodId, couponCode, customerId } = params;
  if (!lines.length) throw new ApiError(400, 'EMPTY_CART', 'Cart is empty');

  const productIds = lines.map((l) => l.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: 'ACTIVE' },
    include: { variants: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));
  const now = new Date();

  let subtotal = 0;
  let discountTotal = 0;
  const pricedLines: (PricingLine & { effectivePrice: number; saleApplied: boolean })[] = [];

  for (const line of lines) {
    const product = productMap.get(line.productId);
    if (!product) throw new ApiError(400, 'PRODUCT_UNAVAILABLE', `Product not available: ${line.sku}`);

    let unit = product.price.toNumber();
    let saleApplied = false;
    if (
      product.salePrice != null &&
      (!product.saleStartAt || product.saleStartAt <= now) &&
      (!product.saleEndAt || product.saleEndAt >= now)
    ) {
      unit = product.salePrice.toNumber();
      saleApplied = true;
    }
    if (product.type === 'VARIABLE' && line.variantId) {
      const variant = product.variants.find((v) => v.id === line.variantId);
      if (!variant) throw new ApiError(400, 'INVALID_VARIANT', 'Invalid product variant');
      unit = variant.price.toNumber();
      if (variant.compareAtPrice && variant.compareAtPrice.toNumber() > unit) {
        discountTotal += (variant.compareAtPrice.toNumber() - unit) * line.quantity;
      }
    } else if (product.type === 'VARIABLE') {
      throw new ApiError(400, 'VARIANT_REQUIRED', `Select a variant for ${product.name}`);
    }

    subtotal += unit * line.quantity;
    pricedLines.push({ ...line, effectivePrice: unit, saleApplied });
  }

  // Promotion / coupon discounts
  let couponDiscount = 0;
  let freeShipping = false;
  let promotionSnapshot: unknown = null;
  if (couponCode) {
    const { discount, freeShip, snapshot } = await calculateCouponDiscount({
      code: couponCode,
      customerId,
      subtotal,
      lines: pricedLines,
    });
    couponDiscount = discount;
    freeShipping = freeShip;
    promotionSnapshot = snapshot;
  }
  discountTotal += couponDiscount;

  // Shipping
  let shippingTotal = 0;
  if (shippingMethodId) {
    shippingTotal = await calculateShipping({
      shippingMethodId,
      country,
      subtotal,
      weightGrams: null,
      freeShippingApplied: freeShipping,
    });
  }

  // Tax
  const taxRate = await taxRateFor(country);
  const taxableBase = Math.max(0, subtotal - couponDiscount);
  const taxTotal = Math.round(taxableBase * taxRate * 100) / 100;

  const grandTotal = Math.round((Math.max(0, subtotal - couponDiscount) + shippingTotal + taxTotal) * 100) / 100;

  return {
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal,
    grandTotal,
    couponDiscount,
    freeShipping,
    promotionSnapshot,
    taxRate,
    lines: pricedLines,
  } satisfies PriceBreakdown & { promotionSnapshot: unknown; taxRate: number; lines: typeof pricedLines };
}

export async function calculateCouponDiscount(params: {
  code: string;
  customerId?: string | null;
  subtotal: number;
  lines: { productId: string; effectivePrice: number; quantity: number }[];
}) {
  const { code, customerId, subtotal, lines } = params;
  const promotion = await prisma.promotion.findUnique({ where: { code } });
  if (!promotion || !promotion.isActive) {
    throw new ApiError(400, 'INVALID_COUPON', 'Invalid or inactive coupon code');
  }
  const now = new Date();
  if (promotion.startsAt > now) throw new ApiError(400, 'INVALID_COUPON', 'Coupon not yet active');
  if (promotion.endsAt && promotion.endsAt < now) throw new ApiError(400, 'INVALID_COUPON', 'Coupon has expired');

  if (promotion.maxRedemptions) {
    const used = await prisma.promotionRedemption.count({ where: { promotionId: promotion.id } });
    if (used >= promotion.maxRedemptions) throw new ApiError(400, 'COUPON_EXHAUSTED', 'This coupon has reached its redemption limit');
  }
  if (promotion.perCustomerLimit && customerId) {
    const usedByCustomer = await prisma.promotionRedemption.count({
      where: { promotionId: promotion.id, customerId },
    });
    if (usedByCustomer >= promotion.perCustomerLimit) throw new ApiError(400, 'COUPON_LIMIT', 'You have already used this coupon');
  }
  if (promotion.minimumOrderAmount && subtotal < promotion.minimumOrderAmount.toNumber()) {
    throw new ApiError(400, 'COUPON_MINIMUM', `Minimum order of ${promotion.minimumOrderAmount} required`);
  }

  let discount = 0;
  let freeShip = false;

  if (promotion.appliesTo === 'FIRST_ORDER' && customerId) {
    const priorOrders = await prisma.order.count({ where: { customerId, status: { not: 'CANCELLED' } } });
    if (priorOrders > 0) throw new ApiError(400, 'COUPON_FIRST_ORDER', 'This coupon is for first orders only');
  }

  const eligibleLines = lines.filter((l) => {
    if (promotion.excludedProductIds.includes(l.productId)) return false;
    if (promotion.appliesTo === 'PRODUCTS' && !promotion.productIds.includes(l.productId)) return false;
    if (promotion.appliesTo === 'CATEGORIES' && !promotion.categoryIds.length) return false;
    return true;
  });
  const eligibleSubtotal = eligibleLines.reduce((s, l) => s + l.effectivePrice * l.quantity, 0);

  if (promotion.type === 'PERCENTAGE') {
    const rate = (promotion.value?.toNumber() ?? 0) / 100;
    discount = Math.round(eligibleSubtotal * rate * 100) / 100;
    if (promotion.minimumQuantity) {
      const totalQty = eligibleLines.reduce((s, l) => s + l.quantity, 0);
      if (totalQty < promotion.minimumQuantity) discount = 0;
    }
  } else if (promotion.type === 'FIXED_AMOUNT') {
    discount = Math.min(eligibleSubtotal, promotion.value?.toNumber() ?? 0);
  } else if (promotion.type === 'FREE_SHIPPING') {
    freeShip = true;
  }

  // never discount below zero and never more than subtotal
  discount = Math.min(discount, subtotal);

  const snapshot = {
    promotionId: promotion.id,
    code,
    name: promotion.name,
    type: promotion.type,
    discount,
    freeShip,
  };

  return { discount, freeShip, snapshot };
}

export async function calculateShipping(params: {
  shippingMethodId: string;
  country: string;
  subtotal: number;
  weightGrams: number | null;
  freeShippingApplied: boolean;
}) {
  const { shippingMethodId, country, subtotal, freeShippingApplied } = params;
  if (freeShippingApplied) return 0;

  const method = await prisma.shippingMethod.findUnique({
    where: { id: shippingMethodId },
    include: { zone: true },
  });
  if (!method || !method.isActive) throw new ApiError(400, 'INVALID_SHIPPING', 'Invalid shipping method');
  if (!method.zone.countries.includes(country)) {
    throw new ApiError(400, 'SHIPPING_UNAVAILABLE', 'Shipping is not available for this country');
  }
  if (method.minOrderAmount && subtotal < method.minOrderAmount.toNumber()) {
    throw new ApiError(400, 'SHIPPING_MINIMUM', `Minimum order of ${method.minOrderAmount} for this shipping method`);
  }

  if (method.type === 'FREE_SHIPPING') return 0;
  if (method.type === 'FLAT_RATE') {
    if (method.minOrderAmount && subtotal >= method.minOrderAmount.toNumber()) return 0;
    return method.price?.toNumber() ?? 0;
  }
  if (method.type === 'PRICE_BASED' || method.type === 'WEIGHT_BASED') {
    return method.price?.toNumber() ?? 0;
  }
  return method.price?.toNumber() ?? 0;
}

export async function taxRateFor(country: string): Promise<number> {
  const rule = await prisma.taxRule.findFirst({
    where: { country },
    orderBy: { region: 'asc' },
  });
  if (rule) return rule.rate.toNumber();
  const def = await prisma.taxRule.findFirst({ where: { isDefault: true } });
  return def ? def.rate.toNumber() : 0;
}
