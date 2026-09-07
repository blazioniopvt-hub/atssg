// AI Extraction Routes
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, adminMiddleware, type AuthVariables } from '../../middleware/auth';
import { skillExtractionService } from '../../services/ai/extraction';
import { extractSkillsSchema } from './validation';
import prismaClient from '../../lib/prisma';

const extractSkillsBodySchema = z.object({
  text: z.string().min(10, 'Input text must be at least 10 characters').max(50000, 'Input text must not exceed 50,000 characters'),
  context: z.string().max(2000, 'Context must not exceed 2,000 characters').optional(),
});

const aiRoutes = new Hono<{ Variables: AuthVariables }>();

// POST /ai/skills/extract - Extract skills from text
aiRoutes.post(
  '/skills/extract',
  authMiddleware,
  zValidator('json', extractSkillsBodySchema),
  async (c) => {
    const user = c.get('user');
    const body = c.req.valid('json');

    try {
      const result = await skillExtractionService.extractSkills(user.id, body.text, body.context);
      return c.json({ data: result }, 200);
    } catch (error) {
      console.error('Skill extraction error:', error);
      if (error instanceof Error) {
        if (error.message.includes('not configured')) {
          return c.json({ error: { code: 'AI_NOT_CONFIGURED', message: 'AI provider not configured' } }, 503);
        }
        if (error.message.includes('too short') || error.message.includes('too long')) {
          return c.json({ error: { code: 'VALIDATION_ERROR', message: error.message } }, 400);
        }
      }
      return c.json({ error: { code: 'EXTRACTION_FAILED', message: 'Skill extraction failed' } }, 500);
    }
  }
);

// GET /ai/skills/extract/:jobId - Get extraction job status
aiRoutes.get('/skills/extract/:jobId', authMiddleware, async (c) => {
  const user = c.get('user');
  const jobId = c.req.param('jobId');

  const job = await prismaClient.aIExtractionJob.findFirst({
    where: { id: jobId, userId: user.id },
    include: {
      results: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!job) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Extraction job not found' } }, 404);
  }

  return c.json({ data: job });
});

// GET /ai/skills/extract - List user's extraction jobs
aiRoutes.get('/skills/extract', authMiddleware, async (c) => {
  const user = c.get('user');
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const [jobs, total] = await Promise.all([
    prismaClient.aIExtractionJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      skip: offset,
      include: {
        results: {
          select: {
            id: true,
            skillName: true,
            isMatched: true,
            confidence: true,
          },
        },
      },
    }),
    prismaClient.aIExtractionJob.count({ where: { userId: user.id } }),
  ]);

  return c.json({ data: { jobs, total } });
});

// POST /ai/skills/normalize - Normalize a skill name against catalog
aiRoutes.post(
  '/skills/normalize',
  authMiddleware,
  zValidator('json', z.object({
    skillName: z.string().min(1, 'Skill name is required').max(100, 'Skill name too long'),
  })),
  async (c) => {
    const { skillName } = c.req.valid('json');

    // Fetch skill catalog
    const catalog = await prismaClient.skill.findMany({
      select: { id: true, name: true, slug: true, category: true },
    });

    // Try exact match first
    const exactMatch = catalog.find((s: { id: string; name: string; slug: string; category: string }) => 
      s.name.toLowerCase() === skillName.toLowerCase() ||
      s.slug.toLowerCase() === skillName.toLowerCase().replace(/\s+/g, '-')
    );

    if (exactMatch) {
      return c.json({
        data: {
          skillName,
          matched: true,
          matchedSkillId: exactMatch.id,
          matchedSkillName: exactMatch.name,
          confidence: 1.0,
          reason: 'Exact match found in catalog',
        },
      });
    }

    // Try alias match
    const alias = await prismaClient.skillAlias.findFirst({
      where: { normalizedAlias: skillName.toLowerCase().replace(/\s+/g, '-') },
      include: { skill: true },
    });

    if (alias) {
      return c.json({
        data: {
          skillName,
          matched: true,
          matchedSkillId: alias.skill.id,
          matchedSkillName: alias.skill.name,
          confidence: 0.95,
          reason: 'Matched via skill alias',
        },
      });
    }

    // No match found
    return c.json({
      data: {
        skillName,
        matched: false,
        confidence: 0,
        reason: 'No matching skill found in catalog',
      },
    });
  }
);

// GET /ai/skills/aliases - List skill aliases (admin)
aiRoutes.get('/skills/aliases', authMiddleware, adminMiddleware, async (c) => {
  const aliases = await prismaClient.skillAlias.findMany({
    include: { skill: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return c.json({ data: aliases });
});

// POST /ai/skills/aliases - Add skill alias (admin)
aiRoutes.post(
  '/skills/aliases',
  authMiddleware,
  adminMiddleware,
  zValidator('json', z.object({
    skillId: z.string().cuid(),
    alias: z.string().min(1).max(100),
  })),
  async (c) => {
    const { skillId, alias } = c.req.valid('json');
    const normalizedAlias = alias.toLowerCase().replace(/\s+/g, '-');

    // Check if skill exists
    const skill = await prismaClient.skill.findUnique({ where: { id: skillId } });
    if (!skill) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
    }

    // Check if alias already exists
    const existing = await prismaClient.skillAlias.findUnique({
      where: { skillId_normalizedAlias: { skillId, normalizedAlias } },
    });

    if (existing) {
      return c.json({ error: { code: 'CONFLICT', message: 'Alias already exists for this skill' } }, 409);
    }

    const newAlias = await prismaClient.skillAlias.create({
      data: { skillId, alias, normalizedAlias },
    });

    return c.json({ data: newAlias }, 201);
  }
);

// DELETE /ai/skills/aliases/:id - Delete skill alias (admin)
aiRoutes.delete('/skills/aliases/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param('id');
  await prismaClient.skillAlias.delete({ where: { id } });
  return c.json({ message: 'Alias deleted' });
});

export default aiRoutes;