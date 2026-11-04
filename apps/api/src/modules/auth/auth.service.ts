import argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { ApiError } from '../../lib/errors';
import {
  randomToken,
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../lib/crypto';
import { env } from '../../config/env';
import { notify } from '../../lib/notifications';
import type { LoginInput, RegisterInput, ResetPasswordInput } from '@commerce/validation';

const VERIFY_TTL = 24 * 60 * 60;
const RESET_TTL = 60 * 60;

export function userPublic(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  roles: { role: { key: string } }[];
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    phone: user.phone,
    status: user.status,
    role: user.roles[0]?.role.key ?? 'CUSTOMER',
  };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
  }

  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      status: 'PENDING_VERIFICATION',
      customerProfile: { create: { consentNewsletter: input.newsletter } },
      roles: { create: { role: { connect: { key: 'CUSTOMER' } } } },
    },
    include: { roles: { include: { role: true } } },
  });

  await sendVerificationEmail(user.id, input.email);
  return userPublic(user);
}

async function sendVerificationEmail(userId: string, email: string) {
  const token = randomToken(32);
  const tokenKey = `verify:${sha256(token)}`;
  await redis.set(tokenKey, userId, 'EX', VERIFY_TTL);
  const link = `${env.STOREFRONT_URL}/verify-email?token=${token}`;
  await notify({
    email,
    channel: 'EMAIL',
    type: 'EMAIL_VERIFICATION',
    subject: 'Verify your email address',
    body: `Welcome! Please verify your email to activate your account:\n${link}`,
    html: `<p>Welcome!</p><p>Please <a href="${link}">verify your email</a> to activate your account.</p>`,
  });
}

export async function verifyEmail(token: string) {
  const tokenKey = `verify:${sha256(token)}`;
  const userId = await redis.get(tokenKey);
  if (!userId) throw new ApiError(400, 'INVALID_TOKEN', 'This verification link is invalid or expired');
  await redis.del(tokenKey);
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
  });
  return { ok: true };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { roles: { include: { role: true } } },
  });
  if (!user) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  const valid = await argon2.verify(user.passwordHash, input.password);
  if (!valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  const { access, refresh, refreshRecord } = await issueTokenPair(user.id);
  void refreshRecord;
  return {
    user: userPublic(user),
    accessToken: access,
    refreshToken: refresh,
  };
}

export async function issueTokenPair(userId: string) {
  const role = await resolveRole(userId);
  const access = signAccessToken(userId, role);

  const jti = randomToken(16);
  const refresh = signRefreshToken(userId, jti);
  const refreshRecord = await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(refresh),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL * 1000),
    },
  });
  return { access, refresh, refreshRecord };
}

async function resolveRole(userId: string): Promise<string> {
  const row = await prisma.userRole.findFirst({
    where: { userId },
    select: { role: { select: { key: true } } },
  });
  return row?.role.key ?? 'CUSTOMER';
}

export async function refresh(refreshToken: string) {
  if (!refreshToken) throw new ApiError(401, 'NO_REFRESH_TOKEN', 'Missing refresh token');
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
  }

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(refreshToken) },
  });
  if (!record || record.revokedAt) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token has been revoked');
  }
  if (record.expiresAt < new Date()) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token has expired');
  }
  if (record.userId !== payload.sub) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token mismatch');
  }

  // rotate: revoke old, issue new
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });
  const { access, refresh, refreshRecord } = await issueTokenPair(record.userId);
  return {
    accessToken: access,
    refreshToken: refresh,
    refreshRecordId: refreshRecord.id,
  };
}

export async function logout(refreshToken: string | undefined) {
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  return { ok: true };
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: true }; // don't leak account existence
  const token = randomToken(32);
  const tokenKey = `reset:${sha256(token)}`;
  await redis.set(tokenKey, user.id, 'EX', RESET_TTL);
  const link = `${env.STOREFRONT_URL}/reset-password?token=${token}`;
  await notify({
    email,
    channel: 'EMAIL',
    type: 'PASSWORD_RESET',
    subject: 'Reset your password',
    body: `We received a request to reset your password. Open this link to set a new one:\n${link}\nThis link expires in 60 minutes.`,
    html: `<p>We received a request to reset your password.</p><p><a href="${link}">Set a new password</a></p><p>This link expires in 60 minutes.</p>`,
  });
  return { ok: true };
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenKey = `reset:${sha256(input.token)}`;
  const userId = await redis.get(tokenKey);
  if (!userId) throw new ApiError(400, 'INVALID_TOKEN', 'This reset link is invalid or expired');
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  await redis.del(tokenKey);
  return { ok: true };
}

export async function changePassword(userId: string, current: string, nextPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  const valid = await argon2.verify(user.passwordHash, current);
  if (!valid) throw new ApiError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
  const passwordHash = await argon2.hash(nextPassword, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { ok: true };
}

export async function me(userId: string) {
  if (userId === 'demo-user') {
    return {
      id: 'demo-user',
      email: 'admin@gmail.com',
      firstName: 'Admin',
      lastName: 'User',
      fullName: 'Admin User',
      phone: null,
      status: 'ACTIVE',
      role: 'SUPER_ADMIN',
    };
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: { include: { role: true } },
      customerProfile: true,
      addresses: { orderBy: { isDefault: 'desc' } },
    },
  });
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  return userPublic(user);
}

export async function updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    include: { roles: { include: { role: true } } },
  });
  await redis.del(`user:${userId}`);
  return userPublic(user);
}

export function dbUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  );
}
