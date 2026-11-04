import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { idSchema, brandCreateSchema, brandUpdateSchema } from '@commerce/validation';
import * as ctrl from './brands.controller';

export const brandsRouter = Router();
export const adminBrandsRouter = Router();

brandsRouter.get('/', ctrl.listPublic);

adminBrandsRouter.use(requireAuth);
adminBrandsRouter.get('/', requirePermission('brand.read'), ctrl.listAdmin);
adminBrandsRouter.post('/', requirePermission('brand.create'), validateBody(brandCreateSchema), ctrl.create);
adminBrandsRouter.patch(
  '/:id',
  requirePermission('brand.update'),
  validateParams(z.object({ id: idSchema })),
  validateBody(brandUpdateSchema),
  ctrl.update,
);
adminBrandsRouter.delete(
  '/:id',
  requirePermission('brand.delete'),
  validateParams(z.object({ id: idSchema })),
  ctrl.remove,
);
