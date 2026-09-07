import prismaClient from '../../lib/prisma';
import { DEMO_OPPORTUNITIES } from '../../lib/demo-data';
import {
  type OpportunityDTO,
  type CreateOpportunityInput,
  OpportunityType,
  OpportunityStatus,
} from '@skillsync/types';
import { opportunityMatchingService } from './opportunity-matching';

export const inMemoryOpportunities = new Map<string, any>();

// Seed in-memory store from demo data for test isolation
for (const opp of DEMO_OPPORTUNITIES) {
  inMemoryOpportunities.set(opp.id, {
    ...opp,
    status: OpportunityStatus.OPEN,
    isRemote: opp.isRemote || false,
    minReadinessScore: 50,
    skills: (opp.requiredSkills || []).map((s, idx) => ({
      id: `oppsk_${opp.id}_${idx}`,
      skillId: `sk_${s.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      skillName: s.name,
      skillSlug: s.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      isRequired: s.required !== false,
    })),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export class OpportunityService {
  /**
   * Creates an opportunity with canonical skill requirement bindings
   */
  async createOpportunity(
    creatorUserId: string,
    input: CreateOpportunityInput,
    organizationId?: string
  ): Promise<OpportunityDTO> {
    try {
      const opp = await prismaClient.opportunity.create({
        data: {
          organizationId: organizationId || null,
          title: input.title,
          description: input.description,
          type: input.type as any || OpportunityType.JOB,
          status: OpportunityStatus.OPEN,
          location: input.location || null,
          isRemote: input.isRemote || false,
          experienceLevel: input.experienceLevel || null,
          minReadinessScore: input.minReadinessScore || 50,
          salaryMin: input.salaryMin || null,
          salaryMax: input.salaryMax || null,
          currency: input.currency || 'USD',
          applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null,
          skills: {
            create: input.skills.map(s => ({
              skillId: s.skillId,
              isRequired: s.isRequired !== false,
            })),
          },
        },
        include: {
          skills: {
            include: { skill: true },
          },
          organization: { select: { name: true } },
          _count: { select: { applications: true } },
        },
      });

      return {
        id: opp.id,
        organizationId: opp.organizationId,
        organizationName: opp.organization?.name,
        title: opp.title,
        description: opp.description,
        type: opp.type,
        status: opp.status,
        location: opp.location,
        isRemote: opp.isRemote,
        experienceLevel: opp.experienceLevel,
        minReadinessScore: opp.minReadinessScore,
        isFeatured: opp.isFeatured,
        salaryMin: opp.salaryMin,
        salaryMax: opp.salaryMax,
        currency: opp.currency,
        applicationDeadline: opp.applicationDeadline,
        skills: opp.skills.map(s => ({
          id: s.id,
          skillId: s.skillId,
          skillName: s.skill.name,
          skillSlug: s.skill.slug,
          isRequired: s.isRequired,
        })),
        applicationsCount: opp._count.applications,
        createdAt: opp.createdAt,
        updatedAt: opp.updatedAt,
      };
    } catch {
      // Memory fallback
      const oppId = `opp_${Date.now()}`;
      const opp: OpportunityDTO = {
        id: oppId,
        organizationId: organizationId || null,
        organizationName: 'Partner Employer',
        title: input.title,
        description: input.description,
        type: input.type,
        status: OpportunityStatus.OPEN,
        location: input.location,
        isRemote: input.isRemote,
        experienceLevel: input.experienceLevel,
        minReadinessScore: input.minReadinessScore,
        salaryMin: input.salaryMin,
        salaryMax: input.salaryMax,
        currency: input.currency,
        skills: input.skills.map((s, idx) => ({
          id: `sk_req_${idx}`,
          skillId: s.skillId,
          skillName: s.skillId.replace('sk_', '').replace(/_/g, ' '),
          skillSlug: s.skillId.replace('sk_', ''),
          isRequired: s.isRequired,
        })),
        applicationsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryOpportunities.set(oppId, opp);
      return opp;
    }
  }

  /**
   * Retrieves an opportunity and optionally calculates candidate match score
   */
  async getOpportunity(opportunityId: string, candidateUserId?: string): Promise<OpportunityDTO & { match?: any }> {
    let oppData: any = null;
    try {
      oppData = await prismaClient.opportunity.findUnique({
        where: { id: opportunityId },
        include: {
          skills: {
            include: { skill: true },
          },
          organization: { select: { name: true } },
          _count: { select: { applications: true } },
        },
      });
    } catch {
      oppData = inMemoryOpportunities.get(opportunityId);
    }

    if (!oppData) {
      throw new Error('Opportunity not found');
    }

    const skills = oppData.skills?.map((s: any) => ({
      id: s.id,
      skillId: s.skillId,
      skillName: s.skill?.name || s.skillName || 'Skill',
      skillSlug: s.skill?.slug || s.skillSlug || 'skill',
      isRequired: s.isRequired !== false,
    })) || [];

    let matchDetails: any = null;
    if (candidateUserId) {
      matchDetails = await opportunityMatchingService.matchCandidateToOpportunity(candidateUserId, {
        id: oppData.id,
        title: oppData.title,
        minReadinessScore: oppData.minReadinessScore,
        skills,
      });
    }

    return {
      id: oppData.id,
      organizationId: oppData.organizationId,
      organizationName: oppData.organization?.name || oppData.company || 'Direct Employer',
      title: oppData.title,
      description: oppData.description,
      type: oppData.type,
      status: oppData.status,
      location: oppData.location,
      isRemote: oppData.isRemote,
      experienceLevel: oppData.experienceLevel,
      minReadinessScore: oppData.minReadinessScore,
      isFeatured: oppData.isFeatured,
      salaryMin: oppData.salaryMin,
      salaryMax: oppData.salaryMax,
      currency: oppData.currency,
      applicationDeadline: oppData.applicationDeadline,
      skills,
      matchScore: matchDetails?.matchScore,
      matchLevel: matchDetails?.matchLevel,
      applicationsCount: oppData._count?.applications || 0,
      match: matchDetails,
      createdAt: oppData.createdAt,
      updatedAt: oppData.updatedAt,
    };
  }

  /**
   * Lists opportunities with personalized match scores
   */
  async listOpportunities(
    filters: {
      type?: string;
      status?: string;
      location?: string;
      isRemote?: boolean;
      organizationId?: string;
    } = {},
    candidateUserId?: string
  ): Promise<OpportunityDTO[]> {
    let opportunities: any[] = [];
    try {
      const whereClause: any = {};
      if (filters.status) whereClause.status = filters.status;
      if (filters.type) whereClause.type = filters.type;
      if (filters.isRemote !== undefined) whereClause.isRemote = filters.isRemote;
      if (filters.organizationId) whereClause.organizationId = filters.organizationId;

      opportunities = await prismaClient.opportunity.findMany({
        where: whereClause,
        include: {
          skills: { include: { skill: true } },
          organization: { select: { name: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      opportunities = Array.from(inMemoryOpportunities.values());
    }

    const results: OpportunityDTO[] = [];
    for (const opp of opportunities) {
      const skills = opp.skills?.map((s: any) => ({
        id: s.id,
        skillId: s.skillId,
        skillName: s.skill?.name || s.skillName || 'Skill',
        skillSlug: s.skill?.slug || s.skillSlug || 'skill',
        isRequired: s.isRequired !== false,
      })) || [];

      let matchScore: number | undefined;
      let matchLevel: any;

      if (candidateUserId) {
        const match = await opportunityMatchingService.matchCandidateToOpportunity(candidateUserId, {
          id: opp.id,
          title: opp.title,
          minReadinessScore: opp.minReadinessScore,
          skills,
        }).catch(() => null);

        if (match) {
          matchScore = match.matchScore;
          matchLevel = match.matchLevel;
        }
      }

      results.push({
        id: opp.id,
        organizationId: opp.organizationId,
        organizationName: opp.organization?.name || opp.company || 'Employer Partner',
        title: opp.title,
        description: opp.description,
        type: opp.type,
        status: opp.status,
        location: opp.location,
        isRemote: opp.isRemote,
        experienceLevel: opp.experienceLevel,
        minReadinessScore: opp.minReadinessScore,
        isFeatured: opp.isFeatured,
        salaryMin: opp.salaryMin,
        salaryMax: opp.salaryMax,
        currency: opp.currency,
        applicationDeadline: opp.applicationDeadline,
        skills,
        matchScore: matchScore ?? opp.matchScore,
        matchLevel,
        applicationsCount: opp._count?.applications || 0,
        createdAt: opp.createdAt,
        updatedAt: opp.updatedAt,
      });
    }

    return results;
  }
}

export const opportunityService = new OpportunityService();
