// Target Role Gap Analysis Service
// Computes deterministic readiness and skill gaps against structured Target Roles

import prismaClient from '../../lib/prisma';
import { ProficiencyLevel, SkillCategory } from '@prisma/client';
import { DEMO_USER_SKILLS } from '../../lib/demo-data';
import type {
  TargetRoleGapAnalysis,
  TargetRoleSkillGapItem,
  TargetRoleSkillPriority,
  TargetRoleGapSummary,
  TargetRoleGapStatus,
} from '@skillsync/types';

export const PROFICIENCY_ORDER: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

// Fallback seed target roles when PostgreSQL is offline
export interface FallbackRequirement {
  id: string;
  targetRoleId: string;
  skillId: string;
  requiredProficiency: ProficiencyLevel;
  importanceWeight: number;
  isRequired: boolean;
  skill: {
    id: string;
    name: string;
    slug: string;
    category: SkillCategory;
    subcategory: string | null;
  };
}

export interface FallbackTargetRole {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: SkillCategory;
  skillRequirements: FallbackRequirement[];
}

export const FALLBACK_TARGET_ROLES: FallbackTargetRole[] = [
  {
    id: 'role_full_stack',
    title: 'Full-Stack Engineer',
    slug: 'full-stack-engineer',
    description: 'Build modern web applications with frontend reactivity, backend microservices, and relational database systems.',
    category: SkillCategory.PROGRAMMING,
    skillRequirements: [
      { id: 'req_fs_1', targetRoleId: 'role_full_stack', skillId: 'sk_ts', requiredProficiency: ProficiencyLevel.EXPERT, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_ts', name: 'TypeScript', slug: 'typescript', category: SkillCategory.PROGRAMMING, subcategory: 'Web Development' } },
      { id: 'req_fs_2', targetRoleId: 'role_full_stack', skillId: 'sk_react', requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_react', name: 'React', slug: 'react', category: SkillCategory.PROGRAMMING, subcategory: 'Frontend Development' } },
      { id: 'req_fs_3', targetRoleId: 'role_full_stack', skillId: 'sk_node', requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_node', name: 'Node.js', slug: 'nodejs', category: SkillCategory.PROGRAMMING, subcategory: 'Backend Development' } },
      { id: 'req_fs_4', targetRoleId: 'role_full_stack', skillId: 'sk_postgres', requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 2.0, isRequired: true, skill: { id: 'sk_postgres', name: 'PostgreSQL', slug: 'postgresql', category: SkillCategory.PROGRAMMING, subcategory: 'Database' } },
      { id: 'req_fs_5', targetRoleId: 'role_full_stack', skillId: 'sk_docker', requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 1.0, isRequired: false, skill: { id: 'sk_docker', name: 'Docker', slug: 'docker', category: SkillCategory.OPERATIONS, subcategory: 'DevOps' } },
      { id: 'req_fs_6', targetRoleId: 'role_full_stack', skillId: 'sk_aws', requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 1.0, isRequired: false, skill: { id: 'sk_aws', name: 'Amazon Web Services', slug: 'aws', category: SkillCategory.OPERATIONS, subcategory: 'Cloud Infrastructure' } },
    ],
  },
  {
    id: 'role_ai_ml',
    title: 'AI / ML Engineer',
    slug: 'ai-ml-engineer',
    description: 'Develop AI pipelines, model integrations, retrieval augmented generation systems, and data infrastructure.',
    category: SkillCategory.DATA_SCIENCE,
    skillRequirements: [
      { id: 'req_ai_1', targetRoleId: 'role_ai_ml', skillId: 'sk_python', requiredProficiency: ProficiencyLevel.EXPERT, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_python', name: 'Python', slug: 'python', category: SkillCategory.PROGRAMMING, subcategory: 'Data Science' } },
      { id: 'req_ai_2', targetRoleId: 'role_ai_ml', skillId: 'sk_ml', requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_ml', name: 'Machine Learning', slug: 'machine-learning', category: SkillCategory.DATA_SCIENCE, subcategory: 'Artificial Intelligence' } },
      { id: 'req_ai_3', targetRoleId: 'role_ai_ml', skillId: 'sk_dl', requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 2.5, isRequired: true, skill: { id: 'sk_dl', name: 'Deep Learning', slug: 'deep-learning', category: SkillCategory.DATA_SCIENCE, subcategory: 'Artificial Intelligence' } },
      { id: 'req_ai_4', targetRoleId: 'role_ai_ml', skillId: 'sk_postgres', requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 1.0, isRequired: false, skill: { id: 'sk_postgres', name: 'PostgreSQL', slug: 'postgresql', category: SkillCategory.PROGRAMMING, subcategory: 'Database' } },
      { id: 'req_ai_5', targetRoleId: 'role_ai_ml', skillId: 'sk_docker', requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 1.0, isRequired: false, skill: { id: 'sk_docker', name: 'Docker', slug: 'docker', category: SkillCategory.OPERATIONS, subcategory: 'DevOps' } },
    ],
  },
  {
    id: 'role_data_science',
    title: 'Data Scientist',
    slug: 'data-scientist',
    description: 'Extract statistical insights, build predictive models, and optimize decision-making using advanced mathematical analysis.',
    category: SkillCategory.DATA_SCIENCE,
    skillRequirements: [
      { id: 'req_ds_1', targetRoleId: 'role_data_science', skillId: 'sk_python', requiredProficiency: ProficiencyLevel.EXPERT, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_python', name: 'Python', slug: 'python', category: SkillCategory.PROGRAMMING, subcategory: 'Data Science' } },
      { id: 'req_ds_2', targetRoleId: 'role_data_science', skillId: 'sk_da', requiredProficiency: ProficiencyLevel.EXPERT, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_da', name: 'Data Analysis & Statistics', slug: 'data-analysis', category: SkillCategory.DATA_SCIENCE, subcategory: 'Analytics' } },
      { id: 'req_ds_3', targetRoleId: 'role_data_science', skillId: 'sk_ml', requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 2.5, isRequired: true, skill: { id: 'sk_ml', name: 'Machine Learning', slug: 'machine-learning', category: SkillCategory.DATA_SCIENCE, subcategory: 'Artificial Intelligence' } },
      { id: 'req_ds_4', targetRoleId: 'role_data_science', skillId: 'sk_postgres', requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 2.0, isRequired: true, skill: { id: 'sk_postgres', name: 'PostgreSQL', slug: 'postgresql', category: SkillCategory.PROGRAMMING, subcategory: 'Database' } },
    ],
  },
  {
    id: 'role_devops',
    title: 'DevOps Engineer',
    slug: 'devops-engineer',
    description: 'Architect scalable cloud infrastructure, containerized orchestrations, and automated deployment pipelines.',
    category: SkillCategory.OPERATIONS,
    skillRequirements: [
      { id: 'req_do_1', targetRoleId: 'role_devops', skillId: 'sk_docker', requiredProficiency: ProficiencyLevel.EXPERT, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_docker', name: 'Docker', slug: 'docker', category: SkillCategory.OPERATIONS, subcategory: 'DevOps' } },
      { id: 'req_do_2', targetRoleId: 'role_devops', skillId: 'sk_k8s', requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_k8s', name: 'Kubernetes', slug: 'kubernetes', category: SkillCategory.OPERATIONS, subcategory: 'Cloud Infrastructure' } },
      { id: 'req_do_3', targetRoleId: 'role_devops', skillId: 'sk_aws', requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_aws', name: 'Amazon Web Services', slug: 'aws', category: SkillCategory.OPERATIONS, subcategory: 'Cloud Infrastructure' } },
      { id: 'req_do_4', targetRoleId: 'role_devops', skillId: 'sk_cicd', requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 2.5, isRequired: true, skill: { id: 'sk_cicd', name: 'CI/CD Pipelines', slug: 'ci-cd', category: SkillCategory.OPERATIONS, subcategory: 'DevOps' } },
      { id: 'req_do_5', targetRoleId: 'role_devops', skillId: 'sk_python', requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 1.5, isRequired: false, skill: { id: 'sk_python', name: 'Python', slug: 'python', category: SkillCategory.PROGRAMMING, subcategory: 'Data Science' } },
    ],
  },
  {
    id: 'role_sec',
    title: 'Cybersecurity Analyst',
    slug: 'cybersecurity-analyst',
    description: 'Defend corporate network perimeters, detect vulnerabilities, analyze security logs, and enforce cryptographic standards.',
    category: SkillCategory.OPERATIONS,
    skillRequirements: [
      { id: 'req_sec_1', targetRoleId: 'role_sec', skillId: 'sk_netsec', requiredProficiency: ProficiencyLevel.EXPERT, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_netsec', name: 'Network Security', slug: 'network-security', category: SkillCategory.OPERATIONS, subcategory: 'Cybersecurity' } },
      { id: 'req_sec_2', targetRoleId: 'role_sec', skillId: 'sk_siem', requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 3.0, isRequired: true, skill: { id: 'sk_siem', name: 'SIEM & Threat Monitoring', slug: 'siem', category: SkillCategory.OPERATIONS, subcategory: 'Cybersecurity' } },
      { id: 'req_sec_3', targetRoleId: 'role_sec', skillId: 'sk_hack', requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 2.5, isRequired: true, skill: { id: 'sk_hack', name: 'Ethical Hacking & Pen Testing', slug: 'ethical-hacking', category: SkillCategory.OPERATIONS, subcategory: 'Cybersecurity' } },
      { id: 'req_sec_4', targetRoleId: 'role_sec', skillId: 'sk_python', requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 1.5, isRequired: false, skill: { id: 'sk_python', name: 'Python', slug: 'python', category: SkillCategory.PROGRAMMING, subcategory: 'Data Science' } },
      { id: 'req_sec_5', targetRoleId: 'role_sec', skillId: 'sk_docker', requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 1.0, isRequired: false, skill: { id: 'sk_docker', name: 'Docker', slug: 'docker', category: SkillCategory.OPERATIONS, subcategory: 'DevOps' } },
    ],
  },
];

// In-memory target role assignments for offline resilience & testing
const userTargetRoleStore = new Map<string, string>();

export class TargetRoleService {
  async getTargetRoles() {
    try {
      const roles = await prismaClient.targetRole.findMany({
        where: { deletedAt: null },
        include: {
          skillRequirements: {
            include: {
              skill: {
                select: { id: true, name: true, slug: true, category: true, subcategory: true },
              },
            },
          },
        },
        orderBy: { title: 'asc' },
      });
      if (roles && roles.length > 0) return roles;
    } catch {
      // Fallback below
    }
    return FALLBACK_TARGET_ROLES;
  }

  async listRoles() {
    return this.getTargetRoles();
  }

  async getTargetRoleById(roleIdOrSlug: string) {
    try {
      const role = await prismaClient.targetRole.findFirst({
        where: {
          OR: [{ id: roleIdOrSlug }, { slug: roleIdOrSlug }],
          deletedAt: null,
        },
        include: {
          skillRequirements: {
            include: {
              skill: {
                select: { id: true, name: true, slug: true, category: true, subcategory: true },
              },
            },
          },
        },
      });
      if (role) return role;
    } catch {
      // Fallback below
    }

    const fallbackRole = FALLBACK_TARGET_ROLES.find(
      (r) => r.id === roleIdOrSlug || r.slug === roleIdOrSlug
    );
    return fallbackRole || null;
  }

  async getRole(roleIdOrSlug: string) {
    return this.getTargetRoleById(roleIdOrSlug);
  }

  async getUserTargetRole(userId: string) {
    try {
      const profile = await prismaClient.profile.findUnique({
        where: { userId },
        include: { targetRole: true },
      });
      if (profile?.targetRole) {
        return profile.targetRole;
      }
    } catch {
      // Fallback below
    }

    const targetRoleId = userTargetRoleStore.get(userId);
    if (targetRoleId) {
      return this.getTargetRoleById(targetRoleId);
    }

    // Default fallback: first available role for demo user
    return FALLBACK_TARGET_ROLES[0];
  }

  async setUserTargetRole(userId: string, roleIdOrSlug: string) {
    const role = await this.getTargetRoleById(roleIdOrSlug);
    if (!role) {
      throw new Error('Target role not found');
    }

    userTargetRoleStore.set(userId, role.id);

    try {
      await prismaClient.profile.upsert({
        where: { userId },
        update: { targetRoleId: role.id },
        create: {
          userId,
          targetRoleId: role.id,
        },
      });
    } catch {
      // Offline fallback: handled by userTargetRoleStore
    }

    return role;
  }

  /**
   * Deterministic Skill Gap Analysis Engine
   */
  async calculateRoleGap(userId: string, roleIdOrSlug: string): Promise<TargetRoleGapAnalysis | null> {
    const role = await this.getTargetRoleById(roleIdOrSlug);
    if (!role) return null;

    // Fetch user skills
    let userSkills: Array<{
      id: string;
      skillId: string;
      proficiencyLevel: ProficiencyLevel;
      confidence?: number | null;
      skill?: { id: string; name: string; slug: string; category?: string };
    }> = [];

    try {
      userSkills = await prismaClient.userSkill.findMany({
        where: { userId },
        include: {
          skill: {
            select: { id: true, name: true, slug: true, category: true },
          },
        },
      });
    } catch {
      // Offline fallback: use in-memory demo user skills
      userSkills = DEMO_USER_SKILLS.map((us) => ({
        id: us.id,
        skillId: us.skillId,
        proficiencyLevel: us.proficiencyLevel as ProficiencyLevel,
        confidence: us.confidence,
        skill: us.skill ? { id: us.skill.id, name: us.skill.name, slug: us.skill.slug, category: us.skill.category } : undefined,
      }));
    }

    // Index user skills by ID, slug, and lowercase name for rock-solid mapping
    const skillById = new Map<string, typeof userSkills[0]>();
    const skillBySlug = new Map<string, typeof userSkills[0]>();
    const skillByName = new Map<string, typeof userSkills[0]>();

    for (const us of userSkills) {
      skillById.set(us.skillId, us);
      if (us.skill?.slug) skillBySlug.set(us.skill.slug.toLowerCase(), us);
      if (us.skill?.name) skillByName.set(us.skill.name.toLowerCase(), us);
    }

    // Process all requirements deterministically
    const requirementGaps: TargetRoleSkillGapItem[] = role.skillRequirements.map((req: any) => {
      const userSkill =
        skillById.get(req.skillId) ||
        (req.skill?.slug ? skillBySlug.get(req.skill.slug.toLowerCase()) : undefined) ||
        (req.skill?.name ? skillByName.get(req.skill.name.toLowerCase()) : undefined);

      const reqProfVal = PROFICIENCY_ORDER[req.requiredProficiency] || 1;
      const userProfVal = userSkill ? PROFICIENCY_ORDER[userSkill.proficiencyLevel] || 0 : 0;
      const proficiencyGap = Math.max(0, reqProfVal - userProfVal);

      let status: TargetRoleGapStatus;
      if (userProfVal >= reqProfVal) {
        status = 'MATCHED';
      } else if (userProfVal > 0) {
        status = 'PARTIAL';
      } else {
        status = 'MISSING';
      }

      return {
        skill: {
          id: req.skill.id,
          name: req.skill.name,
          slug: req.skill.slug,
          category: req.skill.category,
          subcategory: req.skill.subcategory,
        },
        currentProficiency: userSkill ? userSkill.proficiencyLevel : null,
        userProficiencyLevel: userSkill ? userSkill.proficiencyLevel : null,
        requiredProficiency: req.requiredProficiency,
        importanceWeight: req.importanceWeight,
        isRequired: req.isRequired,
        gap: proficiencyGap,
        proficiencyGap,
        status,
        userConfidence: userSkill?.confidence ?? undefined,
      };
    });

    // Categorization
    const matched = requirementGaps.filter((g) => g.status === 'MATCHED');
    const partial = requirementGaps.filter((g) => g.status === 'PARTIAL');
    const missing = requirementGaps.filter((g) => g.status === 'MISSING');
    const optional = requirementGaps.filter((g) => !g.isRequired);

    // Deterministic readiness score calculation:
    // skillScore = min(userProficiency / requiredProficiency, 1)
    // weightedScore = skillScore * importanceWeight
    // readinessScore = (sum(weightedScore) / sum(importanceWeight)) * 100
    let totalImportanceWeight = 0;
    let totalAchievedWeight = 0;

    let mandatoryImportanceWeight = 0;
    let mandatoryAchievedWeight = 0;

    for (const item of requirementGaps) {
      const reqVal = PROFICIENCY_ORDER[item.requiredProficiency];
      const userVal = item.currentProficiency ? PROFICIENCY_ORDER[item.currentProficiency] : 0;
      const skillScore = Math.min(userVal / reqVal, 1.0);
      const weightedScore = skillScore * item.importanceWeight;

      totalImportanceWeight += item.importanceWeight;
      totalAchievedWeight += weightedScore;

      if (item.isRequired) {
        mandatoryImportanceWeight += item.importanceWeight;
        mandatoryAchievedWeight += weightedScore;
      }
    }

    const readinessScore =
      totalImportanceWeight > 0 ? Math.round((totalAchievedWeight / totalImportanceWeight) * 100) : 0;

    const mandatoryReadinessScore =
      mandatoryImportanceWeight > 0
        ? Math.round((mandatoryAchievedWeight / mandatoryImportanceWeight) * 100)
        : 100;

    let readinessLevel: 'HIGHLY_READY' | 'MODERATELY_READY' | 'FOUNDATION_REQUIRED';
    if (readinessScore >= 80) {
      readinessLevel = 'HIGHLY_READY';
    } else if (readinessScore >= 50) {
      readinessLevel = 'MODERATELY_READY';
    } else {
      readinessLevel = 'FOUNDATION_REQUIRED';
    }

    // Priority Engine:
    // priorityScore = importanceWeight * proficiencyGap * mandatoryMultiplier
    // Sort descending by priorityScore, then importanceWeight, then skill name
    const priorities: TargetRoleSkillPriority[] = requirementGaps
      .filter((item) => item.proficiencyGap > 0)
      .map((item) => {
        const mandatoryMultiplier = item.isRequired ? 1.5 : 1.0;
        const priorityScore = Number(
          (item.importanceWeight * item.proficiencyGap * mandatoryMultiplier).toFixed(2)
        );

        let reason = '';
        let suggestedAction = '';

        if (item.status === 'MISSING' && item.isRequired) {
          reason = `Core mandatory requirement missing (${item.requiredProficiency} needed)`;
          suggestedAction = `Begin foundational study and project demonstration for ${item.skill.name}`;
        } else if (item.status === 'PARTIAL' && item.isRequired) {
          reason = `Mandatory skill requires ${item.proficiencyGap} level boost (${item.userProficiencyLevel} → ${item.requiredProficiency})`;
          suggestedAction = `Complete intermediate/advanced hands-on projects in ${item.skill.name}`;
        } else if (item.status === 'MISSING' && !item.isRequired) {
          reason = `Optional preferred skill for higher role competitiveness`;
          suggestedAction = `Explore introductory concepts in ${item.skill.name}`;
        } else {
          reason = `Optional skill boost (${item.userProficiencyLevel} → ${item.requiredProficiency})`;
          suggestedAction = `Upskill ${item.skill.name} to target proficiency`;
        }

        return {
          skill: {
            id: item.skill.id,
            name: item.skill.name,
            slug: item.skill.slug,
            category: item.skill.category,
          },
          priorityScore,
          importanceWeight: item.importanceWeight,
          proficiencyGap: item.proficiencyGap,
          isRequired: item.isRequired,
          reason,
          suggestedAction,
        };
      })
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        if (b.importanceWeight !== a.importanceWeight) return b.importanceWeight - a.importanceWeight;
        return a.skill.name.localeCompare(b.skill.name);
      });

    const summary: TargetRoleGapSummary = {
      totalRequirements: requirementGaps.length,
      matchedCount: matched.length,
      partialCount: partial.length,
      missingCount: missing.length,
      mandatoryMissingCount: missing.filter((m) => m.isRequired).length,
    };

    // Phase 4: Calculate confidence signals across role requirements
    let totalConfidence = 0;
    let confidenceCount = 0;
    let evidenceBackedCount = 0;

    for (const item of requirementGaps) {
      if (typeof item.userConfidence === 'number' && item.userConfidence > 0) {
        totalConfidence += item.userConfidence;
        confidenceCount++;
        if (item.userConfidence >= 50) {
          evidenceBackedCount++;
        }
      }
    }

    const averageSkillConfidence =
      confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 0;

    return {
      role: {
        id: role.id,
        title: role.title,
        slug: role.slug,
        description: role.description,
        category: role.category,
      },
      readinessScore,
      mandatoryReadinessScore,
      readinessPercentage: readinessScore,
      readinessLevel,
      matched,
      partial,
      missing,
      optional,
      priorities,
      summary,
      averageSkillConfidence,
      evidenceBackedSkillsCount: evidenceBackedCount,
      requirementGaps,
      matchedCount: summary.matchedCount,
      partialCount: summary.partialCount,
      missingCount: summary.missingCount,
      totalRequirementsCount: summary.totalRequirements,
    };
  }
}

export const targetRoleService = new TargetRoleService();
