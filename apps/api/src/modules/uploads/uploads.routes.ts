import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import * as ctrl from './uploads.controller';

export const uploadsRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

uploadsRouter.use(requireAuth);
uploadsRouter.post('/image', requirePermission('product.create'), upload.single('file'), ctrl.uploadImage);
