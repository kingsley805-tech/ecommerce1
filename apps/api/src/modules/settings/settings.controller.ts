import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { auditLog } from '../../lib/audit';

export async function get(req: Request, res: Response) {
  const key = (req.query.key as string) ?? 'store';
  const row = await prisma.storeSetting.findUnique({ where: { key } });
  return ok(res, row?.value ?? null);
}

export async function update(req: Request, res: Response) {
  const key = (req.body.key as string) ?? 'store';
  const value = req.body.value;
  if (value === undefined) throw ApiError.badRequest('value is required');
  const row = await prisma.storeSetting.upsert({
    where: { key },
    update: { value: value as object, updatedBy: req.user!.id },
    create: { key, value: value as object, updatedBy: req.user!.id },
  });
  await auditLog(req, { action: 'settings.update', entityType: 'settings', entityId: key, after: value });
  return ok(res, row.value);
}
