import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { idSchema } from '@commerce/validation';
import * as ctrl from './promotions.controller';

export const adminPromotionsRouter = Router();

const promotionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().max(60).optional().nullable(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
  value: z.coerce.number().nonnegative().optional().nullable(),
  appliesTo: z.enum(['ALL', 'PRODUCTS', 'CATEGORIES', 'CUSTOMER_GROUPS', 'FIRST_ORDER']).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
  minimumOrderAmount: z.coerce.number().nonnegative().optional().nullable(),
  minimumQuantity: z.coerce.number().int().min(0).optional().nullable(),
  maxRedemptions: z.coerce.number().int().min(0).optional().nullable(),
  perCustomerLimit: z.coerce.number().int().min(0).optional().nullable(),
  stackable: z.boolean().optional(),
  freeShipping: z.boolean().optional(),
  productIds: z.array(idSchema).optional(),
  categoryIds: z.array(idSchema).optional(),
  excludedProductIds: z.array(idSchema).optional(),
  customerGroupIds: z.array(idSchema).optional(),
});

adminPromotionsRouter.use(requireAuth);
adminPromotionsRouter.get('/', requirePermission('promotion.manage'), ctrl.list);
adminPromotionsRouter.post('/', requirePermission('promotion.manage'), validateBody(promotionSchema), ctrl.create);
adminPromotionsRouter.patch('/:id', requirePermission('promotion.manage'), validateParams(z.object({ id: idSchema })), validateBody(promotionSchema.partial()), ctrl.update);
adminPromotionsRouter.patch('/:id/toggle', requirePermission('promotion.manage'), validateParams(z.object({ id: idSchema })), validateBody(z.object({ isActive: z.boolean() })), ctrl.toggle);
adminPromotionsRouter.delete('/:id', requirePermission('promotion.manage'), validateParams(z.object({ id: idSchema })), ctrl.remove);
