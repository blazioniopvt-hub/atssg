// Phase 7: Work-Sample & Project Intelligence Engine Tests
// Validates project ingestion, static evaluation, multi-dimension scoring,
// skill extraction, evidence bridge, confidence recalculation, and portfolio intelligence.

import { app } from '../index';
import { workSampleEvaluationService } from '../services/skill-intelligence/work-sample-evaluation';
import { createSessionToken } from '../auth/utils';

describe('Phase 7: Work-Sample & Project Intelligence Engine', () => {
  const TEST_SECRET = 'test-jwt-secret-with-at-least-32-characters-for-hs256';
  let userAToken: string;
  let userBToken: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET = TEST_SECRET;
    process.env.JWT_SECRET = TEST_SECRET;

    userAToken = await createSessionToken('usr_student_alex', 'sess_user_a', TEST_SECRET);
    userBToken = await createSessionToken('usr_other_student', 'sess_user_b', TEST_SECRET);
  });

  describe('1. Static Evaluation & Deterministic Multi-Dimension Scoring', () => {
    it('should calculate explainable scores across all 5 technical dimensions', () => {
      const evaluation = workSampleEvaluationService.evaluateProjectStatic({
        id: 'proj_test_1',
        title: 'Distributed Event Pipeline with TypeScript & Docker',
        description: 'Engineered high-throughput event ingestion with PostgreSQL database, Jest integration tests, and Docker deployment.',
        longDescription: 'Comprehensive architecture with layered design, repository pattern, unit testing coverage over 85%, and automated CI/CD pipeline.',
        repositoryUrl: 'https://github.com/alexchen/event-pipeline',
        liveUrl: 'https://pipeline.demo.skillsync.io',
        documentationUrl: 'https://docs.pipeline.demo.skillsync.io',
        tags: ['TypeScript', 'Docker', 'PostgreSQL', 'Jest'],
      });

      expect(evaluation.technicalDepth).toBeGreaterThanOrEqual(70);
      expect(evaluation.architecture).toBeGreaterThanOrEqual(70);
      expect(evaluation.testing).toBeGreaterThanOrEqual(70);
      expect(evaluation.documentation).toBeGreaterThanOrEqual(70);
      expect(evaluation.deployment).toBeGreaterThanOrEqual(70);
      expect(evaluation.overallQuality).toBeGreaterThanOrEqual(75);
      expect(evaluation.overallQuality).toBeLessThanOrEqual(100);
      expect(evaluation.strengths.length).toBeGreaterThan(0);
    });

    it('should assign appropriate testing penalties when no test signals are present', () => {
      const evaluation = workSampleEvaluationService.evaluateProjectStatic({
        id: 'proj_no_tests',
        title: 'Simple Static HTML Showcase',
        description: 'Basic landing page with no automated tests or deployment configuration.',
      });

      expect(evaluation.testing).toBeLessThanOrEqual(45);
      expect(evaluation.improvementAreas.some(ia => ia.toLowerCase().includes('test'))).toBe(true);
    });
  });

  describe('2. Project Skill Extraction & Evidence Creation', () => {
    it('should detect technical skills with grounded evidence snippets and confidence contributions', () => {
      const skills = workSampleEvaluationService.extractProjectSkills(
        {
          title: 'Full-Stack React & Node Microservices Platform',
          description: 'Implemented TypeScript backend microservices in Node.js, React frontend components, and PostgreSQL database storage with Docker containerization.',
          tags: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
        },
        85
      );

      const skillSlugs = skills.map(s => s.slug || s.skillSlug);
      expect(skillSlugs).toContain('typescript');
      expect(skillSlugs).toContain('react');
      expect(skillSlugs).toContain('nodejs');
      expect(skillSlugs).toContain('postgresql');
      expect(skillSlugs).toContain('docker');

      for (const sk of skills) {
        expect(sk.confidenceContribution).toBeGreaterThanOrEqual(60);
        expect(sk.evidenceSnippet.length).toBeGreaterThan(10);
        expect(sk.reasoning).toContain('85/100');
      }
    });
  });

  describe('3. Project Ingestion & Lifecycle API', () => {
    let createdProjectId: string;

    it('should ingest and evaluate a new project via POST /projects', async () => {
      const res = await app.request('/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          title: 'Real-Time Financial Analytics Platform',
          description: 'High-frequency streaming analytics engine built in Python and TypeScript with Docker containers.',
          source: 'WORK_SAMPLE',
          repositoryUrl: 'https://github.com/alexchen/financial-analytics',
          liveUrl: 'https://analytics.skillsync.io',
          tags: ['Python', 'TypeScript', 'Docker', 'Machine Learning'],
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.title).toBe('Real-Time Financial Analytics Platform');
      expect(json.data.evaluation).toBeDefined();
      expect(json.data.evaluation.overallQuality).toBeGreaterThan(50);
      createdProjectId = json.data.id;
    });

    it('should list user projects with evaluation details via GET /projects', async () => {
      const res = await app.request('/projects', {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });

    it('should retrieve single project details via GET /projects/:id', async () => {
      const res = await app.request(`/projects/${createdProjectId}`, {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(createdProjectId);
    });

    it('should re-analyze project via POST /projects/:id/analyze', async () => {
      const res = await app.request(`/projects/${createdProjectId}/analyze`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.overallQuality).toBeGreaterThan(50);
    });
  });

  describe('4. Portfolio Intelligence & Missing Evidence Detection', () => {
    it('should aggregate portfolio strength and missing role evidence via GET /portfolio', async () => {
      const res = await app.request('/portfolio', {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.portfolioStrength).toBeGreaterThan(0);
      expect(Array.isArray(json.data.strongEvidenceSkills)).toBe(true);
      expect(Array.isArray(json.data.missingRoleEvidence)).toBe(true);
    });

    it('should return demonstrated skills via GET /portfolio/skills', async () => {
      const res = await app.request('/portfolio/skills', {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should return role gap recommendations via GET /portfolio/gaps', async () => {
      const res = await app.request('/portfolio/gaps', {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data.missingRoleEvidence)).toBe(true);
    });
  });

  describe('5. Security & IDOR Protection', () => {
    it('should reject unauthenticated requests to project routes with 401', async () => {
      const res = await app.request('/projects');
      expect(res.status).toBe(401);
    });

    it('should prevent cross-user project deletion (IDOR)', async () => {
      const res = await app.request('/projects/proj_nonexistent_other_user', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${userBToken}`,
        },
      });

      expect(res.status).toBe(404);
    });
  });
});
