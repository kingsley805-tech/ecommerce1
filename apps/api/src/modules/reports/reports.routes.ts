import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import * as ctrl from './reports.controller';

export const adminReportsRouter = Router();

adminReportsRouter.use(requireAuth);
adminReportsRouter.get('/sales', requirePermission('report.read'), ctrl.salesReport);
