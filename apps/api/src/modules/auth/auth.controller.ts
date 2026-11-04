import type { Request, Response } from 'express';
import { ok, created } from '../../lib/response';
import { env } from '../../config/env';
import { ApiError } from '../../lib/errors';
import * as authService from './auth.service';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../middleware/auth';
import { randomToken, sha256 } from '../../lib/crypto';
import { redis } from '../../lib/redis';

const ACCESS_MAX_AGE = env.ACCESS_TOKEN_TTL * 1000;
const REFRESH_MAX_AGE = env.REFRESH_TOKEN_TTL * 1000;

function setAuthCookies(res: Response, access: string, refresh: string, csrf: string) {
  const base = {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
  res.cookie(ACCESS_COOKIE, access, { ...base, maxAge: ACCESS_MAX_AGE });
  res.cookie(REFRESH_COOKIE, refresh, { ...base, maxAge: REFRESH_MAX_AGE, path: '/api/v1/auth' });
  res.cookie(env.CSRF_COOKIE_NAME, csrf, {
    httpOnly: false,
    secure: base.secure,
    sameSite: 'lax',
    maxAge: ACCESS_MAX_AGE,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  res.clearCookie(env.CSRF_COOKIE_NAME);
}

export async function register(req: Request, res: Response) {
  const user = await authService.register(req.body);
  return created(res, user);
}

export async function verifyEmail(req: Request, res: Response) {
  const result = await authService.verifyEmail(req.body.token);
  return ok(res, result);
}

export async function resendVerification(req: Request, res: Response) {
  const { email } = req.body;
  const user = await prismaUserByEmail(email);
  if (!user || user.status !== 'PENDING_VERIFICATION') {
    return ok(res, { ok: true });
  }
  const token = randomToken(32);
  await redis.set(`verify:${sha256(token)}`, user.id, 'EX', 24 * 60 * 60);
  const link = `${env.STOREFRONT_URL}/verify-email?token=${token}`;
  const { notify } = await import('../../lib/notifications');
  await notify({
    email,
    channel: 'EMAIL',
    type: 'EMAIL_VERIFICATION',
    subject: 'Verify your email address',
    body: `Please verify your email to activate your account:\n${link}`,
    html: `<p>Please <a href="${link}">verify your email</a> to activate your account.</p>`,
  });
  return ok(res, { ok: true });
}

import { prisma as prismaClient } from '../../lib/prisma';
async function prismaUserByEmail(email: string) {
  return prismaClient.user.findUnique({ where: { email } });
}

export async function login(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  const csrf = randomToken(24);
  setAuthCookies(res, accessToken, refreshToken, csrf);
  await redis.set(`csrf:${csrf}`, user.id, 'EX', env.ACCESS_TOKEN_TTL);
  return ok(res, { user });
}

export async function logout(req: Request, res: Response) {
  const refresh = req.cookies?.[REFRESH_COOKIE];
  await authService.logout(refresh);
  clearAuthCookies(res);
  return ok(res, { ok: true });
}

export async function refresh(req: Request, res: Response) {
  const received = (req.body.refreshToken as string | undefined) ?? req.cookies?.[REFRESH_COOKIE];
  const { accessToken, refreshToken } = await authService.refresh(received);
  const csrf = randomToken(24);
  setAuthCookies(res, accessToken, refreshToken, csrf);
  return ok(res, { ok: true });
}

export async function forgotPassword(req: Request, res: Response) {
  const result = await authService.forgotPassword(req.body.email);
  return ok(res, result);
}

export async function resetPassword(req: Request, res: Response) {
  const result = await authService.resetPassword(req.body);
  return ok(res, result);
}

export async function changePassword(req: Request, res: Response) {
  const result = await authService.changePassword(
    req.user!.id,
    req.body.currentPassword,
    req.body.newPassword,
  );
  return ok(res, result);
}

export async function me(req: Request, res: Response) {
  const user = await authService.me(req.user!.id);
  return ok(res, user);
}

export async function updateMe(req: Request, res: Response) {
  const { firstName, lastName, phone } = req.body;
  const user = await authService.updateProfile(req.user!.id, { firstName, lastName, phone });
  return ok(res, user);
}

export async function requireVerified(req: Request, _res: Response, next: import('express').NextFunction) {
  const user = await prismaClient.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.emailVerifiedAt) return next(new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email first'));
  next();
}
