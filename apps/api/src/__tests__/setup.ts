// Test setup and utilities for integration tests
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/skillsync?schema=public';
}
if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = 'dev-secret-change-in-production-min-32-chars';
}

import prismaClient from '../lib/prisma';
import { hashPassword, createSessionToken, getAuthSecret, generateSessionToken, SESSION_COOKIE_NAME } from '../auth/utils';
import { inMemoryUsers } from '../auth/routes';
import { createTestApp } from './test-app';

const prisma = prismaClient;

export const testPrisma = prisma;

export const app = createTestApp();

export async function createTestUser(overrides: Partial<{
  email: string;
  username: string;
  password: string;
  role: string;
  status: string;
}> = {}) {
  const email = overrides.email || `test-${Date.now()}@example.com`;
  const username = overrides.username || `testuser${Date.now()}`;
  const password = overrides.password || 'TestPassword123!';
  const role = overrides.role || 'STUDENT';
  const status = overrides.status || 'ACTIVE';

  const passwordHash = await hashPassword(password);

  let createdUser: any = null;
  try {
    createdUser = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role: role as any,
        status: status as any,
      },
    });
  } catch {
    createdUser = {
      id: `usr_test_${Date.now()}`,
      email,
      username,
      passwordHash,
      role: role as any,
      status: status as any,
      defaultOrgId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      lastLoginAt: null,
    };
  }

  inMemoryUsers.set(createdUser.email, createdUser);
  inMemoryUsers.set(createdUser.id, createdUser);
  if (createdUser.username) {
    inMemoryUsers.set(createdUser.username, createdUser);
  }

  return { user: createdUser, password };
}

export async function createTestSession(userId: string) {
  const secret = getAuthSecret({} as any) || 'dev-secret-change-in-production-min-32-chars';
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  let session: any;
  try {
    session = await prisma.session.create({
      data: {
        userId,
        token: sessionToken,
        expiresAt,
      },
    });
  } catch {
    session = {
      id: `sess_test_${Date.now()}`,
      userId,
      token: sessionToken,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const jwtToken = await createSessionToken(userId, sessionToken, secret);
  return { session, jwtToken, sessionToken };
}

export async function cleanupTestData() {
  inMemoryUsers.clear();
  try {
    await prisma.session.deleteMany({});
    await prisma.skillEvidence.deleteMany({});
    await prisma.userSkill.deleteMany({});
    await prisma.projectSkill.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.resume.deleteMany({});
    await prisma.aIExtractionJob.deleteMany({});
    await prisma.skillRelationship.deleteMany({});
    await prisma.skill.deleteMany({});
    await prisma.profile.deleteMany({});
    await prisma.user.deleteMany({});
  } catch {
    // Database is offline; skip cleanup
  }
}

export async function createTestSkill(data: {
  name: string;
  slug: string;
  category?: string;
  description?: string;
}) {
  try {
    return await prisma.skill.create({
      data: {
        name: data.name,
        slug: data.slug,
        category: data.category as any || 'PROGRAMMING',
        description: data.description,
      },
    });
  } catch {
    return {
      id: `sk_test_${data.slug}`,
      name: data.name,
      slug: data.slug,
      category: (data.category || 'PROGRAMMING') as any,
      subcategory: null,
      description: data.description || null,
      iconUrl: null,
      isVerified: true,
      demandLevel: 'MEDIUM' as any,
      organizationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
  }
}

export function makeAuthenticatedRequest(jwtToken: string) {
  return {
    headers: {
      Cookie: `${SESSION_COOKIE_NAME}=${jwtToken}`,
    },
  };
}