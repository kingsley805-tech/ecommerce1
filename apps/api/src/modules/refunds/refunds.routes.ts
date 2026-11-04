import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { idSchema } from '@commerce/validation';
import * as ctrl from './refunds.controller';

export const adminRefundsRouter = Router();

adminRefundsRouter.use(requireAuth);
adminRefundsRouter.get('/', requirePermission('refund.read'), ctrl.listAdmin);
adminRefundsRouter.post('/:id/approve', requirePermission('refund.process'), validateParams(z.object({ id: idSchema })), ctrl.approveRefund);
adminRefundsRouter.post('/:id/reject', requirePermission('refund.process'), validateParams(z.object({ id: idSchema })), validateBody(z.object({ reason: z.string().optional() })), ctrl.rejectRefund);
adminRefundsRouter.post('/:id/process', requirePermission('refund.process'), validateParams(z.object({ id: idSchema })), ctrl.processRefund);
