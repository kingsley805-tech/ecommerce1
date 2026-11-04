import type { Request } from 'express';
import { prisma } from './prisma';

export interface AuditMeta {
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}

/** Record a sensitive administrative action. Best-effort, never throws. */
export async function auditLog(req: Request | undefined, meta: AuditMeta) {
  if (!req?.user) return;
  try {
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: meta.action,
        entityType: meta.entityType,
        entityId: meta.entityId,
        before: meta.before === undefined ? undefined : (meta.before as object),
        after: meta.after === undefined ? undefined : (meta.after as object),
        ip: req.ip,
        userAgent: req.headers['user-agent']?.slice(0, 400),
      },
    });
  } catch {
    // auditing must never break the main operation
  }
}
