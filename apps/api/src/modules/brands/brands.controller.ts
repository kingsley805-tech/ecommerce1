import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok, created } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { auditLog } from '../../lib/audit';

export async function listPublic(req: Request, res: Response) {
  const brands = await prisma.brand.findMany({
    where: { products: { some: { status: 'ACTIVE', visibility: 'VISIBLE' } } },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      featured: true,
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  });
  return ok(res, brands);
}

export async function listAdmin(req: Request, res: Response) {
  const q = (req.query.q as string) ?? '';
  const brands = await prisma.brand.findMany({
    where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
  return ok(res, brands);
}

export async function create(req: Request, res: Response) {
  const dup = await prisma.brand.findUnique({ where: { slug: req.body.slug } });
  if (dup) throw new ApiError(409, 'SLUG_TAKEN', 'A brand with this slug already exists');
  const brand = await prisma.brand.create({ data: req.body });
  await auditLog(req, { action: 'brand.create', entityType: 'brand', entityId: brand.id, after: brand });
  return created(res, brand);
}

export async function update(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const before = await prisma.brand.findUnique({ where: { id } });
  if (!before) throw ApiError.notFound('Brand not found');
  if (req.body.slug && req.body.slug !== before.slug) {
    const dup = await prisma.brand.findUnique({ where: { slug: req.body.slug } });
    if (dup) throw new ApiError(409, 'SLUG_TAKEN', 'A brand with this slug already exists');
  }
  const brand = await prisma.brand.update({ where: { id }, data: req.body });
  await auditLog(req, { action: 'brand.update', entityType: 'brand', entityId: brand.id, before, after: brand });
  return ok(res, brand);
}

export async function remove(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  await prisma.brand.delete({ where: { id } });
  await auditLog(req, { action: 'brand.delete', entityType: 'brand', entityId: id });
  return ok(res, { ok: true });
}
