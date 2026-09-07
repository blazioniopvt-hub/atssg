// Skill Intelligence Routes
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../middleware/auth';
import { evidenceService } from '../services/skill-intelligence/evidence';
import { intelligenceService } from '../services/skill-intelligence/intelligence';
import { skillConfidenceService } from '../services/skill-intelligence/skill-confidence';
import { EvidenceType } from '@prisma/client';
import prismaClient from '../lib/prisma';

const skillIntelligence = new Hono<{ Variables: AuthVariables }>();

// Apply auth middleware to all skill-intelligence routes
skillIntelligence.use('*', authMiddleware);

// Validation schemas
const createEvidenceSchema = z.object({
  userSkillId: z.string().cuid(),
  type: z.nativeEnum(EvidenceType),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  url: z.string().url().optional().or(z.literal('')),
  metadata: z.record(z.unknown()).optional(),
});

const updateEvidenceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  url: z.string().url().optional().or(z.literal('')),
  metadata: z.record(z.unknown()).optional(),
});

const addSkillSchema = z.object({
  skillId: z.string().cuid(),
  proficiencyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('BEGINNER'),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  confidence: z.number().min(0).max(100).optional(),
});

const updateSkillSchema = z.object({
  proficiencyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  confidence: z.number().min(0).max(100).optional(),
});

// GET /skill-intelligence - Get user's skill intelligence summary
skillIntelligence.get('/', async (c) => {
  const user = c.get('user');
  const summary = await intelligenceService.getSkillIntelligenceSummary(user.id);
  return c.json({ data: summary });
});

// GET /skill-intelligence/skills - Get all skills with intelligence
skillIntelligence.get('/skills', async (c) => {
  const user = c.get('user');
  const skills = await intelligenceService.getUserSkillIntelligence(user.id);
  return c.json({ data: skills });
});

// GET /skill-intelligence/skills/confidence - Get all skills confidence for authenticated user
skillIntelligence.get('/skills/confidence', async (c) => {
  const user = c.get('user');
  const confidences = await skillConfidenceService.aggregateUserSkillConfidences(user.id);
  return c.json({ data: confidences });
});

// GET /skill-intelligence/skills/:skillId/confidence - Get confidence for specific skill
skillIntelligence.get('/skills/:skillId/confidence', async (c) => {
  const user = c.get('user');
  const skillId = c.req.param('skillId');
  const confidence = await skillConfidenceService.getUserSkillConfidence(user.id, skillId);
  if (!confidence) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found in profile' } }, 404);
  }
  return c.json({ data: confidence });
});

// GET /skill-intelligence/skills/:skillId - Get intelligence for specific skill
skillIntelligence.get('/skills/:skillId', async (c) => {
  const user = c.get('user');
  const skillId = c.req.param('skillId');
  const intelligence = await intelligenceService.getSkillIntelligence(user.id, skillId);
  if (!intelligence) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found' } }, 404);
  }
  return c.json({ data: intelligence });
});

// POST /skill-intelligence/skills - Add a skill to user's profile
skillIntelligence.post('/skills', zValidator('json', addSkillSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');

  try {
    const userSkill = await prismaClient.$transaction(async (tx) => {
      const existing = await tx.userSkill.findUnique({
        where: {
          userId_skillId: {
            userId: user.id,
            skillId: body.skillId,
          },
        },
      });

      if (existing) {
        return null;
      }

      const created = await tx.userSkill.create({
        data: {
          userId: user.id,
          skillId: body.skillId,
          proficiencyLevel: body.proficiencyLevel,
          yearsOfExperience: body.yearsOfExperience,
          confidence: body.confidence ?? 50,
          verificationStatus: 'UNVERIFIED',
        },
        include: { skill: true },
      });

      // Create self-reported evidence automatically
      await tx.skillEvidence.create({
        data: {
          userSkillId: created.id,
          skillId: body.skillId,
          type: 'SELF_REPORTED',
          title: 'Self-reported skill',
          description: `User self-reported ${created.skill.name} at ${body.proficiencyLevel} level`,
        },
      });

      return created;
    });

    if (!userSkill) {
      return c.json(
        { error: { code: 'CONFLICT', message: 'Skill already added to profile' } },
        409
      );
    }

    return c.json({
      data: {
        id: userSkill.id,
        skillId: userSkill.skillId,
        proficiencyLevel: userSkill.proficiencyLevel,
        yearsOfExperience: userSkill.yearsOfExperience,
        confidence: userSkill.confidence,
        verificationStatus: userSkill.verificationStatus,
      },
    }, 201);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return c.json(
        { error: { code: 'CONFLICT', message: 'Skill already added to profile' } },
        409
      );
    }
    throw error;
  }
});

// PATCH /skill-intelligence/skills/:skillId - Update user skill
skillIntelligence.patch('/skills/:skillId', zValidator('json', updateSkillSchema), async (c) => {
  const user = c.get('user');
  const skillId = c.req.param('skillId');
  const body = c.req.valid('json');

  const userSkill = await prismaClient.userSkill.findFirst({
    where: { userId: user.id, skillId },
  });

  if (!userSkill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found in profile' } }, 404);
  }

  const updated = await prismaClient.userSkill.update({
    where: { id: userSkill.id },
    data: {
      proficiencyLevel: body.proficiencyLevel,
      yearsOfExperience: body.yearsOfExperience,
      confidence: body.confidence,
    },
  });

  return c.json({ data: updated });
});

// DELETE /skill-intelligence/skills/:skillId - Remove skill from profile
skillIntelligence.delete('/skills/:skillId', async (c) => {
  const user = c.get('user');
  const skillId = c.req.param('skillId');

  const userSkill = await prismaClient.userSkill.findFirst({
    where: { userId: user.id, skillId },
  });

  if (!userSkill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found in profile' } }, 404);
  }

  await prismaClient.userSkill.delete({
    where: { id: userSkill.id },
  });

  return c.json({ message: 'Skill removed from profile' });
});

// Evidence routes
// GET /skill-intelligence/skills/:skillId/evidence - Get evidence for a skill
skillIntelligence.get('/skills/:skillId/evidence', async (c) => {
  const user = c.get('user');
  const skillId = c.req.param('skillId');

  const userSkill = await prismaClient.userSkill.findFirst({
    where: {
      userId: user.id,
      OR: [
        { skillId },
        { skill: { slug: skillId } },
        { id: skillId },
      ],
    },
  });

  if (!userSkill) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found in profile' } }, 404);
  }

  const evidence = await evidenceService.getByUserSkill(user.id, userSkill.id);
  return c.json({ data: evidence });
});

// POST /skill-intelligence/skills/:skillId/evidence - Add evidence for a skill
skillIntelligence.post(
  '/skills/:skillId/evidence',
  zValidator('json', createEvidenceSchema),
  async (c) => {
    const user = c.get('user');
    const skillId = c.req.param('skillId');
    const body = c.req.valid('json') as { userSkillId: string; type: EvidenceType; title: string; description?: string; url?: string; metadata?: Record<string, unknown> };

    const userSkill = await prismaClient.userSkill.findFirst({
      where: { userId: user.id, skillId },
    });

    if (!userSkill) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Skill not found in profile' } }, 404);
    }

    // Ensure the evidence is for the correct user skill
    if (body.userSkillId !== userSkill.id) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: 'User skill ID mismatch' } },
        400
      );
    }

    const evidence = await evidenceService.create(user.id, body);
    return c.json({ data: evidence }, 201);
  }
);

// PATCH /skill-intelligence/evidence/:evidenceId - Update evidence
skillIntelligence.patch(
  '/evidence/:evidenceId',
  zValidator('json', updateEvidenceSchema),
  async (c) => {
    const user = c.get('user');
    const evidenceId = c.req.param('evidenceId');
    const body = c.req.valid('json');

    const evidence = await evidenceService.update(user.id, evidenceId, body);
    return c.json({ data: evidence });
  }
);

// DELETE /skill-intelligence/evidence/:evidenceId - Delete evidence
skillIntelligence.delete('/evidence/:evidenceId', async (c) => {
  const user = c.get('user');
  const evidenceId = c.req.param('evidenceId');

  await evidenceService.delete(user.id, evidenceId);
  return c.json({ message: 'Evidence deleted' });
});

// GET /skill-intelligence/projects/:projectId/skills - Get skills associated with a project
skillIntelligence.get('/projects/:projectId/skills', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  const project = await prismaClient.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    include: {
      skills: {
        include: { skill: true },
      },
    },
  });

  if (!project) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
  }

  return c.json({
    data: project.skills.map((ps: { skill: { id: string; name: string; slug: string; category: string } }) => ({
      id: ps.skill.id,
      name: ps.skill.name,
      slug: ps.skill.slug,
      category: ps.skill.category,
    })),
  });
});

// POST /skill-intelligence/projects/:projectId/skills - Associate skill with project
skillIntelligence.post(
  '/projects/:projectId/skills',
  zValidator('json', z.object({ skillId: z.string().cuid() })),
  async (c) => {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const { skillId } = c.req.valid('json');

    const project = await prismaClient.project.findFirst({
      where: { id: projectId, ownerId: user.id },
    });

    if (!project) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
    }

    try {
      const projectSkill = await prismaClient.projectSkill.create({
        data: {
          projectId,
          skillId,
        },
        include: { skill: true },
      });
      return c.json({ data: projectSkill }, 201);
    } catch (e) {
      return c.json(
        { error: { code: 'CONFLICT', message: 'Skill already associated with project' } },
        409
      );
    }
  }
);

// DELETE /skill-intelligence/projects/:projectId/skills/:skillId - Remove skill from project
skillIntelligence.delete('/projects/:projectId/skills/:skillId', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  const skillId = c.req.param('skillId');

  const project = await prismaClient.project.findFirst({
    where: { id: projectId, ownerId: user.id },
  });

  if (!project) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
  }

  await prismaClient.projectSkill.delete({
    where: {
      projectId_skillId: {
        projectId,
        skillId,
      },
    },
  });

  return c.json({ message: 'Skill removed from project' });
});

export default skillIntelligence;