import { z } from 'zod';

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().max(120).optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  inStock: z.enum(['true', 'false']).optional(),
  onSale: z.enum(['true', 'false']).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  sortBy: z
    .enum(['newest', 'popularity', 'price_asc', 'price_desc', 'rating', 'name'])
    .optional(),
  view: z.enum(['grid', 'list']).optional(),
  attributes: z.string().optional(),
  variants: z.string().optional(),
  slug: z.string().optional(),
});

export const reviewCreateSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(10).max(5000),
});

export const reviewReportSchema = z.object({
  reviewId: z.string().uuid(),
  reason: z.string().trim().min(1).max(500),
});

export const addToWishlistSchema = z.object({
  productId: z.string().uuid(),
});

export const reviewModerationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  moderationNote: z.string().trim().max(1000).optional(),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
