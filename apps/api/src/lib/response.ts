import type { Response } from 'express';
import type { PaginationMeta } from '@commerce/shared-types';

export function ok<T>(
  res: Response,
  data: T,
  meta?: PaginationMeta,
  statusCode = 200,
) {
  const body: Record<string, unknown> = { success: true, data };
  if (meta) body.meta = meta;
  const requestId = res.req.headers['x-request-id'];
  if (requestId) body.requestId = requestId;
  return res.status(statusCode).json(body);
}

export function created<T>(res: Response, data: T) {
  return ok(res, data, undefined, 201);
}
