import { z } from 'zod';
import { slugSchema, moneySchema, positiveIntSchema, emailSchema, nameSchema } from './common';

export const productVariantSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().trim().min(1).max(60),
  barcode: z.string().trim().max(60).optional(),
  name: z.string().trim().max(120).optional(),
  attributes: z.record(z.string(), z.string()).default({}),
  price: moneySchema,
  compareAtPrice: moneySchema.nullable().optional(),
  costPrice: moneySchema.nullable().optional(),
  stock: positiveIntSchema,
  lowStockThreshold: positiveIntSchema.nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: slugSchema.nullable().optional(),
  description: z.string().trim().max(10000).optional().default(''),
  shortDescription: z.string().trim().max(500).optional(),
  type: z.enum(['SIMPLE', 'VARIABLE']).default('SIMPLE'),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  visibility: z.enum(['VISIBLE', 'HIDDEN']).default('VISIBLE'),
  sku: z.string().trim().min(1).max(60),
  barcode: z.string().trim().max(60).optional(),
  price: moneySchema,
  compareAtPrice: moneySchema.nullable().optional(),
  costPrice: moneySchema.nullable().optional(),
  stock: positiveIntSchema.optional(),
  lowStockThreshold: positiveIntSchema.nullable().optional(),
  weightGrams: positiveIntSchema.nullable().optional(),
  categoryIds: z.array(z.string().uuid()).default([]),
  brandId: z.string().uuid().nullable().optional(),
  tagIds: z.array(z.string().uuid()).default([]),
  featured: z.boolean().optional(),
  salePrice: moneySchema.nullable().optional(),
  saleStartAt: z.string().datetime().nullable().optional(),
  saleEndAt: z.string().datetime().nullable().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  images: z
    .array(
      z.object({
        url: z.string().trim().min(1).max(2000),
        alt: z.string().max(200).optional(),
        position: z.number().int().min(0).optional(),
      }),
    )
    .default([]),
  variants: z
    .array(
      z.object({
        sku: z.string().trim().min(1).max(60),
        barcode: z.string().trim().max(60).optional(),
        name: z.string().trim().max(120).optional(),
        attributes: z.record(z.string(), z.string()).default({}),
        price: moneySchema.optional(),
        compareAtPrice: moneySchema.nullable().optional(),
        costPrice: moneySchema.nullable().optional(),
        stock: positiveIntSchema.optional(),
        imageUrl: z.string().trim().min(1).max(2000).nullable().optional(),
      }),
    )
    .optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(400).optional(),
});

export const productUpdateSchema = productCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
  description: z.string().max(1000).optional(),
  parentId: z.string().uuid().nullable().optional(),
  imageUrl: z.preprocess((v) => (v === '' ? null : v), z.string().url().nullable().optional()),
  displayOrder: z.number().int().optional(),
  visibility: z.enum(['VISIBLE', 'HIDDEN']).default('VISIBLE'),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(400).optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const brandCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().nullable().optional(),
  featured: z.boolean().optional(),
});

export const brandUpdateSchema = brandCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const inventoryAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantityChange: z.number().int().min(-999999).max(999999),
  reason: z.string().trim().min(1).max(500),
  reference: z.string().trim().max(100).optional(),
  type: z
    .enum(['ADJUSTMENT', 'RECEIPT', 'RETURN_TO_STOCK', 'DAMAGED', 'WRITTEN_OFF', 'COUNT_ADJUSTMENT'])
    .default('ADJUSTMENT'),
  locationId: z.string().uuid().optional(),
});

export const stockCountSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().nullable().optional(),
    countedQuantity: z.number().int().min(0),
  })),
  locationId: z.string().uuid().optional(),
});

export const transferSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: positiveIntSchema,
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
});

export const promotionCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().max(60).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
  value: moneySchema.optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
  appliesTo: z.enum(['ALL', 'PRODUCTS', 'CATEGORIES', 'CUSTOMER_GROUPS', 'FIRST_ORDER']).default('ALL'),
  productIds: z.array(z.string().uuid()).default([]),
  categoryIds: z.array(z.string().uuid()).default([]),
  excludedProductIds: z.array(z.string().uuid()).default([]),
  minimumOrderAmount: moneySchema.nullable().optional(),
  minimumQuantity: positiveIntSchema.nullable().optional(),
  maxRedemptions: positiveIntSchema.nullable().optional(),
  perCustomerLimit: positiveIntSchema.nullable().optional(),
  customerGroupIds: z.array(z.string().uuid()).default([]),
  stackable: z.boolean().optional(),
  freeShipping: z.boolean().optional(),
});

export const promotionUpdateSchema = promotionCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const shippingZoneCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  countries: z.array(z.string().length(2)).default([]),
  regions: z.array(z.string()).default([]),
});

export const shippingMethodCreateSchema = z.object({
  zoneId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  type: z.enum(['FLAT_RATE', 'FREE_SHIPPING', 'WEIGHT_BASED', 'PRICE_BASED']),
  price: moneySchema.optional(),
  minWeightGrams: positiveIntSchema.nullable().optional(),
  maxWeightGrams: positiveIntSchema.nullable().optional(),
  minOrderAmount: moneySchema.nullable().optional(),
  estimatedMinDays: positiveIntSchema.optional(),
  estimatedMaxDays: positiveIntSchema.optional(),
  isActive: z.boolean().optional(),
});

export const taxRuleSchema = z.object({
  country: z.string().length(2),
  rate: z.coerce.number().min(0).max(1),
  name: z.string().trim().min(1).max(120),
});

export const returnDecisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'RECEIVED', 'INSPECTED']),
  note: z.string().trim().max(1000).optional(),
  restock: z.boolean().optional(),
  refundAmount: moneySchema.optional(),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum([
    'PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED',
    'CANCELLED', 'RETURNED', 'PARTIALLY_REFUNDED', 'REFUNDED',
  ]),
  note: z.string().trim().max(1000).optional(),
});

export const shipmentCreateSchema = z.object({
  orderId: z.string().uuid(),
  carrier: z.string().trim().min(1).max(120),
  trackingNumber: z.string().trim().min(1).max(120),
  trackingUrl: z.string().url().optional(),
  shippedAt: z.string().datetime().optional(),
});

export const refundSchema = z.object({
  orderId: z.string().uuid(),
  amount: moneySchema,
  reason: z.string().trim().min(1).max(1000),
  restock: z.boolean().optional(),
  refundTo: z.string().optional(),
});

export const customerUpdateSchema = z.object({
  email: emailSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: z.string().optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  note: z.string().max(2000).optional(),
  groupIds: z.array(z.string().uuid()).optional(),
});

export const settingsUpdateSchema = z.record(z.string(), z.unknown());

export const contentPageUpsertSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  body: z.string(),
  visibility: z.enum(['VISIBLE', 'HIDDEN']).optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(400).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export const roleUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;
export type PromotionCreateInput = z.infer<typeof promotionCreateSchema>;
