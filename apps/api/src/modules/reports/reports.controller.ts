import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { ApiError } from '../../lib/errors';

function parseRange(range: string | undefined) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case '7d':
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case '30d':
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'prevMonth':
      start.setMonth(start.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'all':
      start.setFullYear(2000, 0, 1);
      break;
    default:
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

export async function salesReport(req: Request, res: Response) {
  const { start, end } = parseRange(req.query.range as string | undefined);
  const cancelled = ['CANCELLED', 'RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED'];

  const [orders, items, refunds, payments] = await Promise.all([
    prisma.order.findMany({
      where: { placedAt: { gte: start, lte: end } },
      include: { items: true, payments: { where: { status: 'PAID' } } },
    }),
    prisma.orderItem.findMany({
      where: { order: { placedAt: { gte: start, lte: end } } },
      include: { product: { select: { name: true, categories: { select: { category: { select: { name: true } } } } } } },
    }),
    prisma.refund.findMany({
      where: { createdAt: { gte: start, lte: end }, status: { in: ['COMPLETED', 'PROCESSING'] } },
    }),
    prisma.payment.findMany({ where: { createdAt: { gte: start, lte: end } } }),
  ]);

  const activeOrders = orders.filter((o) => !cancelled.includes(o.status));
  const grossSales = activeOrders.reduce((s, o) => s + o.grandTotal.toNumber(), 0);
  const netSales = activeOrders.reduce((s, o) => s + o.grandTotal.toNumber() - o.taxTotal.toNumber() - o.shippingTotal.toNumber(), 0);
  const refundTotal = refunds.reduce((s, r) => s + r.amount.toNumber(), 0);
  const discountTotal = activeOrders.reduce((s, o) => s + o.discountTotal.toNumber(), 0);
  const shippingRevenue = activeOrders.reduce((s, o) => s + o.shippingTotal.toNumber(), 0);
  const taxCollected = activeOrders.reduce((s, o) => s + o.taxTotal.toNumber(), 0);
  const productsSold = items.reduce((s, i) => s + i.quantity, 0);
  const grossProfit = items.reduce((s, i) => s + ((i.totalAmount.toNumber() - (i.costPrice?.toNumber() ?? 0) * i.quantity)), 0);

  const totalCustomers = await prisma.user.count({ where: { customerProfile: { isNot: null } } });
  const newCustomers = await prisma.user.count({ where: { createdAt: { gte: start, lte: end }, customerProfile: { isNot: null } } });
  const pendingOrders = await prisma.order.count({ where: { status: 'PENDING_PAYMENT' } });
  const lowStock = await prisma.inventoryLevel.count({ where: { physicalStock: { gt: 0 }, reservedStock: { lte: 0 } } });
  const outOfStock = await prisma.inventoryLevel.count({ where: { physicalStock: { lte: 0 } } });

  // Revenue/orders over time
  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (const o of activeOrders) {
    const key = o.placedAt.toISOString().slice(0, 10);
    const b = buckets.get(key) ?? { revenue: 0, orders: 0 };
    b.revenue += o.grandTotal.toNumber();
    b.orders += 1;
    buckets.set(key, b);
  }
  const timeSeries = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, revenue: Math.round(v.revenue * 100) / 100, orders: v.orders }));

  // Sales by category, payment method breakdown, order status distribution
  const byCategory = new Map<string, number>();
  for (const i of items) {
    const cat = i.product?.categories[0]?.category.name ?? 'Uncategorized';
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + i.totalAmount.toNumber());
  }
  const paymentBreakdown = new Map<string, number>();
  for (const p of payments) {
    paymentBreakdown.set(p.method, (paymentBreakdown.get(p.method) ?? 0) + p.amount.toNumber());
  }
  const statusDistribution = new Map<string, number>();
  for (const o of orders) {
    statusDistribution.set(o.status, (statusDistribution.get(o.status) ?? 0) + 1);
  }
  const topProducts = [...items.reduce((m, i) => {
    const k = i.productName;
    const cur = m.get(k) ?? { qty: 0, revenue: 0 };
    cur.qty += i.quantity;
    cur.revenue += i.totalAmount.toNumber();
    m.set(k, cur);
    return m;
  }, new Map<string, { qty: number; revenue: number }>()).entries()]
    .map(([name, v]) => ({ name, ...v, revenue: Math.round(v.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return ok(res, {
    kpis: {
      grossSales: Math.round(grossSales * 100) / 100,
      netSales: Math.round(netSales * 100) / 100,
      refundTotal: Math.round(refundTotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      shippingRevenue: Math.round(shippingRevenue * 100) / 100,
      taxCollected: Math.round(taxCollected * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      totalOrders: activeOrders.length,
      averageOrderValue: activeOrders.length ? Math.round((grossSales / activeOrders.length) * 100) / 100 : 0,
      productsSold,
      totalCustomers,
      newCustomers,
      pendingOrders,
      lowStock,
      outOfStock,
    },
    timeSeries,
    byCategory: [...byCategory.entries()].map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })),
    paymentBreakdown: [...paymentBreakdown.entries()].map(([method, value]) => ({ name: method, value: Math.round(value * 100) / 100 })),
    statusDistribution: [...statusDistribution.entries()].map(([status, value]) => ({ name: status, value })),
    topProducts,
    recentOrders: orders.slice(0, 8).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName ?? o.guestEmail,
      status: o.status,
      grandTotal: o.grandTotal,
      placedAt: o.placedAt,
    })),
  });
}

export async function guardUnused(_req: Request) {
  throw ApiError.notFound();
}
