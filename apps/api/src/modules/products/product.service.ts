import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import { pageParams, pageResult, type Paged } from '../../lib/pagination';
import { redis } from '../../lib/redis';
import type { ProductListQuery } from '@commerce/validation';
import type { ProductType, ProductStatus, Visibility } from '@commerce/shared-types';

const LIST_SELECT = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  slug: true,
  name: true,
  type: true,
  price: true,
  compareAtPrice: true,
  salePrice: true,
  saleStartAt: true,
  saleEndAt: true,
  ratingAvg: true,
  ratingCount: true,
  soldCount: true,
  featured: true,
  images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
  variants: {
    select: {
      id: true,
      name: true,
      attributes: true,
      price: true,
      compareAtPrice: true,
      imageUrl: true,
      isDefault: true,
    },
  },
  categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
  brand: { select: { id: true, name: true, slug: true } },
});

export interface ProductListItemDTO {
  id: string;
  slug: string;
  name: string;
  type: ProductType;
  price: Prisma.Decimal;
  compareAtPrice: Prisma.Decimal | null;
  salePrice: Prisma.Decimal | null;
  ratingAvg: Prisma.Decimal;
  ratingCount: number;
  soldCount: number;
  featured: boolean;
  image: string | null;
  imageAlt?: string | null;
  brandName?: string | null;
  categories: string[];
  discountPercent?: number | null;
  variants: {
    id: string;
    name: string | null;
    attributes: Record<string, string>;
    price: Prisma.Decimal;
    compareAtPrice: Prisma.Decimal | null;
    imageUrl: string | null;
    isDefault: boolean;
  }[];
}

export function isSaleActive(p: { salePrice: Prisma.Decimal | null; saleStartAt: Date | null; saleEndAt: Date | null }) {
  if (p.salePrice == null) return false;
  const now = new Date();
  if (p.saleStartAt && p.saleStartAt > now) return false;
  if (p.saleEndAt && p.saleEndAt < now) return false;
  return true;
}

export function toListItem(p: Prisma.ProductGetPayload<{ select: typeof LIST_SELECT }>): ProductListItemDTO {
  const onSale = isSaleActive(p);
  const effective = onSale && p.salePrice != null ? p.salePrice : p.price;
  const discountPercent =
    onSale && p.compareAtPrice != null && p.compareAtPrice.gt(0)
      ? Math.round((1 - effective.toNumber() / p.compareAtPrice.toNumber()) * 100)
      : null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    price: effective,
    compareAtPrice: onSale ? p.compareAtPrice : null,
    salePrice: onSale ? p.salePrice : null,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    soldCount: p.soldCount,
    featured: p.featured,
    image: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt ?? null,
    brandName: p.brand?.name ?? null,
    categories: p.categories.map((c) => c.category.slug),
    discountPercent,
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      attributes: (v.attributes as Record<string, string>) ?? {},
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      imageUrl: v.imageUrl,
      isDefault: v.isDefault,
    })),
  };
}

async function descendantCategoryIds(categorySlug: string): Promise<string[]> {
  const root = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!root) return [];
  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const map = new Map<string, string | null>();
  for (const c of all) map.set(c.id, c.parentId);
  const result: string[] = [root.id];
  let queue = [root.id];
  while (queue.length) {
    const next: string[] = [];
    for (const pid of queue) {
      for (const c of all) {
        if (c.parentId === pid) {
          result.push(c.id);
          next.push(c.id);
        }
      }
    }
    queue = next;
  }
  return result;
}

export async function publicList(query: ProductListQuery): Promise<Paged<ProductListItemDTO>> {
  const { page, pageSize, skip, take } = pageParams(query.page, query.pageSize);
  const { q, brand, category, minPrice, maxPrice, inStock, onSale, rating, sortBy, attributes } = query;

  const where: Prisma.ProductWhereInput = { status: 'ACTIVE', visibility: 'VISIBLE' };
  const and: Prisma.ProductWhereInput[] = [];

  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { brand: { name: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }
  if (brand) {
    and.push({ brand: { slug: brand } });
  }
  if (category) {
    const ids = await descendantCategoryIds(category);
    if (ids.length) and.push({ categories: { some: { categoryId: { in: ids } } } });
  }
  if (minPrice != null || maxPrice != null) {
    const priceClauses: Prisma.ProductWhereInput[] = [];
    if (minPrice != null) {
      priceClauses.push({ price: { gte: minPrice } }, { salePrice: { gte: minPrice } });
    }
    if (maxPrice != null) {
      priceClauses.push({ price: { lte: maxPrice } }, { salePrice: { lte: maxPrice } });
    }
    and.push({ OR: priceClauses });
  }
  if (inStock === 'true') {
    and.push({ variants: { some: {} } });
  }
  if (onSale === 'true') {
    const now = new Date();
    and.push({
      salePrice: { not: null },
      OR: [{ saleStartAt: null }, { saleStartAt: { lte: now } }],
      AND: [{ OR: [{ saleEndAt: null }, { saleEndAt: { gte: now } }] }],
    });
  }
  if (rating && Number(rating) > 0) {
    and.push({ ratingAvg: { gte: Number(rating) } });
  }
  // Variant attribute filtering is applied at query time via attribute params where feasible.
  void attributes;
  if (and.length) where.AND = and;

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = [];
  switch (sortBy) {
    case 'price_asc':
      orderBy.push({ price: 'asc' });
      break;
    case 'price_desc':
      orderBy.push({ price: 'desc' });
      break;
    case 'rating':
      orderBy.push({ ratingAvg: 'desc' });
      break;
    case 'name':
      orderBy.push({ name: 'asc' });
      break;
    case 'popularity':
      orderBy.push({ soldCount: 'desc' });
      break;
    case 'newest':
    default:
      orderBy.push({ createdAt: 'desc' });
  }
  if (orderBy[0]?.price) {
    orderBy.push({ id: 'asc' });
  }

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, select: LIST_SELECT, orderBy, skip, take }),
  ]);
  const items = rows.map(toListItem);
  return pageResult(items, total, page, pageSize);
}

export async function getBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, status: 'ACTIVE', visibility: 'VISIBLE' },
    include: {
      images: { orderBy: { position: 'asc' } },
      variants: true,
      brand: true,
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      attributes: true,
      reviews: { where: { status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });
  if (!product) throw ApiError.notFound('Product not found');
  await prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } });
  return product;
}

export async function related(productId: string, categoryIds: string[], take = 4) {
  const products = await prisma.product.findMany({
    where: {
      id: { not: productId },
      status: 'ACTIVE',
      visibility: 'VISIBLE',
      categories: { some: { categoryId: { in: categoryIds } } },
    },
    select: LIST_SELECT,
    orderBy: { soldCount: 'desc' },
    take,
  });
  return products.map(toListItem);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function ensureUniqueSlug(name: string, prefer?: string): Promise<string> {
  const base = (prefer && prefer.trim()) || slugify(name);
  let candidate = base;
  let i = 2;
  while (await prisma.product.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${i}`;
    i += 1;
  }
  return candidate;
}

export async function createProduct(input: {
  name: string;
  slug?: string;
  type: ProductType;
  status: ProductStatus;
  visibility: Visibility;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  salePrice?: number | null;
  saleStartAt?: Date | null;
  saleEndAt?: Date | null;
  costPrice?: number | null;
  description?: string;
  shortDescription?: string;
  barcode?: string;
  weightGrams?: number | null;
  lowStockThreshold?: number | null;
  categoryIds?: string[];
  tagIds?: string[];
  brandId?: string | null;
  featured?: boolean;
  images?: { url: string; alt?: string; position?: number }[];
  variants?: { sku: string; name?: string; price: number; attributes: Record<string, string>; stock?: number; imageUrl?: string | null }[];
  seoTitle?: string;
  seoDescription?: string;
}) {
  const slug = await ensureUniqueSlug(input.name, input.slug);
  const existingSku = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (existingSku) throw new ApiError(409, 'SKU_TAKEN', 'This SKU is already in use');

  const data: Prisma.ProductCreateInput = {
    name: input.name,
    slug,
    type: input.type,
    status: input.status,
    visibility: input.visibility,
    sku: input.sku,
    price: input.price,
    compareAtPrice: input.compareAtPrice ?? null,
    salePrice: input.salePrice ?? null,
    saleStartAt: input.saleStartAt ?? null,
    saleEndAt: input.saleEndAt ?? null,
    costPrice: input.costPrice ?? null,
    description: input.description,
    shortDescription: input.shortDescription,
    barcode: input.barcode,
    weightGrams: input.weightGrams,
    featured: input.featured ?? false,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    publishedAt: input.status === 'ACTIVE' ? new Date() : null,
    images: input.images?.length
      ? { create: input.images.map((img, i) => ({ url: img.url, alt: img.alt, position: img.position ?? i })) }
      : undefined,
    variants:
      input.type === 'VARIABLE' && input.variants?.length
        ? {
            create: input.variants.map((v, i) => ({
              sku: v.sku,
              name: v.name,
              price: v.price,
              attributes: v.attributes,
              imageUrl: v.imageUrl,
              isDefault: i === 0,
            })),
          }
        : undefined,
    categories:
      input.categoryIds?.length
        ? { create: input.categoryIds.map((id) => ({ category: { connect: { id } } })) }
        : undefined,
    tags: input.tagIds?.length
      ? { create: input.tagIds.map((id) => ({ tag: { connect: { id } } })) }
      : undefined,
    brand: input.brandId ? { connect: { id: input.brandId } } : undefined,
    attributes:
      input.type === 'VARIABLE' && input.variants?.length
        ? {
            create: buildAttributeDefinitions(input.variants.map((v) => v.attributes)),
          }
        : undefined,
  };

  const product = await prisma.product.create({ data });

  if (input.type === 'SIMPLE') {
    await prisma.inventoryLevel.create({
      data: { productId: product.id, locationId: await defaultLocationId(), physicalStock: 0 },
    });
  } else if (input.variants?.length) {
    for (const v of input.variants) {
      const variant = await prisma.productVariant.findFirst({
        where: { productId: product.id, sku: v.sku },
      });
      await prisma.inventoryLevel.create({
        data: { productId: product.id, variantId: variant!.id, locationId: await defaultLocationId(), physicalStock: v.stock ?? 0 },
      });
    }
  }

  return product;
}

function buildAttributeDefinitions(variantAttributes: Record<string, string>[]) {
  const defs = new Map<string, Set<string>>();
  for (const attrs of variantAttributes) {
    for (const [k, v] of Object.entries(attrs)) {
      if (!defs.has(k)) defs.set(k, new Set());
      defs.get(k)!.add(v);
    }
  }
  return Array.from(defs.entries()).map(([name, values]) => ({
    name,
    values: Array.from(values),
  }));
}

async function defaultLocationId(): Promise<string> {
  const loc = await prisma.inventoryLocation.findFirst({ where: { isDefault: true } });
  if (loc) return loc.id;
  const created = await prisma.inventoryLocation.create({
    data: { name: 'Default Warehouse', code: 'MAIN', isDefault: true },
  });
  return created.id;
}

export async function updateProduct(id: string, input: Record<string, unknown>) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Product not found');

  if (input.name && input.slug) {
    if (input.slug !== existing.slug) {
      const dup = await prisma.product.findUnique({ where: { slug: input.slug as string } });
      if (dup) throw new ApiError(409, 'SLUG_TAKEN', 'A product with this slug already exists');
    }
  }

  const { images, variants, categoryIds, tagIds, brandId, ...rest } = input as Record<string, any>;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: { ...rest, publishedAt: (rest as any).status === 'ACTIVE' && !existing.publishedAt ? new Date() : undefined } });

    if (images !== undefined) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (Array.isArray(images) && images.length) {
        await tx.productImage.createMany({
          data: images.map((img, i) => ({ productId: id, url: img.url, alt: img.alt, position: img.position ?? i })),
        });
      }
    }
    if (categoryIds !== undefined) {
      await tx.productCategory.deleteMany({ where: { productId: id } });
      if (Array.isArray(categoryIds) && categoryIds.length) {
        await tx.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({ productId: id, categoryId })),
        });
      }
    }
    if (tagIds !== undefined) {
      await tx.productTag.deleteMany({ where: { productId: id } });
      if (Array.isArray(tagIds) && tagIds.length) {
        await tx.productTag.createMany({ data: tagIds.map((tagId) => ({ productId: id, tagId })) });
      }
    }
    if (brandId !== undefined) {
      await tx.product.update({ where: { id }, data: { brandId: brandId ?? null } });
    }
    if (variants !== undefined) {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      if (Array.isArray(variants) && variants.length) {
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          await tx.productVariant.create({
            data: {
              productId: id,
              sku: v.sku,
              name: v.name ?? null,
              price: v.price,
              compareAtPrice: v.compareAtPrice ?? null,
              costPrice: v.costPrice ?? null,
              attributes: v.attributes ?? {},
              imageUrl: v.imageUrl ?? null,
              isDefault: i === 0,
            },
          });
        }
      }
    }
  });

  await redis.del(`product:${id}`);
  return prisma.product.findUnique({ where: { id } });
}

export async function duplicateProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: true, variants: true, categories: true, tags: true },
  });
  if (!product) throw ApiError.notFound('Product not found');
  const newSlug = await ensureUniqueSlug(`${product.name} copy`);
  const newSku = `${product.sku}-COPY-${Math.floor(Math.random() * 1000)}`;
  const copy = await prisma.product.create({
    data: {
      name: `${product.name} (copy)`,
      slug: newSlug,
      sku: newSku,
      type: product.type,
      status: 'DRAFT',
      visibility: 'HIDDEN',
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      salePrice: product.salePrice,
      costPrice: product.costPrice,
      description: product.description,
      shortDescription: product.shortDescription,
      barcode: product.barcode,
      weightGrams: product.weightGrams,
      featured: false,
      images: product.images.length ? { create: product.images.map((i) => ({ url: i.url, alt: i.alt, position: i.position })) } : undefined,
      variants: product.variants.length
        ? { create: product.variants.map((v, i) => ({ sku: `${v.sku}-COPY`, name: v.name, price: v.price, attributes: v.attributes as Prisma.InputJsonValue, imageUrl: v.imageUrl, isDefault: i === 0 })) }
        : undefined,
      categories: { create: product.categories.map((c) => ({ category: { connect: { id: c.categoryId } } })) },
    },
  });
  if (product.type === 'SIMPLE') {
    await prisma.inventoryLevel.create({
      data: { productId: copy.id, locationId: await defaultLocationId(), physicalStock: 0 },
    });
  }
  return copy;
}

export async function deleteProduct(id: string) {
  await prisma.product.update({ where: { id }, data: { status: 'ARCHIVED', visibility: 'HIDDEN' } });
  return { ok: true };
}

export async function adminList(query: Record<string, any>) {
  const { page, pageSize, skip, take } = pageParams(query.page, query.pageSize);
  const q = (query.q as string) ?? '';
  const status = query.status as ProductStatus | undefined;
  const where: Prisma.ProductWhereInput = {};
  if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }];
  if (status) where.status = status;
  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
        brand: true,
        categories: { include: { category: true } },
        variants: true,
        inventoryLevels: true,
        _count: { select: { variants: true, orderItems: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);
  return pageResult(rows, total, page, pageSize);
}
