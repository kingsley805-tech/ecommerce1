import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  promotion: { findUnique: vi.fn() },
  promotionRedemption: { count: vi.fn() },
  order: { count: vi.fn() },
  shippingMethod: { findUnique: vi.fn() },
  taxRule: { findFirst: vi.fn() },
}));

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));

import { calculateCouponDiscount, calculateShipping, taxRateFor } from './pricing';
import { ApiError } from '../../lib/errors';

function decimal(n: number) {
  return { toNumber: () => n } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.promotionRedemption.count.mockResolvedValue(0);
});

describe('calculateCouponDiscount', () => {
  it('applies a percentage discount to eligible subtotal', async () => {
    mockPrisma.promotion.findUnique.mockResolvedValue({
      id: 'p1', isActive: true, code: 'SAVE10', type: 'PERCENTAGE',
      value: decimal(10), appliesTo: 'ALL', startsAt: new Date(Date.now() - 1000), endsAt: null,
      minimumOrderAmount: null, maximumQuantity: null, maxRedemptions: null, perCustomerLimit: null,
      excludedProductIds: [], productIds: [], categoryIds: [], customerGroupIds: [],
    });

    const result = await calculateCouponDiscount({
      code: 'SAVE10', subtotal: 1000,
      lines: [{ productId: 'a', effectivePrice: 500, quantity: 2 }],
    });
    expect(result.discount).toBe(100);
    expect(result.freeShip).toBe(false);
  });

  it('caps fixed discount at eligible subtotal', async () => {
    mockPrisma.promotion.findUnique.mockResolvedValue({
      id: 'p2', isActive: true, code: 'OFF200', type: 'FIXED_AMOUNT',
      value: decimal(200), appliesTo: 'ALL', startsAt: new Date(Date.now() - 1000), endsAt: null,
      minimumOrderAmount: null, maxRedemptions: null, perCustomerLimit: null,
      excludedProductIds: [], productIds: [], categoryIds: [], customerGroupIds: [],
    });
    const result = await calculateCouponDiscount({
      code: 'OFF200', subtotal: 150,
      lines: [{ productId: 'a', effectivePrice: 150, quantity: 1 }],
    });
    expect(result.discount).toBe(150);
  });

  it('flags free shipping promotions', async () => {
    mockPrisma.promotion.findUnique.mockResolvedValue({
      id: 'p3', isActive: true, code: 'SHIPFREE', type: 'FREE_SHIPPING',
      value: null, appliesTo: 'ALL', startsAt: new Date(Date.now() - 1000), endsAt: null,
      minimumOrderAmount: null, maxRedemptions: null, perCustomerLimit: null,
      excludedProductIds: [], productIds: [], categoryIds: [], customerGroupIds: [],
    });
    const result = await calculateCouponDiscount({
      code: 'SHIPFREE', subtotal: 500,
      lines: [{ productId: 'a', effectivePrice: 500, quantity: 1 }],
    });
    expect(result.freeShip).toBe(true);
    expect(result.discount).toBe(0);
  });

  it('rejects expired coupons', async () => {
    mockPrisma.promotion.findUnique.mockResolvedValue({
      id: 'p4', isActive: true, code: 'OLD', type: 'PERCENTAGE',
      value: decimal(10), appliesTo: 'ALL',
      startsAt: new Date(Date.now() - 1_000_000), endsAt: new Date(Date.now() - 1000),
      minimumOrderAmount: null, maxRedemptions: null, perCustomerLimit: null,
      excludedProductIds: [], productIds: [], categoryIds: [], customerGroupIds: [],
    });
    await expect(calculateCouponDiscount({
      code: 'OLD', subtotal: 100,
      lines: [{ productId: 'a', effectivePrice: 100, quantity: 1 }],
    })).rejects.toBeInstanceOf(ApiError);
  });

  it('enforces minimum order amount', async () => {
    mockPrisma.promotion.findUnique.mockResolvedValue({
      id: 'p5', isActive: true, code: 'MIN500', type: 'PERCENTAGE',
      value: decimal(10), appliesTo: 'ALL',
      startsAt: new Date(Date.now() - 1000), endsAt: null, minimumOrderAmount: decimal(500),
      maxRedemptions: null, perCustomerLimit: null,
      excludedProductIds: [], productIds: [], categoryIds: [], customerGroupIds: [],
    });
    await expect(calculateCouponDiscount({
      code: 'MIN500', subtotal: 200,
      lines: [{ productId: 'a', effectivePrice: 200, quantity: 1 }],
    })).rejects.toBeInstanceOf(ApiError);
  });

  it('enforces per-customer usage limit', async () => {
    mockPrisma.promotion.findUnique.mockResolvedValue({
      id: 'p6', isActive: true, code: 'ONECE', type: 'PERCENTAGE',
      value: decimal(10), appliesTo: 'ALL',
      startsAt: new Date(Date.now() - 1000), endsAt: null, minimumOrderAmount: null,
      maxRedemptions: null, perCustomerLimit: 1,
      excludedProductIds: [], productIds: [], categoryIds: [], customerGroupIds: [],
    });
    mockPrisma.promotionRedemption.count.mockResolvedValue(1);
    await expect(calculateCouponDiscount({
      code: 'ONECE', subtotal: 200, customerId: 'c1',
      lines: [{ productId: 'a', effectivePrice: 200, quantity: 1 }],
    })).rejects.toBeInstanceOf(ApiError);
  });
});

describe('calculateShipping', () => {
  it('returns 0 when free shipping is applied', async () => {
    const total = await calculateShipping({ shippingMethodId: 'm', country: 'GH', subtotal: 100, weightGrams: null, freeShippingApplied: true });
    expect(total).toBe(0);
  });

  it('charges flat rate within zone', async () => {
    mockPrisma.shippingMethod.findUnique.mockResolvedValue({
      id: 'm', isActive: true, type: 'FLAT_RATE', price: decimal(30), minOrderAmount: null,
      zone: { countries: ['GH'] },
    });
    const total = await calculateShipping({ shippingMethodId: 'm', country: 'GH', subtotal: 100, weightGrams: null, freeShippingApplied: false });
    expect(total).toBe(30);
  });

  it('rejects shipping outside the zone', async () => {
    mockPrisma.shippingMethod.findUnique.mockResolvedValue({
      id: 'm', isActive: true, type: 'FLAT_RATE', price: decimal(30), minOrderAmount: null,
      zone: { countries: ['GH'] },
    });
    await expect(calculateShipping({ shippingMethodId: 'm', country: 'US', subtotal: 100, weightGrams: null, freeShippingApplied: false }))
      .rejects.toBeInstanceOf(ApiError);
  });
});

describe('taxRateFor', () => {
  it('uses the country-specific rule', async () => {
    mockPrisma.taxRule.findFirst.mockResolvedValueOnce({ rate: decimal(0.15) });
    const rate = await taxRateFor('GH');
    expect(rate).toBe(0.15);
  });

  it('falls back to default when no country rule exists', async () => {
    mockPrisma.taxRule.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ rate: decimal(0.1) });
    const rate = await taxRateFor('XX');
    expect(rate).toBe(0.1);
  });
});
