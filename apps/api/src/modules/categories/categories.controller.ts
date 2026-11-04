import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ok, created } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { auditLog } from '../../lib/audit';

const categoryInclude = {
  _count: { select: { products: true, children: true } },
} satisfies Prisma.CategoryInclude;

async function loadCategory(id: string) {
  const category = await prisma.category.findUnique({ where: { id }, include: categoryInclude });
  if (!category) throw ApiError.notFound('Category not found');
  return category;
}

function buildTree(categories: { id: string; parentId: string | null; name: string; slug: string; displayOrder: number }[], parentId: string | null = null): unknown[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((c) => ({
      ...c,
      children: buildTree(categories, c.id),
    }));
}

export async function listPublic(req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    where: { visibility: 'VISIBLE' },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      parentId: true,
      description: true,
      displayOrder: true,
      children: { select: { id: true, name: true, slug: true, parentId: true, imageUrl: true, displayOrder: true } },
    },
    orderBy: { displayOrder: 'asc' },
  });
  const tree = buildTree(categories as never[]);
  return ok(res, tree);
}

export async function getBySlug(req: Request, res: Response) {
  const slug = typeof req.params.slug === 'string' ? req.params.slug : '';
  const category = await prisma.category.findFirst({
    where: { slug, visibility: 'VISIBLE' },
    include: {
      parent: true,
      children: { where: { visibility: 'VISIBLE' }, orderBy: { displayOrder: 'asc' } },
    },
  });
  if (!category) throw ApiError.notFound('Category not found');
  return ok(res, category);
}

export async function listAdmin(req: Request, res: Response) {
  const q = (req.query.q as string) ?? '';
  const categories = await prisma.category.findMany({
    where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true, children: true } },
    },
    orderBy: { displayOrder: 'asc' },
  });
  return ok(res, categories);
}

export async function create(req: Request, res: Response) {
  const data = req.body;
  const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
  if (existing) throw new ApiError(409, 'SLUG_TAKEN', 'A category with this slug already exists');
  const category = await prisma.category.create({ data });
  await auditLog(req, { action: 'category.create', entityType: 'category', entityId: category.id, after: category });
  return created(res, category);
}

export async function update(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const before = await loadCategory(id);
  if (req.body.parentId && req.body.parentId === before.id) {
    throw new ApiError(400, 'INVALID_PARENT', 'A category cannot be its own parent');
  }
  if (req.body.slug && req.body.slug !== before.slug) {
    const dup = await prisma.category.findUnique({ where: { slug: req.body.slug } });
    if (dup) throw new ApiError(409, 'SLUG_TAKEN', 'A category with this slug already exists');
  }
  const category = await prisma.category.update({ where: { id }, data: req.body });
  await auditLog(req, { action: 'category.update', entityType: 'category', entityId: category.id, before, after: category });
  return ok(res, category);
}

export async function remove(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const before = await loadCategory(id);
  await prisma.category.delete({ where: { id } });
  await auditLog(req, { action: 'category.delete', entityType: 'category', entityId: id, before });
  return ok(res, { ok: true });
}
