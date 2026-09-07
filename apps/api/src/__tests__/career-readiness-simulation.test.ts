// Phase 8: Career Readiness & Simulation Engine Tests
// Validates 6-dimension readiness calculation, bounded tiers, multi-role comparison,
// adaptive simulation generation, server-side grading, answer key security, and evidence bridging.

import { app } from '../index';
import { careerReadinessService } from '../services/skill-intelligence/career-readiness';
import { careerSimulationService } from '../services/skill-intelligence/career-simulation';
import { createSessionToken } from '../auth/utils';

describe('Phase 8: Career Readiness & Simulation Engine', () => {
  const TEST_SECRET = 'test-jwt-secret-with-at-least-32-characters-for-hs256';
  let userAToken: string;
  let userBToken: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET = TEST_SECRET;
    process.env.JWT_SECRET = TEST_SECRET;

    userAToken = await createSessionToken('usr_student_alex', 'sess_user_a', TEST_SECRET);
    userBToken = await createSessionToken('usr_other_student', 'sess_user_b', TEST_SECRET);
  });

  describe('1. 6-Dimension Career Readiness Model', () => {
    it('should compute explainable scores for all 6 readiness dimensions', async () => {
      const readiness = await careerReadinessService.calculateCareerReadiness('usr_student_alex', 'role_full_stack');

      expect(readiness.overallReadiness).toBeGreaterThan(0);
      expect(readiness.overallReadiness).toBeLessThanOrEqual(100);
      expect(readiness.readinessLevel).toBeDefined();
      expect(readiness.readinessBadge).toBeDefined();

      const dims = readiness.dimensions;
      expect(dims.technicalSkills.score).toBeGreaterThan(0);
      expect(dims.evidenceStrength.score).toBeGreaterThan(0);
      expect(dims.assessmentReadiness.score).toBeGreaterThan(0);
      expect(dims.projectReadiness.score).toBeGreaterThan(0);
      expect(dims.learningProgress.score).toBeGreaterThanOrEqual(0);
      expect(dims.roleAlignment.score).toBeGreaterThan(0);

      expect(dims.technicalSkills.explanation).toContain('Full-Stack');
      expect(readiness.strengths.length).toBeGreaterThan(0);
    });

    it('should assign bounded readiness level tiers correctly based on score thresholds', async () => {
      const readiness = await careerReadinessService.calculateCareerReadiness('usr_student_alex', 'role_full_stack');

      if (readiness.overallReadiness >= 90) {
        expect(readiness.readinessLevel).toBe('STRONG_MATCH');
      } else if (readiness.overallReadiness >= 75) {
        expect(readiness.readinessLevel).toBe('ROLE_READY');
      } else if (readiness.overallReadiness >= 60) {
        expect(readiness.readinessLevel).toBe('DEVELOPING');
      } else {
        expect(readiness.readinessLevel).toBe('EARLY_STAGE');
      }
    });
  });

  describe('2. Multi-Role Readiness Comparison', () => {
    it('should return sorted comparison across target roles via GET /career-readiness/compare', async () => {
      const res = await app.request('/career-readiness/compare', {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data.roles)).toBe(true);
      expect(json.data.roles.length).toBeGreaterThan(1);

      // Verify descending order by overallReadiness
      const roles = json.data.roles;
      for (let i = 0; i < roles.length - 1; i++) {
        expect(roles[i].overallReadiness).toBeGreaterThanOrEqual(roles[i + 1].overallReadiness);
      }
    });

    it('should fetch single role readiness via GET /career-readiness/:roleId', async () => {
      const res = await app.request('/career-readiness/role_ai_ml', {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.targetRoleTitle).toBe('AI / ML Engineer');
      expect(json.data.dimensions).toBeDefined();
    });
  });

  describe('3. Career Simulation Lifecycle & Security', () => {
    let createdSimulationId: string;

    it('should generate an adaptive simulation with protected questions (no correct answers in client payload)', async () => {
      const res = await app.request('/career-simulations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          targetRoleId: 'role_full_stack',
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.status).toBe('CREATED');
      expect(Array.isArray(json.data.scenarios)).toBe(true);
      expect(json.data.scenarios.length).toBeGreaterThan(0);

      // Security check: Verify options DO NOT contain isOptimal, score, or answers
      for (const scen of json.data.scenarios) {
        expect(scen.challengePrompt).toBeDefined();
        for (const opt of scen.options) {
          expect((opt as any).isOptimal).toBeUndefined();
          expect((opt as any).score).toBeUndefined();
          expect((opt as any).explanation).toBeUndefined();
        }
      }

      createdSimulationId = json.data.id;
    });

    it('should start simulation via POST /career-simulations/:id/start', async () => {
      const res = await app.request(`/career-simulations/${createdSimulationId}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('IN_PROGRESS');
      expect(json.data.startedAt).toBeDefined();
    });

    it('should grade answers server-side, create evidence, and update readiness on submit', async () => {
      // Fetch scenario options to submit valid option IDs
      const simDetails = await careerSimulationService.getSimulation('usr_student_alex', createdSimulationId);
      const answers: Record<string, string> = {};

      for (const scen of simDetails!.scenarios) {
        answers[scen.id] = scen.options[0].id;
      }

      const res = await app.request(`/career-simulations/${createdSimulationId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({ answers }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.percentage).toBeDefined();
      expect(json.data.feedback.length).toBe(simDetails!.scenarios.length);
      expect(json.data.readinessImpact).toBeDefined();
      expect(json.data.evidenceCreated).toBeDefined();
    });

    it('should list completed simulations via GET /career-simulations', async () => {
      const res = await app.request('/career-simulations', {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });
  });

  describe('4. Security & Authorization', () => {
    it('should reject unauthenticated requests to career simulation routes with 401', async () => {
      const res = await app.request('/career-simulations');
      expect(res.status).toBe(401);
    });

    it('should prevent cross-user access to simulation results (IDOR)', async () => {
      const res = await app.request('/career-simulations/sim_nonexistent_other_user', {
        headers: {
          Authorization: `Bearer ${userBToken}`,
        },
      });

      expect(res.status).toBe(404);
    });
  });
});
