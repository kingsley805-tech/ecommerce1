import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok, created } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { pageParams, pageResult } from '../../lib/pagination';
import { auditLog } from '../../lib/audit';

export async function list(req: Request, res: Response) {
  const { page, pageSize, skip, take } = pageParams(Number(req.query.page), Number(req.query.pageSize));
  const [total, promotions] = await prisma.$transaction([
    prisma.promotion.count(),
    prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { redemptions: true } } },
      skip,
      take,
    }),
  ]);
  return ok(res, promotions, pageResult(promotions, total, page, pageSize).meta);
}

export async function create(req: Request, res: Response) {
  const body = (req.body as Record<string, unknown>);
  const promo = await prisma.promotion.create({
    data: {
      name: String(body.name),
      code: body.code ? String(body.code) : null,
      type: body.type as never,
      value: typeof body.value === 'number' ? body.value : null,
      appliesTo: (body.appliesTo as never) ?? 'ALL',
      startsAt: new Date(String(body.startsAt)),
      endsAt: body.endsAt ? new Date(String(body.endsAt)) : null,
      isActive: body.isActive !== false,
      minimumOrderAmount: typeof body.minimumOrderAmount === 'number' ? body.minimumOrderAmount : null,
      minimumQuantity: typeof body.minimumQuantity === 'number' ? body.minimumQuantity : null,
      maxRedemptions: typeof body.maxRedemptions === 'number' ? body.maxRedemptions : null,
      perCustomerLimit: typeof body.perCustomerLimit === 'number' ? body.perCustomerLimit : null,
      stackable: body.stackable === true,
      freeShipping: body.freeShipping === true,
      productIds: Array.isArray(body.productIds) ? body.productIds : [],
      categoryIds: Array.isArray(body.categoryIds) ? body.categoryIds : [],
      excludedProductIds: Array.isArray(body.excludedProductIds) ? body.excludedProductIds : [],
      customerGroupIds: Array.isArray(body.customerGroupIds) ? body.customerGroupIds : [],
    },
  });
  await auditLog(req, { action: 'promotion.create', entityType: 'promotion', entityId: promo.id, after: promo });
  return created(res, promo);
}

export async function update(req: Request, res: Response) {
  const id = String(req.params.id);
  const before = await prisma.promotion.findUnique({ where: { id } });
  if (!before) throw ApiError.notFound('Promotion not found');
  const body = req.body as Record<string, unknown>;
  const promo = await prisma.promotion.update({
    where: { id },
    data: {
      name: body.name !== undefined ? String(body.name) : undefined,
      code: body.code !== undefined ? (body.code ? String(body.code) : null) : undefined,
      type: body.type as never | undefined,
      value: body.value !== undefined ? (typeof body.value === 'number' ? body.value : null) : undefined,
      startsAt: body.startsAt ? new Date(String(body.startsAt)) : undefined,
      endsAt: body.endsAt ? new Date(String(body.endsAt)) : body.endsAt === null ? null : undefined,
      isActive: body.isActive !== undefined ? (body.isActive as boolean) : undefined,
      minimumOrderAmount: body.minimumOrderAmount !== undefined ? (typeof body.minimumOrderAmount === 'number' ? body.minimumOrderAmount : null) : undefined,
      minimumQuantity: body.minimumQuantity !== undefined ? (typeof body.minimumQuantity === 'number' ? body.minimumQuantity : null) : undefined,
      maxRedemptions: body.maxRedemptions !== undefined ? (typeof body.maxRedemptions === 'number' ? body.maxRedemptions : null) : undefined,
      perCustomerLimit: body.perCustomerLimit !== undefined ? (typeof body.perCustomerLimit === 'number' ? body.perCustomerLimit : null) : undefined,
      stackable: body.stackable !== undefined ? (body.stackable as boolean) : undefined,
      freeShipping: body.freeShipping !== undefined ? (body.freeShipping as boolean) : undefined,
      productIds: Array.isArray(body.productIds) ? body.productIds : undefined,
      categoryIds: Array.isArray(body.categoryIds) ? body.categoryIds : undefined,
      excludedProductIds: Array.isArray(body.excludedProductIds) ? body.excludedProductIds : undefined,
    },
  });
  await auditLog(req, { action: 'promotion.update', entityType: 'promotion', entityId: promo.id, before, after: promo });
  return ok(res, promo);
}

export async function remove(req: Request, res: Response) {
  const id = String(req.params.id);
  await prisma.promotion.delete({ where: { id } });
  await auditLog(req, { action: 'promotion.delete', entityType: 'promotion', entityId: id });
  return ok(res, { ok: true });
}

export async function toggle(req: Request, res: Response) {
  const id = String(req.params.id);
  const before = await prisma.promotion.findUnique({ where: { id } });
  if (!before) throw ApiError.notFound('Promotion not found');
  const promo = await prisma.promotion.update({
    where: { id },
    data: { isActive: req.body.isActive },
  });
  await auditLog(req, { action: 'promotion.toggle', entityType: 'promotion', entityId: promo.id, before, after: promo });
  return ok(res, promo);
}
