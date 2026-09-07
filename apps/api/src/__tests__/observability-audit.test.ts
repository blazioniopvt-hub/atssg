import {
  app,
  createTestUser,
  createTestSession,
  cleanupTestData,
} from './setup';
import { auditLogService } from '../services/observability/audit-log';
import { aiObservabilityService } from '../services/observability/ai-observability';

describe('Phase 12: Analytics, Audit & Platform Observability', () => {
  let adminUser: any;
  let adminToken: string;
  let studentUser: any;
  let studentToken: string;

  beforeAll(async () => {
    await cleanupTestData();

    const adminRes = await createTestUser({ email: 'admin@skillsync.io', username: 'sysadmin', role: 'SUPER_ADMIN' });
    adminUser = adminRes.user;
    const adminSess = await createTestSession(adminUser.id);
    adminToken = adminSess.jwtToken;

    const studentRes = await createTestUser({ email: 'user@skillsync.io', username: 'regular_user', role: 'STUDENT' });
    studentUser = studentRes.user;
    const studentSess = await createTestSession(studentUser.id);
    studentToken = studentSess.jwtToken;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('1. should record audit log with automatic secret redaction', async () => {
    const log = await auditLogService.logAction({
      actorId: adminUser.id,
      action: 'ORGANIZATION_ROLE_UPDATED',
      resourceType: 'UserOrganization',
      resourceId: 'uorg_123',
      metadata: {
        targetRole: 'ADMIN',
        previousRole: 'MEMBER',
        passwordHash: '$2b$10$supersecret',
        apiKey: 'sk-secret-key-12345',
        safeNote: 'Promoted by institution dean',
      },
    });

    expect(log).toBeDefined();
    expect(log.action).toBe('ORGANIZATION_ROLE_UPDATED');
    expect(log.metadata).toBeDefined();
    expect(log.metadata.passwordHash).toBe('[REDACTED]');
    expect(log.metadata.apiKey).toBe('[REDACTED]');
    expect(log.metadata.safeNote).toBe('Promoted by institution dean');
  });

  it('2. should query audit logs with pagination and filters for admin', async () => {
    const res = await app.request('/admin/audit-logs?limit=10', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
    expect(json.total).toBeGreaterThanOrEqual(1);
  });

  it('3. should track AI request metrics and compute telemetry summary', async () => {
    await aiObservabilityService.recordMetric({
      provider: 'Fable 5.1',
      model: 'fable-pro-5.1',
      category: 'CAREER_COACH',
      latencyMs: 340,
      status: 'SUCCESS',
      tokensUsed: 420,
      estimatedCostUsd: 0.0012,
    });

    await aiObservabilityService.recordMetric({
      provider: 'OpenAI Fallback',
      model: 'gpt-4o-mini',
      category: 'WORK_SAMPLE_EVAL',
      latencyMs: 510,
      status: 'FALLBACK',
      tokensUsed: 310,
      estimatedCostUsd: 0.0008,
    });

    const res = await app.request('/admin/ai-observability?hours=24', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.totalRequests).toBeGreaterThanOrEqual(2);
    expect(json.data.avgLatencyMs).toBeGreaterThan(0);
    expect(json.data.byProvider).toBeDefined();
  });

  it('4. should retrieve platform-wide telemetry and health analytics', async () => {
    const res = await app.request('/admin/analytics', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.totalUsers).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(json.data.topInDemandSkills)).toBe(true);
  });

  it('5. should expose public liveness and readiness health endpoints', async () => {
    const liveRes = await app.request('/admin/health/liveness');
    expect(liveRes.status).toBe(200);
    const liveJson = await liveRes.json();
    expect(liveJson.status).toBe('healthy');

    const readyRes = await app.request('/admin/health/readiness');
    expect([200, 503]).toContain(readyRes.status);
  });

  it('6. should reject non-admin users from admin observability routes', async () => {
    const res = await app.request('/admin/audit-logs', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Access denied');
  });
});
