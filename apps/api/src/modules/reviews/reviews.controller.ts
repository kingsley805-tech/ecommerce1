import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok, created } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { pageParams, pageResult } from '../../lib/pagination';
import { auditLog } from '../../lib/audit';

export async function listByProduct(req: Request, res: Response) {
  const product = await prisma.product.findUnique({ where: { id: typeof req.params.productId === 'string' ? req.params.productId : '' } });
  if (!product) throw ApiError.notFound('Product not found');
  const reviews = await prisma.review.findMany({
    where: { productId: product.id, status: 'APPROVED' },
    include: { customer: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return ok(res, reviews);
}

export async function create(req: Request, res: Response) {
  const { productId, rating, title, body } = req.body;

  const hasOrdered = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { customerId: req.user!.id, status: { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING'] } },
    },
  });

  const existing = await prisma.review.findUnique({
    where: { productId_customerId: { productId, customerId: req.user!.id } },
  });
  if (existing) throw new ApiError(409, 'REVIEW_EXISTS', 'You have already reviewed this product');

  const review = await prisma.review.create({
    data: {
      productId,
      customerId: req.user!.id,
      rating,
      title,
      body,
      status: 'PENDING',
      verifiedPurchase: Boolean(hasOrdered),
    },
  });

  return created(res, review);
}

export async function report(req: Request, res: Response) {
  const review = await prisma.review.findUnique({ where: { id: typeof req.params.id === 'string' ? req.params.id : '' } });
  if (!review) throw ApiError.notFound('Review not found');
  await prisma.reviewReport.create({
    data: {
      reviewId: review.id,
      reporterCustomerId: req.user!.id,
      reason: req.body.reason,
    },
  });
  return ok(res, { reported: true }, undefined, 201);
}

export async function adminList(req: Request, res: Response) {
  const { page, pageSize, skip, take } = pageParams(Number(req.query.page), Number(req.query.pageSize));
  const status = (req.query.status as string) || undefined;
  const where = status ? { status: status as never } : {};
  const [total, reviews] = await prisma.$transaction([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, slug: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);
  return ok(res, reviews, pageResult([], total, page, pageSize).meta);
}

export async function moderate(req: Request, res: Response) {
  const review = await prisma.review.findUnique({ where: { id: typeof req.params.id === 'string' ? req.params.id : '' } });
  if (!review) throw ApiError.notFound('Review not found');
  const updated = await prisma.review.update({
    where: { id: review.id },
    data: {
      status: req.body.status,
      moderationNote: req.body.moderationNote,
      moderatedBy: req.user!.id,
    },
  });
  await auditLog(req, { action: 'review.moderate', entityType: 'review', entityId: review.id, before: review, after: updated });
  return ok(res, updated);
}

export async function adminReportList(req: Request, res: Response) {
  const reports = await prisma.reviewReport.findMany({
    include: { review: { include: { product: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  return ok(res, reports);
}
