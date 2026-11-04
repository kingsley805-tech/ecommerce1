import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { idSchema } from '@commerce/validation';
import * as ctrl from './shipping.controller';

export const shippingRouter = Router();
export const adminShippingRouter = Router();

shippingRouter.get('/methods', ctrl.methodsForCountry);

const zoneSchema = z.object({
  name: z.string().trim().min(1).max(120),
  countries: z.array(z.string().length(2)).default([]),
  regions: z.array(z.string()).default([]),
});

const methodSchema = z.object({
  zoneId: idSchema,
  name: z.string().trim().min(1).max(120),
  type: z.enum(['FLAT_RATE', 'FREE_SHIPPING', 'WEIGHT_BASED', 'PRICE_BASED']),
  price: z.coerce.number().nonnegative().optional(),
  minWeightGrams: z.coerce.number().int().min(0).optional(),
  maxWeightGrams: z.coerce.number().int().min(0).optional(),
  minOrderAmount: z.coerce.number().nonnegative().optional(),
  estimatedMinDays: z.coerce.number().int().min(0).optional(),
  estimatedMaxDays: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

adminShippingRouter.use(requireAuth);
adminShippingRouter.get('/zones', requirePermission('settings.manage'), ctrl.listZones);
adminShippingRouter.post('/zones', requirePermission('settings.manage'), validateBody(zoneSchema), ctrl.createZone);
adminShippingRouter.patch('/zones/:id', requirePermission('settings.manage'), validateParams(z.object({ id: idSchema })), validateBody(zoneSchema), ctrl.updateZone);
adminShippingRouter.delete('/zones/:id', requirePermission('settings.manage'), validateParams(z.object({ id: idSchema })), ctrl.deleteZone);
adminShippingRouter.post('/methods', requirePermission('settings.manage'), validateBody(methodSchema), ctrl.createMethod);
adminShippingRouter.patch('/methods/:id', requirePermission('settings.manage'), validateParams(z.object({ id: idSchema })), validateBody(methodSchema), ctrl.updateMethod);
adminShippingRouter.delete('/methods/:id', requirePermission('settings.manage'), validateParams(z.object({ id: idSchema })), ctrl.deleteMethod);
