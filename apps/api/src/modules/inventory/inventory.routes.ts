import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { idSchema } from '@commerce/validation';
import * as ctrl from './inventory.controller';

export const inventoryRouter = Router();

const adjustSchema = z.object({
  productId: idSchema,
  variantId: idSchema.nullable().optional(),
  locationId: idSchema.optional(),
  quantityChange: z.number().int().min(1).or(z.number().int().max(-1)),
  type: z.enum([
    'RECEIPT',
    'ADJUSTMENT',
    'RETURN_TO_STOCK',
    'DAMAGED',
    'WRITTEN_OFF',
    'COUNT_ADJUSTMENT',
  ]),
  reason: z.string().trim().min(1).max(500),
  reference: z.string().trim().max(120).optional(),
});

const transferSchema = z.object({
  productId: idSchema,
  variantId: idSchema.nullable().optional(),
  quantity: z.number().int().min(1),
  fromLocationId: idSchema,
  toLocationId: idSchema,
  reference: z.string().trim().max(120).optional(),
});

const locationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(60),
  isDefault: z.boolean().optional(),
});

const stockCountSchema = z.object({
  items: z
    .array(
      z.object({
        productId: idSchema,
        variantId: idSchema.nullable().optional(),
        countedQuantity: z.number().int().min(0),
      }),
    )
    .min(1),
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().max(120).optional(),
  lowStock: z.enum(['true', 'false']).optional(),
  outOfStock: z.enum(['true', 'false']).optional(),
});

inventoryRouter.use(requireAuth);
inventoryRouter.get('/', requirePermission('inventory.read'), validateQuery(listQuery), ctrl.list);
inventoryRouter.get('/movements', requirePermission('inventory.read'), ctrl.movements);
inventoryRouter.get('/locations', requirePermission('inventory.read'), ctrl.locations);
inventoryRouter.post('/locations', requirePermission('inventory.update'), validateBody(locationSchema), ctrl.createLocation);
inventoryRouter.post('/adjustments', requirePermission('inventory.update'), validateBody(adjustSchema), ctrl.adjust);
inventoryRouter.post('/transfers', requirePermission('inventory.update'), validateBody(transferSchema), ctrl.transfer);
inventoryRouter.post('/stock-counts', requirePermission('inventory.update'), validateBody(stockCountSchema), ctrl.stockCount);

export const adminInventoryRouter = inventoryRouter;
