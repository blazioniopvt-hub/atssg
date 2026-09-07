// AI Career Coach API Routes
// Phase 9: AI coaching sessions, grounded multi-turn conversations, Next-Best-Action.

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, type AuthVariables } from '../middleware/auth';
import { careerCoachService } from '../services/skill-intelligence/career-coach';
import { nextBestActionService } from '../services/skill-intelligence/next-best-action';
import {
  CreateCoachSessionSchema,
  SendCoachMessageSchema,
} from '@skillsync/types';

const careerCoachRoutes = new Hono<{ Variables: AuthVariables }>();

careerCoachRoutes.use('*', authMiddleware);

// GET /career-coach/next-action - Get deterministic single highest-impact Next Best Action
careerCoachRoutes.get('/next-action', async (c) => {
  const user = c.get('user');
  const roleId = c.req.query('roleId');
  const nextAction = await nextBestActionService.getNextBestAction(user.id, roleId);
  return c.json({ data: nextAction });
});

// GET /career-coach/recommendations - Get prioritized list of recommended actions
careerCoachRoutes.get('/recommendations', async (c) => {
  const user = c.get('user');
  const roleId = c.req.query('roleId');
  const recommendations = await nextBestActionService.getRecommendedActions(user.id, roleId);
  return c.json({ data: recommendations });
});

// GET /career-coach/sessions - List all coaching sessions for user
careerCoachRoutes.get('/sessions', async (c) => {
  const user = c.get('user');
  const sessions = await careerCoachService.getUserSessions(user.id);
  return c.json({ data: sessions });
});

// POST /career-coach/sessions - Create new coaching session
careerCoachRoutes.post('/sessions', zValidator('json', CreateCoachSessionSchema), async (c) => {
  const user = c.get('user');
  const { targetRoleId, title } = c.req.valid('json');

  try {
    const session = await careerCoachService.createSession(user.id, targetRoleId, title);
    return c.json({ data: session }, 201);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to create coach session' } },
      400
    );
  }
});

// GET /career-coach/sessions/:id - Get coaching session messages
careerCoachRoutes.get('/sessions/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const session = await careerCoachService.getSession(user.id, id);
  if (!session) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Coaching session not found' } }, 404);
  }

  return c.json({ data: session });
});

// POST /career-coach/sessions/:id/messages - Send message to AI coach & receive grounded reply
careerCoachRoutes.post(
  '/sessions/:id/messages',
  zValidator('json', SendCoachMessageSchema),
  async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const { message } = c.req.valid('json');

    try {
      const responseMessage = await careerCoachService.sendMessage(user.id, id, message);
      return c.json({ data: responseMessage });
    } catch (err: any) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to generate coach response' } },
        400
      );
    }
  }
);

export default careerCoachRoutes;
