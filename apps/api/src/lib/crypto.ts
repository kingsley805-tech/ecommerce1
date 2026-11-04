import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function randomOrderNumber(prefix = 'ORD'): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

export function randomReference(prefix = 'PAY'): string {
  const rand = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}-${Date.now()}-${rand}`;
}

export interface AccessPayload {
  sub: string;
  role: string;
  type: 'access';
  csrf?: string;
}

export interface RefreshPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export function signAccessToken(userId: string, role: string): string {
  return jwt.sign(
    { sub: userId, role, type: 'access' } as AccessPayload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL },
  );
}

export function signRefreshToken(userId: string, jti: string): string {
  return jwt.sign({ sub: userId, jti, type: 'refresh' } as RefreshPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL,
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}
