import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { addToWishlistSchema } from '@commerce/validation';
import * as ctrl from './wishlist.controller';

export const wishlistRouter = Router();

wishlistRouter.use(requireAuth);
wishlistRouter.get('/', ctrl.get);
wishlistRouter.post('/', validateBody(addToWishlistSchema), ctrl.add);
wishlistRouter.delete('/:id', ctrl.remove);
