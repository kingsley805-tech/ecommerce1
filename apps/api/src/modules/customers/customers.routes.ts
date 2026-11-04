import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { idSchema } from '@commerce/validation';
import * as ctrl from './customers.controller';

export const adminCustomersRouter = Router();

const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().max(120).optional(),
  status: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  note: z.string().max(2000).optional(),
});

adminCustomersRouter.use(requireAuth);
adminCustomersRouter.get('/', requirePermission('customer.read'), validateQuery(listQuery), ctrl.list);
adminCustomersRouter.get('/export', requirePermission('customer.export'), ctrl.exportCsv);
adminCustomersRouter.get('/:id', requirePermission('customer.read'), validateParams(z.object({ id: idSchema })), ctrl.detail);
adminCustomersRouter.patch('/:id', requirePermission('customer.update'), validateParams(z.object({ id: idSchema })), validateBody(updateSchema), ctrl.update);
