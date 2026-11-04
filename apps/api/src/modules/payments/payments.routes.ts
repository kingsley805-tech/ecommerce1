import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../../middleware/validate';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { idSchema } from '@commerce/validation';
import * as ctrl from './payments.controller';

export const paymentsRouter = Router();
export const adminPaymentsRouter = Router();
export const webhooksRouter = Router();

const initSchema = z.object({
  orderId: idSchema,
  method: z.enum(['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']),
  provider: z.string().optional(),
  returnUrl: z.string().url().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

paymentsRouter.use(optionalAuth);
paymentsRouter.post('/initialize', validateBody(initSchema), ctrl.initialize);
paymentsRouter.get('/:reference', ctrl.getByReference);

adminPaymentsRouter.use(requireAuth);
adminPaymentsRouter.get('/', requirePermission('payment.read'), ctrl.listAdmin);
// paymentsRouter.post('/:id/refund' handled in refunds module)

webhooksRouter.post('/:provider', ctrl.webhook);
