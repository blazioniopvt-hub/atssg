// Evidence Service
// Handles CRUD operations for skill evidence

import prismaClient from '../../lib/prisma';
import { EvidenceType, VerificationStatus } from '@prisma/client';

export interface CreateEvidenceInput {
  userSkillId: string;
  type: EvidenceType;
  title: string;
  description?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateEvidenceInput {
  title?: string;
  description?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface EvidenceWithSkill {
  id: string;
  userSkillId: string;
  skillId: string | null;
  type: EvidenceType;
  title: string;
  description: string | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  skill?: {
    id: string;
    name: string;
    slug: string;
    category: string;
  } | null;
}

export class EvidenceService {
  async create(userId: string, input: CreateEvidenceInput): Promise<EvidenceWithSkill> {
    // Verify ownership of the user skill
    const userSkill = await prismaClient.userSkill.findFirst({
      where: {
        id: input.userSkillId,
        userId,
      },
      include: { skill: true },
    });

    if (!userSkill) {
      throw new Error('User skill not found or access denied');
    }

    const evidence = await prismaClient.skillEvidence.create({
      data: {
        userSkillId: input.userSkillId,
        skillId: userSkill.skillId,
        type: input.type,
        title: input.title,
        description: input.description,
        url: input.url,
        metadata: input.metadata as any,
      },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
      },
    });

    return this.formatEvidence(evidence);
  }

  async getByUserSkill(userId: string, userSkillId: string): Promise<EvidenceWithSkill[]> {
    // Verify ownership
    const userSkill = await prismaClient.userSkill.findFirst({
      where: { id: userSkillId, userId },
    });

    if (!userSkill) {
      throw new Error('User skill not found or access denied');
    }

    const evidence = await prismaClient.skillEvidence.findMany({
      where: { userSkillId },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return evidence.map(this.formatEvidence);
  }

  async getById(userId: string, evidenceId: string): Promise<EvidenceWithSkill | null> {
    const evidence = await prismaClient.skillEvidence.findFirst({
      where: {
        id: evidenceId,
        userSkill: { userId },
      },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
      },
    });

    return evidence ? this.formatEvidence(evidence) : null;
  }

  async update(userId: string, evidenceId: string, input: UpdateEvidenceInput): Promise<EvidenceWithSkill> {
    // Verify ownership
    const existing = await prismaClient.skillEvidence.findFirst({
      where: {
        id: evidenceId,
        userSkill: { userId },
      },
    });

    if (!existing) {
      throw new Error('Evidence not found or access denied');
    }

    const evidence = await prismaClient.skillEvidence.update({
      where: { id: evidenceId },
      data: {
        title: input.title,
        description: input.description,
        url: input.url,
        metadata: input.metadata as any,
      },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
      },
    });

    return this.formatEvidence(evidence);
  }

  async delete(userId: string, evidenceId: string): Promise<void> {
    // Verify ownership
    const existing = await prismaClient.skillEvidence.findFirst({
      where: {
        id: evidenceId,
        userSkill: { userId },
      },
    });

    if (!existing) {
      throw new Error('Evidence not found or access denied');
    }

    await prismaClient.skillEvidence.delete({
      where: { id: evidenceId },
    });
  }

  async getProjectDerivedEvidence(userId: string, userSkillId: string): Promise<EvidenceWithSkill[]> {
    // Get projects that have this skill and belong to the user
    const userSkill = await prismaClient.userSkill.findFirst({
      where: { id: userSkillId, userId },
      include: { skill: true },
    });

    if (!userSkill) {
      throw new Error('User skill not found or access denied');
    }

    const projectSkills = await prismaClient.projectSkill.findMany({
      where: {
        skillId: userSkill.skillId,
        project: { ownerId: userId },
      },
      include: {
        project: true,
      },
    });

    return projectSkills.map((ps: { projectId: string; project: { title: string; description: string | null; liveUrl: string | null; repositoryUrl: string | null; id: string; slug: string; status: string; createdAt: Date; updatedAt: Date } }) => ({
      id: `project-${ps.projectId}`,
      userSkillId,
      skillId: userSkill.skillId,
      type: 'PROJECT' as EvidenceType,
      title: ps.project.title,
      description: ps.project.description,
      url: ps.project.liveUrl || ps.project.repositoryUrl,
      metadata: {
        projectId: ps.project.id,
        projectSlug: ps.project.slug,
        projectStatus: ps.project.status,
      },
      verifiedAt: null,
      verifiedBy: null,
      createdAt: ps.project.createdAt,
      updatedAt: ps.project.updatedAt,
      skill: {
        id: userSkill.skill.id,
        name: userSkill.skill.name,
        slug: userSkill.skill.slug,
        category: userSkill.skill.category,
      },
    }));
  }

  private formatEvidence(evidence: any): EvidenceWithSkill {
    return {
      id: evidence.id,
      userSkillId: evidence.userSkillId,
      skillId: evidence.skillId,
      type: evidence.type,
      title: evidence.title,
      description: evidence.description,
      url: evidence.url,
      metadata: evidence.metadata as Record<string, unknown> | null,
      verifiedAt: evidence.verifiedAt,
      verifiedBy: evidence.verifiedBy,
      createdAt: evidence.createdAt,
      updatedAt: evidence.updatedAt,
      skill: evidence.skill
        ? {
            id: evidence.skill.id,
            name: evidence.skill.name,
            slug: evidence.skill.slug,
            category: evidence.skill.category,
          }
        : null,
    };
  }
}

export const evidenceService = new EvidenceService();