import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { idSchema } from '@commerce/validation';
import * as ctrl from './addresses.controller';

export const addressesRouter = Router();

const addressSchema = z.object({
  label: z.string().max(60).optional(),
  recipientName: z.string().trim().min(1).max(120),
  phone: z.string().max(30).optional().nullable(),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().trim().min(1).max(100),
  region: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().length(2).toUpperCase(),
  isDefault: z.boolean().optional(),
});

addressesRouter.use(requireAuth);
addressesRouter.get('/', ctrl.list);
addressesRouter.post('/', validateBody(addressSchema), ctrl.create);
addressesRouter.patch('/:id', validateParams(z.object({ id: idSchema })), validateBody(addressSchema.partial()), ctrl.update);
addressesRouter.delete('/:id', validateParams(z.object({ id: idSchema })), ctrl.remove);
