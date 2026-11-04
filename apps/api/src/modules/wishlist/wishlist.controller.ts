import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { ApiError } from '../../lib/errors';

export async function get(req: Request, res: Response) {
  let wishlist = await prisma.wishlist.findUnique({
    where: { userId: req.user!.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              price: true,
              salePrice: true,
              ratingAvg: true,
              images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!wishlist) {
    wishlist = await prisma.wishlist.create({
      data: { userId: req.user!.id, items: { create: [] } },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                name: true,
                price: true,
                salePrice: true,
                ratingAvg: true,
                images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
  return ok(res, wishlist);
}

export async function add(req: Request, res: Response) {
  const { productId } = req.body;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound('Product not found');
  let wishlist = await prisma.wishlist.findUnique({ where: { userId: req.user!.id } });
  if (!wishlist) {
    wishlist = await prisma.wishlist.create({ data: { userId: req.user!.id } });
  }
  const existing = await prisma.wishlistItem.findFirst({
    where: { wishlistId: wishlist.id, productId },
  });
  if (!existing) {
    await prisma.wishlistItem.create({ data: { wishlistId: wishlist.id, productId } });
  }
  return ok(res, { added: true }, undefined, 201);
}

export async function remove(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  await prisma.wishlistItem.deleteMany({
    where: { id, wishlist: { userId: req.user!.id } },
  });
  return ok(res, { ok: true });
}
