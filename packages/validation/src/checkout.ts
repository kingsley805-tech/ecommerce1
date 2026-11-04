import { z } from 'zod';
import { emailSchema, nameSchema, phoneSchema } from './common';

export const addressSchema = z.object({
  recipientName: nameSchema,
  phone: phoneSchema,
  email: emailSchema.optional(),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().min(2).max(2).toUpperCase(),
  deliveryInstructions: z.string().trim().max(500).optional(),
  isDefault: z.boolean().optional(),
});

export const customerInfoSchema = z.object({
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  isGuest: z.boolean().optional(),
});

export const deliveryInfoSchema = z.object({
  address: addressSchema,
  shippingMethodId: z.string().uuid(),
  saveAddress: z.boolean().optional(),
});

export const paymentInfoSchema = z.object({
  method: z.enum(['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']),
  provider: z.string().optional(),
  saveDetails: z.boolean().optional(),
  billingSameAsShipping: z.boolean().optional().default(true),
  billingAddress: addressSchema.optional(),
});

export const checkoutValidateSchema = z.object({
  customer: customerInfoSchema,
  delivery: deliveryInfoSchema.optional(),
  couponCode: z.string().trim().max(60).optional(),
});

export const checkoutSchema = z.object({
  customer: customerInfoSchema,
  delivery: deliveryInfoSchema,
  payment: paymentInfoSchema,
  couponCode: z.string().trim().max(60).optional(),
  orderNote: z.string().trim().max(1000).optional(),
  idempotencyKey: z.string().trim().min(8).max(100),
});

export const checkoutOrderSchema = z.object({
  orderId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutValidateInput = z.infer<typeof checkoutValidateSchema>;
export type CustomerInfoInput = z.infer<typeof customerInfoSchema>;

export const orderTrackSchema = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  email: emailSchema,
});
