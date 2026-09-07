import {
  app,
  createTestUser,
  createTestSession,
  cleanupTestData,
} from './setup';
import { entitlementService, PLATFORM_PLANS } from '../services/billing/entitlement';
import { productionConfigValidator } from '../services/billing/production-config';

describe('Phase 15: Billing, Entitlements & Production Platform Readiness', () => {
  let studentUser: any;
  let studentToken: string;
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    await cleanupTestData();
    entitlementService.reset();

    const studentRes = await createTestUser({ email: 'billing_student@test.io', username: 'billing_student', role: 'STUDENT' });
    studentUser = studentRes.user;
    const studentSess = await createTestSession(studentUser.id);
    studentToken = studentSess.jwtToken;

    const adminRes = await createTestUser({ email: 'billing_admin@test.io', username: 'billing_admin', role: 'ADMIN' });
    adminUser = adminRes.user;
    const adminSess = await createTestSession(adminUser.id);
    adminToken = adminSess.jwtToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    entitlementService.reset();
  });

  describe('Plans & Tier Definitions', () => {
    it('1. GET /billing/plans returns public plans and limits', async () => {
      const res = await app.request('/billing/plans');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(4);

      const planCodes = json.data.map((p: any) => p.planCode);
      expect(planCodes).toContain('FREE');
      expect(planCodes).toContain('PRO');
      expect(planCodes).toContain('ORGANIZATION');
      expect(planCodes).toContain('ENTERPRISE');
    });

    it('2. GET /billing/subscription returns default FREE plan for student', async () => {
      const res = await app.request('/billing/subscription', {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.planCode).toBe('FREE');
      expect(json.data.features.resumeUploadsPerMonth).toBe(3);
    });
  });

  describe('Entitlement Enforcement & Metering', () => {
    beforeEach(() => {
      entitlementService.reset();
    });

    it('3. allows action when within free quota and blocks when exhausted', async () => {
      const userId = studentUser.id;

      // Initial check should be allowed (limit is 3 for resumeUploadsPerMonth)
      const check1 = await entitlementService.canPerformAction(userId, 'resumeUploadsPerMonth');
      expect(check1.allowed).toBe(true);
      expect(check1.currentUsage).toBe(0);

      // Record 3 usages
      await entitlementService.recordUsage(userId, 'resumeUploadsPerMonth', 3);

      // 4th check should be denied
      const check2 = await entitlementService.canPerformAction(userId, 'resumeUploadsPerMonth');
      expect(check2.allowed).toBe(false);
      expect(check2.currentUsage).toBe(3);
      expect(check2.reason).toContain('quota reached');
    });

    it('4. blocks gated features not included in lower tier', async () => {
      const userId = studentUser.id;

      // customCohorts is false on FREE plan
      const cohortCheck = await entitlementService.canPerformAction(userId, 'customCohorts');
      expect(cohortCheck.allowed).toBe(false);
      expect(cohortCheck.reason).toContain('not included in the FREE plan');
    });

    it('5. POST /billing/upgrade transitions user to PRO plan with expanded limits', async () => {
      const res = await app.request('/billing/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({ planCode: 'PRO' }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.planCode).toBe('PRO');
      expect(json.data.features.resumeUploadsPerMonth).toBe(50);
      expect(json.data.features.aiCoachMessagesPerDay).toBe(200);
    });

    it('6. GET /billing/usage returns aggregated usage report', async () => {
      const res = await app.request('/billing/usage', {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.usage).toBeDefined();
      expect(json.data.usage.resumeUploadsPerMonth).toBeDefined();
      expect(json.data.usage.aiCoachMessagesPerDay).toBeDefined();
    });
  });

  describe('Production Configuration Validator', () => {
    it('7. validates runtime environment configuration and detects missing mandatory variables', () => {
      const invalidEnv = {
        PORT: '4000',
        // Missing JWT_SECRET
      };

      const result = productionConfigValidator.validate(invalidEnv);
      expect(result.isValid).toBe(false);
      expect(result.warnings.some((w: string) => w.includes('JWT_SECRET'))).toBe(true);
    });

    it('8. succeeds when mandatory production variables are present', () => {
      const validEnv = {
        JWT_SECRET: 'super-secure-production-jwt-secret-min-32-chars',
        PORT: '4000',
        DATABASE_URL: 'postgresql://prod:secret@db.rds.amazonaws.com/skillsync',
        NODE_ENV: 'production',
      };

      const result = productionConfigValidator.validate(validEnv);
      expect(result.isValid).toBe(true);
      expect(result.environment).toBe('production');
      expect(result.mandatoryVars.JWT_SECRET).toBe(true);
      expect(result.mandatoryVars.PORT).toBe(true);
    });

    it('9. GET /billing/production-readiness exposes runtime operational status', async () => {
      const res = await app.request('/billing/production-readiness', {
        headers: {
          Cookie: `skillsync_session=${adminToken}`,
        },
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.mandatoryVars).toBeDefined();
      expect(json.data.warnings).toBeDefined();
    });
  });
});
