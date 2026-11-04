import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok, created } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { auditLog } from '../../lib/audit';

export async function getPage(req: Request, res: Response) {
  const slug = typeof req.params.slug === 'string' ? req.params.slug : '';
  const page = await prisma.contentPage.findFirst({
    where: { slug, visibility: 'VISIBLE', publishedAt: { not: null } },
  });
  if (!page) throw ApiError.notFound('Page not found');
  return ok(res, page);
}

export async function listPages(req: Request, res: Response) {
  const pages = await prisma.contentPage.findMany({
    where: { visibility: 'VISIBLE', publishedAt: { not: null } },
    orderBy: { title: 'asc' },
  });
  return ok(res, pages);
}

export async function adminListPages(req: Request, res: Response) {
  const pages = await prisma.contentPage.findMany({ orderBy: { updatedAt: 'desc' } });
  return ok(res, pages);
}

export async function upsertPage(req: Request, res: Response) {
  const { slug, title, body, visibility, seoTitle, seoDescription, scheduledAt } = req.body;
  const existing = await prisma.contentPage.findUnique({ where: { slug } });
  const data = {
    title,
    body,
    visibility: visibility ?? 'VISIBLE',
    seoTitle,
    seoDescription,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    publishedAt: scheduledAt ? null : new Date(),
  };
  const page = existing
    ? await prisma.contentPage.update({ where: { slug }, data })
    : await prisma.contentPage.create({ data: { ...data, slug } });
  await auditLog(req, { action: 'content.upsert', entityType: 'contentPage', entityId: page.id, after: page });
  return created(res, page);
}

export async function getHomepage(req: Request, res: Response) {
  const sections = await prisma.homepageSection.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });
  const testimonials = await prisma.testimonial.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });
  const navMenus = await prisma.navigationMenu.findMany({
    where: { isActive: true },
  });
  return ok(res, { sections, testimonials, navMenus });
}

export async function adminListSections(req: Request, res: Response) {
  const sections = await prisma.homepageSection.findMany({
    orderBy: { displayOrder: 'asc' },
  });
  return ok(res, sections);
}

export async function createSection(req: Request, res: Response) {
  const section = await prisma.homepageSection.create({ data: req.body });
  await auditLog(req, { action: 'section.create', entityType: 'homepageSection', entityId: section.id, after: section });
  return created(res, section);
}

export async function updateSection(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const before = await prisma.homepageSection.findUnique({ where: { id } });
  if (!before) throw ApiError.notFound('Section not found');
  const section = await prisma.homepageSection.update({ where: { id }, data: req.body });
  await auditLog(req, { action: 'section.update', entityType: 'homepageSection', entityId: section.id, before, after: section });
  return ok(res, section);
}

export async function deleteSection(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  await prisma.homepageSection.delete({ where: { id } });
  await auditLog(req, { action: 'section.delete', entityType: 'homepageSection', entityId: id });
  return ok(res, { ok: true });
}

export async function listTestimonialsAdmin(req: Request, res: Response) {
  const all = await prisma.testimonial.findMany({ orderBy: { displayOrder: 'asc' } });
  return ok(res, all);
}

export async function createTestimonial(req: Request, res: Response) {
  const t = await prisma.testimonial.create({ data: req.body });
  return created(res, t);
}

export async function updateTestimonial(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const t = await prisma.testimonial.update({ where: { id }, data: req.body });
  return ok(res, t);
}

export async function deleteTestimonial(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  await prisma.testimonial.delete({ where: { id } });
  return ok(res, { ok: true });
}

export async function subscribeNewsletter(req: Request, res: Response) {
  const { email } = req.body;
  await prisma.newsletterSubscription.upsert({
    where: { email },
    create: { email, source: req.body.source },
    update: { subscribed: true, unsubscribedAt: null },
  });
  return created(res, { subscribed: true });
}

export async function listNewsletterSubscriptions(req: Request, res: Response) {
  const subs = await prisma.newsletterSubscription.findMany({ orderBy: { createdAt: 'desc' } });
  return ok(res, subs);
}

export async function unsubscribeNewsletter(req: Request, res: Response) {
  const { email } = req.body;
  await prisma.newsletterSubscription.updateMany({
    where: { email },
    data: { subscribed: false, unsubscribedAt: new Date() },
  });
  return ok(res, { unsubscribed: true });
}
