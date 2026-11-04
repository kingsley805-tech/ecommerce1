import type { NextFunction, Request, Response } from 'express';

/**
 * Super admin bypasses granular permission checks.
 * NOTE: Auth is temporarily disabled — all permission checks pass through.
 */
export function requirePermission(...permissions: string[]) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    void permissions;
    next();
  };
}

/** NOTE: Auth is temporarily disabled — role checks pass through. */
export function requireRole(...roles: string[]) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    void roles;
    next();
  };
}
