import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { idSchema } from '@commerce/validation';
import { productListQuerySchema, productCreateSchema, productUpdateSchema } from '@commerce/validation';
import * as ctrl from './products.controller';

export const productsRouter = Router();
export const adminProductsRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

productsRouter.get('/', validateQuery(productListQuerySchema), ctrl.list);
productsRouter.get('/:slug', ctrl.getBySlug);
productsRouter.get('/:id/related', validateParams(z.object({ id: idSchema })), ctrl.related);

adminProductsRouter.use(requireAuth);
adminProductsRouter.get('/', requirePermission('product.read'), ctrl.adminList);
adminProductsRouter.get('/export', requirePermission('product.read'), ctrl.exportCsv);
adminProductsRouter.post('/import', requirePermission('product.create'), upload.single('file'), ctrl.importCsv);
adminProductsRouter.get('/:id', requirePermission('product.read'), validateParams(z.object({ id: idSchema })), ctrl.adminDetail);
adminProductsRouter.post('/', requirePermission('product.create'), validateBody(productCreateSchema), ctrl.create);
adminProductsRouter.patch(
  '/:id',
  requirePermission('product.update'),
  validateParams(z.object({ id: idSchema })),
  validateBody(productUpdateSchema),
  ctrl.update,
);
adminProductsRouter.post('/:id/duplicate', requirePermission('product.create'), validateParams(z.object({ id: idSchema })), ctrl.duplicate);
adminProductsRouter.delete(
  '/:id',
  requirePermission('product.delete'),
  validateParams(z.object({ id: idSchema })),
  ctrl.remove,
);
