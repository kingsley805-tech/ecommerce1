import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';
import { ApiError } from '../lib/errors';

export function validateBody(schema: z.ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ApiError(422, 'VALIDATION_ERROR', 'Invalid request payload', result.error));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: z.ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(new ApiError(422, 'VALIDATION_ERROR', 'Invalid query parameters', result.error));
    }
    req.query = result.data as never;
    next();
  };
}

export function validateParams(schema: z.ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return next(new ApiError(422, 'VALIDATION_ERROR', 'Invalid path parameters', result.error));
    }
    req.params = result.data as never;
    next();
  };
}
