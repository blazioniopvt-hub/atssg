// Auth middleware - Session validation + RBAC
import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { UserRole as PrismaUserRole, OrgUserRole as PrismaOrgUserRole } from '@prisma/client';
import type { UserRole, OrgUserRole } from '@prisma/client';
import { verifySessionToken, getAuthSecret, SESSION_COOKIE_NAME } from '../auth/utils';
import { inMemoryUsers } from '../auth/routes';
import prismaClient from '../lib/prisma';
import type { Context } from 'hono';

// Safe runtime fallback for enums when bundled into Webpack / Next.js server environments
const ResolvedUserRole = PrismaUserRole || {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  FACULTY: 'FACULTY',
  PLACEMENT_OFFICER: 'PLACEMENT_OFFICER',
  STUDENT: 'STUDENT',
  RECRUITER: 'RECRUITER',
  ALUMNI: 'ALUMNI',
};

const ResolvedOrgUserRole = PrismaOrgUserRole || {
  ORG_ADMIN: 'ORG_ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
};

export interface AuthVariables {
  user: {
    id: string;
    email: string;
    username: string | null;
    status: string;
    role: UserRole;
    isSuperAdmin: boolean;
    isAdmin: boolean;
    defaultOrgId: string | null;
  };
  session: {
    id: string;
    token: string;
    expiresAt: Date;
  };
  org: {
    id: string;
    slug: string;
    role: OrgUserRole;
  } | null;
}

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const secret = getAuthSecret(c);
  if (!secret) {
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Authentication not configured' } }, 500);
  }

  const authHeader = c.req.header('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const rawToken = getCookie(c, SESSION_COOKIE_NAME) || bearerToken;
  if (!rawToken) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  const verified = await verifySessionToken(rawToken, secret);
  if (!verified) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' } }, 401);
  }

  const isProduction = process.env.NODE_ENV === 'production';

  let session: any = null;
  try {
    session = await prismaClient.session.findUnique({
      where: { token: verified.token },
      include: { user: true },
    });
  } catch (dbError) {
    if (isProduction) {
      console.error('Database query failed during authentication in production:', dbError);
      return c.json({ error: { code: 'SERVER_ERROR', message: 'Authentication service temporarily unavailable' } }, 503);
    }
    // Non-production fallback when PostgreSQL is offline
    if (process.env.NODE_ENV !== 'test') {
      console.warn('PostgreSQL database query failed, using in-memory demo session context.');
    }
    const memUser = inMemoryUsers.get(verified.userId);
    session = {
      id: 'sess_demo_123',
      token: verified.token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      user: memUser ? {
        id: memUser.id,
        email: memUser.email,
        username: memUser.username || 'user',
        status: memUser.status || 'ACTIVE',
        role: memUser.role || ResolvedUserRole.STUDENT,
        defaultOrgId: memUser.defaultOrgId || null,
      } : {
        id: verified.userId || 'usr_student_alex',
        email: verified.userId?.toLowerCase().includes('admin') ? 'admin@skillsync.io' : 'alex.chen@stanford.edu',
        username: verified.userId?.toLowerCase().includes('admin') ? 'admin' : 'alexchen',
        status: 'ACTIVE',
        role: verified.userId?.toLowerCase().includes('admin') ? ResolvedUserRole.ADMIN : ResolvedUserRole.STUDENT,
        defaultOrgId: null,
      },
    };
  }

  if (!session) {
    if (isProduction) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' } }, 401);
    }
    // Graceful non-production fallback for demo tokens when session object isn't in database
    const memUser = inMemoryUsers.get(verified.userId);
    session = {
      id: 'sess_demo_123',
      token: verified.token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      user: memUser ? {
        id: memUser.id,
        email: memUser.email,
        username: memUser.username || 'user',
        status: memUser.status || 'ACTIVE',
        role: memUser.role || ResolvedUserRole.STUDENT,
        defaultOrgId: memUser.defaultOrgId || null,
      } : {
        id: verified.userId || 'usr_student_alex',
        email: verified.userId?.toLowerCase().includes('admin') ? 'admin@skillsync.io' : 'alex.chen@stanford.edu',
        username: verified.userId?.toLowerCase().includes('admin') ? 'admin' : 'alexchen',
        status: 'ACTIVE',
        role: verified.userId?.toLowerCase().includes('admin') ? ResolvedUserRole.ADMIN : ResolvedUserRole.STUDENT,
        defaultOrgId: null,
      },
    };
  }

  if (session.expiresAt < new Date()) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Session expired' } }, 401);
  }

  if (session.user.status !== 'ACTIVE') {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Account is not active' } }, 403);
  }

  const isSuperAdmin = session.user.role === ResolvedUserRole.SUPER_ADMIN;
  const isAdmin = isSuperAdmin || session.user.role === ResolvedUserRole.ADMIN;

  // Resolve organization context
  let orgContext: AuthVariables['org'] = null;
  if (session.user.defaultOrgId) {
    const userOrg = await prismaClient.userOrganization.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: session.user.defaultOrgId } },
      include: { organization: true },
    });
    if (userOrg) {
      orgContext = {
        id: userOrg.organization.id,
        slug: userOrg.organization.slug,
        role: userOrg.role,
      };
    }
  }

  c.set('user', {
    id: session.user.id,
    email: session.user.email,
    username: session.user.username,
    status: session.user.status,
    role: session.user.role,
    isSuperAdmin,
    isAdmin,
    defaultOrgId: session.user.defaultOrgId,
  });
  c.set('session', {
    id: session.id,
    token: session.token,
    expiresAt: session.expiresAt,
  });
  c.set('org', orgContext);

  await next();
});

export const optionalAuthMiddleware = createMiddleware<{ Variables: Partial<AuthVariables> }>(async (c, next) => {
  const secret = getAuthSecret(c);
  if (!secret) return next();

  const authHeader = c.req.header('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const rawToken = getCookie(c, SESSION_COOKIE_NAME) || bearerToken;
  if (!rawToken) return next();

  const verified = await verifySessionToken(rawToken, secret);
  if (!verified) return next();

  const session = await prismaClient.session.findUnique({
    where: { token: verified.token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || session.user.status !== 'ACTIVE') return next();

  const isSuperAdmin = session.user.role === ResolvedUserRole.SUPER_ADMIN;
  const isAdmin = isSuperAdmin || session.user.role === ResolvedUserRole.ADMIN;

  let orgContext: AuthVariables['org'] = null;
  if (session.user.defaultOrgId) {
    const userOrg = await prismaClient.userOrganization.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: session.user.defaultOrgId } },
      include: { organization: true },
    });
    if (userOrg) {
      orgContext = {
        id: userOrg.organization.id,
        slug: userOrg.organization.slug,
        role: userOrg.role,
      };
    }
  }

  c.set('user', {
    id: session.user.id,
    email: session.user.email,
    username: session.user.username,
    status: session.user.status,
    role: session.user.role,
    isSuperAdmin,
    isAdmin,
    defaultOrgId: session.user.defaultOrgId,
  });
  c.set('session', {
    id: session.id,
    token: session.token,
    expiresAt: session.expiresAt,
  });
  c.set('org', orgContext);

  await next();
});

// Admin-only middleware
export const adminMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const user = c.get('user');
  if (!user || !user.isAdmin) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, 403);
  }
  await next();
});

// Super admin only
export const superAdminMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const user = c.get('user');
  if (!user || !user.isSuperAdmin) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Super admin access required' } }, 403);
  }
  await next();
});

// Organization role guards
export function requireOrgRole(...allowedRoles: OrgUserRole[]) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const org = c.get('org');
    if (!org) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Organization context required' } }, 403);
    }
    if (!allowedRoles.includes(org.role)) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient organization permissions' } }, 403);
    }
    await next();
  });
}

export function requireAnyRole(...allowedRoles: UserRole[]) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const user = c.get('user');
    if (!user || !allowedRoles.includes(user.role)) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient role permissions' } }, 403);
    }
    await next();
  });
}

// Tenant scoping helper - automatically adds organizationId filter
export function withTenantScope<
  T extends Record<string, unknown>,
  K extends keyof T
>(c: Context<{ Variables: AuthVariables }>, baseWhere: T, whereKey: K = 'organizationId' as K): T {
  const org = c.get('org');
  const user = c.get('user');

  if (user.isSuperAdmin) {
    return baseWhere; // Super admin sees all
  }

  if (org) {
    return { ...baseWhere, [whereKey]: org.id } as T;
  }

  if (user.defaultOrgId) {
    return { ...baseWhere, [whereKey]: user.defaultOrgId } as T;
  }

  return { ...baseWhere, [whereKey]: 'NO_ORG_CONTEXT' } as T; // Will match nothing
}