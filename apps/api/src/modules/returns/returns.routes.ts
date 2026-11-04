import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { idSchema } from '@commerce/validation';
import * as ctrl from './returns.controller';

export const returnsRouter = Router();
export const adminReturnsRouter = Router();

const returnRequestSchema = z.object({
  orderId: idSchema,
  reason: z.string().trim().min(5).max(500),
  items: z.array(z.object({ orderItemId: idSchema, quantity: z.number().int().min(1) })).min(1),
});

const returnDecisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'RECEIVED', 'INSPECTED', 'COMPLETED']),
  note: z.string().max(1000).optional(),
  restock: z.boolean().optional(),
  refundAmount: z.number().nonnegative().optional(),
});

returnsRouter.use(requireAuth);
returnsRouter.get('/', ctrl.myReturns);
returnsRouter.post('/', validateBody(returnRequestSchema), ctrl.requestReturn);

adminReturnsRouter.use(requireAuth);
adminReturnsRouter.get('/', requirePermission('refund.read'), ctrl.adminList);
adminReturnsRouter.patch('/:id/decide', requirePermission('refund.process'), validateParams(z.object({ id: idSchema })), validateBody(returnDecisionSchema), ctrl.decide);
