// Auth Integration Tests: register → login → me → logout
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  app,
  createTestUser,
  createTestSession,
  cleanupTestData,
  makeAuthenticatedRequest,
  testPrisma,
} from './setup';
import { getAuthSecret, SESSION_COOKIE_NAME } from '../auth/utils';
import { inMemoryUsers } from '../auth/routes';

describe('Auth Flow Integration Tests', () => {
  let testUser: { user: any; password: string };
  let authCookie: string;

  beforeAll(async () => {
    testUser = await createTestUser({
      email: 'auth-test@example.com',
      username: 'authtestuser',
      password: 'TestPassword123!',
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  beforeEach(async () => {
    await testPrisma.session.deleteMany({}).catch(() => {});
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return user data with session cookie', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'NewPassword123!',
          displayName: 'New User',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('newuser@example.com');
      expect(data.user.username).toBe('newuser');
      expect(data.user.displayName).toBe('New User');
      expect(data.user.role).toBe('STUDENT');

      const cookies = res.headers.get('set-cookie');
      expect(cookies).toContain(SESSION_COOKIE_NAME);
    });

    it('should reject registration with existing email', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.user.email,
          username: 'differentuser',
          password: 'TestPassword123!',
        }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error.code).toBe('CONFLICT');
    });

    it('should reject registration with existing username', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'different@example.com',
          username: testUser.user.username,
          password: 'TestPassword123!',
        }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error.code).toBe('CONFLICT');
    });

    it('should reject registration with invalid email', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          username: 'testuser',
          password: 'TestPassword123!',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject registration with weak password', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'weakpass@example.com',
          username: 'weakpassuser',
          password: 'weak',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials and return session cookie', async () => {
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.user.email,
          password: testUser.password,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.user.email);
      expect(data.user.id).toBe(testUser.user.id);

      const cookies = res.headers.get('set-cookie');
      expect(cookies).toContain(SESSION_COOKIE_NAME);
      authCookie = cookies?.split(';')[0] || '';
    });

    it('should reject login with wrong password', async () => {
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.user.email,
          password: 'WrongPassword123!',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject login with non-existent email', async () => {
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject login for inactive user', async () => {
      // Create a dedicated user for this test
      const inactiveUser = await createTestUser({
        email: 'inactive-test@example.com',
        username: 'inactivetestuser',
        password: 'TestPassword123!',
      });

      inactiveUser.user.status = 'INACTIVE';
      if (inMemoryUsers.has(inactiveUser.user.email)) {
        inMemoryUsers.get(inactiveUser.user.email).status = 'INACTIVE';
      }
      await testPrisma.user.update({
        where: { id: inactiveUser.user.id },
        data: { status: 'INACTIVE' },
      }).catch(() => {});

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inactiveUser.user.email,
          password: inactiveUser.password,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe('FORBIDDEN');

      inactiveUser.user.status = 'ACTIVE';
      if (inMemoryUsers.has(inactiveUser.user.email)) {
        inMemoryUsers.get(inactiveUser.user.email).status = 'ACTIVE';
      }
      await testPrisma.user.update({
        where: { id: inactiveUser.user.id },
        data: { status: 'ACTIVE' },
      }).catch(() => {});
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user data with valid session', async () => {
      const loginRes = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.user.email,
          password: testUser.password,
        }),
      });

      const cookies = loginRes.headers.get('set-cookie');
      const cookie = cookies?.split(';')[0] || '';

      const res = await app.request('/auth/me', {
        method: 'GET',
        headers: { Cookie: cookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(testUser.user.id);
      expect(data.user.email).toBe(testUser.user.email);
      expect(data.user.username).toBe(testUser.user.username);
    });

    it('should reject request without session cookie', async () => {
      const res = await app.request('/auth/me', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject request with invalid session cookie', async () => {
      const res = await app.request('/auth/me', {
        method: 'GET',
        headers: { Cookie: `${SESSION_COOKIE_NAME}=invalid.token.here` },
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully and clear session cookie', async () => {
      const loginRes = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.user.email,
          password: testUser.password,
        }),
      });

      const cookies = loginRes.headers.get('set-cookie');
      const cookie = cookies?.split(';')[0] || '';

      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: { Cookie: cookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('Logged out successfully');

      const clearCookie = res.headers.get('set-cookie');
      expect(clearCookie).toContain(`${SESSION_COOKIE_NAME}=;`);
    });

    it('should reject logout without session', async () => {
      const res = await app.request('/auth/logout', {
        method: 'POST',
      });

      expect(res.status).toBe(401);
    });

    it('should invalidate session after logout', async () => {
      const loginRes = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.user.email,
          password: testUser.password,
        }),
      });

      const cookies = loginRes.headers.get('set-cookie');
      const cookie = cookies?.split(';')[0] || '';

      await app.request('/auth/logout', {
        method: 'POST',
        headers: { Cookie: cookie },
      });

      const res = await app.request('/auth/me', {
        method: 'GET',
        headers: { Cookie: cookie },
      });

      expect(res.status).toBe(401);
    });
  });

  describe('Full Auth Flow', () => {
    it('should complete full register → login → me → logout flow', async () => {
      // Register
      const registerRes = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'flowtest@example.com',
          username: 'flowtestuser',
          password: 'FlowTest123!',
          displayName: 'Flow Test User',
        }),
      });
      expect(registerRes.status).toBe(201);

      const registerCookies = registerRes.headers.get('set-cookie');
      const registerCookie = registerCookies?.split(';')[0] || '';

      // Me after register
      const meAfterRegister = await app.request('/auth/me', {
        method: 'GET',
        headers: { Cookie: registerCookie },
      });
      expect(meAfterRegister.status).toBe(200);

      // Logout
      const logoutRes = await app.request('/auth/logout', {
        method: 'POST',
        headers: { Cookie: registerCookie },
      });
      expect(logoutRes.status).toBe(200);

      // Login again
      const loginRes = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'flowtest@example.com',
          password: 'FlowTest123!',
        }),
      });
      expect(loginRes.status).toBe(200);

      const loginCookies = loginRes.headers.get('set-cookie');
      const loginCookie = loginCookies?.split(';')[0] || '';

      // Me after login
      const meAfterLogin = await app.request('/auth/me', {
        method: 'GET',
        headers: { Cookie: loginCookie },
      });
      expect(meAfterLogin.status).toBe(200);
      const meData = await meAfterLogin.json();
      expect(meData.user.email).toBe('flowtest@example.com');
    });
  });
});