// Auth routes - Register, Login, Logout, Me
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { setCookie, deleteCookie } from 'hono/cookie';
import { registerSchema, loginSchema, type RegisterInput, type LoginInput } from './validation';
import { hashPassword, verifyPassword, createSessionToken, getSessionCookieOptions, getAuthSecret, generateSessionToken, SESSION_COOKIE_NAME } from './utils';
import prismaClient from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { authMiddleware, type AuthVariables } from '../middleware/auth';

const auth = new Hono<{ Variables: AuthVariables }>();

// In-memory user & session cache for DB-offline fallback
export const inMemoryUsers = new Map<string, any>();

// POST /auth/register
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json') as RegisterInput;
  const secret = getAuthSecret(c);

  if (!secret) {
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Authentication not configured' } }, 500);
  }

  // Check for existing user
  let existingUser: any = null;
  try {
    existingUser = await prismaClient.user.findFirst({
      where: {
        OR: [
          { email: body.email },
          ...(body.username ? [{ username: body.username }] : []),
        ],
      },
    });
  } catch (dbError) {
    existingUser = Array.from(inMemoryUsers.values()).find(
      (u) => u.email === body.email || (body.username && u.username === body.username)
    );
  }

  if (existingUser) {
    return c.json(
      { error: { code: 'CONFLICT', message: 'An account with this email or username already exists' } },
      409
    );
  }

  // Hash password
  const passwordHash = await hashPassword(body.password);

  let user: any = null;
  const displayName = body.displayName || body.username || body.email.split('@')[0];

  try {
    user = await prismaClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const newUser = await tx.user.create({
        data: {
          email: body.email,
          username: body.username,
          passwordHash,
          status: 'ACTIVE',
        },
      });

      await tx.profile.create({
        data: {
          userId: newUser.id,
          displayName,
        },
      });

      return newUser;
    });
  } catch (dbError) {
    user = {
      id: `usr_reg_${Date.now()}`,
      email: body.email,
      username: body.username || null,
      passwordHash,
      status: 'ACTIVE',
      role: 'STUDENT',
      displayName,
    };
    inMemoryUsers.set(user.email, user);
    inMemoryUsers.set(user.id, user);
    if (user.username) {
      inMemoryUsers.set(user.username, user);
    }
  }

  // Create session in database
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prismaClient.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt,
    },
  }).catch(() => {});

  // Fetch profile for displayName
  let profile: any = null;
  try {
    profile = await prismaClient.profile.findUnique({
      where: { userId: user.id },
    });
  } catch (dbError) {
    profile = { displayName: user.displayName || displayName };
  }

  // Create JWT token for cookie
  const jwtToken = await createSessionToken(user.id, sessionToken, secret);
  const cookieOptions = getSessionCookieOptions(c);
  setCookie(c, SESSION_COOKIE_NAME, jwtToken, cookieOptions);

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      status: user.status,
      role: user.role,
      displayName: profile?.displayName || user.displayName || displayName,
    },
  }, 201);
});

// POST /auth/login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json') as LoginInput;
  const secret = getAuthSecret(c);

  if (!secret) {
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Authentication not configured' } }, 500);
  }

  // Find user by email
  let user: any = null;
  try {
    user = await prismaClient.user.findUnique({
      where: { email: body.email },
    });
  } catch (dbError) {
    user = inMemoryUsers.get(body.email);
  }

  if (!user || !user.passwordHash) {
    // Generic error to prevent account enumeration
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } },
      401
    );
  }

  // Verify password
  const isValid = await verifyPassword(user.passwordHash, body.password);
  if (!isValid) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } },
      401
    );
  }

  if (user.status !== 'ACTIVE') {
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'Account is not active' } },
      403
    );
  }

  // Update last login
  await prismaClient.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  }).catch(() => {});

  // Create session in database
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prismaClient.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt,
    },
  }).catch(() => {});

  // Fetch profile for displayName
  let profile: any = null;
  try {
    profile = await prismaClient.profile.findUnique({
      where: { userId: user.id },
    });
  } catch (dbError) {
    profile = { displayName: user.displayName || user.username || user.email.split('@')[0] };
  }

  // Create JWT token for cookie
  const jwtToken = await createSessionToken(user.id, sessionToken, secret);
  const cookieOptions = getSessionCookieOptions(c);
  setCookie(c, SESSION_COOKIE_NAME, jwtToken, cookieOptions);

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      status: user.status,
      role: user.role,
      displayName: profile?.displayName || user.displayName || null,
    },
  });
});

// POST /auth/logout
auth.post('/logout', authMiddleware, async (c) => {
  const session = c.get('session');
  const secret = getAuthSecret(c);

  if (!secret) {
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Authentication not configured' } }, 500);
  }

  // Delete session from database
  await prismaClient.session.delete({
    where: { token: session.token },
  }).catch(() => {});

  // Clear cookie
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });

  return c.json({ message: 'Logged out successfully' });
});

// GET /auth/me
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');

  // Fetch profile for additional info
  let profile: any = null;
  try {
    profile = await prismaClient.profile.findUnique({
      where: { userId: user.id },
    });
  } catch (dbError) {
    profile = null;
  }

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      status: user.status,
      role: user.role,
      displayName: profile?.displayName || null,
    },
  });
});

export default auth;