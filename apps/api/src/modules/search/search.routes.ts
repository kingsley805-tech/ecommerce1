import { Router } from 'express';
import { z } from 'zod';
import { validateQuery } from '../../middleware/validate';
import * as ctrl from './search.controller';

export const searchRouter = Router();

searchRouter.get(
  '/suggest',
  validateQuery(z.object({ q: z.string().max(120).optional() })),
  ctrl.suggest,
);
