// Project & Work-Sample Intelligence API Routes
// Phase 7: Project ingestion, static analysis, skill extraction, and evaluation.

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, type AuthVariables } from '../middleware/auth';
import { workSampleEvaluationService } from '../services/skill-intelligence/work-sample-evaluation';
import { CreateProjectSchema, UpdateProjectSchema } from '@skillsync/types';

const projectRoutes = new Hono<{ Variables: AuthVariables }>();

// All project endpoints require authentication
projectRoutes.use('*', authMiddleware);

// GET /projects - List all projects for current user
projectRoutes.get('/', async (c) => {
  const user = c.get('user');
  const projects = await workSampleEvaluationService.getUserProjects(user.id);
  return c.json({ data: projects });
});

// POST /projects - Ingest, evaluate, and create new project/work-sample
projectRoutes.post('/', zValidator('json', CreateProjectSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');

  try {
    const project = await workSampleEvaluationService.createAndEvaluateProject(user.id, body);
    return c.json({ data: project }, 201);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to create project' } },
      400
    );
  }
});

// GET /projects/:id - Get single project with evaluation
projectRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const project = await workSampleEvaluationService.getProjectById(user.id, id);
  if (!project) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
  }

  return c.json({ data: project });
});

// GET /projects/:id/evaluation - Get detailed explainable evaluation
projectRoutes.get('/:id/evaluation', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const project = await workSampleEvaluationService.getProjectById(user.id, id);
  if (!project) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
  }

  return c.json({ data: project.evaluation || null });
});

// POST /projects/:id/analyze - Re-evaluate work-sample & update evidence
projectRoutes.post('/:id/analyze', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const project = await workSampleEvaluationService.getProjectById(user.id, id);
  if (!project) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
  }

  const evaluation = workSampleEvaluationService.evaluateProjectStatic(project);
  await workSampleEvaluationService.bridgeProjectEvidence(user.id, project, evaluation);

  return c.json({ data: evaluation });
});

// DELETE /projects/:id - Delete project with IDOR protection
projectRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const deleted = await workSampleEvaluationService.deleteProject(user.id, id);
  if (!deleted) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
  }

  return c.json({ data: { success: true } });
});

export default projectRoutes;
