import {
  app,
  createTestUser,
  createTestSession,
  createTestSkill,
  cleanupTestData,
} from './setup';
import { OpportunityType, ApplicationStatus } from '@skillsync/types';

describe('Phase 11: Opportunity & Placement Intelligence', () => {
  let recruiterUser: any;
  let recruiterToken: string;
  let candidateUser: any;
  let candidateToken: string;

  let testSkillTs: any;
  let testSkillPython: any;
  let testOppId: string;
  let testAppId: string;

  beforeAll(async () => {
    await cleanupTestData();

    const recRes = await createTestUser({ email: 'recruiter@anthropic.com', username: 'recruiter_alex', role: 'RECRUITER' });
    recruiterUser = recRes.user;
    const recSess = await createTestSession(recruiterUser.id);
    recruiterToken = recSess.jwtToken;

    const candRes = await createTestUser({ email: 'candidate@stanford.edu', username: 'candidate_sarah', role: 'STUDENT' });
    candidateUser = candRes.user;
    const candSess = await createTestSession(candidateUser.id);
    candidateToken = candSess.jwtToken;

    testSkillTs = await createTestSkill({ name: 'TypeScript', slug: 'typescript', category: 'PROGRAMMING' });
    testSkillPython = await createTestSkill({ name: 'Python', slug: 'python', category: 'DATA_SCIENCE' });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('1. should create an opportunity with canonical skill requirements', async () => {
    const res = await app.request('/opportunities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterToken}`,
      },
      body: JSON.stringify({
        title: 'Senior Distributed Systems Engineer',
        description: 'Design and operate low-latency edge computing clusters with TypeScript and Python.',
        type: OpportunityType.JOB,
        location: 'San Francisco, CA (Hybrid)',
        isRemote: false,
        experienceLevel: 'SENIOR',
        minReadinessScore: 60,
        salaryMin: 180000,
        salaryMax: 220000,
        currency: 'USD',
        skills: [
          { skillId: testSkillTs.id, isRequired: true },
          { skillId: testSkillPython.id, isRequired: true },
        ],
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.title).toBe('Senior Distributed Systems Engineer');
    expect(json.data.skills.length).toBe(2);

    testOppId = json.data.id;
  });

  it('2. should list opportunities with personalized candidate match scores', async () => {
    const res = await app.request('/opportunities', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${candidateToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);

    const matchOpp = json.data.find((o: any) => o.id === testOppId);
    expect(matchOpp).toBeDefined();
    expect(matchOpp.matchScore).toBeDefined();
  });

  it('3. should retrieve opportunity details with explainable match breakdown', async () => {
    const res = await app.request(`/opportunities/${testOppId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${candidateToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(testOppId);
    expect(json.data.match).toBeDefined();
    expect(json.data.match.matchScore).toBeGreaterThanOrEqual(0);
    expect(json.data.match.matchScore).toBeLessThanOrEqual(100);
    expect(json.data.match.matchLevel).toBeDefined();
    expect(json.data.match.explanation).toBeDefined();
    expect(Array.isArray(json.data.match.matchedSkills)).toBe(true);
  });

  it('4. should allow candidate to submit application with match snapshot', async () => {
    const res = await app.request(`/opportunities/${testOppId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        coverLetter: 'I am excited to build low-latency systems. My verified projects demonstrate TypeScript depth.',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.status).toBe(ApplicationStatus.APPLIED);
    expect(json.data.matchScore).toBeDefined();

    testAppId = json.data.id;
  });

  it('5. should list candidate submitted applications', async () => {
    const res = await app.request('/applications', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${candidateToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.some((a: any) => a.id === testAppId)).toBe(true);
  });

  it('6. should allow recruiter to view and rank candidate matches', async () => {
    const res = await app.request(`/opportunities/${testOppId}/candidates`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);

    const applicant = json.data.find((c: any) => c.candidateId === candidateUser.id);
    expect(applicant).toBeDefined();
    expect(applicant.matchScore).toBeDefined();
    expect(applicant.readinessScore).toBeDefined();
  });

  it('7. should allow recruiter to update applicant review status', async () => {
    const res = await app.request(`/applications/${testAppId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterToken}`,
      },
      body: JSON.stringify({
        status: ApplicationStatus.INTERVIEW,
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe(ApplicationStatus.INTERVIEW);
    expect(json.data.reviewedBy).toBe(recruiterUser.id);
  });
});
