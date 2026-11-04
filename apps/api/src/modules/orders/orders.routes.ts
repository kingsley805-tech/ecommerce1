import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { idSchema } from '@commerce/validation';
import { orderStatusUpdateSchema, shipmentCreateSchema } from '@commerce/validation';
import * as ctrl from './orders.controller';

export const ordersRouter = Router();
export const adminOrdersRouter = Router();

const adminListQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().max(120).optional(),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
});

ordersRouter.use(requireAuth);
ordersRouter.get('/', validateQuery(z.object({ page: z.coerce.number().optional(), pageSize: z.coerce.number().optional() })), ctrl.myOrders);
ordersRouter.get('/:id', validateParams(z.object({ id: idSchema })), ctrl.myOrderDetail);

adminOrdersRouter.use(requireAuth);
adminOrdersRouter.get('/', requirePermission('order.read'), validateQuery(adminListQuery), ctrl.adminList);
adminOrdersRouter.get('/:id', requirePermission('order.read'), validateParams(z.object({ id: idSchema })), ctrl.adminDetail);
adminOrdersRouter.patch('/:id/status', requirePermission('order.update'), validateParams(z.object({ id: idSchema })), validateBody(orderStatusUpdateSchema), ctrl.updateStatus);
adminOrdersRouter.post('/:id/notes', requirePermission('order.update'), validateParams(z.object({ id: idSchema })), validateBody(z.object({ note: z.string().max(1000) })), ctrl.addNote);
adminOrdersRouter.post('/:id/cancel', requirePermission('order.update'), validateParams(z.object({ id: idSchema })), ctrl.cancelOrder);
adminOrdersRouter.post('/shipments', requirePermission('order.update'), validateBody(shipmentCreateSchema), ctrl.createShipment);
