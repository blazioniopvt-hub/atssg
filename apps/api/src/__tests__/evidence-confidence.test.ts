// SkillSync Phase 4: Evidence Intelligence + Skill Confidence Engine Test Suite
// Covers multi-signal evidence scoring, specificity analysis, recency decay,
// corroboration, contradiction detection, proficiency vs confidence separation,
// evidence deduplication, REST API authorization, IDOR defense, and Target Role integration.

const mockUserSkills = new Map<string, any>();
const mockEvidence = new Map<string, any>();

const mockSkills = [
  { id: 'sk_python', name: 'Python', slug: 'python', category: 'PROGRAMMING' },
  { id: 'sk_pytorch', name: 'PyTorch', slug: 'pytorch', category: 'DATA_SCIENCE' },
  { id: 'sk_docker', name: 'Docker', slug: 'docker', category: 'OPERATIONS' },
  { id: 'sk_k8s', name: 'Kubernetes', slug: 'kubernetes', category: 'OPERATIONS' },
];

const mockPrisma = {
  userSkill: {
    findFirst: jest.fn().mockImplementation(({ where }: any) => {
      for (const us of mockUserSkills.values()) {
        if (where.userId && us.userId !== where.userId) continue;
        if (where.skillId && us.skillId !== where.skillId) continue;
        if (where.id && us.id !== where.id) continue;
        if (where.OR) {
          const match = where.OR.some((cond: any) => {
            if (cond.skillId && us.skillId === cond.skillId) return true;
            if (cond.id && us.id === cond.id) return true;
            if (cond.skill?.slug && us.skill?.slug === cond.skill.slug) return true;
            return false;
          });
          if (!match) continue;
        }
        const evidence = Array.from(mockEvidence.values()).filter((e) => e.userSkillId === us.id);
        return Promise.resolve({ ...us, evidence });
      }
      return Promise.resolve(null);
    }),
    findMany: jest.fn().mockImplementation(({ where }: any) => {
      const list = [];
      for (const us of mockUserSkills.values()) {
        if (where.userId && us.userId !== where.userId) continue;
        const evidence = Array.from(mockEvidence.values()).filter((e) => e.userSkillId === us.id);
        list.push({ ...us, evidence });
      }
      return Promise.resolve(list);
    }),
  },
  skillEvidence: {
    findMany: jest.fn().mockImplementation(({ where }: any) => {
      const list = [];
      for (const ev of mockEvidence.values()) {
        if (where.userSkillId && ev.userSkillId !== where.userSkillId) continue;
        list.push(ev);
      }
      return Promise.resolve(list);
    }),
    create: jest.fn().mockImplementation(({ data }: any) => {
      const record = { id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ...data, createdAt: new Date() };
      mockEvidence.set(record.id, record);
      return Promise.resolve(record);
    }),
  },
  user: {
    findUnique: jest.fn().mockImplementation(({ where }: any) => {
      if (where.id === 'usr_alice') {
        return Promise.resolve({ id: 'usr_alice', email: 'alice@skillsync.test', role: 'STUDENT' });
      }
      if (where.id === 'usr_bob') {
        return Promise.resolve({ id: 'usr_bob', email: 'bob@skillsync.test', role: 'STUDENT' });
      }
      return Promise.resolve(null);
    }),
  },
};

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// Import services and dependencies after prisma mock
import {
  evaluateSpecificity,
  calculateRecencyDecay,
  getEvidenceSourceWeight,
} from '../services/skill-intelligence/config';
import {
  skillConfidenceService,
  SkillConfidenceService,
} from '../services/skill-intelligence/skill-confidence';
import { TargetRoleService } from '../services/skill-intelligence/role-gap';
import { createTestApp } from './test-app';
import { SignJWT } from 'jose';

describe('SkillSync Phase 4: Evidence Intelligence + Skill Confidence Engine', () => {
  let app: any;
  let aliceJwt: string;
  let bobJwt: string;
  let targetRoleService: TargetRoleService;

  beforeAll(async () => {
    app = createTestApp();
    targetRoleService = new TargetRoleService();

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'test-secret-at-least-32-chars-long-for-jwt-signing');

    aliceJwt = await new SignJWT({
      userId: 'usr_alice',
      email: 'alice@skillsync.test',
      role: 'STUDENT',
      tokenVersion: 0,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secret);

    bobJwt = await new SignJWT({
      userId: 'usr_bob',
      email: 'bob@skillsync.test',
      role: 'STUDENT',
      tokenVersion: 0,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secret);
  });

  beforeEach(() => {
    mockUserSkills.clear();
    mockEvidence.clear();
    jest.clearAllMocks();
  });

  // ============================================================
  // 1. EVIDENCE SPECIFICITY & RECENCY HEURISTICS
  // ============================================================
  describe('Evidence Specificity & Recency Engine', () => {
    it('should assign lower specificity to vague keyword mentions', () => {
      const bareKeyword = 'Python';
      const specificity = evaluateSpecificity(bareKeyword);
      expect(specificity).toBeLessThanOrEqual(0.60);
    });

    it('should assign high specificity to concrete action and scale outcomes', () => {
      const detailedEvidence = 'Architected and built a PyTorch image classification pipeline in Python processing 50k images with 99.9% uptime.';
      const specificity = evaluateSpecificity(detailedEvidence);
      expect(specificity).toBeGreaterThanOrEqual(0.90);
    });

    it('should calculate recency decay with fresh evidence near 1.0 and decaying gracefully over time', () => {
      const now = new Date();
      const freshFactor = calculateRecencyDecay(now);
      expect(freshFactor).toBeGreaterThanOrEqual(0.98);

      const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);
      const decayedFactor = calculateRecencyDecay(twoYearsAgo);
      expect(decayedFactor).toBeLessThan(freshFactor);
      expect(decayedFactor).toBeGreaterThanOrEqual(0.70);

      const fourYearsAgo = new Date(Date.now() - 1460 * 24 * 60 * 60 * 1000);
      const oldFactor = calculateRecencyDecay(fourYearsAgo);
      expect(oldFactor).toBeGreaterThanOrEqual(0.65); // Invariant: historical evidence never destroyed
    });

    it('should return configured source weights correctly', () => {
      expect(getEvidenceSourceWeight('WORK_SAMPLE')).toBe(0.95);
      expect(getEvidenceSourceWeight('ASSESSMENT')).toBe(0.90);
      expect(getEvidenceSourceWeight('CERTIFICATION')).toBe(0.75);
      expect(getEvidenceSourceWeight('PROJECT')).toBe(0.70);
      expect(getEvidenceSourceWeight('RESUME')).toBe(0.55);
      expect(getEvidenceSourceWeight('SELF_REPORTED')).toBe(0.35);
    });
  });

  // ============================================================
  // 2. MULTI-SIGNAL CONFIDENCE CALCULATION & CORROBORATION
  // ============================================================
  describe('Multi-Signal Confidence & Corroboration', () => {
    it('should assign low confidence (CLAIMED) to uncorroborated self-reports', () => {
      const userSkill = {
        skillId: 'sk_python',
        proficiencyLevel: 'ADVANCED',
        skill: mockSkills[0],
      };

      const confidence = skillConfidenceService.calculateSkillConfidence(userSkill, [
        {
          type: 'SELF_REPORTED',
          title: 'Self-reported skill',
          description: 'Python',
          metadata: { source: 'SELF_REPORTED', confidence: 0.5 },
        },
      ]);

      expect(confidence.confidence).toBeLessThan(50);
      expect(confidence.verificationStatus).toBe('CLAIMED');
      expect(confidence.evidenceCount).toBe(1);
    });

    it('should elevate confidence to SUPPORTED when validated project or resume evidence is added', () => {
      const userSkill = {
        skillId: 'sk_python',
        proficiencyLevel: 'ADVANCED',
        skill: mockSkills[0],
      };

      const confidence = skillConfidenceService.calculateSkillConfidence(userSkill, [
        {
          type: 'PROJECT',
          title: 'FastAPI Microservice backend in Python',
          description: 'Developed REST API with PostgreSQL',
          createdAt: new Date(),
          metadata: { source: 'PROJECT', confidence: 0.85 },
        },
      ]);

      expect(confidence.confidence).toBeGreaterThanOrEqual(50);
      expect(confidence.verificationStatus).toBe('SUPPORTED');
    });

    it('should achieve STRONGLY_SUPPORTED when multiple independent sources corroborate skill', () => {
      const userSkill = {
        skillId: 'sk_python',
        proficiencyLevel: 'ADVANCED',
        skill: mockSkills[0],
      };

      const confidence = skillConfidenceService.calculateSkillConfidence(userSkill, [
        {
          type: 'WORK_EXPERIENCE',
          title: 'Resume Experience at TechCorp',
          description: 'Built data processing pipelines in Python',
          createdAt: new Date(),
          metadata: { source: 'RESUME', confidence: 0.88 },
        },
        {
          type: 'PROJECT',
          title: 'Full-Stack Machine Learning Web App',
          description: 'Deployed transformer models in Python and Docker',
          createdAt: new Date(),
          metadata: { source: 'PROJECT', confidence: 0.85 },
        },
        {
          type: 'CERTIFICATE',
          title: 'Python for Data Science Professional Certificate',
          description: 'Completed 6-month industry specialization',
          createdAt: new Date(),
          metadata: { source: 'CERTIFICATION', confidence: 0.90 },
        },
      ]);

      expect(confidence.confidence).toBeGreaterThanOrEqual(75);
      expect(confidence.verificationStatus).toBe('STRONGLY_SUPPORTED');
      expect(confidence.factors.corroborationBonus).toBeGreaterThan(0);
      expect(confidence.evidenceSources.length).toBeGreaterThanOrEqual(3);
    });

    it('should achieve VERIFIED when high-scoring assessment or work sample is present', () => {
      const userSkill = {
        skillId: 'sk_python',
        proficiencyLevel: 'EXPERT',
        skill: mockSkills[0],
      };

      const confidence = skillConfidenceService.calculateSkillConfidence(userSkill, [
        {
          type: 'ASSESSMENT_RESULT',
          title: 'SkillSync Advanced Python Coding Benchmark',
          description: 'Passed 90-minute live algorithmic and architecture test',
          verifiedAt: new Date(),
          metadata: { source: 'ASSESSMENT', score: 92, confidence: 0.95 },
        },
        {
          type: 'PROJECT',
          title: 'Async Python Distributed Worker Pool',
          description: 'Built distributed message queue in Python',
          createdAt: new Date(),
          metadata: { source: 'PROJECT', confidence: 0.85 },
        },
      ]);

      expect(confidence.confidence).toBeGreaterThanOrEqual(85);
      expect(confidence.verificationStatus).toBe('VERIFIED');
    });

    it('should enforce strict bounds (0 <= confidence <= 100) regardless of evidence volume', () => {
      const userSkill = {
        skillId: 'sk_python',
        proficiencyLevel: 'EXPERT',
        skill: mockSkills[0],
      };

      // Construct a flood of 20 high-confidence evidence records
      const massiveEvidence = Array.from({ length: 20 }, (_, i) => ({
        type: 'WORK_SAMPLE',
        title: `Work sample ${i}`,
        description: `High impact engineering in Python with measurable metrics`,
        createdAt: new Date(),
        metadata: { source: 'WORK_SAMPLE', confidence: 0.99 },
      }));

      const confidence = skillConfidenceService.calculateSkillConfidence(userSkill, massiveEvidence);
      expect(confidence.confidence).toBeLessThanOrEqual(100);
      expect(confidence.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================
  // 3. CONTRADICTION & CONFLICT DETECTION
  // ============================================================
  describe('Contradiction & Conflict Detection', () => {
    it('should flag CONFLICTING status when user claims EXPERT but assessment proves BEGINNER', () => {
      const userSkill = {
        skillId: 'sk_python',
        proficiencyLevel: 'EXPERT',
        skill: mockSkills[0],
      };

      const confidence = skillConfidenceService.calculateSkillConfidence(userSkill, [
        {
          type: 'WORK_EXPERIENCE',
          title: 'Resume Claim',
          description: '10 years Python programming',
          metadata: { source: 'RESUME', confidence: 0.85 },
        },
        {
          type: 'ASSESSMENT_RESULT',
          title: 'SkillSync Technical Assessment',
          description: 'Scored at foundational level',
          verifiedAt: new Date(),
          metadata: {
            source: 'ASSESSMENT',
            assessedProficiency: 'BEGINNER',
            score: 42,
          },
        },
      ]);

      expect(confidence.verificationStatus).toBe('CONFLICTING');
      expect(confidence.conflicts.length).toBeGreaterThan(0);
      expect(confidence.conflicts[0].type).toBe('PROFICIENCY_MISMATCH');
    });

    it('should detect low assessment test score and record conflict without crashing', () => {
      const userSkill = {
        skillId: 'sk_python',
        proficiencyLevel: 'ADVANCED',
        skill: mockSkills[0],
      };

      const confidence = skillConfidenceService.calculateSkillConfidence(userSkill, [
        {
          type: 'ASSESSMENT_RESULT',
          title: 'Python Coding Exam',
          description: 'Exam score: 35%',
          metadata: { source: 'ASSESSMENT', score: 35 },
        },
      ]);

      expect(confidence.verificationStatus).toBe('CONFLICTING');
      expect(confidence.conflicts.some((c) => c.type === 'LOW_ASSESSMENT_SCORE')).toBe(true);
    });
  });

  // ============================================================
  // 4. PROFICIENCY SEPARATION & NON-DOWNGRADE INVARIANT
  // ============================================================
  describe('Proficiency vs Confidence Separation', () => {
    it('should preserve EXPERT proficiency even when confidence is low (claimed)', () => {
      const userSkill = {
        skillId: 'sk_python',
        proficiencyLevel: 'EXPERT',
        skill: mockSkills[0],
      };

      const confidence = skillConfidenceService.calculateSkillConfidence(userSkill, []);

      // Critical Invariant: proficiency remains EXPERT, confidence communicates uncertainty
      expect(confidence.proficiency).toBe('EXPERT');
      expect(confidence.confidence).toBeLessThan(50);
      expect(confidence.verificationStatus).toBe('CLAIMED');
    });
  });

  // ============================================================
  // 5. EVIDENCE DEDUPLICATION
  // ============================================================
  describe('Evidence Deduplication', () => {
    it('should deduplicate identical evidence items and avoid score inflation', () => {
      const userSkill = {
        skillId: 'sk_python',
        proficiencyLevel: 'INTERMEDIATE',
        skill: mockSkills[0],
      };

      const identicalItem = {
        type: 'WORK_EXPERIENCE',
        title: 'Resume Evidence (resume_2026.pdf)',
        description: 'Built data microservices in Python',
        createdAt: new Date('2026-01-01'),
        metadata: { source: 'RESUME', confidence: 0.85 },
      };

      // Send identical item 3 times
      const confidence = skillConfidenceService.calculateSkillConfidence(userSkill, [
        identicalItem,
        identicalItem,
        { ...identicalItem },
      ]);

      expect(confidence.evidenceCount).toBe(1); // Deduplicated to 1 item
    });
  });

  // ============================================================
  // 6. REST API & IDOR SECURITY TESTS
  // ============================================================
  describe('REST API & IDOR Defense', () => {
    it('should reject unauthenticated requests to /skill-intelligence/skills/confidence with 401', async () => {
      const res = await app.request('/skill-intelligence/skills/confidence', {
        method: 'GET',
      });
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated requests to /skill-intelligence/skills/:skillId/confidence with 401', async () => {
      const res = await app.request('/skill-intelligence/skills/sk_python/confidence', {
        method: 'GET',
      });
      expect(res.status).toBe(401);
    });

    it('should prevent IDOR: User B cannot access User A skill confidence or evidence', async () => {
      // Alice owns Python
      const aliceSkill = {
        id: 'usk_alice_python',
        userId: 'usr_alice',
        skillId: 'sk_python',
        proficiencyLevel: 'EXPERT',
        confidence: 88,
        skill: mockSkills[0],
      };
      mockUserSkills.set(aliceSkill.id, aliceSkill);

      // Bob attempts to request Alice's skill confidence
      const res = await app.request('/skill-intelligence/skills/sk_python/confidence', {
        method: 'GET',
        headers: { Cookie: `skillsync_session=${bobJwt}` },
      });

      // Bob does not own Python, must receive 404
      expect(res.status).toBe(404);

      // Bob attempts to request Alice's skill evidence
      const evRes = await app.request('/skill-intelligence/skills/sk_python/evidence', {
        method: 'GET',
        headers: { Cookie: `skillsync_session=${bobJwt}` },
      });
      expect(evRes.status).toBe(404);
    });

    it('should allow authenticated User A to fetch own skill confidence and evidence', async () => {
      const aliceSkill = {
        id: 'usk_alice_python',
        userId: 'usr_alice',
        skillId: 'sk_python',
        proficiencyLevel: 'ADVANCED',
        confidence: 80,
        skill: mockSkills[0],
      };
      mockUserSkills.set(aliceSkill.id, aliceSkill);

      mockEvidence.set('ev_alice_1', {
        id: 'ev_alice_1',
        userSkillId: aliceSkill.id,
        skillId: 'sk_python',
        type: 'PROJECT',
        title: 'ML pipeline in Python',
        description: 'Image classification model processing 50k images',
        metadata: { source: 'PROJECT', confidence: 0.9 },
        createdAt: new Date(),
      });

      const res = await app.request('/skill-intelligence/skills/sk_python/confidence', {
        method: 'GET',
        headers: { Cookie: `skillsync_session=${aliceJwt}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.skillName).toBe('Python');
      expect(json.data.confidence).toBeGreaterThanOrEqual(50);
      expect(json.data.verificationStatus).toBe('SUPPORTED');

      // Fetch evidence list
      const evRes = await app.request('/skill-intelligence/skills/sk_python/evidence', {
        method: 'GET',
        headers: { Cookie: `skillsync_session=${aliceJwt}` },
      });
      expect(evRes.status).toBe(200);
      const evJson = await evRes.json();
      expect(evJson.data.length).toBe(1);
    });
  });

  // ============================================================
  // 7. TARGET ROLE INTEGRATION WITH CONFIDENCE METRICS
  // ============================================================
  describe('Target Role Readiness + Confidence Integration', () => {
    it('should surface averageSkillConfidence and evidenceBackedSkillsCount alongside deterministic readiness', async () => {
      // Mock user with skills having confidence values
      const userSkills = [
        {
          id: 'us_1',
          skillId: 'sk_python',
          proficiencyLevel: 'EXPERT',
          confidence: 90,
          skill: mockSkills[0],
        },
        {
          id: 'us_2',
          skillId: 'sk_pytorch',
          proficiencyLevel: 'ADVANCED',
          confidence: 80,
          skill: mockSkills[1],
        },
      ];

      jest.spyOn(mockPrisma.userSkill, 'findMany').mockResolvedValue(userSkills as any);

      const gap = await targetRoleService.calculateRoleGap('usr_alice', 'role_data_science');

      // Deterministic readiness scores remain completely preserved from Phase 2
      expect(gap.readinessScore).toBeGreaterThan(0);
      expect(gap.mandatoryReadinessScore).toBeGreaterThan(0);

      // Phase 4: Confidence context exposed alongside readiness
      expect(typeof gap.averageSkillConfidence).toBe('number');
      expect(gap.averageSkillConfidence).toBeGreaterThanOrEqual(80);
      expect(gap.evidenceBackedSkillsCount).toBeGreaterThanOrEqual(1);
    });
  });
});
