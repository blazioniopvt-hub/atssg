import crypto from 'crypto';
import {
  app,
  createTestUser,
  createTestSession,
  cleanupTestData,
} from './setup';
import { webhookHandlerService, inMemoryWebhookEvents } from '../services/integrations/webhook-handler';
import { gitProvider } from '../services/integrations/git-provider';
import { jobSourceProvider } from '../services/integrations/job-source-provider';

describe('Phase 13: Integrations & External Data Intelligence', () => {
  const secret = 'skillsync-default-webhook-secret-key-min-32-chars';

  let studentUser: any;
  let studentToken: string;
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    await cleanupTestData();
    inMemoryWebhookEvents.clear();

    const studentRes = await createTestUser({ email: 'integ_student@test.io', username: 'integ_student', role: 'STUDENT' });
    studentUser = studentRes.user;
    const studentSess = await createTestSession(studentUser.id);
    studentToken = studentSess.jwtToken;

    const adminRes = await createTestUser({ email: 'integ_admin@test.io', username: 'integ_admin', role: 'SUPER_ADMIN' });
    adminUser = adminRes.user;
    const adminSess = await createTestSession(adminUser.id);
    adminToken = adminSess.jwtToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    inMemoryWebhookEvents.clear();
  });

  describe('WebhookHandlerService', () => {
    it('1. verifies valid HMAC-SHA256 signature', () => {
      const payload = JSON.stringify({ action: 'sync_completed', candidateId: 'usr_123' });
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      const signature = hmac.digest('hex');

      const isValid = webhookHandlerService.verifySignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('2. rejects tampered/forged signature', () => {
      const payload = JSON.stringify({ action: 'sync_completed', candidateId: 'usr_123' });
      const invalidSignature = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

      const isValid = webhookHandlerService.verifySignature(payload, invalidSignature, secret);
      expect(isValid).toBe(false);
    });

    it('3. verifies fresh timestamp and rejects replay attack (> 300s)', () => {
      const nowSeconds = Math.floor(Date.now() / 1000).toString();
      expect(webhookHandlerService.verifyTimestamp(nowSeconds, 300)).toBe(true);

      // 10 minutes old → must be rejected
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
      expect(webhookHandlerService.verifyTimestamp(oldTimestamp, 300)).toBe(false);
    });

    it('4. deduplicates identical webhook events (idempotency)', async () => {
      const eventId = `evt_dedup_${Date.now()}`;
      const payload = { event: 'candidate_hire', id: '123' };

      const res1 = await webhookHandlerService.processWebhook({
        provider: 'GREENHOUSE',
        eventId,
        eventType: 'candidate_hire',
        payload,
        webhookSecret: secret,
      });
      expect(res1.status).toBe('PROCESSED');
      expect(res1.duplicate).toBe(false);

      const res2 = await webhookHandlerService.processWebhook({
        provider: 'GREENHOUSE',
        eventId,
        eventType: 'candidate_hire',
        payload,
        webhookSecret: secret,
      });
      expect(res2.status).toBe('ALREADY_PROCESSED');
      expect(res2.duplicate).toBe(true);
    });
  });

  describe('GitProvider static inspection', () => {
    it('5. safely parses repository metadata without code execution', async () => {
      const meta = await gitProvider.inspectRepository('https://github.com/skillsync/production-engine');
      expect(meta.repoUrl).toBe('https://github.com/skillsync/production-engine');
      expect(meta.isSafe).toBe(true);
      expect(meta.languages).toBeDefined();
      expect(meta.hasTests).toBe(true);
      expect(meta.hasCiCd).toBe(true);
      expect(meta.fileTree.length).toBeGreaterThan(0);
    });

    it('6. rejects invalid repo URL formats', async () => {
      await expect(gitProvider.inspectRepository('invalid-url-no-protocol')).rejects.toThrow(
        'Invalid repository URL format'
      );
    });
  });

  describe('JobSourceProvider', () => {
    it('7. normalizes external job feed into structured opportunity', async () => {
      const opp = await jobSourceProvider.ingestExternalJob({
        externalId: 'ext_gh_456',
        source: 'GREENHOUSE',
        title: 'Senior Fullstack Engineer',
        companyName: 'Acme Health Tech',
        description: 'Building high throughput FHIR systems with Node and Postgres',
        location: 'San Francisco, CA',
        isRemote: true,
        requiredSkillsRaw: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'REST APIs'],
      });

      expect(opp.title).toBe('Senior Fullstack Engineer');
      expect(opp.companyName).toBe('Acme Health Tech');
      expect(opp.requiredSkills).toContain('TypeScript');
      expect(opp.requiredSkills).toContain('PostgreSQL');
      expect(opp.requiredSkills).toContain('Docker');
    });
  });

  describe('Integrations API Endpoints', () => {
    it('8. GET /integrations returns available providers', async () => {
      const res = await app.request('/integrations', {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.some((p: any) => p.provider === 'GITHUB')).toBe(true);
    });

    it('9. POST /integrations/git/inspect inspects repository safely', async () => {
      const res = await app.request('/integrations/git/inspect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoUrl: 'https://github.com/skillsync/demo-project' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.isSafe).toBe(true);
      expect(data.data.repoUrl).toBe('https://github.com/skillsync/demo-project');
    });

    it('10. POST /integrations/webhooks/github processes webhook with valid signature', async () => {
      const payload = { action: 'push', repository: { full_name: 'org/repo' } };
      const payloadStr = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payloadStr);
      const signature = `sha256=${hmac.digest('hex')}`;
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const res = await app.request('/integrations/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hub-signature-256': signature,
          'x-skillsync-timestamp': timestamp,
          'x-event-id': `evt_api_${Date.now()}`,
          'x-event-type': 'push',
        },
        body: payloadStr,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.status).toBe('PROCESSED');
    });
  });
});
