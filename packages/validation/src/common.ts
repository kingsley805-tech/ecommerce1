import { z } from 'zod';

export const idSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/** Required when sensitive actions are performed. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72)
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[0-9]/, 'Must contain a number');

export const emailSchema = z.string().email('Enter a valid email address').max(254).toLowerCase();

export const phoneSchema = z
  .string()
  .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Enter a valid phone number')
  .optional()
  .or(z.literal(''));

export const nameSchema = z.string().trim().min(1).max(120);

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens');

export const currencySchema = z.string().length(3).toUpperCase();

export const moneySchema = z.coerce.number().nonnegative().multipleOf(0.01);

export const positiveIntSchema = z.coerce.number().int().min(0);
