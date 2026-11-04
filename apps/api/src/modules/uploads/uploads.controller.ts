import type { Request, Response } from 'express';
import { storage } from '../../integrations/storage';
import { ok } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { auditLog } from '../../lib/audit';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

export async function uploadImage(req: Request, res: Response) {
  const file = req.file;
  if (!file) throw ApiError.badRequest('No image file provided');
  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    throw ApiError.badRequest('Unsupported file type. Use JPEG, PNG, WebP, GIF or AVIF.');
  }
  const result = await storage.upload({
    buffer: file.buffer,
    contentType: file.mimetype,
    folder: 'products',
    filename: file.originalname,
  });
  await auditLog(req, { action: 'media.upload', entityType: 'media', entityId: result.key, after: { url: result.url } });
  return ok(res, result);
}
