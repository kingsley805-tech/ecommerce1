import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { idSchema, reviewCreateSchema, reviewReportSchema, reviewModerationSchema } from '@commerce/validation';
import * as ctrl from './reviews.controller';

export const reviewsRouter = Router();
export const adminReviewsRouter = Router();

reviewsRouter.get('/product/:productId', validateParams(z.object({ productId: idSchema })), ctrl.listByProduct);
reviewsRouter.post('/', requireAuth, validateBody(reviewCreateSchema), ctrl.create);
reviewsRouter.post('/:id/report', requireAuth, validateParams(z.object({ id: idSchema })), validateBody(reviewReportSchema), ctrl.report);

adminReviewsRouter.use(requireAuth);
adminReviewsRouter.get('/', requirePermission('review.read'), ctrl.adminList);
adminReviewsRouter.get('/reports', requirePermission('review.read'), ctrl.adminReportList);
adminReviewsRouter.patch('/:id/moderate', requirePermission('review.moderate'), validateParams(z.object({ id: idSchema })), validateBody(reviewModerationSchema), ctrl.moderate);
