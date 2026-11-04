import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { idSchema } from '@commerce/validation';
import { contentPageUpsertSchema } from '@commerce/validation';
import * as ctrl from './content.controller';

export const contentRouter = Router();
export const adminContentRouter = Router();

contentRouter.get('/pages', ctrl.listPages);
contentRouter.get('/pages/:slug', ctrl.getPage);
contentRouter.get('/homepage', ctrl.getHomepage);
contentRouter.post('/newsletter/subscribe', ctrl.subscribeNewsletter);
contentRouter.post('/newsletter/unsubscribe', ctrl.unsubscribeNewsletter);

adminContentRouter.use(requireAuth);
adminContentRouter.get('/pages', requirePermission('content.read'), ctrl.adminListPages);
adminContentRouter.put('/pages', requirePermission('content.update'), validateBody(contentPageUpsertSchema), ctrl.upsertPage);
adminContentRouter.get('/sections', requirePermission('content.read'), ctrl.adminListSections);
adminContentRouter.post('/sections', requirePermission('content.update'), ctrl.createSection);
adminContentRouter.patch('/sections/:id', requirePermission('content.update'), validateParams(z.object({ id: idSchema })), ctrl.updateSection);
adminContentRouter.delete('/sections/:id', requirePermission('content.update'), validateParams(z.object({ id: idSchema })), ctrl.deleteSection);
adminContentRouter.get('/testimonials', requirePermission('content.read'), ctrl.listTestimonialsAdmin);
adminContentRouter.post('/testimonials', requirePermission('content.update'), ctrl.createTestimonial);
adminContentRouter.patch('/testimonials/:id', requirePermission('content.update'), validateParams(z.object({ id: idSchema })), ctrl.updateTestimonial);
adminContentRouter.delete('/testimonials/:id', requirePermission('content.update'), validateParams(z.object({ id: idSchema })), ctrl.deleteTestimonial);
adminContentRouter.get('/newsletter', requirePermission('marketing.read'), ctrl.listNewsletterSubscriptions);
