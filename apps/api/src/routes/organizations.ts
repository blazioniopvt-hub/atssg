import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../middleware/auth';
import { organizationService } from '../services/organization/organization';
import { collegeIntelligenceService } from '../services/organization/college-intelligence';
import {
  CreateOrganizationSchema,
  CreateInvitationSchema,
  CreateDepartmentSchema,
  CreateCohortSchema,
} from '@skillsync/types';

const router = new Hono<{ Variables: AuthVariables }>();

// ============================================================
// ORGANIZATION CRUD
// ============================================================

// POST /organizations - Create organization
router.post('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const parseResult = CreateOrganizationSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
  }

  try {
    const org = await organizationService.createOrganization(user.id, parseResult.data);
    return c.json({ data: org }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create organization' }, 400);
  }
});

// GET /organizations - List user's organizations
router.get('/', authMiddleware, async (c) => {
  const user = c.get('user');
  try {
    const orgs = await organizationService.listUserOrganizations(user.id);
    return c.json({ data: orgs });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to list organizations' }, 500);
  }
});

// GET /organizations/:id - Get organization details
router.get('/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('id');

  try {
    const org = await organizationService.getOrganization(orgId, user.id);
    return c.json({ data: org });
  } catch (err: any) {
    if (err.message === 'Organization not found') {
      return c.json({ error: 'Organization not found' }, 404);
    }
    return c.json({ error: err.message || 'Failed to fetch organization' }, 500);
  }
});

// GET /organizations/:id/members - List members
router.get('/:id/members', authMiddleware, async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('id');

  try {
    const members = await organizationService.getMembers(orgId, user.id);
    return c.json({ data: members });
  } catch (err: any) {
    if (err.message.includes('Access denied')) {
      return c.json({ error: err.message }, 403);
    }
    return c.json({ error: err.message || 'Failed to fetch members' }, 500);
  }
});

// ============================================================
// INVITATIONS
// ============================================================

// POST /organizations/:id/invitations - Invite member
router.post('/:id/invitations', authMiddleware, async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('id');
  const body = await c.req.json();

  const parseResult = CreateInvitationSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
  }

  try {
    const invitation = await organizationService.createInvitation(
      orgId,
      user.id,
      parseResult.data.email,
      parseResult.data.role
    );
    return c.json({ data: invitation }, 201);
  } catch (err: any) {
    if (err.message.includes('Access denied')) {
      return c.json({ error: err.message }, 403);
    }
    return c.json({ error: err.message || 'Failed to create invitation' }, 400);
  }
});

// POST /organizations/invitations/:token/accept - Accept invitation
router.post('/invitations/:token/accept', authMiddleware, async (c) => {
  const user = c.get('user');
  const token = c.req.param('token');

  try {
    const result = await organizationService.acceptInvitation(token, user.id);
    return c.json({ data: result, message: 'Invitation accepted successfully' });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to accept invitation' }, 400);
  }
});

// ============================================================
// DEPARTMENTS & COHORTS
// ============================================================

// GET /organizations/:id/departments
router.get('/:id/departments', authMiddleware, async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('id');

  try {
    const depts = await organizationService.listDepartments(orgId, user.id);
    return c.json({ data: depts });
  } catch (err: any) {
    if (err.message.includes('Access denied')) {
      return c.json({ error: err.message }, 403);
    }
    return c.json({ error: err.message || 'Failed to fetch departments' }, 500);
  }
});

// POST /organizations/:id/departments
router.post('/:id/departments', authMiddleware, async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('id');
  const body = await c.req.json();

  const parseResult = CreateDepartmentSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
  }

  try {
    const dept = await organizationService.createDepartment(orgId, user.id, parseResult.data);
    return c.json({ data: dept }, 201);
  } catch (err: any) {
    if (err.message.includes('Access denied')) {
      return c.json({ error: err.message }, 403);
    }
    return c.json({ error: err.message || 'Failed to create department' }, 400);
  }
});

// GET /organizations/:id/cohorts
router.get('/:id/cohorts', authMiddleware, async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('id');

  try {
    const cohorts = await organizationService.listCohorts(orgId, user.id);
    return c.json({ data: cohorts });
  } catch (err: any) {
    if (err.message.includes('Access denied')) {
      return c.json({ error: err.message }, 403);
    }
    return c.json({ error: err.message || 'Failed to fetch cohorts' }, 500);
  }
});

// POST /organizations/:id/cohorts
router.post('/:id/cohorts', authMiddleware, async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('id');
  const body = await c.req.json();

  const parseResult = CreateCohortSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
  }

  try {
    const cohort = await organizationService.createCohort(orgId, user.id, parseResult.data);
    return c.json({ data: cohort }, 201);
  } catch (err: any) {
    if (err.message.includes('Access denied')) {
      return c.json({ error: err.message }, 403);
    }
    return c.json({ error: err.message || 'Failed to create cohort' }, 400);
  }
});

// ============================================================
// COLLEGE & INSTITUTIONAL ANALYTICS
// ============================================================

// GET /organizations/:id/analytics
router.get('/:id/analytics', authMiddleware, async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('id');
  const cohortId = c.req.query('cohortId');

  try {
    const analytics = await collegeIntelligenceService.getCollegeAnalytics(orgId, user.id, cohortId);
    return c.json({ data: analytics });
  } catch (err: any) {
    if (err.message.includes('Access denied')) {
      return c.json({ error: err.message }, 403);
    }
    return c.json({ error: err.message || 'Failed to generate institutional analytics' }, 500);
  }
});

export default router;
