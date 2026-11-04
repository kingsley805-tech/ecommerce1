import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { redis } from '../../lib/redis';

const SUGGESTION_TTL = 60 * 5;

export async function suggest(req: Request, res: Response) {
  const q = ((req.query.q as string) ?? '').trim();
  if (q.length < 2) return ok(res, { products: [], searches: [] });

  const cacheKey = `suggest:${q.toLowerCase()}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return ok(res, JSON.parse(cached));
  }

  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      visibility: 'VISIBLE',
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { brand: { name: { contains: q, mode: 'insensitive' } } },
        { categories: { some: { category: { name: { contains: q, mode: 'insensitive' } } } } },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      compareAtPrice: true,
      salePrice: true,
      saleStartAt: true,
      saleEndAt: true,
      images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
    },
    take: 6,
    orderBy: { soldCount: 'desc' },
  });

  const popular = await redis.lrange('search:popular', 0, 9);
  const result = { products, searches: popular.length ? popular : [] };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', SUGGESTION_TTL);

  if (q.length >= 3) {
    // record popular term with a simple approach (avoid storing PII); use a capped list
    const already = await redis.lpos('search:popular', q.toLowerCase());
    if (already === null) {
      await redis.lpush('search:popular', q.toLowerCase());
      await redis.ltrim('search:popular', 0, 49);
    }
  }

  return ok(res, result);
}
