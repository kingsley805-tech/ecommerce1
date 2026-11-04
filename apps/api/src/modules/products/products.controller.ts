import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok, created } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { auditLog } from '../../lib/audit';
import * as productService from './product.service';

export async function list(req: Request, res: Response) {
  const result = await productService.publicList(req.query as never);
  return ok(res, result.items, result.meta);
}

export async function getBySlug(req: Request, res: Response) {
  const slug = typeof req.params.slug === 'string' ? req.params.slug : '';
  const product = await productService.getBySlug(slug);
  return ok(res, product);
}

export async function related(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, categories: { select: { categoryId: true } } },
  });
  if (!product) throw ApiError.notFound('Product not found');
  const rows = await productService.related(product.id, product.categories.map((c) => c.categoryId));
  return ok(res, rows);
}

export async function adminList(req: Request, res: Response) {
  const result = await productService.adminList(req.query as never);
  return ok(res, result.items, result.meta);
}

export async function adminDetail(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: 'asc' } },
      variants: true,
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      brand: true,
      attributes: true,
      inventoryLevels: true,
    },
  });
  if (!product) throw ApiError.notFound('Product not found');
  return ok(res, product);
}

export async function create(req: Request, res: Response) {
  const product = await productService.createProduct(req.body);
  await auditLog(req, { action: 'product.create', entityType: 'product', entityId: product.id, after: product });
  return created(res, product);
}

export async function update(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const before = await prisma.product.findUnique({ where: { id } });
  const product = await productService.updateProduct(id, req.body);
  await auditLog(req, { action: 'product.update', entityType: 'product', entityId: product!.id, before, after: product });
  return ok(res, product);
}

export async function duplicate(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const copy = await productService.duplicateProduct(id);
  await auditLog(req, { action: 'product.duplicate', entityType: 'product', entityId: copy.id });
  return created(res, copy);
}

export async function remove(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const before = await prisma.product.findUnique({ where: { id } });
  await productService.deleteProduct(id);
  await auditLog(req, { action: 'product.archive', entityType: 'product', entityId: id, before });
  return ok(res, { ok: true });
}

export async function exportCsv(req: Request, res: Response) {
  const products = await prisma.product.findMany({
    include: { brand: true, categories: { include: { category: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const header = ['id', 'name', 'slug', 'sku', 'type', 'status', 'price', 'compareAtPrice', 'costPrice', 'stock', 'brand', 'categories', 'createdAt'];
  const rows = products.map((p) => [
    p.id,
    p.name,
    p.slug,
    p.sku,
    p.type,
    p.status,
    p.price.toString(),
    p.compareAtPrice?.toString() ?? '',
    p.costPrice?.toString() ?? '',
    '',
    p.brand?.name ?? '',
    p.categories.map((c) => c.category.slug).join('|'),
    p.createdAt.toISOString(),
  ]);
  const csv = [header.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
  return res.send(csv);
}

export async function importCsv(req: Request, res: Response) {
  const file = req.file;
  if (!file) throw ApiError.badRequest('No CSV file provided');
  const text = file.buffer.toString('utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw ApiError.badRequest('CSV must contain a header and at least one row');
  const headers = parseCsvLine(lines[0]);
  const imported: string[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => (row[h] = (cols[idx] ?? '').trim()));
    try {
      const product = await productService.createProduct({
        name: row.name,
        sku: row.sku || `IMP-${Date.now()}-${i}`,
        slug: row.slug || undefined,
        type: (row.type as 'SIMPLE' | 'VARIABLE') || 'SIMPLE',
        status: (row.status as 'ACTIVE' | 'DRAFT') || 'DRAFT',
        visibility: 'HIDDEN',
        price: Number(row.price) || 0,
        compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : null,
        costPrice: row.costPrice ? Number(row.costPrice) : null,
        description: row.description,
        shortDescription: row.shortDescription,
        weightGrams: row.weightGrams ? Number(row.weightGrams) : null,
        featured: row.featured === 'true',
        categoryIds: row.categories ? (await resolveCategoryIds(row.categories)) : [],
      });
      imported.push(product.id);
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'error'}`);
    }
  }

  await auditLog(req, { action: 'product.import', entityType: 'product', after: { imported: imported.length, errors } });
  return ok(res, { imported: imported.length, errors }, undefined, 201);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

async function resolveCategoryIds(slugs: string): Promise<string[]> {
  const parts = slugs.split('|').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return [];
  const cats = await prisma.category.findMany({ where: { slug: { in: parts } }, select: { id: true } });
  return cats.map((c) => c.id);
}
