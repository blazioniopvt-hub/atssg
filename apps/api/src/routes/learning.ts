// Learning Routes
// Skill Gap Analysis, Learning Paths, and Learning Resources

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware, adminMiddleware, type AuthVariables } from '../middleware/auth';
import { skillGapService, SkillGapResult } from '../services/skill-intelligence/gap';
import { learningPathService, LearningPlanResult } from '../services/skill-intelligence/learning-path';
import { learningResourceService, CreateResourceInput, UpdateResourceInput, ResourceFilters } from '../services/skill-intelligence/learning-resource';
import { LearningResourceType, ResourceDifficulty } from '@prisma/client';
import prismaClient from '../lib/prisma';

const learning = new Hono<{ Variables: AuthVariables }>();

// Validation schemas
const gapAnalysisSchema = z.object({
  targetSkillId: z.string().cuid(),
});

const learningPathSchema = z.object({
  targetSkillId: z.string().cuid(),
});

const createResourceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  url: z.string().url(),
  provider: z.string().max(100).optional(),
  type: z.nativeEnum(LearningResourceType),
  skillId: z.string().cuid(),
  difficulty: z.nativeEnum(ResourceDifficulty).optional(),
  language: z.string().max(10).optional(),
  durationMinutes: z.number().int().min(1).max(10000).optional(),
  rating: z.number().min(0).max(5).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  verifiedSource: z.boolean().optional(),
});

const updateResourceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  url: z.string().url().optional(),
  provider: z.string().max(100).optional(),
  type: z.nativeEnum(LearningResourceType).optional(),
  difficulty: z.nativeEnum(ResourceDifficulty).optional(),
  language: z.string().max(10).optional(),
  durationMinutes: z.number().int().min(1).max(10000).optional(),
  rating: z.number().min(0).max(5).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  verifiedSource: z.boolean().optional(),
});

const listResourcesSchema = z.object({
  skillId: z.string().cuid().optional(),
  type: z.nativeEnum(LearningResourceType).optional(),
  difficulty: z.nativeEnum(ResourceDifficulty).optional(),
  verifiedSource: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

// GET /learning/gap/:skillId - Analyze skill gap for authenticated user
learning.get('/gap/:skillId', authMiddleware, async (c) => {
  const user = c.get('user');
  const skillId = c.req.param('skillId');

  const skill = await prismaClient.skill.findUnique({ where: { id: skillId } });
  if (!skill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }

  const gap = await skillGapService.calculateSkillGap(user.id, skillId);
  if (!gap) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Could not analyze gap' } }, 404);
  }

  return c.json({ data: gap });
});

// GET /learning/path/:skillId - Generate learning path for authenticated user
learning.get('/path/:skillId', authMiddleware, async (c) => {
  const user = c.get('user');
  const skillId = c.req.param('skillId');

  const skill = await prismaClient.skill.findUnique({ where: { id: skillId } });
  if (!skill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }

  const learningPath = await learningPathService.generateLearningPath(user.id, skillId);
  if (!learningPath) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Could not generate learning path' } }, 404);
  }

  // Convert Map to object for JSON serialization
  const resourcesObj: Record<string, any[]> = {};
  for (const [skillId, resources] of learningPath.resources.entries()) {
    resourcesObj[skillId] = resources;
  }

  return c.json({
    data: {
      learningPath: learningPath.learningPath,
      gapAnalysis: learningPath.gapAnalysis,
      resources: resourcesObj,
    },
  });
});

// GET /learning/plan/:skillId - Combined learning plan (gap + path + resources)
learning.get('/plan/:skillId', authMiddleware, async (c) => {
  const user = c.get('user');
  const skillId = c.req.param('skillId');

  const skill = await prismaClient.skill.findUnique({ where: { id: skillId } });
  if (!skill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }

  const [gap, learningPath] = await Promise.all([
    skillGapService.calculateSkillGap(user.id, skillId),
    learningPathService.generateLearningPath(user.id, skillId),
  ]);

  if (!gap || !learningPath) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Could not generate learning plan' } }, 404);
  }

  const resourcesObj: Record<string, any[]> = {};
  for (const [skillId, resources] of learningPath.resources.entries()) {
    resourcesObj[skillId] = resources;
  }

  return c.json({
    data: {
      targetSkill: {
        id: skill.id,
        name: skill.name,
        slug: skill.slug,
        category: skill.category,
        subcategory: skill.subcategory,
      },
      readiness: gap.readiness,
      knownCount: gap.knownCount,
      partialCount: gap.partialCount,
      missingCount: gap.missingCount,
      foundationRequiredCount: gap.foundationRequiredCount,
      prioritizedGaps: gap.prioritizedGaps,
      learningPath: learningPath.learningPath,
      resources: resourcesObj,
    },
  });
});

// GET /learning/resources - List learning resources with filters
learning.get('/resources', zValidator('query', listResourcesSchema), async (c) => {
  const filters = c.req.valid('query');
  const result = await learningResourceService.list(filters as ResourceFilters);
  return c.json({ data: result });
});

// GET /learning/resources/types - Get resource type counts
learning.get('/resources/types', async (c) => {
  const types = await learningResourceService.getResourceTypes();
  return c.json({ data: types });
});

// GET /learning/resources/difficulties - Get resource difficulty counts
learning.get('/resources/difficulties', async (c) => {
  const difficulties = await learningResourceService.getResourceDifficulties();
  return c.json({ data: difficulties });
});

// GET /learning/resources/:skillId - Get resources for a specific skill
learning.get('/resources/:skillId', async (c) => {
  const skillId = c.req.param('skillId');
  const type = c.req.query('type') as LearningResourceType | undefined;
  const difficulty = c.req.query('difficulty') as ResourceDifficulty | undefined;
  const verifiedOnly = c.req.query('verifiedOnly') === 'true';
  const limit = parseInt(c.req.query('limit') || '20', 10);

  const skill = await prismaClient.skill.findUnique({ where: { id: skillId } });
  if (!skill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }

  const resources = await learningResourceService.getBySkillId(skillId, {
    type,
    difficulty,
    verifiedOnly,
    limit: Math.min(limit, 50),
  });

  return c.json({ data: resources });
});

// GET /learning/resources/detail/:resourceId - Get single resource details
learning.get('/resources/detail/:resourceId', async (c) => {
  const resourceId = c.req.param('resourceId');
  const resource = await learningResourceService.getById(resourceId);
  
  if (!resource) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } }, 404);
  }

  return c.json({ data: resource });
});

// POST /learning/resources - Create a new learning resource (admin only)
learning.post('/resources', authMiddleware, adminMiddleware, zValidator('json', createResourceSchema), async (c) => {
  const body = c.req.valid('json');

  // Verify skill exists
  const skill = await prismaClient.skill.findUnique({ where: { id: body.skillId } });
  if (!skill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }

  try {
    const resource = await learningResourceService.create(body as CreateResourceInput);
    return c.json({ data: resource }, 201);
  } catch (error) {
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to create resource' } }, 500);
  }
});

// PATCH /learning/resources/:resourceId - Update a learning resource (admin only)
learning.patch('/resources/:resourceId', authMiddleware, adminMiddleware, zValidator('json', updateResourceSchema), async (c) => {
  const resourceId = c.req.param('resourceId');
  const body = c.req.valid('json');

  const existing = await learningResourceService.getById(resourceId);
  if (!existing) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } }, 404);
  }

  try {
    const resource = await learningResourceService.update(resourceId, body as UpdateResourceInput);
    return c.json({ data: resource });
  } catch (error) {
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to update resource' } }, 500);
  }
});

// DELETE /learning/resources/:resourceId - Delete a learning resource (admin only)
learning.delete('/resources/:resourceId', authMiddleware, adminMiddleware, async (c) => {
  const resourceId = c.req.param('resourceId');

  const existing = await learningResourceService.getById(resourceId);
  if (!existing) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } }, 404);
  }

  await learningResourceService.delete(resourceId);
  return c.json({ message: 'Resource deleted' });
});

// ============================================================
// PHASE 5: PERSONALIZED LEARNING PATHS & PROGRESS TRACKING
// ============================================================

import { personalizedLearningPathService } from '../services/skill-intelligence/personalized-path';

const generatePathSchema = z.object({
  targetRoleId: z.string().optional(),
});

const updateProgressSchema = z.object({
  progress: z.number().min(0).max(100),
});

const updatePathStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']),
});

// GET /learning/paths - Get active personalized learning path for user
learning.get('/paths', authMiddleware, async (c) => {
  const user = c.get('user');
  const targetRoleId = c.req.query('targetRoleId');

  try {
    const path = await personalizedLearningPathService.getOrCreateUserLearningPath(user.id, targetRoleId);
    return c.json({ data: path });
  } catch (err: any) {
    return c.json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to load learning path' } }, 500);
  }
});

// POST /learning/paths - Initialize or generate learning path for target role
learning.post('/paths', authMiddleware, zValidator('json', generatePathSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');

  try {
    const path = await personalizedLearningPathService.getOrCreateUserLearningPath(user.id, body.targetRoleId);
    return c.json({ data: path }, 201);
  } catch (err: any) {
    return c.json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to generate learning path' } }, 500);
  }
});

// GET /learning/paths/:id - Get specific learning path by ID with strict ownership check
learning.get('/paths/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const pathId = c.req.param('id');

  const path = await personalizedLearningPathService.getPathById(user.id, pathId);
  if (!path) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Learning path not found' } }, 404);
  }

  return c.json({ data: path });
});

// POST /learning/paths/:id/regenerate - Adaptive regeneration preserving progress history
learning.post('/paths/:id/regenerate', authMiddleware, async (c) => {
  const user = c.get('user');
  const pathId = c.req.param('id');

  try {
    const regenerated = await personalizedLearningPathService.regeneratePath(user.id, pathId);
    return c.json({ data: regenerated });
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Learning path not found' } }, 404);
    }
    return c.json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to regenerate path' } }, 500);
  }
});

// PATCH /learning/paths/:id - Update learning path status
learning.patch('/paths/:id', authMiddleware, zValidator('json', updatePathStatusSchema), async (c) => {
  const user = c.get('user');
  const pathId = c.req.param('id');
  const body = c.req.valid('json');

  const path = await personalizedLearningPathService.getPathById(user.id, pathId);
  if (!path) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Learning path not found' } }, 404);
  }

  path.status = body.status;
  return c.json({ data: path });
});

// DELETE /learning/paths/:id - Archive learning path
learning.delete('/paths/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const pathId = c.req.param('id');

  const path = await personalizedLearningPathService.getPathById(user.id, pathId);
  if (!path) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Learning path not found' } }, 404);
  }

  path.status = 'ARCHIVED';
  return c.json({ message: 'Learning path archived' });
});

// GET /learning/paths/:id/items - List all items for a learning path
learning.get('/paths/:id/items', authMiddleware, async (c) => {
  const user = c.get('user');
  const pathId = c.req.param('id');

  const path = await personalizedLearningPathService.getPathById(user.id, pathId);
  if (!path) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Learning path not found' } }, 404);
  }

  return c.json({ data: path.items });
});

// POST /learning/items/:id/start - Start a learning item (transitions to IN_PROGRESS)
learning.post('/items/:id/start', authMiddleware, async (c) => {
  const user = c.get('user');
  const itemId = c.req.param('id');

  try {
    const item = await personalizedLearningPathService.startItem(user.id, itemId);
    return c.json({ data: item });
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Learning item not found' } }, 404);
    }
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message } }, 400);
  }
});

// PATCH /learning/items/:id/progress - Update progress percentage
learning.patch('/items/:id/progress', authMiddleware, zValidator('json', updateProgressSchema), async (c) => {
  const user = c.get('user');
  const itemId = c.req.param('id');
  const body = c.req.valid('json');

  try {
    const item = await personalizedLearningPathService.updateItemProgress(user.id, itemId, body.progress);
    return c.json({ data: item });
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Learning item not found' } }, 404);
    }
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message } }, 400);
  }
});

// POST /learning/items/:id/complete - Complete learning item & auto-unlock dependents
learning.post('/items/:id/complete', authMiddleware, async (c) => {
  const user = c.get('user');
  const itemId = c.req.param('id');

  try {
    const item = await personalizedLearningPathService.completeItem(user.id, itemId);
    return c.json({ data: item });
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Learning item not found' } }, 404);
    }
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message } }, 400);
  }
});

// POST /learning/items/:id/skip - Skip learning item
learning.post('/items/:id/skip', authMiddleware, async (c) => {
  const user = c.get('user');
  const itemId = c.req.param('id');

  try {
    const item = await personalizedLearningPathService.skipItem(user.id, itemId);
    return c.json({ data: item });
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Learning item not found' } }, 404);
    }
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message } }, 400);
  }
});

// GET /learning/dashboard/summary - Compact learning summary for Dashboard
learning.get('/dashboard/summary', authMiddleware, async (c) => {
  const user = c.get('user');
  const summary = await personalizedLearningPathService.getDashboardSummary(user.id);
  return c.json({ data: summary });
});

// GET /learning/recommendations - Recommended resources across active role gaps with explainability
learning.get('/recommendations', authMiddleware, async (c) => {
  const user = c.get('user');
  const path = await personalizedLearningPathService.getOrCreateUserLearningPath(user.id);

  const recommendations = path.items
    .filter(it => it.resource)
    .map(it => ({
      resource: it.resource!,
      score: it.priority === 'HIGH' ? 95 : it.priority === 'MEDIUM' ? 85 : 75,
      relevanceScore: 1.0,
      difficultyFit: 0.9,
      qualityFactor: 0.95,
      explanation: it.explanation,
    }));

  return c.json({ data: recommendations });
});

// GET /learning/recommendations/:skillId - Ranked resources for specific skill gap
learning.get('/recommendations/:skillId', authMiddleware, async (c) => {
  const skillId = c.req.param('skillId');
  const skill = await prismaClient.skill.findUnique({ where: { id: skillId } });
  const slug = skill?.slug || skillId;

  const recommendations = await learningResourceService.rankResourcesForSkillGap(
    skillId,
    slug,
    'INTERMEDIATE',
    'BEGINNER',
    true,
    10
  );

  return c.json({ data: recommendations });
});

// ============================================================
// PHASE 6: ASSESSMENT ENGINE & RESOURCE DISCOVERY
// ============================================================

import { assessmentEngineService } from '../services/skill-intelligence/assessment-engine';
import { resourceDiscoveryService } from '../services/skill-intelligence/resource-discovery';

const createAssessmentSchema = z.object({
  skillId: z.string().min(1),
  type: z.enum(['QUIZ', 'PRACTICAL', 'PEER_REVIEW', 'SELF_CHECK']).optional(),
  learningPathItemId: z.string().optional(),
});

const submitAssessmentSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

// POST /learning/assessments - Create a new assessment for a skill
learning.post('/assessments', authMiddleware, zValidator('json', createAssessmentSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');

  try {
    const assessment = await assessmentEngineService.createAssessment(
      user.id,
      body.skillId,
      body.type || 'QUIZ',
      body.learningPathItemId
    );
    return c.json({ data: assessment }, 201);
  } catch (err: any) {
    return c.json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to create assessment' } }, 500);
  }
});

// GET /learning/assessments - List user's assessments
learning.get('/assessments', authMiddleware, async (c) => {
  const user = c.get('user');

  try {
    const assessments = await assessmentEngineService.listUserAssessments(user.id);
    return c.json({ data: assessments });
  } catch (err: any) {
    return c.json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list assessments' } }, 500);
  }
});

// GET /learning/assessments/:id - Get assessment details (questions without answers)
learning.get('/assessments/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const assessmentId = c.req.param('id');

  const assessment = await assessmentEngineService.getAssessment(user.id, assessmentId);
  if (!assessment) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Assessment not found' } }, 404);
  }

  return c.json({ data: assessment });
});

// POST /learning/assessments/:id/start - Start assessment
learning.post('/assessments/:id/start', authMiddleware, async (c) => {
  const user = c.get('user');
  const assessmentId = c.req.param('id');

  try {
    const assessment = await assessmentEngineService.startAssessment(user.id, assessmentId);
    return c.json({ data: assessment });
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Assessment not found' } }, 404);
    }
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message } }, 400);
  }
});

// POST /learning/assessments/:id/submit - Submit answers for grading
learning.post('/assessments/:id/submit', authMiddleware, zValidator('json', submitAssessmentSchema), async (c) => {
  const user = c.get('user');
  const assessmentId = c.req.param('id');
  const body = c.req.valid('json');

  try {
    const result = await assessmentEngineService.submitAssessment(user.id, assessmentId, body.answers);
    return c.json({ data: result });
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Assessment not found' } }, 404);
    }
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message } }, 400);
  }
});

// GET /learning/assessments/:id/result - Get grading result with per-question feedback
learning.get('/assessments/:id/result', authMiddleware, async (c) => {
  const user = c.get('user');
  const assessmentId = c.req.param('id');

  const result = await assessmentEngineService.getAssessmentResult(user.id, assessmentId);
  if (!result) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Assessment result not found' } }, 404);
  }

  return c.json({ data: result });
});

// GET /learning/discover/:skillId - Discover resources for a skill gap
learning.get('/discover/:skillId', authMiddleware, async (c) => {
  const user = c.get('user');
  const skillId = c.req.param('skillId');
  const difficulty = c.req.query('difficulty');
  const type = c.req.query('type');
  const limit = parseInt(c.req.query('limit') || '10', 10);

  try {
    const result = await resourceDiscoveryService.discoverResources(
      skillId,
      difficulty,
      type,
      Math.min(limit, 50)
    );
    return c.json({ data: result });
  } catch (err: any) {
    return c.json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to discover resources' } }, 500);
  }
});

// POST /learning/resources/:id/verify - Trigger resource quality verification (admin only)
learning.post('/resources/:id/verify', authMiddleware, adminMiddleware, async (c) => {
  const resourceId = c.req.param('id');

  try {
    const verification = await resourceDiscoveryService.verifyResource(resourceId);
    return c.json({ data: verification });
  } catch (err: any) {
    return c.json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to verify resource' } }, 500);
  }
});

export default learning;