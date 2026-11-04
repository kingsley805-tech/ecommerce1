import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ok, created } from '../../lib/response';
import { auditLog } from '../../lib/audit';

export async function methodsForCountry(req: Request, res: Response) {
  const country = (req.query.country as string) ?? 'GH';
  const zones = await prisma.shippingZone.findMany({
    where: { countries: { has: country } },
    include: { methods: { where: { isActive: true }, orderBy: { price: 'asc' } } },
  });
  const methods = zones.flatMap((z) => z.methods);
  return ok(res, methods);
}

export async function listZones(_req: Request, res: Response) {
  const zones = await prisma.shippingZone.findMany({ include: { methods: true } });
  return ok(res, zones);
}

export async function createZone(req: Request, res: Response) {
  const zone = await prisma.shippingZone.create({
    data: { name: req.body.name, countries: req.body.countries ?? [], regions: req.body.regions ?? [] },
  });
  await auditLog(req, { action: 'shipping.zone.create', entityType: 'shippingZone', entityId: zone.id, after: zone });
  return created(res, zone);
}

export async function updateZone(req: Request, res: Response) {
  const id = String(req.params.id);
  const zone = await prisma.shippingZone.update({
    where: { id },
    data: {
      name: req.body.name,
      countries: req.body.countries,
      regions: req.body.regions,
    },
  });
  await auditLog(req, { action: 'shipping.zone.update', entityType: 'shippingZone', entityId: zone.id, after: zone });
  return ok(res, zone);
}

export async function deleteZone(req: Request, res: Response) {
  const id = String(req.params.id);
  await prisma.shippingZone.delete({ where: { id } });
  await auditLog(req, { action: 'shipping.zone.delete', entityType: 'shippingZone', entityId: id });
  return ok(res, { ok: true });
}

export async function createMethod(req: Request, res: Response) {
  const method = await prisma.shippingMethod.create({
    data: {
      zoneId: req.body.zoneId,
      name: req.body.name,
      type: req.body.type,
      price: req.body.price ?? 0,
      minWeightGrams: req.body.minWeightGrams,
      maxWeightGrams: req.body.maxWeightGrams,
      minOrderAmount: req.body.minOrderAmount,
      estimatedMinDays: req.body.estimatedMinDays,
      estimatedMaxDays: req.body.estimatedMaxDays,
      isActive: req.body.isActive ?? true,
    },
  });
  await auditLog(req, { action: 'shipping.method.create', entityType: 'shippingMethod', entityId: method.id, after: method });
  return created(res, method);
}

export async function updateMethod(req: Request, res: Response) {
  const id = String(req.params.id);
  const before = await prisma.shippingMethod.findUnique({ where: { id } });
  const method = await prisma.shippingMethod.update({
    where: { id },
    data: {
      name: req.body.name,
      type: req.body.type,
      price: req.body.price,
      minWeightGrams: req.body.minWeightGrams,
      maxWeightGrams: req.body.maxWeightGrams,
      minOrderAmount: req.body.minOrderAmount,
      estimatedMinDays: req.body.estimatedMinDays,
      estimatedMaxDays: req.body.estimatedMaxDays,
      isActive: req.body.isActive,
    },
  });
  await auditLog(req, { action: 'shipping.method.update', entityType: 'shippingMethod', entityId: method.id, before, after: method });
  return ok(res, method);
}

export async function deleteMethod(req: Request, res: Response) {
  const id = String(req.params.id);
  await prisma.shippingMethod.delete({ where: { id } });
  await auditLog(req, { action: 'shipping.method.delete', entityType: 'shippingMethod', entityId: id });
  return ok(res, { ok: true });
}
