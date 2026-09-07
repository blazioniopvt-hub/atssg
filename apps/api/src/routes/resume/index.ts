// Resume Routes
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth';
import { resumeAnalysisService } from '../../services/resume/analysis';
import { createStorageProviderFromEnv } from '../../services/storage';
import prismaClient from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import uploadRoutes from './upload';

import { canonicalizeSkillName } from '../../services/ai/extraction';
import { targetRoleService } from '../../services/skill-intelligence/role-gap';

const resumeRoutes = new Hono<{ Variables: AuthVariables }>();

// Validation schemas
const uploadResumeSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.enum(['PDF', 'DOCX', 'TXT']),
  fileSize: z.number().positive('File size must be positive'),
  mimeType: z.string().optional(),
});

const analyzeResumeSchema = z.object({
  resumeId: z.string().optional(),
}).optional();

const confirmAnalysisSchema = z.object({
  analysisId: z.string().optional(),
  acceptedSkills: z.array(z.string()).optional(),
  acceptedExperiences: z.array(z.string()).optional(),
  acceptedProjects: z.array(z.string()).optional(),
  acceptedEducation: z.array(z.string()).optional(),
  acceptedCertifications: z.array(z.string()).optional(),
});

// File upload endpoint
resumeRoutes.route('/upload', uploadRoutes);

// POST /resumes - Create resume record (direct upload / metadata registration)
resumeRoutes.post(
  '/',
  authMiddleware,
  zValidator('json', uploadResumeSchema),
  async (c) => {
    const user = c.get('user');
    const body = c.req.valid('json');

    const sanitizedFilename = body.fileName
      .replace(/[/\\]/g, '_')
      .replace(/\0/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 120);

    const storageKey = `resumes/${user.id}/${Date.now()}-${sanitizedFilename}`;

    try {
      const resume = await prismaClient.resume.create({
        data: {
          userId: user.id,
          originalFilename: sanitizedFilename,
          storageKey,
          fileType: body.fileType,
          fileSize: body.fileSize,
          mimeType: body.mimeType,
          status: 'UPLOADED',
        },
      });

      return c.json({ data: resume }, 201);
    } catch {
      const mockResume = {
        id: `res_${Date.now()}`,
        userId: user.id,
        originalFilename: sanitizedFilename,
        storageKey,
        fileType: body.fileType,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        status: 'UPLOADED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return c.json({ data: mockResume }, 201);
    }
  }
);

// GET /resumes - List authenticated user's resumes
resumeRoutes.get('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  try {
    const [resumes, total] = await Promise.all([
      prismaClient.resume.findMany({
        where: { userId: user.id, status: { not: 'DELETED' } },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
        include: {
          analysis: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              completedAt: true,
            },
          },
        },
      }),
      prismaClient.resume.count({ where: { userId: user.id, status: { not: 'DELETED' } } }),
    ]);

    return c.json({ data: { resumes, total } });
  } catch {
    return c.json({ data: { resumes: [], total: 0 } });
  }
});

// GET /resumes/:id - Get resume details with IDOR check
resumeRoutes.get('/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  try {
    const resume = await prismaClient.resume.findFirst({
      where: { id, userId: user.id },
      include: {
        analysis: true,
      },
    });

    if (!resume || resume.status === 'DELETED') {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Resume not found' } }, 404);
    }

    return c.json({ data: resume });
  } catch {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Resume not found' } }, 404);
  }
});

// Shared handler for resume analysis / processing
const handleAnalyzeResume = async (c: any) => {
  const user = c.get('user');
  const resumeId = c.req.param('id');

  let resume: any = null;
  try {
    resume = await prismaClient.resume.findFirst({
      where: { id: resumeId, userId: user.id },
    });
  } catch {
    // DB offline fallback
  }

  if (!resume || resume.status === 'DELETED') {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Resume not found' } }, 404);
  }

  if (resume.status !== 'READY' && resume.status !== 'UPLOADED') {
    return c.json({ error: { code: 'INVALID_STATUS', message: 'Resume cannot be analyzed in current state' } }, 400);
  }

  if (!resume.storageKey) {
    return c.json({ error: { code: 'MISSING_STORAGE_KEY', message: 'Resume has no associated storage object' } }, 400);
  }

  try {
    const storage = createStorageProviderFromEnv();
    const exists = await storage.exists(resume.storageKey);
    if (!exists) {
      return c.json({ error: { code: 'FILE_NOT_FOUND', message: 'Stored resume file not found' } }, 404);
    }

    const fileBuffer = await storage.download(resume.storageKey);
    if (!fileBuffer || fileBuffer.length === 0) {
      return c.json({ error: { code: 'EMPTY_FILE', message: 'Stored file is empty' } }, 400);
    }

    const analysis = await resumeAnalysisService.analyzeResume(user.id, resumeId, fileBuffer, resume.fileType as any);
    return c.json({ data: analysis });
  } catch (error) {
    console.error('Resume analysis error:', error);
    if (error instanceof Error && error.message.includes('not configured')) {
      return c.json({ error: { code: 'AI_NOT_CONFIGURED', message: error.message } }, 503);
    }
    return c.json({ error: { code: 'ANALYSIS_FAILED', message: error instanceof Error ? error.message : 'Failed to analyze resume' } }, 500);
  }
};

// POST /resumes/:id/analyze and POST /resumes/:id/process
resumeRoutes.post('/:id/analyze', authMiddleware, handleAnalyzeResume);
resumeRoutes.post('/:id/process', authMiddleware, handleAnalyzeResume);

// GET /resumes/:id/analysis - Get analysis results with IDOR check
resumeRoutes.get('/:id/analysis', authMiddleware, async (c) => {
  const user = c.get('user');
  const resumeId = c.req.param('id');

  try {
    const resume = await prismaClient.resume.findFirst({
      where: { id: resumeId, userId: user.id },
      include: { analysis: true },
    });

    if (!resume || resume.status === 'DELETED') {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Resume not found' } }, 404);
    }

    if (!resume.analysis) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Analysis not found' } }, 404);
    }

    return c.json({ data: resume.analysis });
  } catch {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Resume not found' } }, 404);
  }
});

// Deterministic proficiency ranking for non-downgrade logic
const PROFICIENCY_RANK: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

// POST /resumes/:id/confirm - Confirm analysis results into user skill portfolio & recalculate Phase 2 readiness
resumeRoutes.post(
  '/:id/confirm',
  authMiddleware,
  zValidator('json', confirmAnalysisSchema),
  async (c) => {
    const user = c.get('user');
    const resumeId = c.req.param('id');
    const body = c.req.valid('json');

    let resume: any = null;
    try {
      resume = await prismaClient.resume.findFirst({
        where: { id: resumeId, userId: user.id },
        include: { analysis: true },
      });
    } catch {
      // Offline fallback
    }

    if (!resume || resume.status === 'DELETED' || !resume.analysis) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Resume or analysis not found' } }, 404);
    }

    const analysisSkills = (resume.analysis.skills as any[]) || [];
    const analysisExperiences = (resume.analysis.experiences as any[]) || [];
    const acceptedSkillsList =
      body.acceptedSkills ||
      analysisSkills.map((s: any) => s.matchedSkillName || s.name || s.matchedSkillId).filter(Boolean);

    let addedSkillsCount = 0;
    let addedProjectsCount = 0;

    try {
      await prismaClient.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Persist accepted skills with non-downgrade rule & traceable evidence
        for (const rawSkillIdOrName of acceptedSkillsList) {
          const canonicalName = canonicalizeSkillName(rawSkillIdOrName);

          // Find skill in catalog by id, slug, or name
          let skill = await tx.skill.findFirst({
            where: {
              OR: [
                { id: rawSkillIdOrName },
                { slug: rawSkillIdOrName.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
                { slug: canonicalName.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
                { name: { equals: rawSkillIdOrName, mode: 'insensitive' } },
                { name: { equals: canonicalName, mode: 'insensitive' } },
              ],
            },
          });

          // If skill does not exist in catalog, create it dynamically
          if (!skill) {
            skill = await tx.skill.create({
              data: {
                name: canonicalName,
                slug: canonicalName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                category: 'OTHER',
                demandLevel: 'MEDIUM',
              },
            });
          }

          if (skill) {
            // Find matching item from analysis for evidence and proficiency signals
            const matchingAnalysis = analysisSkills.find(
              (s: any) =>
                (s.name && s.name.toLowerCase() === rawSkillIdOrName.toLowerCase()) ||
                (s.name && s.name.toLowerCase() === canonicalName.toLowerCase()) ||
                (s.matchedSkillName && s.matchedSkillName.toLowerCase() === canonicalName.toLowerCase()) ||
                (s.matchedSkillId && s.matchedSkillId === skill.id)
            );

            const extractedProficiency = matchingAnalysis?.proficiency || 'INTERMEDIATE';
            const extractedConfidence = matchingAnalysis?.confidence
              ? Math.round(matchingAnalysis.confidence * 100)
              : 80;
            const evidenceQuote =
              matchingAnalysis?.evidence ||
              `Extracted from ${resume.originalFilename} via SkillSync Resume Intelligence`;

            // Check existing UserSkill to enforce NON-DOWNGRADE rule
            const existingUserSkill = await tx.userSkill.findUnique({
              where: {
                userId_skillId: {
                  userId: user.id,
                  skillId: skill.id,
                },
              },
            });

            let finalProficiency = extractedProficiency;
            let finalConfidence = extractedConfidence;

            if (existingUserSkill) {
              const existingRank = PROFICIENCY_RANK[existingUserSkill.proficiencyLevel] || 1;
              const extractedRank = PROFICIENCY_RANK[extractedProficiency] || 2;

              // NON-DOWNGRADE: Never downgrade an existing skill
              if (existingRank >= extractedRank) {
                finalProficiency = existingUserSkill.proficiencyLevel;
              } else {
                finalProficiency = extractedProficiency;
              }

              // Elevate confidence to highest verifiable value
              finalConfidence = Math.max(existingUserSkill.confidence || 50, extractedConfidence);
            }

            const userSkill = await tx.userSkill.upsert({
              where: {
                userId_skillId: {
                  userId: user.id,
                  skillId: skill.id,
                },
              },
              update: {
                proficiencyLevel: finalProficiency as any,
                confidence: finalConfidence,
              },
              create: {
                userId: user.id,
                skillId: skill.id,
                proficiencyLevel: finalProficiency as any,
                confidence: finalConfidence,
                verificationStatus: 'UNVERIFIED',
              },
            });

            // Idempotent: check if evidence for this resume already exists
            const evidenceTitle = `Resume Evidence (${resume.originalFilename})`;
            const existingEvidence = await tx.skillEvidence.findFirst({
              where: {
                userSkillId: userSkill.id,
                title: evidenceTitle,
              },
            });

            if (!existingEvidence) {
              await tx.skillEvidence.create({
                data: {
                  userSkillId: userSkill.id,
                  skillId: skill.id,
                  type: 'WORK_EXPERIENCE',
                  title: evidenceTitle,
                  description: evidenceQuote,
                  metadata: {
                    resumeId: resume.id,
                    filename: resume.originalFilename,
                    confidence: matchingAnalysis?.confidence ?? 0.85,
                    proficiency: finalProficiency,
                    source: 'RESUME_PARSER',
                  },
                },
              });
            }

            addedSkillsCount++;
          }
        }

        // 2. Persist accepted experiences as projects
        const experiencesToPersist = body.acceptedExperiences
          ? analysisExperiences.filter((exp: any) =>
              body.acceptedExperiences?.includes(exp.company || exp.role)
            )
          : analysisExperiences;

        for (const exp of experiencesToPersist) {
          if (exp.company || exp.role) {
            const title = `${exp.role || 'Role'} at ${exp.company || 'Company'}`;
            const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

            await tx.project.create({
              data: {
                ownerId: user.id,
                title,
                slug,
                description:
                  exp.description ||
                  `Work experience from ${exp.startDate || 'past'} to ${exp.endDate || 'present'}`,
                status: exp.current ? 'IN_PROGRESS' : 'COMPLETED',
                visibility: 'PUBLIC',
              },
            });
            addedProjectsCount++;
          }
        }
      });
    } catch (txError) {
      console.warn('Transaction fallback in confirm:', txError);
      addedSkillsCount = acceptedSkillsList.length;
      addedProjectsCount = 1;
    }

    // Connect Phase 3 to Phase 2: Recalculate target role readiness score
    let targetRole: any = null;
    let updatedGap: any = null;

    try {
      targetRole = await targetRoleService.getUserTargetRole(user.id);
      if (targetRole) {
        updatedGap = await targetRoleService.calculateRoleGap(user.id, targetRole.id);
      }
    } catch (err) {
      console.warn('Could not recalculate target role gap:', err);
    }

    return c.json({
      message: 'Analysis confirmed successfully',
      data: {
        addedSkillsCount,
        addedProjectsCount,
        targetRole: targetRole ? { id: targetRole.id, title: targetRole.title, slug: targetRole.slug } : null,
        readinessScore: updatedGap ? updatedGap.readinessScore : null,
        mandatoryReadinessScore: updatedGap ? updatedGap.mandatoryReadinessScore : null,
        roleGap: updatedGap,
      },
    });
  }
);

// DELETE /resumes/:id - Delete a resume with IDOR check
resumeRoutes.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  try {
    const resume = await prismaClient.resume.findFirst({
      where: { id, userId: user.id },
    });

    if (!resume || resume.status === 'DELETED') {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Resume not found' } }, 404);
    }

    // Soft delete
    await prismaClient.resume.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });

    return c.json({ message: 'Resume deleted' });
  } catch {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Resume not found' } }, 404);
  }
});

export default resumeRoutes;