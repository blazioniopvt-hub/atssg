// Skill Graph Routes
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware, adminMiddleware, type AuthVariables } from '../middleware/auth';
import { skillGraphService } from '../services/skill-intelligence/graph';
import prismaClient from '../lib/prisma';

const skillGraph = new Hono<{ Variables: AuthVariables }>();

// Validation schemas
const createRelationshipSchema = z.object({
  sourceSkillId: z.string().cuid(),
  targetSkillId: z.string().cuid(),
  type: z.enum(['PREREQUISITE', 'RELATED', 'SUBSKILL', 'SPECIALIZATION', 'COMPLEMENTARY']),
  strength: z.number().min(0).max(1).default(1.0),
});

const updateRelationshipSchema = z.object({
  type: z.enum(['PREREQUISITE', 'RELATED', 'SUBSKILL', 'SPECIALIZATION', 'COMPLEMENTARY']).optional(),
  strength: z.number().min(0).max(1).optional(),
});

const skillGapSchema = z.object({
  targetSkillId: z.string().cuid(),
});

// GET /skills/:id/relationships - Get all relationships for a skill
skillGraph.get('/skills/:id/relationships', async (c) => {
  const id = c.req.param('id');
  const skill = await prismaClient.skill.findUnique({ where: { id } });
  if (!skill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }
  const relationships = await skillGraphService.getSkillRelationships(skill.id);
  return c.json({ data: relationships });
});

// GET /skills/:id/related - Get related skills
skillGraph.get('/skills/:id/related', async (c) => {
  const id = c.req.param('id');
  const skill = await prismaClient.skill.findUnique({ where: { id } });
  if (!skill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }
  const related = await skillGraphService.getRelatedSkills(skill.id);
  return c.json({ data: related });
});

// GET /skills/:id/prerequisites - Get prerequisites
skillGraph.get('/skills/:id/prerequisites', async (c) => {
  const id = c.req.param('id');
  const skill = await prismaClient.skill.findUnique({ where: { id } });
  if (!skill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }
  const prerequisites = await skillGraphService.getPrerequisites(skill.id);
  return c.json({ data: prerequisites });
});

// GET /skills/:id/subskills - Get subskills
skillGraph.get('/skills/:id/subskills', async (c) => {
  const id = c.req.param('id');
  const skill = await prismaClient.skill.findUnique({ where: { id } });
  if (!skill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }
  const subskills = await skillGraphService.getSubskills(skill.id);
  return c.json({ data: subskills });
});

// GET /skills/:id/specializations - Get specializations
skillGraph.get('/skills/:id/specializations', async (c) => {
  const id = c.req.param('id');
  const skill = await prismaClient.skill.findUnique({ where: { id } });
  if (!skill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }
  const specializations = await skillGraphService.getSpecializations(skill.id);
  return c.json({ data: specializations });
});

// GET /skills/:id/complementary - Get complementary skills
skillGraph.get('/skills/:id/complementary', async (c) => {
  const id = c.req.param('id');
  const skill = await prismaClient.skill.findUnique({ where: { id } });
  if (!skill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }
  const complementary = await skillGraphService.getComplementarySkills(skill.id);
  return c.json({ data: complementary });
});

// GET /skills/:id/graph - Get skill graph with neighbors
skillGraph.get('/skills/:id/graph', async (c) => {
  const id = c.req.param('id');
  const depth = parseInt(c.req.query('depth') || '2', 10);
  const skill = await prismaClient.skill.findUnique({ where: { id } });
  if (!skill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }
  const graph = await skillGraphService.getSkillNeighbors(skill.id, Math.min(Math.max(depth, 1), 3));
  return c.json({ data: graph });
});

// GET /skills/:id/path - Find shortest path to another skill
skillGraph.get('/skills/:id/path', async (c) => {
  const id = c.req.param('id');
  const targetId = c.req.query('to');
  if (!targetId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Target skill ID required (query param: to)' } }, 400);
  }
  const sourceSkill = await prismaClient.skill.findUnique({ where: { id } });
  if (!sourceSkill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Source skill not found' } }, 404);
  }
  const targetSkill = await prismaClient.skill.findUnique({ where: { id: targetId } });
  if (!targetSkill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Target skill not found' } }, 404);
  }
  const path = await skillGraphService.findSkillPath(sourceSkill.id, targetSkill.id);
  return c.json({ data: path });
});

// POST /skills/relationships - Create skill relationship (admin only)
skillGraph.post('/skills/relationships', authMiddleware, adminMiddleware, zValidator('json', createRelationshipSchema), async (c) => {
  const body = c.req.valid('json');
  if (body.sourceSkillId === body.targetSkillId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Cannot create self-referencing relationship' } }, 400);
  }
  const [sourceSkill, targetSkill] = await Promise.all([
    prismaClient.skill.findUnique({ where: { id: body.sourceSkillId } }),
    prismaClient.skill.findUnique({ where: { id: body.targetSkillId } }),
  ]);
  if (!sourceSkill || !targetSkill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'One or both skills not found' } }, 404);
  }
  try {
    const relationship = await prismaClient.skillRelationship.create({
      data: {
        sourceSkillId: body.sourceSkillId,
        targetSkillId: body.targetSkillId,
        type: body.type,
        strength: body.strength,
      },
    });
    return c.json({ data: relationship }, 201);
  } catch (e) {
    return c.json({ error: { code: 'CONFLICT', message: 'Relationship already exists' } }, 409);
  }
});

// GET /skills/:id/gap - Calculate skill gap for authenticated user
skillGraph.get('/skills/:id/gap', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const skill = await prismaClient.skill.findUnique({ where: { id } });
  if (!skill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }
  const gap = await skillGraphService.calculateSkillGap(user.id, skill.id);
  return c.json({ data: gap });
});

// GET /skills - List all skills with optional category filter
skillGraph.get('/skills', async (c) => {
  const category = c.req.query('category');
  const search = c.req.query('search');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const where: any = {};
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [skills, total] = await Promise.all([
    prismaClient.skill.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, category: true, subcategory: true, isVerified: true, demandLevel: true },
    }),
    prismaClient.skill.count({ where }),
  ]);

  return c.json({ data: { skills, total } });
});

// GET /skills/:id - Get skill details
skillGraph.get('/skills/:id', async (c) => {
  const id = c.req.param('id');
  const skill = await prismaClient.skill.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, description: true, category: true, subcategory: true, iconUrl: true, isVerified: true, demandLevel: true, createdAt: true },
  });
  if (!skill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }
  return c.json({ data: skill });
});

// PATCH /skills/relationships/:id - Update skill relationship (admin)
skillGraph.patch('/skills/relationships/:id', authMiddleware, adminMiddleware, zValidator('json', updateRelationshipSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  const relationship = await prismaClient.skillRelationship.findUnique({ where: { id } });
  if (!relationship) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Relationship not found' } }, 404);
  }
  const updated = await prismaClient.skillRelationship.update({
    where: { id },
    data: body,
  });
  return c.json({ data: updated });
});

// DELETE /skills/relationships/:id - Delete skill relationship (admin)
skillGraph.delete('/skills/relationships/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param('id');
  const relationship = await prismaClient.skillRelationship.findUnique({ where: { id } });
  if (!relationship) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Relationship not found' } }, 404);
  }
  await prismaClient.skillRelationship.delete({ where: { id } });
  return c.json({ message: 'Relationship deleted' });
});

export default skillGraph;