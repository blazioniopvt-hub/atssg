import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../middleware/auth';
import { applicationService } from '../services/opportunity/application';
import { ApplicationStatus } from '@skillsync/types';

const router = new Hono<{ Variables: AuthVariables }>();

router.use('*', authMiddleware);

// GET /applications - List user's applications
router.get('/', async (c) => {
  const user = c.get('user');
  try {
    const apps = await applicationService.listUserApplications(user.id);
    return c.json({ data: apps });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to list applications' }, 500);
  }
});

// PATCH /applications/:id/status - Update application status
router.patch('/:id/status', async (c) => {
  const user = c.get('user');
  const appId = c.req.param('id');
  const body = await c.req.json();

  if (!body.status || !Object.values(ApplicationStatus).includes(body.status)) {
    return c.json({ error: 'Valid status is required' }, 400);
  }

  try {
    const updated = await applicationService.updateStatus(appId, user.id, body.status);
    return c.json({ data: updated });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update application status' }, 400);
  }
});

export default router;
