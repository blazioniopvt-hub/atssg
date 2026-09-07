// Skill Intelligence Integration Tests: add skill → add evidence → get intelligence → update → delete
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  app,
  createTestUser,
  createTestSession,
  cleanupTestData,
  createTestSkill,
  testPrisma,
} from './setup';

describe('Skill Intelligence Integration Tests', () => {
  let testUser: { user: any; password: string };
  let authCookie: string;
  let testSkill: any;

  beforeAll(async () => {
    await cleanupTestData();
    testUser = await createTestUser({
      email: 'si-test@example.com',
      username: 'sitestuser',
      password: 'TestPassword123!',
    });

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.user.email,
        password: testUser.password,
      }),
    });

    const cookies = loginRes.headers.get('set-cookie');
    authCookie = cookies?.split(';')[0] || '';

    testSkill = await createTestSkill({
      name: 'TypeScript',
      slug: 'typescript',
      category: 'PROGRAMMING',
      description: 'Typed superset of JavaScript',
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  beforeEach(async () => {
    await testPrisma.userSkill.deleteMany({}).catch(() => {});
    await testPrisma.skillEvidence.deleteMany({}).catch(() => {});
    await testPrisma.projectSkill.deleteMany({}).catch(() => {});
    await testPrisma.project.deleteMany({}).catch(() => {});
    await testPrisma.resume.deleteMany({}).catch(() => {});
    await testPrisma.aIExtractionJob.deleteMany({}).catch(() => {});
    await testPrisma.skillRelationship.deleteMany({}).catch(() => {});
    // Note: skills and users are preserved across tests in this file
  });

  describe('POST /skill-intelligence/skills - Add skill to profile', () => {
    it('should add a skill to user profile', async () => {
      const res = await app.request('/skill-intelligence/skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          skillId: testSkill.id,
          proficiencyLevel: 'INTERMEDIATE',
          yearsOfExperience: 3,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data).toBeDefined();
      expect(data.data.skillId).toBe(testSkill.id);
      expect(data.data.proficiencyLevel).toBe('INTERMEDIATE');
      expect(data.data.yearsOfExperience).toBe(3);
      expect(data.data.verificationStatus).toBe('UNVERIFIED');
    });

    it('should reject adding duplicate skill', async () => {
      // Add skill first time
      await app.request('/skill-intelligence/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ skillId: testSkill.id, proficiencyLevel: 'BEGINNER' }),
      });

      // Try to add again
      const res = await app.request('/skill-intelligence/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ skillId: testSkill.id, proficiencyLevel: 'ADVANCED' }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error.code).toBe('CONFLICT');
    });

    it('should reject adding non-existent skill', async () => {
      const res = await app.request('/skill-intelligence/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ skillId: 'non-existent-id', proficiencyLevel: 'BEGINNER' }),
      });

      expect(res.status).toBe(404);
    });

    it('should require authentication', async () => {
      const res = await app.request('/skill-intelligence/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: testSkill.id, proficiencyLevel: 'BEGINNER' }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /skill-intelligence/skills - Get all skills with intelligence', () => {
    it('should return user skills with intelligence data', async () => {
      await app.request('/skill-intelligence/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ skillId: testSkill.id, proficiencyLevel: 'ADVANCED' }),
      });

      const res = await app.request('/skill-intelligence/skills', {
        method: 'GET',
        headers: { Cookie: authCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toBeInstanceOf(Array);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data[0].skillId).toBe(testSkill.id);
      expect(data.data[0].proficiencyLevel).toBe('ADVANCED');
      expect(data.data[0].confidence).toBeDefined();
    });

    it('should return empty array for user with no skills', async () => {
      // Create a new user with no skills
      const newUser = await createTestUser({
        email: 'no-skills@example.com',
        username: 'noskillsuser',
      });

      const loginRes = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.user.email,
          password: newUser.password,
        }),
      });

      const cookies = loginRes.headers.get('set-cookie');
      const newAuthCookie = cookies?.split(';')[0] || '';

      const res = await app.request('/skill-intelligence/skills', {
        method: 'GET',
        headers: { Cookie: newAuthCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toBeInstanceOf(Array);
      expect(data.data.length).toBe(0);
    });
  });

  describe('GET /skill-intelligence/skills/:skillId - Get intelligence for specific skill', () => {
    it('should return skill intelligence for user skill', async () => {
      await app.request('/skill-intelligence/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ skillId: testSkill.id, proficiencyLevel: 'INTERMEDIATE' }),
      });

      const res = await app.request(`/skill-intelligence/skills/${testSkill.id}`, {
        method: 'GET',
        headers: { Cookie: authCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toBeDefined();
      expect(data.data.skillId).toBe(testSkill.id);
      expect(data.data.proficiencyLevel).toBe('INTERMEDIATE');
      expect(data.data.confidence).toBeDefined();
      expect(data.data.evidence).toBeInstanceOf(Array);
    });

    it('should return 404 for skill not in profile', async () => {
      const res = await app.request(`/skill-intelligence/skills/${testSkill.id}`, {
        method: 'GET',
        headers: { Cookie: authCookie },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /skill-intelligence/skills/:skillId/evidence - Add evidence for a skill', () => {
    it('should add evidence to a user skill', async () => {
      const addSkillRes = await app.request('/skill-intelligence/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ skillId: testSkill.id, proficiencyLevel: 'BEGINNER' }),
      });

      const addSkillData = await addSkillRes.json();
      const userSkill = addSkillData.data;

      const res = await app.request(`/skill-intelligence/skills/${testSkill.id}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({
          userSkillId: userSkill.id,
          type: 'PROJECT',
          title: 'Built a TypeScript project',
          description: 'Created a full-stack app with TypeScript',
          url: 'https://github.com/user/project',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data).toBeDefined();
      expect(data.data.type).toBe('PROJECT');
      expect(data.data.title).toBe('Built a TypeScript project');
      expect(data.data.verificationStatus).toBe('UNVERIFIED');
    });

    it('should reject evidence for non-existent skill', async () => {
      const res = await app.request(`/skill-intelligence/skills/non-existent-id/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({
          userSkillId: 'fake-id',
          type: 'PROJECT',
          title: 'Test',
        }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /skill-intelligence/skills/:skillId - Update user skill', () => {
    it('should update user skill proficiency', async () => {
      await app.request('/skill-intelligence/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ skillId: testSkill.id, proficiencyLevel: 'BEGINNER' }),
      });

      const res = await app.request(`/skill-intelligence/skills/${testSkill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({
          proficiencyLevel: 'EXPERT',
          yearsOfExperience: 10,
          confidence: 95,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.proficiencyLevel).toBe('EXPERT');
      expect(data.data.yearsOfExperience).toBe(10);
      expect(data.data.confidence).toBe(95);
    });

    it('should return 404 for skill not in profile', async () => {
      const res = await app.request(`/skill-intelligence/skills/${testSkill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ proficiencyLevel: 'EXPERT' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /skill-intelligence/skills/:skillId - Remove skill from profile', () => {
    it('should remove skill from user profile', async () => {
      await app.request('/skill-intelligence/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ skillId: testSkill.id, proficiencyLevel: 'BEGINNER' }),
      });

      const res = await app.request(`/skill-intelligence/skills/${testSkill.id}`, {
        method: 'DELETE',
        headers: { Cookie: authCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('Skill removed from profile');

      // Verify skill is removed
      const getRes = await app.request(`/skill-intelligence/skills/${testSkill.id}`, {
        method: 'GET',
        headers: { Cookie: authCookie },
      });
      expect(getRes.status).toBe(404);
    });
  });

  describe('GET /skill-intelligence - Get skill intelligence summary', () => {
    it('should return summary with skill count and categories', async () => {
      await app.request('/skill-intelligence/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ skillId: testSkill.id, proficiencyLevel: 'INTERMEDIATE' }),
      });

      const res = await app.request('/skill-intelligence', {
        method: 'GET',
        headers: { Cookie: authCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toBeDefined();
      expect(data.data.totalSkills).toBeGreaterThan(0);
      expect(data.data.categories).toBeInstanceOf(Array);
    });
  });
});