// Career Simulation API Routes
// Phase 8: Adaptive simulation lifecycle, scenario execution, and server grading.

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, type AuthVariables } from '../middleware/auth';
import { careerSimulationService } from '../services/skill-intelligence/career-simulation';
import { CreateSimulationSchema, SimulationSubmissionSchema } from '@skillsync/types';

const careerSimulationRoutes = new Hono<{ Variables: AuthVariables }>();

careerSimulationRoutes.use('*', authMiddleware);

// GET /career-simulations - List all simulations for authenticated user
careerSimulationRoutes.get('/', async (c) => {
  const user = c.get('user');
  const simulations = await careerSimulationService.getUserSimulations(user.id);
  return c.json({ data: simulations });
});

// POST /career-simulations - Generate adaptive simulation for target role
careerSimulationRoutes.post('/', zValidator('json', CreateSimulationSchema), async (c) => {
  const user = c.get('user');
  const { targetRoleId } = c.req.valid('json');

  try {
    const simulation = await careerSimulationService.createSimulation(user.id, targetRoleId);
    return c.json({ data: simulation }, 201);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to create simulation' } },
      400
    );
  }
});

// GET /career-simulations/:id - Get simulation details and scenario questions
careerSimulationRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const simulation = await careerSimulationService.getSimulation(user.id, id);
  if (!simulation) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Simulation not found' } }, 404);
  }

  return c.json({ data: simulation });
});

// POST /career-simulations/:id/start - Start simulation session
careerSimulationRoutes.post('/:id/start', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  try {
    const started = await careerSimulationService.startSimulation(user.id, id);
    return c.json({ data: started });
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to start simulation' } },
      400
    );
  }
});

// POST /career-simulations/:id/submit - Submit answers and receive server-graded results
careerSimulationRoutes.post(
  '/:id/submit',
  zValidator('json', SimulationSubmissionSchema),
  async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const { answers } = c.req.valid('json');

    try {
      const result = await careerSimulationService.submitSimulation(user.id, id, answers);
      return c.json({ data: result });
    } catch (err: any) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to grade simulation' } },
        400
      );
    }
  }
);

export default careerSimulationRoutes;
