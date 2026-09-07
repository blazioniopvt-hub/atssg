// Career Readiness API Routes
// Phase 8: Multi-dimensional career readiness and target role comparison.

import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../middleware/auth';
import { careerReadinessService } from '../services/skill-intelligence/career-readiness';

const careerReadinessRoutes = new Hono<{ Variables: AuthVariables }>();

careerReadinessRoutes.use('*', authMiddleware);

// GET /career-readiness - Get career readiness for primary/active target role
careerReadinessRoutes.get('/', async (c) => {
  const user = c.get('user');
  const roleId = c.req.query('roleId');
  const readiness = await careerReadinessService.calculateCareerReadiness(user.id, roleId);
  return c.json({ data: readiness });
});

// GET /career-readiness/compare - Compare readiness across all target roles
careerReadinessRoutes.get('/compare', async (c) => {
  const user = c.get('user');
  const comparison = await careerReadinessService.getRoleReadinessComparison(user.id);
  return c.json({ data: comparison });
});

// GET /career-readiness/:roleId - Get career readiness for specific role ID or slug
careerReadinessRoutes.get('/:roleId', async (c) => {
  const user = c.get('user');
  const roleId = c.req.param('roleId');
  const readiness = await careerReadinessService.calculateCareerReadiness(user.id, roleId);
  return c.json({ data: readiness });
});

export default careerReadinessRoutes;
