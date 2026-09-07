// Learning Path Service
// Generates ordered learning sequences from skill graph using deterministic algorithms

import prismaClient from '../../lib/prisma';
import { ProficiencyLevel, SkillRelationshipType, LearningPlanStatus } from '@prisma/client';
import { skillGraphService, SkillGraphNode, SkillRelationshipDTO } from './graph';
import { skillGapService, GapItem, SkillGapResult, PrioritizedGapItem } from './gap';

export type MilestoneStatus = 'KNOWN' | 'PARTIAL' | 'MISSING' | 'FOUNDATION_REQUIRED';

export interface LearningMilestone {
  skill: SkillGraphNode;
  order: number;
  status: MilestoneStatus;
  targetProficiency: ProficiencyLevel;
  currentProficiency?: ProficiencyLevel;
  currentConfidence?: number;
  prerequisiteSkills: SkillGraphNode[];
  estimatedDifficulty: 'LOW' | 'MEDIUM' | 'HIGH';
  priorityReason: string;
}

export interface LearningPath {
  targetSkill: SkillGraphNode;
  milestones: LearningMilestone[];
  totalMilestones: number;
  completedMilestones: number;
  estimatedDifficulty: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface LearningPlanResult {
  learningPath: LearningPath;
  gapAnalysis: SkillGapResult;
  resources: Map<string, LearningResourceSummary[]>;
}

export interface LearningResourceSummary {
  id: string;
  title: string;
  description: string | null;
  url: string;
  provider: string | null;
  type: string;
  difficulty: string | null;
  language: string | null;
  durationMinutes: number | null;
  rating: number | null;
  verifiedSource: boolean;
}

const PROFICIENCY_ORDER: Record<ProficiencyLevel, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

const STRENGTH_TO_MIN_PROFICIENCY: Record<string, ProficiencyLevel> = {
  '0.9': 'ADVANCED',
  '0.8': 'ADVANCED',
  '0.7': 'INTERMEDIATE',
  '0.6': 'INTERMEDIATE',
  '0.5': 'BEGINNER',
  '0.4': 'BEGINNER',
  '0.3': 'BEGINNER',
  '0.2': 'BEGINNER',
  '0.1': 'BEGINNER',
};

function getMinProficiencyForStrength(strength: number): ProficiencyLevel {
  const strengthKey = strength.toFixed(1);
  return STRENGTH_TO_MIN_PROFICIENCY[strengthKey] ?? 'BEGINNER';
}

function getEstimatedDifficulty(skill: SkillGraphNode, prerequisites: SkillGraphNode[]): 'LOW' | 'MEDIUM' | 'HIGH' {
  const prereqCount = prerequisites.length;
  const isAdvancedCategory = ['DATA_SCIENCE', 'MANAGEMENT', 'LEGAL', 'FINANCE'].includes(skill.category);
  
  if (prereqCount >= 3 || isAdvancedCategory) return 'HIGH';
  if (prereqCount >= 1) return 'MEDIUM';
  return 'LOW';
}

export class LearningPathService {
  private readonly MAX_DEPTH = 3;
  private readonly MAX_MILESTONES = 20;

  /**
   * Generate a learning path for a user towards a target skill
   */
  async generateLearningPath(userId: string, targetSkillId: string): Promise<LearningPlanResult | null> {
    const targetSkill = await prismaClient.skill.findUnique({
      where: { id: targetSkillId },
      select: { id: true, name: true, slug: true, category: true, subcategory: true },
    });

    if (!targetSkill) return null;

    // Get gap analysis
    const gapAnalysis = await skillGapService.calculateSkillGap(userId, targetSkillId);
    if (!gapAnalysis) return null;

    // Get all prerequisites with full graph context
    const allPrereqs = await this.getAllPrerequisitesWithContext(targetSkillId);
    
    // Filter to only missing/partial/foundation_required skills (exclude KNOWN)
    const gapItems = gapAnalysis.prioritizedGaps.filter(
      (g) => g.status !== 'KNOWN'
    );

    // Topologically sort prerequisites based on graph dependencies
    const sortedMilestones = this.topologicalSortPrerequisites(gapItems, allPrereqs);

    // Build milestones
    const milestones: LearningMilestone[] = sortedMilestones.map((item, index) => {
      const prereqSkills = this.getDirectPrerequisites(item.skill.id, allPrereqs);
      const targetProficiency = getMinProficiencyForStrength(item.requiredStrength);
      
      return {
        skill: item.skill,
        order: index + 1,
        status: item.status as MilestoneStatus,
        targetProficiency,
        currentProficiency: item.userProficiencyLevel,
        currentConfidence: item.userConfidence,
        prerequisiteSkills: prereqSkills,
        estimatedDifficulty: getEstimatedDifficulty(item.skill, prereqSkills),
        priorityReason: item.priorityReason,
      };
    });

    // Filter out milestones user already satisfies (KNOWN) unless they want reinforcement
    const activeMilestones = milestones.filter((m) => m.status !== 'KNOWN');

    const completedCount = milestones.filter((m) => m.status === 'KNOWN').length;
    const totalMilestones = activeMilestones.length + completedCount;

    // Calculate overall path difficulty
    const pathDifficulty = this.calculatePathDifficulty(activeMilestones);

    const learningPath: LearningPath = {
      targetSkill: {
        id: targetSkill.id,
        name: targetSkill.name,
        slug: targetSkill.slug,
        category: targetSkill.category,
        subcategory: targetSkill.subcategory,
      },
      milestones: activeMilestones,
      totalMilestones,
      completedMilestones: completedCount,
      estimatedDifficulty: pathDifficulty,
    };

    // Fetch resources for each milestone skill
    const skillIds = activeMilestones.map((m) => m.skill.id);
    const resources = await this.getResourcesForSkills(skillIds);

    return {
      learningPath,
      gapAnalysis,
      resources,
    };
  }

  /**
   * Get all prerequisites with full context for topological sorting
   */
  private async getAllPrerequisitesWithContext(skillId: string): Promise<Map<string, SkillRelationshipDTO[]>> {
    const prereqMap = new Map<string, SkillRelationshipDTO[]>();
    const visited = new Set<string>();

    const maxDepth = this.MAX_DEPTH;
    const traverse = async (currentSkillId: string, depth: number): Promise<void> => {
      if (depth >= maxDepth || visited.has(currentSkillId)) return;
      visited.add(currentSkillId);

      const directPrereqs = await skillGraphService.getPrerequisites(currentSkillId);
      if (directPrereqs.length > 0) {
        prereqMap.set(currentSkillId, directPrereqs);
      }

      for (const prereq of directPrereqs) {
        await traverse(prereq.skill.id, depth + 1);
      }
    };

    await traverse(skillId, 0);
    return prereqMap;
  }

  /**
   * Topological sort of prerequisites using Kahn's algorithm
   * Returns skills in dependency order (prerequisites first)
   */
  private topologicalSortPrerequisites(
    gapItems: PrioritizedGapItem[],
    prereqMap: Map<string, SkillRelationshipDTO[]>
  ): PrioritizedGapItem[] {
    // Build adjacency list and in-degree count
    const adjList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const skillNodes = new Map<string, PrioritizedGapItem>();

    // Initialize all gap items
    for (const item of gapItems) {
      skillNodes.set(item.skill.id, item);
      adjList.set(item.skill.id, []);
      inDegree.set(item.skill.id, 0);
    }

    // Build edges from prereqMap
    for (const [skillId, prereqs] of prereqMap.entries()) {
      if (!skillNodes.has(skillId)) continue;
      
      for (const prereq of prereqs) {
        if (skillNodes.has(prereq.skill.id)) {
          adjList.get(prereq.skill.id)!.push(skillId);
          inDegree.set(skillId, (inDegree.get(skillId) || 0) + 1);
        }
      }
    }

    // Kahn's algorithm
    const queue: string[] = [];
    for (const [skillId, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(skillId);
    }

    const sorted: PrioritizedGapItem[] = [];
    while (queue.length > 0) {
      // Sort queue by priority (descending) for deterministic ordering
      queue.sort((a, b) => {
        const itemA = skillNodes.get(a);
        const itemB = skillNodes.get(b);
        if (!itemA || !itemB) return 0;
        // Higher priority first
        return itemB.priority - itemA.priority;
      });

      const current = queue.shift()!;
      const item = skillNodes.get(current);
      if (item) sorted.push(item);

      for (const neighbor of adjList.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Handle any remaining nodes (cycles or disconnected)
    const remaining = gapItems.filter((item) => !sorted.some((s) => s.skill.id === item.skill.id));
    for (const item of remaining) {
      sorted.push(item);
    }

    return sorted;
  }

  /**
   * Get direct prerequisites for a skill from the prereq map
   */
  private getDirectPrerequisites(skillId: string, prereqMap: Map<string, SkillRelationshipDTO[]>): SkillGraphNode[] {
    const prereqs = prereqMap.get(skillId);
    if (!prereqs) return [];
    return prereqs.map((p) => p.skill);
  }

  /**
   * Calculate overall path difficulty
   */
  private calculatePathDifficulty(milestones: LearningMilestone[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (milestones.length === 0) return 'LOW';
    
    const highCount = milestones.filter((m) => m.estimatedDifficulty === 'HIGH').length;
    const mediumCount = milestones.filter((m) => m.estimatedDifficulty === 'MEDIUM').length;
    
    if (highCount >= 2 || (highCount >= 1 && mediumCount >= 2)) return 'HIGH';
    if (highCount >= 1 || mediumCount >= 2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get learning resources for a list of skill IDs
   */
  private async getResourcesForSkills(skillIds: string[]): Promise<Map<string, LearningResourceSummary[]>> {
    if (skillIds.length === 0) return new Map();

    const resources = await prismaClient.learningResource.findMany({
      where: {
        skillId: { in: skillIds },
        deletedAt: null,
      },
      orderBy: [
        { verifiedSource: 'desc' },
        { qualityScore: 'desc' },
        { rating: 'desc' },
        { createdAt: 'asc' },
      ],
      take: 50, // Limit total resources
    });

    const resourceMap = new Map<string, LearningResourceSummary[]>();
    for (const resource of resources) {
      const existing = resourceMap.get(resource.skillId) || [];
      if (existing.length < 5) { // Max 5 resources per skill
        existing.push({
          id: resource.id,
          title: resource.title,
          description: resource.description,
          url: resource.url,
          provider: resource.provider,
          type: resource.type,
          difficulty: resource.difficulty,
          language: resource.language,
          durationMinutes: resource.durationMinutes,
          rating: resource.rating,
          verifiedSource: resource.verifiedSource,
        });
        resourceMap.set(resource.skillId, existing);
      }
    }

    return resourceMap;
  }
}

export const learningPathService = new LearningPathService();