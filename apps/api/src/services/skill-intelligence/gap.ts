// Skill Gap Analysis Service
// Deterministic gap calculation based on skill graph, user skills, and proficiency levels

import prismaClient from '../../lib/prisma';
import { ProficiencyLevel, SkillRelationshipType } from '@prisma/client';
import { skillGraphService, SkillGraphNode, SkillRelationshipDTO } from './graph';
import { getProficiencyBaseline } from './config';

export type GapStatus = 'KNOWN' | 'PARTIAL' | 'MISSING' | 'FOUNDATION_REQUIRED';

export interface GapItem {
  skill: SkillGraphNode;
  status: GapStatus;
  userProficiencyLevel?: ProficiencyLevel;
  userConfidence?: number;
  requiredStrength: number;
  proficiencyGap?: number;
  confidenceContext?: 'HIGH' | 'MEDIUM' | 'LOW';
  targetProficiency: ProficiencyLevel;
}

export interface DetailedSkillGapAnalysis {
  targetSkill: SkillGraphNode;
  readiness: 'READY' | 'PARTIAL' | 'FOUNDATION_REQUIRED';
  knownSkills: GapItem[];
  partialSkills: GapItem[];
  missingSkills: GapItem[];
  allPrerequisites: GapItem[];
}

export interface PrioritizedGapItem extends GapItem {
  priority: number;
  priorityReason: string;
}

export interface SkillGapResult {
  targetSkill: SkillGraphNode;
  readiness: 'READY' | 'PARTIAL' | 'FOUNDATION_REQUIRED';
  prioritizedGaps: PrioritizedGapItem[];
  knownCount: number;
  partialCount: number;
  missingCount: number;
  foundationRequiredCount: number;
}

// Proficiency level order for comparison
const PROFICIENCY_ORDER: Record<ProficiencyLevel, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

// Minimum proficiency required based on prerequisite strength
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

function getConfidenceContext(confidence: number | null): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (confidence === null || confidence === undefined) return 'LOW';
  if (confidence >= 75) return 'HIGH';
  if (confidence >= 50) return 'MEDIUM';
  return 'LOW';
}

export class SkillGapService {
  private readonly MAX_DEPTH = 3;
  private readonly MAX_NODES = 100;

  /**
   * Calculate skill gap for a user towards a target skill
   * Uses proficiency-aware and confidence-aware analysis
   */
  async calculateSkillGap(userId: string, targetSkillId: string): Promise<SkillGapResult | null> {
    const targetSkill = await prismaClient.skill.findUnique({
      where: { id: targetSkillId },
      select: { id: true, name: true, slug: true, category: true, subcategory: true },
    });

    if (!targetSkill) return null;

    // Get all prerequisites (direct and indirect)
    const allPrerequisites = await this.getAllPrerequisites(targetSkillId);
    
    // Get user's skills
    const userSkills = await prismaClient.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const userSkillMap = new Map<string, { skillId: string; proficiencyLevel: ProficiencyLevel; confidence: number | null }>(
      userSkills.map((us) => [us.skillId, { skillId: us.skillId, proficiencyLevel: us.proficiencyLevel, confidence: us.confidence }])
    );

    // Analyze each prerequisite
    const gapItems: GapItem[] = allPrerequisites.map((p) => {
      const userSkill = userSkillMap.get(p.skill.id);
      const requiredMinProficiency = getMinProficiencyForStrength(p.strength);
      
      if (!userSkill) {
        return {
          skill: p.skill,
          status: 'MISSING' as GapStatus,
          requiredStrength: p.strength,
          proficiencyGap: PROFICIENCY_ORDER[requiredMinProficiency],
          targetProficiency: requiredMinProficiency,
        };
      }

      const userProficiencyLevel = userSkill.proficiencyLevel;
      const userProficiencyValue = PROFICIENCY_ORDER[userProficiencyLevel];
      const requiredProficiencyValue = PROFICIENCY_ORDER[requiredMinProficiency];
      const proficiencyGap = requiredProficiencyValue - userProficiencyValue;
      const confidenceContext = getConfidenceContext(userSkill.confidence ?? null);

      let status: GapStatus;
      if (proficiencyGap <= 0) {
        // User meets or exceeds required proficiency
        status = 'KNOWN';
      } else if (proficiencyGap === 1) {
        // One level below required
        status = 'PARTIAL';
      } else {
        // Two or more levels below required
        status = 'FOUNDATION_REQUIRED';
      }

      return {
        skill: p.skill,
        status,
        userProficiencyLevel,
        userConfidence: userSkill.confidence ?? undefined,
        requiredStrength: p.strength,
        proficiencyGap: proficiencyGap > 0 ? proficiencyGap : undefined,
        confidenceContext,
        targetProficiency: requiredMinProficiency,
      };
    });

    // Categorize gaps
    const knownSkills = gapItems.filter((g) => g.status === 'KNOWN');
    const partialSkills = gapItems.filter((g) => g.status === 'PARTIAL');
    const missingSkills = gapItems.filter((g) => g.status === 'MISSING');
    const foundationRequiredSkills = gapItems.filter((g) => g.status === 'FOUNDATION_REQUIRED');

    // Determine overall readiness
    let readiness: 'READY' | 'PARTIAL' | 'FOUNDATION_REQUIRED';
    if (missingSkills.length > 0 || foundationRequiredSkills.length > 0) {
      readiness = foundationRequiredSkills.length > 0 ? 'FOUNDATION_REQUIRED' : 'PARTIAL';
    } else if (partialSkills.length > 0) {
      readiness = 'PARTIAL';
    } else {
      readiness = 'READY';
    }

    // Prioritize gaps
    const prioritizedGaps = this.prioritizeGaps(gapItems);

    return {
      targetSkill: {
        id: targetSkill.id,
        name: targetSkill.name,
        slug: targetSkill.slug,
        category: targetSkill.category,
        subcategory: targetSkill.subcategory,
      },
      readiness,
      prioritizedGaps,
      knownCount: knownSkills.length,
      partialCount: partialSkills.length,
      missingCount: missingSkills.length,
      foundationRequiredCount: foundationRequiredSkills.length,
    };
  }

  /**
   * Get all prerequisites for a skill (recursive, up to MAX_DEPTH)
   */
  private async getAllPrerequisites(skillId: string, depth: number = 0): Promise<SkillRelationshipDTO[]> {
    if (depth >= this.MAX_DEPTH) return [];

    const directPrereqs = await skillGraphService.getPrerequisites(skillId);
    let allPrereqs = [...directPrereqs];

    for (const prereq of directPrereqs) {
      const indirect = await this.getAllPrerequisites(prereq.skill.id, depth + 1);
      allPrereqs = [...allPrereqs, ...indirect];
    }

    // Deduplicate by skill ID, keeping the highest strength relationship
    const uniqueMap = new Map<string, SkillRelationshipDTO>();
    for (const p of allPrereqs) {
      const existing = uniqueMap.get(p.skill.id);
      if (!existing || p.strength > existing.strength) {
        uniqueMap.set(p.skill.id, p);
      }
    }

    return Array.from(uniqueMap.values());
  }

  /**
   * Deterministic prioritization of skill gaps
   * Priority factors (in order of importance):
   * 1. Direct prerequisites (depth = 1)
   * 2. Foundation required (proficiency gap >= 2)
   * 3. Prerequisite strength
   * 4. Dependency count (skills that depend on this)
   * 5. Current proficiency level (lower = higher priority to fix)
   */
  private prioritizeGaps(gapItems: GapItem[]): PrioritizedGapItem[] {
    return gapItems
      .map((item) => {
        let priority = 0;
        const reasons: string[] = [];

        // Factor 1: Direct prerequisite (depth heuristic - we don't track depth here, 
        // but we can use strength as proxy since direct prereqs tend to have higher strength)
        if (item.requiredStrength >= 0.8) {
          priority += 100;
          reasons.push('Direct prerequisite (high strength)');
        } else if (item.requiredStrength >= 0.6) {
          priority += 70;
          reasons.push('Strong prerequisite');
        } else if (item.requiredStrength >= 0.4) {
          priority += 40;
          reasons.push('Moderate prerequisite');
        } else {
          priority += 10;
          reasons.push('Weak prerequisite');
        }

        // Factor 2: Foundation required (proficiency gap >= 2)
        if (item.status === 'FOUNDATION_REQUIRED') {
          priority += 80;
          reasons.push('Foundation required (proficiency gap >= 2)');
        } else if (item.status === 'PARTIAL') {
          priority += 50;
          reasons.push('Partial proficiency (one level below)');
        } else if (item.status === 'MISSING') {
          priority += 60;
          reasons.push('Completely missing');
        }

        // Factor 3: Current proficiency (lower = higher priority)
        if (item.userProficiencyLevel) {
          const proficiencyValue = PROFICIENCY_ORDER[item.userProficiencyLevel];
          priority += (5 - proficiencyValue) * 10;
          reasons.push(`Current proficiency: ${item.userProficiencyLevel}`);
        } else {
          priority += 40;
          reasons.push('No proficiency (missing skill)');
        }

        // Factor 4: Confidence context (low confidence = higher priority to verify/improve)
        if (item.confidenceContext === 'LOW') {
          priority += 20;
          reasons.push('Low confidence');
        } else if (item.confidenceContext === 'MEDIUM') {
          priority += 10;
          reasons.push('Medium confidence');
        }

        return {
          ...item,
          priority,
          priorityReason: reasons.join('; '),
        };
      })
      .sort((a, b) => b.priority - a.priority);
  }
}

export const skillGapService = new SkillGapService();