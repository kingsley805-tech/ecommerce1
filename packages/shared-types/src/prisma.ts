/**
 * Shared enums and cross-domain shapes used by the API, storefront, and admin.
 * Mirrors the Prisma schema enums so clients do not depend on Prisma client types.
 */

/** Role identifiers (also rows in the `roles` table). */
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  STORE_MANAGER: 'STORE_MANAGER',
  PRODUCT_MANAGER: 'PRODUCT_MANAGER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  FULFILLMENT_STAFF: 'FULFILLMENT_STAFF',
  CUSTOMER_SUPPORT: 'CUSTOMER_SUPPORT',
  MARKETING_MANAGER: 'MARKETING_MANAGER',
  FINANCE_STAFF: 'FINANCE_STAFF',
  CUSTOMER: 'CUSTOMER',
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Order lifecycle status (business status; independent of payment/fulfillment). */
export const ORDER_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  REFUNDED: 'REFUNDED',
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const FULFILLMENT_STATUS = {
  UNFULFILLED: 'UNFULFILLED',
  PARTIALLY_FULFILLED: 'PARTIALLY_FULFILLED',
  FULFILLED: 'FULFILLED',
} as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUS)[keyof typeof FULFILLMENT_STATUS];

export const PAYMENT_METHOD = {
  CARD: 'CARD',
  MOBILE_MONEY: 'MOBILE_MONEY',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH_ON_DELIVERY: 'CASH_ON_DELIVERY',
} as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_PROVIDER = {
  STRIPE: 'STRIPE',
  PAYPAL: 'PAYPAL',
  PAYSTACK: 'PAYSTACK',
  FLUTTERWAVE: 'FLUTTERWAVE',
  MOBILE_MONEY: 'MOBILE_MONEY',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH_ON_DELIVERY: 'CASH_ON_DELIVERY',
} as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDER)[keyof typeof PAYMENT_PROVIDER];

export const PAYMENT_EVENT_STATUS = {
  INITIATED: 'INITIATED',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  FRAUD_REVIEW: 'FRAUD_REVIEW',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  REFUND_SUCCEEDED: 'REFUND_SUCCEEDED',
  REFUND_FAILED: 'REFUND_FAILED',
} as const;
export type PaymentEventStatus = (typeof PAYMENT_EVENT_STATUS)[keyof typeof PAYMENT_EVENT_STATUS];

export const REFUND_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type RefundStatus = (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS];

export const RETURN_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RECEIVED: 'RECEIVED',
  INSPECTED: 'INSPECTED',
  COMPLETED: 'COMPLETED',
} as const;
export type ReturnStatus = (typeof RETURN_STATUS)[keyof typeof RETURN_STATUS];

export const INVENTORY_MOVEMENT_TYPE = {
  RECEIPT: 'RECEIPT',
  ADJUSTMENT: 'ADJUSTMENT',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
  SALE: 'SALE',
  RETURN_TO_STOCK: 'RETURN_TO_STOCK',
  DAMAGED: 'DAMAGED',
  WRITTEN_OFF: 'WRITTEN_OFF',
  COUNT_ADJUSTMENT: 'COUNT_ADJUSTMENT',
} as const;
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPE)[keyof typeof INVENTORY_MOVEMENT_TYPE];

export const PRODUCT_TYPE = {
  SIMPLE: 'SIMPLE',
  VARIABLE: 'VARIABLE',
} as const;
export type ProductType = (typeof PRODUCT_TYPE)[keyof typeof PRODUCT_TYPE];

export const PRODUCT_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

export const PROMOTION_TYPE = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
  FREE_SHIPPING: 'FREE_SHIPPING',
} as const;
export type PromotionType = (typeof PROMOTION_TYPE)[keyof typeof PROMOTION_TYPE];

export const SHIPPING_METHOD_TYPE = {
  FLAT_RATE: 'FLAT_RATE',
  FREE_SHIPPING: 'FREE_SHIPPING',
  WEIGHT_BASED: 'WEIGHT_BASED',
  PRICE_BASED: 'PRICE_BASED',
} as const;
export type ShippingMethodType = (typeof SHIPPING_METHOD_TYPE)[keyof typeof SHIPPING_METHOD_TYPE];

export const REVIEW_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
} as const;
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const CART_STATUS = {
  ACTIVE: 'ACTIVE',
  CHECKED_OUT: 'CHECKED_OUT',
  ABANDONED: 'ABANDONED',
} as const;
export type CartStatus = (typeof CART_STATUS)[keyof typeof CART_STATUS];

export const NOTIFICATION_CHANNEL = {
  EMAIL: 'EMAIL',
  IN_APP: 'IN_APP',
  SMS: 'SMS',
} as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL];

export const PAGE_VISIBILITY = {
  VISIBLE: 'VISIBLE',
  HIDDEN: 'HIDDEN',
} as const;
export type PageVisibility = (typeof PAGE_VISIBILITY)[keyof typeof PAGE_VISIBILITY];

/** Product/category/visibility counterpart of PAGE_VISIBILITY. */
export const VISIBILITY = {
  VISIBLE: 'VISIBLE',
  HIDDEN: 'HIDDEN',
} as const;
export type Visibility = (typeof VISIBILITY)[keyof typeof VISIBILITY];

export const SECTION_TYPE = {
  HERO: 'HERO',
  BANNER: 'BANNER',
  CATEGORIES: 'CATEGORIES',
  BEST_SELLERS: 'BEST_SELLERS',
  NEW_ARRIVALS: 'NEW_ARRIVALS',
  FEATURED_COLLECTIONS: 'FEATURED_COLLECTIONS',
  PROMOTIONAL: 'PROMOTIONAL',
  TESTIMONIALS: 'TESTIMONIALS',
  NEWSLETTER: 'NEWSLETTER',
} as const;
export type SectionType = (typeof SECTION_TYPE)[keyof typeof SECTION_TYPE];
