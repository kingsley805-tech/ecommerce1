import { Router } from 'express';
import { validateBody, validateParams } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { idSchema } from '@commerce/validation';
import { categoryCreateSchema, categoryUpdateSchema } from '@commerce/validation';
import * as ctrl from './categories.controller';
import { z } from 'zod';

export const categoriesRouter = Router();
export const adminCategoriesRouter = Router();

categoriesRouter.get('/', ctrl.listPublic);
categoriesRouter.get('/:slug', ctrl.getBySlug);

adminCategoriesRouter.use(requireAuth);
adminCategoriesRouter.get('/', requirePermission('category.read'), ctrl.listAdmin);
adminCategoriesRouter.post(
  '/',
  requirePermission('category.create'),
  validateBody(categoryCreateSchema),
  ctrl.create,
);
adminCategoriesRouter.patch(
  '/:id',
  requirePermission('category.update'),
  validateParams(z.object({ id: idSchema })),
  validateBody(categoryUpdateSchema),
  ctrl.update,
);
adminCategoriesRouter.delete(
  '/:id',
  requirePermission('category.delete'),
  validateParams(z.object({ id: idSchema })),
  ctrl.remove,
);
