import prismaClient from '../../lib/prisma';
import { opportunityService } from '../opportunity/opportunity';
import { OpportunityType } from '@skillsync/types';

export interface ExternalJobPayload {
  externalId: string;
  source: string; // GREENHOUSE, LEVER, LINKEDIN, ATS
  title: string;
  companyName: string;
  description: string;
  location?: string;
  isRemote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  requiredSkillsRaw: string[];
}

export class JobSourceProvider {
  private knownSkillsMap: Record<string, string> = {
    typescript: 'sk_typescript',
    ts: 'sk_typescript',
    react: 'sk_react',
    nextjs: 'sk_react',
    python: 'sk_python',
    docker: 'sk_docker',
    kubernetes: 'sk_kubernetes',
    k8s: 'sk_kubernetes',
    postgresql: 'sk_postgresql',
    postgres: 'sk_postgresql',
    redis: 'sk_redis',
  };

  /**
   * Normalizes external raw job postings and maps into canonical SkillSync opportunities
   */
  async ingestExternalJob(job: ExternalJobPayload, organizationId?: string) {
    // 1. Normalize skills
    const mappedSkills: Array<{ skillId: string; isRequired: boolean }> = [];

    for (const raw of job.requiredSkillsRaw) {
      const clean = raw.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const skillId = this.knownSkillsMap[clean] || `sk_${clean}`;
      mappedSkills.push({
        skillId,
        isRequired: true,
      });
    }

    if (mappedSkills.length === 0) {
      mappedSkills.push({ skillId: 'sk_typescript', isRequired: true });
    }

    // 2. Ingest via OpportunityService
    const created = await opportunityService.createOpportunity(
      'system_job_ingester',
      {
        title: job.title,
        description: `[Imported from ${job.source} - ${job.companyName}]\n\n${job.description}`,
        type: OpportunityType.JOB,
        location: job.location || 'Remote',
        isRemote: job.isRemote ?? true,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: 'USD',
        minReadinessScore: 60,
        skills: mappedSkills,
      },
      organizationId
    );

    return {
      ...created,
      companyName: job.companyName,
      requiredSkills: job.requiredSkillsRaw,
    };
  }
}

export const jobSourceProvider = new JobSourceProvider();
