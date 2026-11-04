import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { ApiError } from '../../lib/errors';
import { pageParams, pageResult } from '../../lib/pagination';
import { auditLog } from '../../lib/audit';

export async function list(req: Request, res: Response) {
  const { page, pageSize, skip, take } = pageParams(Number(req.query.page), Number(req.query.pageSize));
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const status = typeof req.query.status === 'string' ? req.query.status : '';

  const where: Record<string, unknown> = { customerProfile: { isNot: null } };
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;

  const [total, customers] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        createdAt: true,
        customerProfile: { select: { consentNewsletter: true } },
        orders: { select: { grandTotal: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  const rows = customers.map((c) => ({
    id: c.id,
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
    fullName: `${c.firstName} ${c.lastName}`,
    phone: c.phone,
    status: c.status,
    newsletter: c.customerProfile?.consentNewsletter ?? false,
    createdAt: c.createdAt,
    orderCount: c._count.orders,
    lifetimeSpend: Math.round(c.orders.reduce((s, o) => s + o.grandTotal.toNumber(), 0) * 100) / 100,
  }));

  return ok(res, rows, pageResult(rows, total, page, pageSize).meta);
}

export async function detail(req: Request, res: Response) {
  const id = String(req.params.id);
  const customer = await prisma.user.findFirst({
    where: { id, customerProfile: { isNot: null } },
    include: {
      customerProfile: true,
      addresses: true,
      orders: {
        orderBy: { placedAt: 'desc' },
        take: 20,
        include: { items: { take: 3 } },
      },
    },
  });
  if (!customer) throw ApiError.notFound('Customer not found');
  const lifetimeSpend = customer.orders.reduce((s, o) => s + o.grandTotal.toNumber(), 0);
  const { passwordHash: _pw, roles: _r, refreshTokens: _rt, ...safe } = customer as unknown as Record<string, unknown>;
  return ok(res, { ...safe, lifetimeSpend: Math.round(lifetimeSpend * 100) / 100, orderCount: customer.orders.length });
}

export async function update(req: Request, res: Response) {
  const id = String(req.params.id);
  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw ApiError.notFound('Customer not found');
  const data: Record<string, unknown> = {};
  if (typeof req.body.status === 'string') data.status = req.body.status;
  if (typeof req.body.firstName === 'string') data.firstName = req.body.firstName;
  if (typeof req.body.lastName === 'string') data.lastName = req.body.lastName;
  if (req.body.phone !== undefined) data.phone = req.body.phone;
  const user = await prisma.user.update({ where: { id }, data });
  if (typeof req.body.note === 'string') {
    await prisma.customerProfile.upsert({
      where: { userId: id },
      update: { note: req.body.note },
      create: { userId: id, note: req.body.note },
    });
  }
  await auditLog(req, { action: 'customer.update', entityType: 'customer', entityId: id, before, after: user });
  return ok(res, user);
}

export async function exportCsv(req: Request, res: Response) {
  const customers = await prisma.user.findMany({
    where: { customerProfile: { isNot: null } },
    include: { _count: { select: { orders: true } }, orders: { select: { grandTotal: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const header = ['id', 'email', 'firstName', 'lastName', 'phone', 'status', 'orders', 'lifetimeSpend', 'createdAt'];
  const rows = customers.map((c) => [
    c.id,
    c.email,
    c.firstName,
    c.lastName,
    c.phone ?? '',
    c.status,
    c._count.orders,
    c.orders.reduce((s, o) => s + o.grandTotal.toNumber(), 0).toFixed(2),
    c.createdAt.toISOString(),
  ]);
  const csv = [header.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
  return res.send(csv);
}
