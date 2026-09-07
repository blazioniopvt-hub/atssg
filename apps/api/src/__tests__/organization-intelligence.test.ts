import {
  app,
  createTestUser,
  createTestSession,
  makeAuthenticatedRequest,
  cleanupTestData,
} from './setup';
import { OrgUserRole, InvitationStatus } from '@skillsync/types';

describe('Phase 10: Organization & College Intelligence', () => {
  let ownerUser: any;
  let ownerToken: string;
  let studentUser: any;
  let studentToken: string;
  let outsideUser: any;
  let outsideToken: string;

  beforeAll(async () => {
    await cleanupTestData();

    const ownerRes = await createTestUser({ email: 'owner@stanford.edu', username: 'org_owner', role: 'ADMIN' });
    ownerUser = ownerRes.user;
    const ownerSess = await createTestSession(ownerUser.id);
    ownerToken = ownerSess.jwtToken;

    const studentRes = await createTestUser({ email: 'student@stanford.edu', username: 'org_student', role: 'STUDENT' });
    studentUser = studentRes.user;
    const studentSess = await createTestSession(studentUser.id);
    studentToken = studentSess.jwtToken;

    const outsideRes = await createTestUser({ email: 'stranger@other.edu', username: 'org_stranger', role: 'STUDENT' });
    outsideUser = outsideRes.user;
    const outsideSess = await createTestSession(outsideUser.id);
    outsideToken = outsideSess.jwtToken;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  let testOrgId: string;
  let testInviteToken: string;

  it('1. should create an organization and assign creator as OWNER', async () => {
    const slug = `stanford-cs-${Date.now()}`;
    const res = await app.request('/organizations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Stanford School of Engineering',
        slug,
        description: 'Premier institutional engineering program',
        type: 'EDUCATIONAL',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.name).toBe('Stanford School of Engineering');
    expect(json.data.slug).toBe(slug);

    testOrgId = json.data.id;
  });

  it('2. should list organizations where user is a member', async () => {
    const res = await app.request('/organizations', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.some((o: any) => o.id === testOrgId || o.name === 'Stanford School of Engineering')).toBe(true);
  });

  it('3. should get organization details with caller role', async () => {
    const res = await app.request(`/organizations/${testOrgId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(testOrgId);
    expect(json.data.userRole).toBe(OrgUserRole.OWNER);
  });

  it('4. should create organization invitation with cryptographic token', async () => {
    const res = await app.request(`/organizations/${testOrgId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: 'student@stanford.edu',
        role: OrgUserRole.CANDIDATE,
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.email).toBe('student@stanford.edu');
    expect(json.data.token).toBeDefined();
    expect(json.data.token.length).toBeGreaterThan(20);
    expect(json.data.status).toBe(InvitationStatus.PENDING);

    testInviteToken = json.data.token;
  });

  it('5. should allow invited user to accept invitation and join organization', async () => {
    const res = await app.request(`/organizations/invitations/${testInviteToken}/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.message).toContain('accepted');
  });

  it('6. should reject already accepted or invalid invitation tokens', async () => {
    const res = await app.request(`/organizations/invitations/${testInviteToken}/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('7. should create and list academic departments', async () => {
    const createRes = await app.request(`/organizations/${testOrgId}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Computer Science',
        code: `CS${Date.now().toString().slice(-4)}`,
        description: 'Department of Computer Science',
      }),
    });

    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    expect(createJson.data.name).toBe('Computer Science');

    const listRes = await app.request(`/organizations/${testOrgId}/departments`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(Array.isArray(listJson.data)).toBe(true);
    expect(listJson.data.length).toBeGreaterThanOrEqual(1);
  });

  it('8. should create and list training cohorts', async () => {
    const createRes = await app.request(`/organizations/${testOrgId}/cohorts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Class of 2026 - AI Fellows',
        graduationYear: 2026,
      }),
    });

    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    expect(createJson.data.name).toBe('Class of 2026 - AI Fellows');

    const listRes = await app.request(`/organizations/${testOrgId}/cohorts`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(Array.isArray(listJson.data)).toBe(true);
    expect(listJson.data.length).toBeGreaterThanOrEqual(1);
  });

  it('9. should return institutional & cohort college intelligence analytics', async () => {
    const res = await app.request(`/organizations/${testOrgId}/analytics`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.institution).toBeDefined();
    expect(json.data.totalStudents).toBeGreaterThanOrEqual(0);
    expect(json.data.averageReadiness).toBeGreaterThanOrEqual(0);
    expect(json.data.placementReadinessDistribution).toBeDefined();
    expect(Array.isArray(json.data.curriculumGaps)).toBe(true);
  });

  it('10. should enforce IDOR & tenant isolation for non-members', async () => {
    // Non-member tries to view members of testOrgId
    const res = await app.request(`/organizations/${testOrgId}/members`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${outsideToken}`,
      },
    });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Access denied');
  });
});
