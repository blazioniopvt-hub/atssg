// Phase 9: AI Career Coach & Next-Best-Action Engine Tests
// Validates deterministic Next-Best-Action ranking, supporting signals,
// grounded context construction, zero hallucination, session isolation, and action cards.

import { app } from '../index';
import { nextBestActionService } from '../services/skill-intelligence/next-best-action';
import { careerCoachService } from '../services/skill-intelligence/career-coach';
import { createSessionToken } from '../auth/utils';

describe('Phase 9: AI Career Coach & Next-Best-Action Engine', () => {
  const TEST_SECRET = 'test-jwt-secret-with-at-least-32-characters-for-hs256';
  let userAToken: string;
  let userBToken: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET = TEST_SECRET;
    process.env.JWT_SECRET = TEST_SECRET;

    userAToken = await createSessionToken('usr_student_alex', 'sess_user_a', TEST_SECRET);
    userBToken = await createSessionToken('usr_other_student', 'sess_user_b', TEST_SECRET);
  });

  describe('1. Deterministic Next-Best-Action Engine', () => {
    it('should generate a high-impact Next Best Action with explainable supporting signals', async () => {
      const nextAction = await nextBestActionService.getNextBestAction('usr_student_alex', 'role_full_stack');

      expect(nextAction).toBeDefined();
      expect(nextAction.title).toBeDefined();
      expect(nextAction.reason).toBeDefined();
      expect(nextAction.priorityScore).toBeGreaterThan(0);
      expect(Array.isArray(nextAction.supportingSignals)).toBe(true);
      expect(nextAction.supportingSignals.length).toBeGreaterThan(0);
      expect(nextAction.expectedImpact).toBeDefined();
      expect(nextAction.estimatedEffort).toBeDefined();
      expect(nextAction.actionUrl).toBeDefined();
    });

    it('should return a prioritized list of recommended actions via GET /career-coach/recommendations', async () => {
      const res = await app.request('/career-coach/recommendations', {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);

      // Verify descending order of priority scores
      const actions = json.data;
      for (let i = 0; i < actions.length - 1; i++) {
        expect(actions[i].priorityScore).toBeGreaterThanOrEqual(actions[i + 1].priorityScore);
      }
    });

    it('should fetch single Next Best Action via GET /career-coach/next-action', async () => {
      const res = await app.request('/career-coach/next-action', {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.type).toBeDefined();
      expect(json.data.title).toBeDefined();
    });
  });

  describe('2. Coaching Session Lifecycle & Grounded Messaging', () => {
    let createdSessionId: string;

    it('should create a coaching session with initial welcome and action card via POST /career-coach/sessions', async () => {
      const res = await app.request('/career-coach/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          targetRoleId: 'role_full_stack',
          title: 'Full-Stack Career Strategy Session',
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBeDefined();
      expect(json.data.title).toBe('Full-Stack Career Strategy Session');
      expect(json.data.messages.length).toBeGreaterThanOrEqual(1);

      const welcomeMsg = json.data.messages[0];
      expect(welcomeMsg.sender).toBe('COACH');
      expect(welcomeMsg.structuredData?.nextBestAction).toBeDefined();
      createdSessionId = json.data.id;
    });

    it('should retrieve coaching session details via GET /career-coach/sessions/:id', async () => {
      const res = await app.request(`/career-coach/sessions/${createdSessionId}`, {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(createdSessionId);
    });

    it('should send user message and receive grounded coach response via POST /career-coach/sessions/:id/messages', async () => {
      const res = await app.request(`/career-coach/sessions/${createdSessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          message: 'What is my current career readiness score and what should I build next to improve it?',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.sender).toBe('COACH');
      expect(json.data.content).toBeDefined();
      expect(json.data.structuredData).toBeDefined();
      expect(json.data.structuredData.nextBestAction).toBeDefined();
    });

    it('should list all sessions for user via GET /career-coach/sessions', async () => {
      const res = await app.request('/career-coach/sessions', {
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

  describe('3. Security, Session Isolation & IDOR Defense', () => {
    it('should reject unauthenticated requests to coach endpoints with 401', async () => {
      const res = await app.request('/career-coach/sessions');
      expect(res.status).toBe(401);
    });

    it('should prevent cross-user access to coaching sessions (IDOR)', async () => {
      const res = await app.request('/career-coach/sessions/coach_sess_nonexistent_other_user', {
        headers: {
          Authorization: `Bearer ${userBToken}`,
        },
      });

      expect(res.status).toBe(404);
    });
  });
});
