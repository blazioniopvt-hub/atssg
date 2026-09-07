// Target Role Intelligence + Skill Gap Analysis Engine Test Suite
// Covers deterministic scoring, mandatory readiness, priority ranking, and API authorization

import { ProficiencyLevel, SkillCategory } from '@prisma/client';

const mockRoles = [
  {
    id: 'role_full_stack',
    title: 'Full-Stack Engineer',
    slug: 'full-stack-engineer',
    description: 'Build modern web applications with frontend reactivity, backend microservices, and databases.',
    category: 'PROGRAMMING' as SkillCategory,
    skillRequirements: [
      { id: 'req_1', targetRoleId: 'role_full_stack', skillId: 'sk_ts', requiredProficiency: 'EXPERT' as ProficiencyLevel, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_ts', name: 'TypeScript', slug: 'typescript', category: 'PROGRAMMING' as SkillCategory, subcategory: 'Web' } },
      { id: 'req_2', targetRoleId: 'role_full_stack', skillId: 'sk_react', requiredProficiency: 'ADVANCED' as ProficiencyLevel, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_react', name: 'React', slug: 'react', category: 'PROGRAMMING' as SkillCategory, subcategory: 'Frontend' } },
      { id: 'req_3', targetRoleId: 'role_full_stack', skillId: 'sk_node', requiredProficiency: 'ADVANCED' as ProficiencyLevel, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_node', name: 'Node.js', slug: 'nodejs', category: 'PROGRAMMING' as SkillCategory, subcategory: 'Backend' } },
      { id: 'req_4', targetRoleId: 'role_full_stack', skillId: 'sk_postgres', requiredProficiency: 'INTERMEDIATE' as ProficiencyLevel, importanceWeight: 2.0, isRequired: true, skill: { id: 'sk_postgres', name: 'PostgreSQL', slug: 'postgresql', category: 'PROGRAMMING' as SkillCategory, subcategory: 'Database' } },
      { id: 'req_5', targetRoleId: 'role_full_stack', skillId: 'sk_docker', requiredProficiency: 'INTERMEDIATE' as ProficiencyLevel, importanceWeight: 1.0, isRequired: false, skill: { id: 'sk_docker', name: 'Docker', slug: 'docker', category: 'OPERATIONS' as SkillCategory, subcategory: 'DevOps' } },
      { id: 'req_6', targetRoleId: 'role_full_stack', skillId: 'sk_aws', requiredProficiency: 'INTERMEDIATE' as ProficiencyLevel, importanceWeight: 1.0, isRequired: false, skill: { id: 'sk_aws', name: 'Amazon Web Services', slug: 'aws', category: 'OPERATIONS' as SkillCategory, subcategory: 'Cloud' } },
    ],
  },
  {
    id: 'role_ai_ml',
    title: 'AI / ML Engineer',
    slug: 'ai-ml-engineer',
    description: 'Develop AI pipelines and models.',
    category: 'DATA_SCIENCE' as SkillCategory,
    skillRequirements: [
      { id: 'req_ai_1', targetRoleId: 'role_ai_ml', skillId: 'sk_python', requiredProficiency: 'EXPERT' as ProficiencyLevel, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_python', name: 'Python', slug: 'python', category: 'PROGRAMMING' as SkillCategory, subcategory: 'AI' } },
      { id: 'req_ai_2', targetRoleId: 'role_ai_ml', skillId: 'sk_ml', requiredProficiency: 'ADVANCED' as ProficiencyLevel, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_ml', name: 'Machine Learning', slug: 'machine-learning', category: 'DATA_SCIENCE' as SkillCategory, subcategory: 'AI' } },
    ],
  },
];

const mockPrisma = {
  targetRole: {
    findMany: jest.fn().mockImplementation(() => Promise.resolve(mockRoles)),
    findFirst: jest.fn().mockImplementation(({ where }: any) => {
      const match = mockRoles.find((r) =>
        (where.OR && where.OR.some((cond: any) => cond.id === r.id || cond.slug === r.slug)) ||
        where.id === r.id ||
        where.slug === r.slug
      );
      return Promise.resolve(match || null);
    }),
    findUnique: jest.fn().mockImplementation(({ where }: any) => {
      const match = mockRoles.find((r) => r.id === where.id || r.slug === where.slug);
      return Promise.resolve(match || null);
    }),
  },
  userSkill: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  profile: {
    findUnique: jest.fn().mockResolvedValue({
      id: 'prof_test',
      userId: 'usr_test_1',
      targetRoleId: 'role_full_stack',
      targetRole: mockRoles[0],
    }),
    upsert: jest.fn().mockResolvedValue({
      id: 'prof_test',
      userId: 'usr_test_1',
      targetRoleId: 'role_full_stack',
    }),
  },
  user: {
    create: jest.fn().mockResolvedValue({
      id: 'usr_test_1',
      email: 'test@skillsync.local',
      role: 'STUDENT',
      status: 'ACTIVE',
    }),
    findUnique: jest.fn().mockResolvedValue({
      id: 'usr_test_1',
      email: 'test@skillsync.local',
      role: 'STUDENT',
      status: 'ACTIVE',
    }),
  },
  session: {
    create: jest.fn().mockResolvedValue({
      id: 'sess_1',
      userId: 'usr_test_1',
      token: 'session-token-123',
    }),
    findUnique: jest.fn().mockImplementation(({ where }: any) =>
      Promise.resolve({
        id: 'sess_1',
        userId: 'usr_test_1',
        token: where?.token || 'session-token-123',
        expiresAt: new Date(Date.now() + 86400000),
        user: {
          id: 'usr_test_1',
          email: 'test@skillsync.local',
          username: 'testuser',
          status: 'ACTIVE',
          role: 'STUDENT',
          defaultOrgId: null,
        },
      })
    ),
  },
  $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
};

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

import { targetRoleService } from '../services/skill-intelligence/role-gap';
import { app, createTestUser, createTestSession, makeAuthenticatedRequest } from './setup';

describe('Phase 2: Target Role Intelligence + Skill Gap Engine', () => {
  describe('Deterministic Readiness Scoring & Gap Calculations', () => {
    const mockRole = {
      id: 'role_test_engine',
      title: 'Senior Systems Engineer',
      slug: 'senior-systems-engineer',
      description: 'Test role for gap calculations',
      category: 'PROGRAMMING' as SkillCategory,
      skillRequirements: [
        {
          id: 'req_1',
          targetRoleId: 'role_test_engine',
          skillId: 'sk_ts',
          requiredProficiency: 'EXPERT' as ProficiencyLevel, // 4
          importanceWeight: 3.0,
          isRequired: true,
          skill: { id: 'sk_ts', name: 'TypeScript', slug: 'typescript', category: 'PROGRAMMING' as SkillCategory, subcategory: null },
        },
        {
          id: 'req_2',
          targetRoleId: 'role_test_engine',
          skillId: 'sk_node',
          requiredProficiency: 'ADVANCED' as ProficiencyLevel, // 3
          importanceWeight: 2.0,
          isRequired: true,
          skill: { id: 'sk_node', name: 'Node.js', slug: 'nodejs', category: 'PROGRAMMING' as SkillCategory, subcategory: null },
        },
        {
          id: 'req_3',
          targetRoleId: 'role_test_engine',
          skillId: 'sk_docker',
          requiredProficiency: 'INTERMEDIATE' as ProficiencyLevel, // 2
          importanceWeight: 1.0,
          isRequired: false, // Optional
          skill: { id: 'sk_docker', name: 'Docker', slug: 'docker', category: 'OPERATIONS' as SkillCategory, subcategory: null },
        },
      ],
    };

    beforeEach(() => {
      jest.spyOn(targetRoleService, 'getTargetRoleById').mockResolvedValue(mockRole as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return 100 readiness and 100 mandatory readiness for a perfect match', async () => {
      const mockUserSkills = [
        { skillId: 'sk_ts', proficiencyLevel: 'EXPERT', confidence: 95, skill: { id: 'sk_ts', name: 'TypeScript', slug: 'typescript' } },
        { skillId: 'sk_node', proficiencyLevel: 'EXPERT', confidence: 90, skill: { id: 'sk_node', name: 'Node.js', slug: 'nodejs' } }, // Exceeds ADVANCED
        { skillId: 'sk_docker', proficiencyLevel: 'INTERMEDIATE', confidence: 80, skill: { id: 'sk_docker', name: 'Docker', slug: 'docker' } },
      ];

      mockPrisma.userSkill.findMany.mockResolvedValueOnce(mockUserSkills as any);

      const result = await targetRoleService.calculateRoleGap('test_user_perfect', 'role_test_engine');

      expect(result).not.toBeNull();
      expect(result!.readinessScore).toBe(100);
      expect(result!.mandatoryReadinessScore).toBe(100);
      expect(result!.matched.length).toBe(3);
      expect(result!.partial.length).toBe(0);
      expect(result!.missing.length).toBe(0);
      expect(result!.optional.length).toBe(1);
      expect(result!.summary.matchedCount).toBe(3);
      expect(result!.summary.missingCount).toBe(0);
      expect(result!.summary.mandatoryMissingCount).toBe(0);
      expect(result!.priorities.length).toBe(0);
    });

    it('should return 0 readiness and 0 mandatory readiness when user possesses no skills', async () => {
      mockPrisma.userSkill.findMany.mockResolvedValueOnce([]);

      const result = await targetRoleService.calculateRoleGap('test_user_empty', 'role_test_engine');

      expect(result).not.toBeNull();
      expect(result!.readinessScore).toBe(0);
      expect(result!.mandatoryReadinessScore).toBe(0);
      expect(result!.matched.length).toBe(0);
      expect(result!.partial.length).toBe(0);
      expect(result!.missing.length).toBe(3);
      expect(result!.summary.mandatoryMissingCount).toBe(2);
      expect(result!.priorities.length).toBe(3);

      for (const item of result!.missing) {
        expect(item.status).toBe('MISSING');
        expect(item.currentProficiency).toBeNull();
        expect(item.gap).toBeGreaterThan(0);
      }
    });

    it('should calculate exact intermediate score for partial proficiencies', async () => {
      // TypeScript (req EXPERT = 4, weight 3.0): User has INTERMEDIATE = 2 -> score 2/4 = 0.5 -> weighted 1.5
      // Node.js (req ADVANCED = 3, weight 2.0): User has ADVANCED = 3 -> score 3/3 = 1.0 -> weighted 2.0
      // Docker (req INTERMEDIATE = 2, weight 1.0, optional): User is MISSING = 0 -> score 0 -> weighted 0
      // Total weight: 3.0 + 2.0 + 1.0 = 6.0
      // Achieved weight: 1.5 + 2.0 + 0 = 3.5
      // Overall readiness: round((3.5 / 6.0) * 100) = round(58.33) = 58
      // Mandatory weight: 3.0 + 2.0 = 5.0
      // Mandatory achieved: 1.5 + 2.0 = 3.5
      // Mandatory readiness: round((3.5 / 5.0) * 100) = 70
      const mockUserSkills = [
        { skillId: 'sk_ts', proficiencyLevel: 'INTERMEDIATE', confidence: 75, skill: { id: 'sk_ts', name: 'TypeScript', slug: 'typescript' } },
        { skillId: 'sk_node', proficiencyLevel: 'ADVANCED', confidence: 85, skill: { id: 'sk_node', name: 'Node.js', slug: 'nodejs' } },
      ];

      mockPrisma.userSkill.findMany.mockResolvedValueOnce(mockUserSkills as any);

      const result = await targetRoleService.calculateRoleGap('test_user_partial', 'role_test_engine');

      expect(result).not.toBeNull();
      expect(result!.readinessScore).toBe(58);
      expect(result!.mandatoryReadinessScore).toBe(70);
      expect(result!.matched.length).toBe(1);
      expect(result!.partial.length).toBe(1);
      expect(result!.missing.length).toBe(1);
      expect(result!.partial[0].skill.name).toBe('TypeScript');
      expect(result!.partial[0].gap).toBe(2);
    });

    it('should demonstrate that higher importance skills impact readiness more than lower importance skills', async () => {
      // Scenario A: User only has TypeScript (weight 3.0, matched 4/4) -> achieved = 3.0 / 6.0 = 50%
      mockPrisma.userSkill.findMany.mockResolvedValueOnce([
        { skillId: 'sk_ts', proficiencyLevel: 'EXPERT', confidence: 90, skill: { id: 'sk_ts', name: 'TypeScript', slug: 'typescript' } },
      ] as any);

      const resultA = await targetRoleService.calculateRoleGap('user_ts_only', 'role_test_engine');

      // Scenario B: User only has Docker (weight 1.0, matched 2/2) -> achieved = 1.0 / 6.0 = 17%
      mockPrisma.userSkill.findMany.mockResolvedValueOnce([
        { skillId: 'sk_docker', proficiencyLevel: 'INTERMEDIATE', confidence: 80, skill: { id: 'sk_docker', name: 'Docker', slug: 'docker' } },
      ] as any);

      const resultB = await targetRoleService.calculateRoleGap('user_docker_only', 'role_test_engine');

      expect(resultA!.readinessScore).toBe(50);
      expect(resultB!.readinessScore).toBe(17);
      expect(resultA!.readinessScore).toBeGreaterThan(resultB!.readinessScore);
    });

    it('should severely reduce mandatory readiness score when missing a mandatory skill while matching optional skills', async () => {
      const mockUserSkills = [
        { skillId: 'sk_node', proficiencyLevel: 'ADVANCED', confidence: 85, skill: { id: 'sk_node', name: 'Node.js', slug: 'nodejs' } },
        { skillId: 'sk_docker', proficiencyLevel: 'INTERMEDIATE', confidence: 80, skill: { id: 'sk_docker', name: 'Docker', slug: 'docker' } },
      ];

      mockPrisma.userSkill.findMany.mockResolvedValueOnce(mockUserSkills as any);

      const result = await targetRoleService.calculateRoleGap('user_missing_mandatory', 'role_test_engine');

      expect(result!.readinessScore).toBe(50);
      expect(result!.mandatoryReadinessScore).toBe(40);
      expect(result!.summary.mandatoryMissingCount).toBe(1);
      expect(result!.mandatoryReadinessScore).toBeLessThan(result!.readinessScore);
    });

    it('should rank mandatory high-gap skills first in priority ranking', async () => {
      // TypeScript: MISSING (req EXPERT = 4, weight 3.0, mandatory) -> priority = 3.0 * 4 * 1.5 = 18.0
      // Node.js: INTERMEDIATE (req ADVANCED = 3, gap = 1, weight 2.0, mandatory) -> priority = 2.0 * 1 * 1.5 = 3.0
      // Docker: MISSING (req INTERMEDIATE = 2, weight 1.0, optional) -> priority = 1.0 * 2 * 1.0 = 2.0
      const mockUserSkills = [
        { skillId: 'sk_node', proficiencyLevel: 'INTERMEDIATE', confidence: 70, skill: { id: 'sk_node', name: 'Node.js', slug: 'nodejs' } },
      ];

      mockPrisma.userSkill.findMany.mockResolvedValueOnce(mockUserSkills as any);

      const result = await targetRoleService.calculateRoleGap('user_priorities_test', 'role_test_engine');

      expect(result!.priorities.length).toBe(3);
      expect(result!.priorities[0].skill.name).toBe('TypeScript');
      expect(result!.priorities[0].priorityScore).toBe(18.0);
      expect(result!.priorities[0].isRequired).toBe(true);

      expect(result!.priorities[1].skill.name).toBe('Node.js');
      expect(result!.priorities[1].priorityScore).toBe(3.0);

      expect(result!.priorities[2].skill.name).toBe('Docker');
      expect(result!.priorities[2].priorityScore).toBe(2.0);
      expect(result!.priorities[2].isRequired).toBe(false);
    });
  });

  describe('API Route Security, Validation & Authorization', () => {
    let testUser: any;
    let authHeaders: { headers: { Cookie: string } };

    beforeAll(async () => {
      const res = await createTestUser();
      testUser = res.user;
      const session = await createTestSession(testUser.id);
      authHeaders = makeAuthenticatedRequest(session.jwtToken);
    });

    it('GET /skill-intelligence/roles should return available target roles', async () => {
      const res = await app.request('/skill-intelligence/roles', { method: 'GET' });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0]).toHaveProperty('slug');
      expect(body.data[0]).toHaveProperty('title');
    });

    it('GET /skill-intelligence/roles/:id should return role details for a valid role', async () => {
      const res = await app.request('/skill-intelligence/roles/full-stack-engineer', { method: 'GET' });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(body.data.slug).toBe('full-stack-engineer');
      expect(body.data.skillRequirements).toBeDefined();
    });

    it('GET /skill-intelligence/roles/:id should return 404 for a nonexistent role', async () => {
      const res = await app.request('/skill-intelligence/roles/nonexistent-role-slug', { method: 'GET' });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('GET /skill-intelligence/roles/:id/gap should reject unauthenticated requests with 401', async () => {
      const res = await app.request('/skill-intelligence/roles/full-stack-engineer/gap', {
        method: 'GET',
      });
      expect(res.status).toBe(401);
    });

    it('GET /skill-intelligence/roles/:id/gap should return authenticated user gap analysis', async () => {
      const res = await app.request(
        '/skill-intelligence/roles/full-stack-engineer/gap',
        {
          method: 'GET',
          ...authHeaders,
        }
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(body.data).toHaveProperty('readinessScore');
      expect(body.data).toHaveProperty('mandatoryReadinessScore');
      expect(body.data).toHaveProperty('matched');
      expect(body.data).toHaveProperty('partial');
      expect(body.data).toHaveProperty('missing');
      expect(body.data).toHaveProperty('priorities');
      expect(body.data).toHaveProperty('summary');
    });

    it('POST /skill-intelligence/target-role should reject unauthenticated requests with 401', async () => {
      const res = await app.request('/skill-intelligence/target-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: 'full-stack-engineer' }),
      });
      expect(res.status).toBe(401);
    });

    it('POST /skill-intelligence/target-role should return 404 for nonexistent role', async () => {
      const res = await app.request('/skill-intelligence/target-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders.headers,
        },
        body: JSON.stringify({ roleId: 'nonexistent-role-xyz' }),
      });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('POST /skill-intelligence/target-role should validate request body', async () => {
      const res = await app.request('/skill-intelligence/target-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders.headers,
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('POST /skill-intelligence/target-role should set role and return real gap analysis', async () => {
      const res = await app.request('/skill-intelligence/target-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders.headers,
        },
        body: JSON.stringify({ roleId: 'ai-ml-engineer' }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(body.data.role.slug).toBe('ai-ml-engineer');
      expect(body.data.readinessScore).toBeDefined();
    });

    it('GET /skill-intelligence/target-role should return user current target role and gap', async () => {
      const res = await app.request('/skill-intelligence/target-role', {
        method: 'GET',
        ...authHeaders,
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(body.data.targetRole).toBeDefined();
      expect(body.data.gap).toBeDefined();
    });
  });
});
