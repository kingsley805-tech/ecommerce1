import { Router } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { optionalAuth, csrfProtection } from '../../middleware/auth';
import { checkoutValidateSchema, checkoutSchema, orderTrackSchema } from '@commerce/validation';
import * as ctrl from './checkout.controller';

export const checkoutRouter = Router();

checkoutRouter.post('/validate', optionalAuth, validateBody(checkoutValidateSchema), ctrl.validate);
checkoutRouter.post('/', optionalAuth, csrfProtection, validateBody(checkoutSchema), ctrl.placeOrder);
checkoutRouter.get('/track', validateQuery(orderTrackSchema), ctrl.trackOrderGet);
