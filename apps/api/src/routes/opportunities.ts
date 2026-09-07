import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../middleware/auth';
import { opportunityService } from '../services/opportunity/opportunity';
import { applicationService } from '../services/opportunity/application';
import {
  CreateOpportunitySchema,
  SubmitApplicationSchema,
} from '@skillsync/types';

const router = new Hono<{ Variables: AuthVariables }>();

// GET /opportunities - List opportunities with personalized match scores
router.get('/', async (c) => {
  // Optional auth
  let userId: string | undefined;
  try {
    const authHeader = c.req.header('authorization');
    if (authHeader) {
      await authMiddleware(c, async () => {});
      userId = c.get('user')?.id;
    }
  } catch {
    // Non-authenticated browsing allowed
  }

  const type = c.req.query('type');
  const location = c.req.query('location');
  const isRemote = c.req.query('isRemote') ? c.req.query('isRemote') === 'true' : undefined;
  const organizationId = c.req.query('organizationId');

  try {
    const opportunities = await opportunityService.listOpportunities(
      { type, location, isRemote, organizationId },
      userId
    );
    return c.json({ data: opportunities });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to list opportunities' }, 500);
  }
});

// POST /opportunities - Create opportunity
router.post('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const parseResult = CreateOpportunitySchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
  }

  try {
    const organizationId = (body as any).organizationId;
    const opp = await opportunityService.createOpportunity(user.id, parseResult.data, organizationId);
    return c.json({ data: opp }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create opportunity' }, 400);
  }
});

// GET /opportunities/:id - Get opportunity with match score
router.get('/:id', async (c) => {
  let userId: string | undefined;
  try {
    const authHeader = c.req.header('authorization');
    if (authHeader) {
      await authMiddleware(c, async () => {});
      userId = c.get('user')?.id;
    }
  } catch {
    // Optional auth header: if invalid or expired, continue as unauthenticated
  }

  const oppId = c.req.param('id');
  try {
    const opp = await opportunityService.getOpportunity(oppId, userId);
    return c.json({ data: opp });
  } catch (err: any) {
    if (err.message === 'Opportunity not found') {
      return c.json({ error: 'Opportunity not found' }, 404);
    }
    return c.json({ error: err.message || 'Failed to fetch opportunity' }, 500);
  }
});

// GET /opportunities/:id/candidates - Ranked candidates for recruiter/employer
router.get('/:id/candidates', authMiddleware, async (c) => {
  const user = c.get('user');
  const oppId = c.req.param('id');

  try {
    const candidates = await applicationService.listOpportunityApplicants(oppId, user.id);
    return c.json({ data: candidates });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch applicants' }, 500);
  }
});

// POST /opportunities/:id/apply - Apply for opportunity
router.post('/:id/apply', authMiddleware, async (c) => {
  const user = c.get('user');
  const oppId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const parseResult = SubmitApplicationSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
  }

  try {
    const appRecord = await applicationService.apply(
      user.id,
      oppId,
      parseResult.data.coverLetter,
      parseResult.data.resumeId
    );
    return c.json({ data: appRecord, message: 'Application submitted successfully' }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to submit application' }, 400);
  }
});

export default router;
