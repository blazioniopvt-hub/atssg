// Auth utilities - Password hashing and token generation
import argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import { env } from 'hono/adapter';

export const SESSION_COOKIE_NAME = 'skillsync_session';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createSessionToken(userId: string, sessionToken: string, secret: string): Promise<string> {
  const jwt = await new SignJWT({ userId, token: sessionToken })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(secret));
  return jwt;
}

export async function verifySessionToken(jwtToken: string, secret: string): Promise<{ userId: string; token: string } | null> {
  try {
    const { payload } = await jwtVerify(jwtToken, new TextEncoder().encode(secret));
    return {
      userId: payload.userId as string,
      token: payload.token as string,
    };
  } catch {
    return null;
  }
}

export function getAuthSecret(c: any): string {
  const e = env(c);
  return e.AUTH_SECRET as string;
}

export function getSessionCookieOptions(c: any) {
  const e = env(c);
  const isProduction = e.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}