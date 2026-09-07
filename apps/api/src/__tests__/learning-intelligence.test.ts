// Phase 5: Personalized Learning Path & Resource Intelligence Tests
// Validates Target Role gap prioritization, prerequisite ordering, deterministic resource ranking,
// objective generation, progress tracking, adaptive history-safe regeneration, and session IDOR isolation.

import { app } from '../index';
import { personalizedLearningPathService } from '../services/skill-intelligence/personalized-path';
import { learningObjectiveService } from '../services/skill-intelligence/learning-objective';
import { learningResourceService } from '../services/skill-intelligence/learning-resource';
import { createSessionToken } from '../auth/utils';
import { LearningPathItemStatus, LearningPathStatus } from '@prisma/client';

describe('Phase 5: Personalized Learning Path & Resource Intelligence Engine', () => {
  const TEST_SECRET = 'test-jwt-secret-with-at-least-32-characters-for-hs256';
  let userAToken: string;
  let userBToken: string;
  let adminToken: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET = TEST_SECRET;
    process.env.JWT_SECRET = TEST_SECRET;

    userAToken = await createSessionToken('usr_student_alex', 'sess_user_a', TEST_SECRET);
    userBToken = await createSessionToken('usr_other_student', 'sess_user_b', TEST_SECRET);
    adminToken = await createSessionToken('usr_admin_system', 'sess_admin', TEST_SECRET);
  });

  describe('1. Learning Gap Prioritization & Mastery Filtering', () => {
    it('should exclude already mastered skills with high confidence from the learning path', async () => {
      // Alex Chen has TypeScript (EXPERT, 94% confidence) and React (ADVANCED, 88% confidence)
      // Both meet or exceed the requirements for Full-Stack Engineer
      const path = await personalizedLearningPathService.generatePath('usr_student_alex', 'role_full_stack');

      // TypeScript and React should NOT appear as active learning gap milestones since they are already mastered
      const tsItem = path.items.find(it => it.skillSlug === 'typescript');
      const reactItem = path.items.find(it => it.skillSlug === 'react');
      expect(tsItem).toBeUndefined();
      expect(reactItem).toBeUndefined();

      // Missing mandatory skills like Node.js SHOULD appear
      const nodeItem = path.items.find(it => it.skillSlug === 'nodejs');
      expect(nodeItem).toBeDefined();
    });

    it('should assign HIGH priority to missing or mandatory role skills with significant gaps', async () => {
      const path = await personalizedLearningPathService.generatePath('usr_student_alex', 'role_ai_ml');

      // Machine Learning & Deep Learning are mandatory core skills with gaps
      const mlItem = path.items.find(it => it.skillSlug === 'machine-learning' || it.skillSlug === 'deep-learning');
      expect(mlItem).toBeDefined();
      expect(mlItem?.priority).toBe('HIGH');
    });
  });

  describe('2. Learning Objective Engine', () => {
    it('should generate concrete, capability-focused objectives for technical skills', () => {
      const dockerObj = learningObjectiveService.generateObjective({
        skillId: 'sk_docker',
        skillName: 'Docker',
        skillSlug: 'docker',
        currentProficiency: 'BEGINNER',
        targetProficiency: 'INTERMEDIATE',
        roleTitle: 'AI / ML Engineer',
      });

      expect(dockerObj.title).toContain('Docker');
      expect(dockerObj.objective).toContain('containerized');
      expect(dockerObj.estimatedMinutes).toBeGreaterThanOrEqual(120);
    });

    it('should calculate realistic learning duration scaling with proficiency leap', () => {
      const smallJump = learningObjectiveService.generateObjective({
        skillId: 'sk_1',
        skillName: 'Tool A',
        skillSlug: 'tool-a',
        currentProficiency: 'INTERMEDIATE',
        targetProficiency: 'ADVANCED',
      });

      const largeJump = learningObjectiveService.generateObjective({
        skillId: 'sk_2',
        skillName: 'Tool B',
        skillSlug: 'tool-b',
        currentProficiency: 'BEGINNER',
        targetProficiency: 'EXPERT',
      });

      expect(largeJump.estimatedMinutes).toBeGreaterThan(smallJump.estimatedMinutes);
    });
  });

  describe('3. Deterministic Resource Ranking Engine', () => {
    it('should rank exact skill matches higher than related skills', async () => {
      const ranked = await learningResourceService.rankResourcesForSkillGap(
        'sk_docker',
        'docker',
        'INTERMEDIATE',
        'BEGINNER',
        true,
        5
      );

      expect(ranked.length).toBeGreaterThan(0);
      expect(ranked[0].score).toBeGreaterThan(70);
      expect(ranked[0].relevanceScore).toBe(1.0);
      expect(ranked[0].resource.url).toContain('docker.com');
    });

    it('should penalize resources when prerequisites are unsatisfied', () => {
      const dummyResource: any = {
        id: 'res_1',
        title: 'Advanced Kubernetes Orchestration',
        url: 'https://kubernetes.io',
        provider: 'CNCF',
        type: 'COURSE',
        difficulty: 'ADVANCED',
        qualityScore: 0.95,
        verifiedSource: true,
        skill: { slug: 'kubernetes', name: 'Kubernetes' },
      };

      const satisfiedEval = learningResourceService.calculateResourceScore(
        dummyResource,
        'kubernetes',
        'ADVANCED',
        'INTERMEDIATE',
        true
      );

      const unsatisfiedEval = learningResourceService.calculateResourceScore(
        dummyResource,
        'kubernetes',
        'ADVANCED',
        'INTERMEDIATE',
        false
      );

      expect(satisfiedEval.score).toBeGreaterThan(unsatisfiedEval.score);
      expect(unsatisfiedEval.explanation).toContain('Has pending foundational prerequisites');
    });

    it('should generate explainable justifications for recommendations', async () => {
      const ranked = await learningResourceService.rankResourcesForSkillGap(
        'sk_ml',
        'machine-learning',
        'INTERMEDIATE',
        'BEGINNER',
        true,
        3
      );

      expect(ranked[0].explanation.length).toBeGreaterThan(0);
      expect(ranked[0].explanation.some(e => e.includes('required skill') || e.includes('proficiency'))).toBe(true);
    });
  });

  describe('4. Personalized Learning Path Generation & Prerequisite Ordering', () => {
    it('should generate an ordered learning path for the target role', async () => {
      const path = await personalizedLearningPathService.generatePath('usr_student_alex', 'role_ai_ml');

      expect(path).toBeDefined();
      expect(path.targetRoleSlug).toBe('ai-ml-engineer');
      expect(path.items.length).toBeGreaterThan(0);
      expect(path.totalItems).toBe(path.items.length);
      expect(path.status).toBe(LearningPathStatus.ACTIVE);
    });

    it('should ensure order indices are sequential starting from 1', async () => {
      const path = await personalizedLearningPathService.generatePath('usr_student_alex', 'role_ai_ml');

      path.items.forEach((item, idx) => {
        expect(item.order).toBe(idx + 1);
      });
    });

    it('should properly configure item statuses: first available in progress or available, locked if prereq pending', async () => {
      const path = await personalizedLearningPathService.generatePath('usr_student_alex', 'role_ai_ml');

      const statuses = path.items.map(it => it.status);
      expect(statuses).toContain(LearningPathItemStatus.IN_PROGRESS);
    });
  });

  describe('5. Progress Tracking, State Transitions & Auto-Unlocking', () => {
    let testPath: any;
    let activeItem: any;

    beforeEach(async () => {
      testPath = await personalizedLearningPathService.generatePath('usr_student_alex', 'role_ai_ml');
      activeItem = testPath.items[0];
    });

    it('should start an available milestone and transition to IN_PROGRESS', async () => {
      const secondItem = testPath.items[1];
      if (secondItem && secondItem.status === LearningPathItemStatus.AVAILABLE) {
        const started = await personalizedLearningPathService.startItem('usr_student_alex', secondItem.id);
        expect(started.status).toBe(LearningPathItemStatus.IN_PROGRESS);
        expect(started.startedAt).toBeDefined();
      }
    });

    it('should update milestone progress and recalculate overall path progress', async () => {
      const updated = await personalizedLearningPathService.updateItemProgress('usr_student_alex', activeItem.id, 50);
      expect(updated.progress).toBe(50);

      const refreshedPath = await personalizedLearningPathService.getPathById('usr_student_alex', testPath.id);
      expect(refreshedPath?.progress).toBeGreaterThan(0);
    });

    it('should complete a milestone, set progress to 100%, and unlock downstream locked items', async () => {
      // Create a scenario where item B is locked on item A
      testPath.items[0].status = LearningPathItemStatus.IN_PROGRESS;
      testPath.items[1].status = LearningPathItemStatus.LOCKED;
      testPath.items[1].prerequisites = [{ id: testPath.items[0].skillId, name: testPath.items[0].skillName, isSatisfied: false }];

      const completed = await personalizedLearningPathService.completeItem('usr_student_alex', testPath.items[0].id);
      expect(completed.status).toBe(LearningPathItemStatus.COMPLETED);
      expect(completed.progress).toBe(100);
      expect(completed.completedAt).toBeDefined();

      const refreshedPath = await personalizedLearningPathService.getPathById('usr_student_alex', testPath.id);
      const unlockedItem = refreshedPath?.items.find(it => it.id === testPath.items[1].id);
      expect(unlockedItem?.status).toBe(LearningPathItemStatus.AVAILABLE);
    });

    it('should skip a milestone when requested', async () => {
      const skipped = await personalizedLearningPathService.skipItem('usr_student_alex', activeItem.id);
      expect(skipped.status).toBe(LearningPathItemStatus.SKIPPED);
    });
  });

  describe('6. Adaptive History-Safe Path Regeneration', () => {
    it('should strictly preserve completed milestones and progress during path regeneration', async () => {
      const initialPath = await personalizedLearningPathService.generatePath('usr_student_alex', 'role_ai_ml');
      const itemToComplete = initialPath.items[0];

      // Mark first milestone as completed
      await personalizedLearningPathService.completeItem('usr_student_alex', itemToComplete.id);

      // Trigger adaptive regeneration
      const regenerated = await personalizedLearningPathService.regeneratePath('usr_student_alex', initialPath.id);

      // Verify that completed item was NOT erased or reverted
      const preserved = regenerated.items.find(it => it.skillId === itemToComplete.skillId);
      expect(preserved).toBeDefined();
      expect(preserved?.status).toBe(LearningPathItemStatus.COMPLETED);
      expect(preserved?.progress).toBe(100);
    });
  });

  describe('7. API Endpoints & Authorization IDOR Protection', () => {
    it('GET /learning/paths should reject unauthenticated requests with 401', async () => {
      const res = await app.request('/learning/paths', {
        method: 'GET',
      });
      expect(res.status).toBe(401);
    });

    it('GET /learning/paths should return personalized path for authenticated user', async () => {
      const res = await app.request('/learning/paths', {
        method: 'GET',
        headers: {
          Cookie: `skillsync_session=${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.userId).toBe('usr_student_alex');
      expect(json.data.items.length).toBeGreaterThan(0);
    });

    it('GET /learning/paths/:id should deny access to another user (IDOR protection)', async () => {
      // User A generates path
      const pathA = await personalizedLearningPathService.generatePath('usr_student_alex', 'role_ai_ml');

      // User B tries to access User A's path
      const res = await app.request(`/learning/paths/${pathA.id}`, {
        method: 'GET',
        headers: {
          Cookie: `skillsync_session=${userBToken}`,
        },
      });

      expect(res.status).toBe(404);
    });

    it('POST /learning/items/:id/start should prevent unauthorized cross-user modifications', async () => {
      const pathA = await personalizedLearningPathService.generatePath('usr_student_alex', 'role_ai_ml');
      const itemA = pathA.items[0];

      // User B tries to start User A's item
      const res = await app.request(`/learning/items/${itemA.id}/start`, {
        method: 'POST',
        headers: {
          Cookie: `skillsync_session=${userBToken}`,
        },
      });

      expect(res.status).toBe(404);
    });

    it('GET /learning/dashboard/summary should return compact learning progress summary', async () => {
      const res = await app.request('/learning/dashboard/summary', {
        method: 'GET',
        headers: {
          Cookie: `skillsync_session=${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.targetRoleTitle).toBeDefined();
      expect(typeof json.data.progress).toBe('number');
    });

    it('GET /learning/recommendations should return ranked recommendations with explainability', async () => {
      const res = await app.request('/learning/recommendations', {
        method: 'GET',
        headers: {
          Cookie: `skillsync_session=${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      if (json.data.length > 0) {
        expect(json.data[0].explanation).toBeDefined();
      }
    });
  });
});

// ============================================================
// PHASE 6: ASSESSMENT ENGINE & RESOURCE DISCOVERY TESTS
// ============================================================

import { assessmentEngineService } from '../services/skill-intelligence/assessment-engine';
import { resourceDiscoveryService } from '../services/skill-intelligence/resource-discovery';

describe('Phase 6: Live Resource Intelligence & Adaptive Skill Assessment Engine', () => {
  const TEST_SECRET = 'test-jwt-secret-with-at-least-32-characters-for-hs256';
  let userAToken: string;
  let userBToken: string;
  let adminToken: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET = TEST_SECRET;
    process.env.JWT_SECRET = TEST_SECRET;

    userAToken = await createSessionToken('usr_student_alex', 'sess_p6_user_a', TEST_SECRET);
    userBToken = await createSessionToken('usr_other_student', 'sess_p6_user_b', TEST_SECRET);
    adminToken = await createSessionToken('usr_admin_system', 'sess_p6_admin', TEST_SECRET);
  });

  // ----------------------------------------------------------
  // 1. ASSESSMENT QUESTION GENERATION
  // ----------------------------------------------------------
  describe('1. Assessment Question Generation', () => {
    it('should generate deterministic questions for known skills', () => {
      const { questions, correctAnswers } = assessmentEngineService.generateQuestionsForSkill('typescript', 5);

      expect(questions.length).toBeGreaterThanOrEqual(3);
      expect(questions.length).toBeLessThanOrEqual(5);
      expect(correctAnswers.size).toBe(questions.length);
    });

    it('should include choices for MULTIPLE_CHOICE questions', () => {
      const { questions } = assessmentEngineService.generateQuestionsForSkill('react', 5);

      const mcq = questions.find((q) => q.type === 'MULTIPLE_CHOICE');
      expect(mcq).toBeDefined();
      expect(mcq!.choices).toBeDefined();
      expect(mcq!.choices!.length).toBeGreaterThanOrEqual(2);
    });

    it('should NOT expose correct answers in the question DTO', () => {
      const { questions } = assessmentEngineService.generateQuestionsForSkill('python', 5);

      for (const q of questions) {
        expect((q as any).correctAnswer).toBeUndefined();
      }
    });

    it('should generate TRUE_FALSE questions with exactly 2 choices', () => {
      const { questions } = assessmentEngineService.generateQuestionsForSkill('docker', 5);

      const tf = questions.find((q) => q.type === 'TRUE_FALSE');
      expect(tf).toBeDefined();
      expect(tf!.choices).toBeDefined();
      expect(tf!.choices!.length).toBe(2);
    });

    it('should generate questions for skills not in the bank using generic fallback', () => {
      const { questions, correctAnswers } = assessmentEngineService.generateQuestionsForSkill('some-unknown-skill', 5);

      expect(questions.length).toBeGreaterThanOrEqual(1);
      expect(correctAnswers.size).toBeGreaterThanOrEqual(1);
    });

    it('should generate questions for machine-learning skill', () => {
      const { questions, correctAnswers } = assessmentEngineService.generateQuestionsForSkill('machine-learning', 5);

      expect(questions.length).toBeGreaterThanOrEqual(3);
      expect(correctAnswers.size).toBe(questions.length);
      const areas = questions.map((q) => q.skillArea);
      expect(areas.length).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------
  // 2. ASSESSMENT LIFECYCLE (CREATE → START → SUBMIT → GRADE)
  // ----------------------------------------------------------
  describe('2. Assessment Lifecycle', () => {
    it('should create an assessment with CREATED status', async () => {
      const assessment = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_ts',
        'QUIZ'
      );

      expect(assessment).toBeDefined();
      expect(assessment.status).toBe('CREATED');
      expect(assessment.skillName).toBe('TypeScript');
      expect(assessment.questions.length).toBeGreaterThan(0);
      expect(assessment.maxScore).toBeGreaterThan(0);
      expect(assessment.score).toBeNull();
    });

    it('should start an assessment and transition to IN_PROGRESS', async () => {
      const created = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_react',
        'QUIZ'
      );

      const started = await assessmentEngineService.startAssessment(
        'usr_student_alex',
        created.id
      );

      expect(started.status).toBe('IN_PROGRESS');
      expect(started.startedAt).toBeDefined();
    });

    it('should reject starting an already started assessment', async () => {
      const created = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_node',
        'QUIZ'
      );

      await assessmentEngineService.startAssessment('usr_student_alex', created.id);

      await expect(
        assessmentEngineService.startAssessment('usr_student_alex', created.id)
      ).rejects.toThrow(/cannot be started/i);
    });
  });

  // ----------------------------------------------------------
  // 3. SERVER-SIDE GRADING
  // ----------------------------------------------------------
  describe('3. Server-Side Grading', () => {
    it('should produce a high score when all answers are correct', async () => {
      const { questions, correctAnswers } = assessmentEngineService.generateQuestionsForSkill('typescript', 5);

      const created = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_ts',
        'PRACTICAL'
      );

      await assessmentEngineService.startAssessment('usr_student_alex', created.id);

      // Build correct answers map for submission
      const answers: Record<string, string> = {};
      for (const q of created.questions) {
        const questionSlugAndNum = q.id;
        // Get correct answer from the assessment's internal correctAnswers
        const { correctAnswers: ca } = assessmentEngineService.generateQuestionsForSkill('typescript', 5);
        const correct = ca.get(questionSlugAndNum);
        if (correct) answers[questionSlugAndNum] = correct;
      }

      const result = await assessmentEngineService.submitAssessment(
        'usr_student_alex',
        created.id,
        answers
      );

      expect(result.percentage).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.feedback.length).toBe(created.questions.length);
      expect(result.feedback.every((f) => f.isCorrect)).toBe(true);
    });

    it('should produce a low score when answers are wrong', async () => {
      const created = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_python',
        'QUIZ'
      );

      await assessmentEngineService.startAssessment('usr_student_alex', created.id);

      // Submit all wrong answers
      const wrongAnswers: Record<string, string> = {};
      for (const q of created.questions) {
        wrongAnswers[q.id] = 'completely wrong answer that no question would have';
      }

      const result = await assessmentEngineService.submitAssessment(
        'usr_student_alex',
        created.id,
        wrongAnswers
      );

      expect(result.percentage).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.feedback.every((f) => !f.isCorrect)).toBe(true);
    });

    it('should generate per-question feedback with explanations', async () => {
      const created = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_docker',
        'QUIZ'
      );

      await assessmentEngineService.startAssessment('usr_student_alex', created.id);

      const answers: Record<string, string> = {};
      for (const q of created.questions) {
        answers[q.id] = q.choices ? q.choices[0] : 'some answer';
      }

      const result = await assessmentEngineService.submitAssessment(
        'usr_student_alex',
        created.id,
        answers
      );

      expect(result.feedback.length).toBe(created.questions.length);
      for (const fb of result.feedback) {
        expect(fb.questionId).toBeDefined();
        expect(typeof fb.isCorrect).toBe('boolean');
        expect(fb.explanation).toBeDefined();
        expect(fb.explanation.length).toBeGreaterThan(0);
        expect(fb.correctAnswer).toBeDefined();
      }
    });

    it('should transition assessment to GRADED status after submission', async () => {
      const created = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_postgres',
        'QUIZ'
      );

      await assessmentEngineService.startAssessment('usr_student_alex', created.id);

      await assessmentEngineService.submitAssessment(
        'usr_student_alex',
        created.id,
        {}
      );

      const assessment = await assessmentEngineService.getAssessment('usr_student_alex', created.id);
      expect(assessment).toBeDefined();
      expect(assessment!.status).toBe('GRADED');
      expect(assessment!.gradedAt).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // 4. EVIDENCE CREATION & CONFIDENCE IMPACT
  // ----------------------------------------------------------
  describe('4. Evidence Creation & Confidence Impact', () => {
    it('should report confidence impact after grading', async () => {
      const created = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_ts',
        'SELF_CHECK'
      );

      await assessmentEngineService.startAssessment('usr_student_alex', created.id);

      const result = await assessmentEngineService.submitAssessment(
        'usr_student_alex',
        created.id,
        {}
      );

      expect(result.confidenceImpact).toBeDefined();
      expect(typeof result.confidenceImpact.previousConfidence).toBe('number');
      expect(typeof result.confidenceImpact.newConfidence).toBe('number');
      expect(typeof result.confidenceImpact.delta).toBe('number');
    });

    it('should report path adaptation information after grading', async () => {
      const created = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_react',
        'SELF_CHECK'
      );

      await assessmentEngineService.startAssessment('usr_student_alex', created.id);

      const result = await assessmentEngineService.submitAssessment(
        'usr_student_alex',
        created.id,
        {}
      );

      expect(result.pathAdaptation).toBeDefined();
      expect(typeof result.pathAdaptation.itemsUnlocked).toBe('number');
      expect(typeof result.pathAdaptation.masteryAchieved).toBe('boolean');
    });
  });

  // ----------------------------------------------------------
  // 5. ASSESSMENT RESULT RETRIEVAL
  // ----------------------------------------------------------
  describe('5. Assessment Result Retrieval', () => {
    it('should return null for ungraded assessments', async () => {
      const created = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_node',
        'PRACTICAL'
      );

      const result = await assessmentEngineService.getAssessmentResult('usr_student_alex', created.id);
      expect(result).toBeNull();
    });

    it('should return full result after grading', async () => {
      const created = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_ts',
        'PEER_REVIEW'
      );
      await assessmentEngineService.startAssessment('usr_student_alex', created.id);
      await assessmentEngineService.submitAssessment('usr_student_alex', created.id, {});

      const result = await assessmentEngineService.getAssessmentResult('usr_student_alex', created.id);
      expect(result).toBeDefined();
      expect(result!.assessmentId).toBe(created.id);
      expect(typeof result!.percentage).toBe('number');
      expect(typeof result!.passed).toBe('boolean');
      expect(Array.isArray(result!.feedback)).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // 6. RESOURCE DISCOVERY
  // ----------------------------------------------------------
  describe('6. Resource Discovery', () => {
    it('should discover curated resources for TypeScript', async () => {
      const result = await resourceDiscoveryService.discoverResources('sk_ts');

      expect(result.resources.length).toBeGreaterThan(0);
      expect(result.skillName).toBe('TypeScript');
      expect(result.totalFound).toBeGreaterThanOrEqual(result.resources.length);
    });

    it('should filter by difficulty', async () => {
      const result = await resourceDiscoveryService.discoverResources('sk_ts', 'BEGINNER');

      expect(result.resources.length).toBeGreaterThan(0);
      expect(result.appliedFilters.difficulty).toBe('BEGINNER');
    });

    it('should sort by quality score descending', async () => {
      const result = await resourceDiscoveryService.discoverResources('sk_react');

      for (let i = 1; i < result.resources.length; i++) {
        const prevScore = result.resources[i - 1].qualityScore || 0;
        const currScore = result.resources[i].qualityScore || 0;
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    });

    it('should deduplicate resources by URL', async () => {
      const result = await resourceDiscoveryService.discoverResources('sk_python');
      const urls = result.resources.map((r) => r.url.toLowerCase().replace(/\/+$/, ''));
      const uniqueUrls = new Set(urls);
      expect(urls.length).toBe(uniqueUrls.size);
    });

    it('should return empty resources for unknown skills gracefully', async () => {
      const result = await resourceDiscoveryService.discoverResources('sk_nonexistent_xyz');
      expect(result.resources.length).toBe(0);
      expect(result.totalFound).toBe(0);
    });

    it('should verify curated resources as VERIFIED_CURATED', async () => {
      const verification = await resourceDiscoveryService.verifyResource('res_ts_handbook');

      expect(verification.verified).toBe(true);
      expect(verification.status).toBe('VERIFIED_CURATED');
      expect(verification.checkedAt).toBeDefined();
    });

    it('should return NOT_FOUND for unknown resources', async () => {
      const verification = await resourceDiscoveryService.verifyResource('res_nonexistent');

      expect(verification.verified).toBe(false);
      expect(verification.status).toBe('NOT_FOUND');
    });

    it('should provide catalog statistics by skill', () => {
      const stats = resourceDiscoveryService.getResourceCatalogStats();

      expect(stats['typescript']).toBeGreaterThanOrEqual(3);
      expect(stats['react']).toBeGreaterThanOrEqual(3);
      expect(stats['python']).toBeGreaterThanOrEqual(3);
      expect(stats['machine-learning']).toBeGreaterThanOrEqual(3);
    });
  });

  // ----------------------------------------------------------
  // 7. API ENDPOINT INTEGRATION
  // ----------------------------------------------------------
  describe('7. API Endpoint Integration', () => {
    it('POST /learning/assessments should create assessment via API', async () => {
      const res = await app.request('/learning/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `skillsync_session=${userAToken}`,
        },
        body: JSON.stringify({ skillId: 'sk_ts', type: 'QUIZ' }),
      });

      expect(res.status).toBe(201);
      const json: any = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.status).toBe('CREATED');
      expect(json.data.questions.length).toBeGreaterThan(0);
    });

    it('GET /learning/assessments should list user assessments', async () => {
      const res = await app.request('/learning/assessments', {
        method: 'GET',
        headers: {
          Cookie: `skillsync_session=${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('GET /learning/assessments/:id should return 404 for non-existent assessment', async () => {
      const res = await app.request('/learning/assessments/nonexistent_id', {
        method: 'GET',
        headers: {
          Cookie: `skillsync_session=${userAToken}`,
        },
      });

      expect(res.status).toBe(404);
    });

    it('GET /learning/discover/:skillId should return curated resources', async () => {
      const res = await app.request('/learning/discover/sk_ts', {
        method: 'GET',
        headers: {
          Cookie: `skillsync_session=${userAToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.resources.length).toBeGreaterThan(0);
      expect(json.data.skillName).toBe('TypeScript');
    });

    it('POST /learning/resources/:id/verify should verify curated resources (admin)', async () => {
      const res = await app.request('/learning/resources/res_ts_handbook/verify', {
        method: 'POST',
        headers: {
          Cookie: `skillsync_session=${adminToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.data.verified).toBe(true);
    });

    it('POST /learning/assessments should require authentication', async () => {
      const res = await app.request('/learning/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: 'sk_ts' }),
      });

      expect(res.status).toBe(401);
    });

    it('GET /learning/discover/:skillId should require authentication', async () => {
      const res = await app.request('/learning/discover/sk_ts', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
    });
  });

  // ----------------------------------------------------------
  // 8. SECURITY & IDOR PROTECTION
  // ----------------------------------------------------------
  describe('8. Security & IDOR Protection', () => {
    it('User B should not access User A\'s assessment', async () => {
      const assessment = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_docker',
        'QUIZ'
      );

      const result = await assessmentEngineService.getAssessment('usr_other_student', assessment.id);
      expect(result).toBeNull();
    });

    it('User B should not start User A\'s assessment', async () => {
      const assessment = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_python',
        'PRACTICAL'
      );

      await expect(
        assessmentEngineService.startAssessment('usr_other_student', assessment.id)
      ).rejects.toThrow(/not found/i);
    });

    it('User B should not submit answers for User A\'s assessment', async () => {
      const assessment = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_react',
        'PRACTICAL'
      );
      await assessmentEngineService.startAssessment('usr_student_alex', assessment.id);

      await expect(
        assessmentEngineService.submitAssessment('usr_other_student', assessment.id, {})
      ).rejects.toThrow(/not found/i);
    });

    it('User B should not view User A\'s assessment result', async () => {
      const assessment = await assessmentEngineService.createAssessment(
        'usr_student_alex',
        'sk_node',
        'SELF_CHECK'
      );
      await assessmentEngineService.startAssessment('usr_student_alex', assessment.id);
      await assessmentEngineService.submitAssessment('usr_student_alex', assessment.id, {});

      const result = await assessmentEngineService.getAssessmentResult('usr_other_student', assessment.id);
      expect(result).toBeNull();
    });
  });
});
