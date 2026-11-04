import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        email: string;
      };
      csrfToken?: string;
    }
  }
}

let demoUserId: string | null = null;

async function getDemoUser(): Promise<{ id: string; role: string; email: string }> {
  if (!demoUserId) {
    const u = await prisma.user.findFirst({
      where: { roles: { some: { role: { key: 'SUPER_ADMIN' } } } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    demoUserId = u?.id ?? 'demo-user';
  }
  return { id: demoUserId, role: 'SUPER_ADMIN', email: 'admin@gmail.com' };
}

/**
 * Populates req.user if a valid token is present, never throws.
 * NOTE: Auth is temporarily disabled — sets a default SUPER_ADMIN.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) req.user = await getDemoUser();
  next();
}

/**
 * Requires an authenticated, active user.
 * NOTE: Auth is temporarily disabled — every request is treated as an
 * authenticated SUPER_ADMIN. Re-enable by restoring the original logic.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = await getDemoUser();
  next();
}

/**
 * CSRF protection for cookie-authenticated state-changing requests.
 * Frontends read the CSRF cookie and echo it in X-CSRF-Token header.
 */
/** CSRF is temporarily disabled — always passes through. */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  next();
}
