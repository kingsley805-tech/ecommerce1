import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import * as ctrl from './settings.controller';

export const adminSettingsRouter = Router();

const updateSchema = z.object({
  key: z.string().min(1).max(120),
  value: z.unknown(),
});

adminSettingsRouter.use(requireAuth);
adminSettingsRouter.get('/', requirePermission('settings.manage'), ctrl.get);
adminSettingsRouter.put('/', requirePermission('settings.manage'), validateBody(updateSchema), ctrl.update);
