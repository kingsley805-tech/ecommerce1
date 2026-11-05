import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../lib/crypto';
import { env } from '../config/env';

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

function unauthorized(res: Response, message = 'Not authenticated') {
  return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message } });
}

/**
 * Populates req.user if a valid access token is present, never throws.
 * Unauthenticated requests continue without a user.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = (req.cookies as Record<string, string | undefined> | undefined)?.[ACCESS_COOKIE];
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, status: true },
      });
      if (user && user.status === 'ACTIVE') {
        req.user = { id: user.id, role: payload.role, email: user.email };
      }
    } catch {
      /* invalid token — treat as unauthenticated */
    }
  }
  next();
}

/**
 * Requires a valid access token and an active user.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = (req.cookies as Record<string, string | undefined> | undefined)?.[ACCESS_COOKIE];
  if (!token) return unauthorized(res);
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') return unauthorized(res, 'Account is not active');
    req.user = { id: user.id, role: payload.role, email: user.email };
    next();
  } catch {
    return unauthorized(res, 'Invalid or expired session');
  }
}

/**
 * CSRF protection for cookie-authenticated state-changing requests.
 * Frontends echo the csrf cookie in the X-CSRF-Token header.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const header = req.headers['x-csrf-token'];
  const cookie = (req.cookies as Record<string, string | undefined> | undefined)?.[env.CSRF_COOKIE_NAME];
  if (!header || !cookie || header !== cookie) {
    return res.status(403).json({ success: false, error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token' } });
  }
  next();
}
