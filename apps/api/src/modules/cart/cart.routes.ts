import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '../../middleware/validate';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { idSchema } from '@commerce/validation';
import { addCartItemSchema, updateCartItemSchema, applyCouponSchema } from '@commerce/validation';
import * as ctrl from './cart.controller';

export const cartRouter = Router();

cartRouter.use(optionalAuth);
cartRouter.get('/', ctrl.get);
cartRouter.post('/items', validateBody(addCartItemSchema), ctrl.addItem);
cartRouter.patch('/items/:id', validateParams(z.object({ id: idSchema })), validateBody(updateCartItemSchema), ctrl.updateItem);
cartRouter.delete('/items/:id', validateParams(z.object({ id: idSchema })), ctrl.removeItem);
cartRouter.delete('/', ctrl.clear);
cartRouter.post('/coupon', validateBody(applyCouponSchema), ctrl.applyCoupon);
cartRouter.post('/merge', requireAuth, ctrl.mergeGuest);
