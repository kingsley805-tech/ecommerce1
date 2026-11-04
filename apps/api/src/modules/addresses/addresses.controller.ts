import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok, created } from '../../lib/response';
import { ApiError } from '../../lib/errors';

export async function list(req: Request, res: Response) {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.id },
    orderBy: { isDefault: 'desc' },
  });
  return ok(res, addresses);
}

export async function create(req: Request, res: Response) {
  const body = req.body as Record<string, unknown>;
  const isDefault = body.isDefault === true;
  if (isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
  }
  const address = await prisma.address.create({
    data: {
      userId: req.user!.id,
      recipientName: String(body.recipientName),
      phone: body.phone ? String(body.phone) : null,
      line1: String(body.line1),
      line2: body.line2 ? String(body.line2) : null,
      city: String(body.city),
      region: body.region ? String(body.region) : null,
      postalCode: body.postalCode ? String(body.postalCode) : null,
      country: String(body.country).toUpperCase(),
      isDefault,
      label: body.label ? String(body.label) : null,
    },
  });
  return created(res, address);
}

export async function update(req: Request, res: Response) {
  const id = String(req.params.id);
  const address = await prisma.address.findFirst({ where: { id, userId: req.user!.id } });
  if (!address) throw ApiError.notFound('Address not found');
  const body = req.body as Record<string, unknown>;
  const isDefault = body.isDefault === true;
  if (isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
  }
  const updated = await prisma.address.update({
    where: { id: address.id },
    data: {
      recipientName: body.recipientName !== undefined ? String(body.recipientName) : undefined,
      phone: body.phone !== undefined ? (body.phone ? String(body.phone) : null) : undefined,
      line1: body.line1 !== undefined ? String(body.line1) : undefined,
      line2: body.line2 !== undefined ? (body.line2 ? String(body.line2) : null) : undefined,
      city: body.city !== undefined ? String(body.city) : undefined,
      region: body.region !== undefined ? (body.region ? String(body.region) : null) : undefined,
      postalCode: body.postalCode !== undefined ? (body.postalCode ? String(body.postalCode) : null) : undefined,
      country: body.country !== undefined ? String(body.country).toUpperCase() : undefined,
      isDefault: body.isDefault !== undefined ? isDefault : undefined,
      label: body.label !== undefined ? (body.label ? String(body.label) : null) : undefined,
    },
  });
  return ok(res, updated);
}

export async function remove(req: Request, res: Response) {
  const id = String(req.params.id);
  const deleted = await prisma.address.deleteMany({ where: { id, userId: req.user!.id } });
  if (deleted.count === 0) throw ApiError.notFound('Address not found');
  return ok(res, { ok: true });
}
