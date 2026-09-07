// Personalized Learning Path Service
// Orchestrates Target Role Gaps, Skill Confidence, Prerequisite Intelligence, Learning Objectives, and Progress Tracking

import prismaClient from '../../lib/prisma';
import { LearningPathStatus, LearningPathItemStatus } from '@prisma/client';
import { targetRoleService, FALLBACK_TARGET_ROLES } from './role-gap';
import { skillConfidenceService } from './skill-confidence';
import { skillGraphService } from './graph';
import { learningObjectiveService } from './learning-objective';
import { learningResourceService } from './learning-resource';
import { DEMO_USER_SKILLS } from '../../lib/demo-data';
import type {
  LearningPathDTO,
  LearningPathItemDTO,
  LearningPathSummaryDTO,
  LearningGapPriorityLevel,
} from '@skillsync/types';

// In-memory persistence fallback when database is offline or in test environments
const IN_MEMORY_PATHS = new Map<string, LearningPathDTO>();

const PROFICIENCY_RANKS: Record<string, number> = {
  NONE: 0,
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

export class PersonalizedLearningPathService {
  /**
   * Get or automatically generate the active learning path for the authenticated user
   */
  async getOrCreateUserLearningPath(userId: string, targetRoleId?: string): Promise<LearningPathDTO> {
    // 1. Resolve target role ID
    let roleId = targetRoleId;
    if (!roleId) {
      const userRole = await targetRoleService.getUserTargetRole(userId);
      roleId = userRole ? userRole.id : 'role_ai_ml';
    }

    // 2. Check if path already exists in DB
    try {
      const existing = await prismaClient.learningPath.findUnique({
        where: { userId_targetRoleId: { userId, targetRoleId: roleId } },
        include: {
          targetRole: true,
          items: {
            include: {
              skill: true,
              resource: true,
            },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (existing && existing.items.length > 0) {
        return this.formatDatabasePath(existing);
      }
    } catch {
      // Database offline or table deferred
    }

    const memKey = `${userId}:${roleId}`;
    if (IN_MEMORY_PATHS.has(memKey)) {
      return IN_MEMORY_PATHS.get(memKey)!;
    }

    // 3. Generate fresh personalized path
    return this.generatePath(userId, roleId);
  }

  /**
   * Generate an end-to-end personalized learning path from Target Role & Confidence
   */
  async generatePath(userId: string, targetRoleId: string): Promise<LearningPathDTO> {
    // A. Fetch target role and requirements
    const roleDetails = await targetRoleService.getTargetRoleById(targetRoleId);
    const targetRole = roleDetails || FALLBACK_TARGET_ROLES.find(r => r.id === targetRoleId || r.slug === targetRoleId) || FALLBACK_TARGET_ROLES[1];

    // B. Fetch user skills and Phase 4 confidence ratings
    const userSkillsMap = new Map<string, { proficiency: string; confidence: number; verificationStatus: string }>();
    try {
      const dbSkills = await prismaClient.userSkill.findMany({
        where: { userId },
        include: { skill: true },
      });

      for (const us of dbSkills) {
        const conf = await skillConfidenceService.getUserSkillConfidence(userId, us.skillId);
        userSkillsMap.set(us.skillId, {
          proficiency: us.proficiencyLevel,
          confidence: conf ? conf.confidence : (us.confidence || 50),
          verificationStatus: conf ? String(conf.verificationStatus) : 'CLAIMED',
        });
      }
    } catch {
      // Fallback demo user skills
      for (const us of DEMO_USER_SKILLS) {
        userSkillsMap.set(us.skillId, {
          proficiency: us.proficiencyLevel,
          confidence: us.confidence || 80,
          verificationStatus: us.verificationStatus || 'SUPPORTED',
        });
      }
    }

    // C. Analyze each role requirement: identify gaps and prioritize
    interface CandidateGap {
      skillId: string;
      skillName: string;
      skillSlug: string;
      category: string;
      requiredProficiency: string;
      currentProficiency: string;
      confidence: number;
      verificationStatus: string;
      priority: LearningGapPriorityLevel;
      importanceWeight: number;
      isRequired: boolean;
      score: number;
      reasons: string[];
    }

    const candidateGaps: CandidateGap[] = [];

    for (const req of targetRole.skillRequirements) {
      const skillId = req.skillId;
      const skillName = req.skill.name;
      const skillSlug = req.skill.slug;
      const reqProf = req.requiredProficiency;
      const isRequired = req.isRequired;
      const weight = req.importanceWeight || 1.0;

      const userSkill = userSkillsMap.get(skillId) || {
        proficiency: 'NONE',
        confidence: 0,
        verificationStatus: 'UNVERIFIED',
      };

      const userRank = PROFICIENCY_RANKS[userSkill.proficiency] || 0;
      const reqRank = PROFICIENCY_RANKS[reqProf] || 2;
      const deltaProf = Math.max(0, reqRank - userRank);
      const conf = userSkill.confidence;

      // RULE: If skill already meets or exceeds required proficiency with >= 70% confidence, NO ACTION REQUIRED
      if (userRank >= reqRank && conf >= 70 && userSkill.verificationStatus !== 'CONFLICTING') {
        continue; // Exclude mastered skills from learning path!
      }

      // Calculate gap severity and priority level
      let priority: LearningGapPriorityLevel = 'MEDIUM';
      const reasons: string[] = [];

      if (isRequired) {
        reasons.push(`Mandatory core skill for ${targetRole.title}`);
      }

      if (userRank === 0) {
        reasons.push('New capability required (no existing experience logged)');
      } else if (deltaProf > 0) {
        reasons.push(`Proficiency jump needed: ${userSkill.proficiency} → ${reqProf}`);
      }

      if (conf < 50) {
        reasons.push(`Low evidence confidence (${conf}%) requires structured validation`);
      } else if (userSkill.verificationStatus === 'CONFLICTING') {
        reasons.push('Conflicting evidence requires benchmark completion');
      }

      // Prioritization calculation
      const priorityScore = (weight * (isRequired ? 1.5 : 1.0) * 10) + (deltaProf * 5) + (Math.max(0, 75 - conf) * 0.1);

      if (isRequired && (deltaProf > 0 || conf < 50 || weight >= 2.5)) {
        priority = 'HIGH';
      } else if (weight >= 2.0 || deltaProf >= 2) {
        priority = 'MEDIUM';
      } else {
        priority = 'LOW';
      }

      candidateGaps.push({
        skillId,
        skillName,
        skillSlug,
        category: req.skill.category || 'PROGRAMMING',
        requiredProficiency: reqProf,
        currentProficiency: userSkill.proficiency,
        confidence: conf,
        verificationStatus: userSkill.verificationStatus,
        priority,
        importanceWeight: weight,
        isRequired,
        score: priorityScore,
        reasons,
      });
    }

    // D. Prerequisite Intelligence & Topological Ordering
    const KNOWN_PREREQS: Record<string, { id: string; name: string; slug: string }[]> = {
      kubernetes: [{ id: 'sk_docker', name: 'Docker', slug: 'docker' }],
      'machine-learning': [{ id: 'sk_python', name: 'Python', slug: 'python' }],
      'deep-learning': [{ id: 'sk_ml', name: 'Machine Learning', slug: 'machine-learning' }],
      mlops: [
        { id: 'sk_docker', name: 'Docker', slug: 'docker' },
        { id: 'sk_ml', name: 'Machine Learning', slug: 'machine-learning' },
      ],
      react: [{ id: 'sk_ts', name: 'TypeScript', slug: 'typescript' }],
      nextjs: [{ id: 'sk_react', name: 'React', slug: 'react' }],
    };

    const prereqMap = new Map<string, { id: string; name: string; isSatisfied: boolean }[]>();
    for (const gap of candidateGaps) {
      let graphPrereqs: any[] = [];
      try {
        graphPrereqs = await skillGraphService.getPrerequisites(gap.skillId);
      } catch {
        const curated = KNOWN_PREREQS[gap.skillSlug] || [];
        graphPrereqs = curated.map(c => ({
          skill: { id: c.id, name: c.name, slug: c.slug },
          type: 'PREREQUISITE',
          strength: 1.0,
        }));
      }

      if (!graphPrereqs || graphPrereqs.length === 0) {
        const curated = KNOWN_PREREQS[gap.skillSlug] || [];
        graphPrereqs = curated.map(c => ({
          skill: { id: c.id, name: c.name, slug: c.slug },
          type: 'PREREQUISITE',
          strength: 1.0,
        }));
      }

      const prereqs = graphPrereqs.map(p => {
        const uSkill = userSkillsMap.get(p.skill.id);
        const isSatisfied = Boolean(uSkill && (PROFICIENCY_RANKS[uSkill.proficiency] || 0) >= 2);
        return {
          id: p.skill.id,
          name: p.skill.name,
          isSatisfied,
        };
      });
      prereqMap.set(gap.skillId, prereqs);
    }

    // Sort items so foundational skills with satisfied prerequisites or higher priority come first
    candidateGaps.sort((a, b) => {
      const aPrereqs = prereqMap.get(a.skillId) || [];
      const bPrereqs = prereqMap.get(b.skillId) || [];
      const aUnsatisfied = aPrereqs.filter(p => !p.isSatisfied).length;
      const bUnsatisfied = bPrereqs.filter(p => !p.isSatisfied).length;

      // Skills with fewer unsatisfied prerequisites come earlier
      if (aUnsatisfied !== bUnsatisfied) {
        return aUnsatisfied - bUnsatisfied;
      }
      // Then by priority score descending
      return b.score - a.score;
    });

    // E. Assemble Learning Path Items with Objectives and Ranked Resources
    const pathId = `lpath_${userId.replace(/[^a-zA-Z0-9]/g, '_')}_${targetRole.slug}`;
    const items: LearningPathItemDTO[] = [];
    let accumulatedMinutes = 0;

    for (let i = 0; i < candidateGaps.length; i++) {
      const gap = candidateGaps[i];
      const prereqs = prereqMap.get(gap.skillId) || [];
      const hasUnsatisfiedPrereq = prereqs.some(p => !p.isSatisfied);

      // Objective generation
      const objectiveDTO = learningObjectiveService.generateObjective({
        skillId: gap.skillId,
        skillName: gap.skillName,
        skillSlug: gap.skillSlug,
        currentProficiency: gap.currentProficiency,
        targetProficiency: gap.requiredProficiency,
        roleTitle: targetRole.title,
      });

      // Ranked resource retrieval
      const rankedResources = await learningResourceService.rankResourcesForSkillGap(
        gap.skillId,
        gap.skillSlug,
        gap.requiredProficiency,
        gap.currentProficiency,
        !hasUnsatisfiedPrereq,
        1
      );

      const topResource = rankedResources.length > 0 ? rankedResources[0].resource : null;
      const resourceReasons = rankedResources.length > 0 ? rankedResources[0].explanation : [];

      // Determine initial item status
      let initialStatus: LearningPathItemStatus = LearningPathItemStatus.AVAILABLE;
      if (hasUnsatisfiedPrereq) {
        initialStatus = LearningPathItemStatus.LOCKED;
      }

      const combinedExplanation = Array.from(new Set([...gap.reasons, ...resourceReasons]));
      accumulatedMinutes += objectiveDTO.estimatedMinutes;

      items.push({
        id: `litem_${pathId}_${gap.skillSlug}`,
        learningPathId: pathId,
        skillId: gap.skillId,
        skillName: gap.skillName,
        skillSlug: gap.skillSlug,
        skillCategory: gap.category,
        resourceId: topResource?.id || null,
        resource: topResource,
        title: objectiveDTO.title,
        objective: objectiveDTO.objective,
        priority: gap.priority,
        order: i + 1,
        status: initialStatus,
        progress: 0,
        estimatedMinutes: objectiveDTO.estimatedMinutes,
        explanation: combinedExplanation,
        prerequisites: prereqs,
        currentProficiency: gap.currentProficiency,
        requiredProficiency: gap.requiredProficiency,
        confidence: gap.confidence,
        startedAt: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Ensure the first available milestone is marked IN_PROGRESS as active focus
    if (!items.some(it => it.status === LearningPathItemStatus.IN_PROGRESS)) {
      const firstAvailable = items.find(it => it.status === LearningPathItemStatus.AVAILABLE);
      if (firstAvailable) {
        firstAvailable.status = LearningPathItemStatus.IN_PROGRESS;
        firstAvailable.progress = 15;
        firstAvailable.startedAt = new Date().toISOString();
      }
    }

    const completedItems = items.filter(it => it.status === LearningPathItemStatus.COMPLETED).length;
    const inProgressItems = items.filter(it => it.status === LearningPathItemStatus.IN_PROGRESS).length;
    const totalProgress = items.length > 0
      ? Math.round(items.reduce((acc, it) => acc + (it.progress || 0), 0) / items.length)
      : 0;

    const learningPath: LearningPathDTO = {
      id: pathId,
      userId,
      targetRoleId: targetRole.id,
      targetRoleTitle: targetRole.title,
      targetRoleSlug: targetRole.slug,
      title: `${targetRole.title} Personalized Learning Path`,
      description: `Targeted developmental roadmap addressing critical skill gaps and verification objectives for ${targetRole.title}.`,
      status: LearningPathStatus.ACTIVE,
      progress: totalProgress,
      totalItems: items.length,
      completedItems,
      inProgressItems,
      estimatedTotalMinutes: accumulatedMinutes,
      items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };

    // F. Persist to Database or In-Memory
    await this.persistLearningPath(learningPath);

    return learningPath;
  }

  /**
   * Regenerate learning path adaptively while preserving completed and in-progress milestone history
   */
  async regeneratePath(userId: string, pathId: string): Promise<LearningPathDTO> {
    // 1. Fetch current path
    const current = await this.getPathById(userId, pathId);
    if (!current) {
      throw new Error('Learning path not found');
    }

    // 2. Identify already completed and in-progress items to preserve
    const preservedItems = current.items.filter(it =>
      it.status === LearningPathItemStatus.COMPLETED ||
      it.status === LearningPathItemStatus.IN_PROGRESS ||
      it.progress > 0
    );

    // 3. Generate fresh path for the target role
    const freshPath = await this.generatePath(userId, current.targetRoleId);

    // 4. Merge preserved items back in place, maintaining progress history
    const mergedItems: LearningPathItemDTO[] = [];
    const processedSkillIds = new Set<string>();

    for (const pItem of preservedItems) {
      mergedItems.push(pItem);
      processedSkillIds.add(pItem.skillId);
    }

    for (const fItem of freshPath.items) {
      if (!processedSkillIds.has(fItem.skillId)) {
        mergedItems.push(fItem);
        processedSkillIds.add(fItem.skillId);
      }
    }

    // Re-index order
    mergedItems.forEach((it, idx) => {
      it.order = idx + 1;
    });

    const completedItems = mergedItems.filter(it => it.status === LearningPathItemStatus.COMPLETED).length;
    const inProgressItems = mergedItems.filter(it => it.status === LearningPathItemStatus.IN_PROGRESS).length;
    const totalProgress = mergedItems.length > 0
      ? Math.round(mergedItems.reduce((acc, it) => acc + (it.progress || 0), 0) / mergedItems.length)
      : 0;

    freshPath.items = mergedItems;
    freshPath.totalItems = mergedItems.length;
    freshPath.completedItems = completedItems;
    freshPath.inProgressItems = inProgressItems;
    freshPath.progress = totalProgress;
    freshPath.updatedAt = new Date().toISOString();

    await this.persistLearningPath(freshPath);
    return freshPath;
  }

  /**
   * Fetch specific learning path by ID with strict ownership validation
   */
  async getPathById(userId: string, pathId: string): Promise<LearningPathDTO | null> {
    try {
      const dbPath = await prismaClient.learningPath.findFirst({
        where: { id: pathId, userId },
        include: {
          targetRole: true,
          items: {
            include: {
              skill: true,
              resource: true,
            },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (dbPath) {
        return this.formatDatabasePath(dbPath);
      }
    } catch {
      // Offline fallback
    }

    for (const path of IN_MEMORY_PATHS.values()) {
      if (path.id === pathId && path.userId === userId) {
        return path;
      }
    }

    return null;
  }

  /**
   * Mark a learning item as IN_PROGRESS
   */
  async startItem(userId: string, itemId: string): Promise<LearningPathItemDTO> {
    const path = await this.findPathContainingItem(userId, itemId);
    if (!path) throw new Error('Learning path item not found');

    const item = path.items.find(it => it.id === itemId);
    if (!item) throw new Error('Learning item not found');

    if (item.status === LearningPathItemStatus.LOCKED) {
      throw new Error('Cannot start locked learning item: prerequisites are not satisfied');
    }

    item.status = LearningPathItemStatus.IN_PROGRESS;
    item.startedAt = new Date().toISOString();
    if (item.progress === 0) {
      item.progress = 10;
    }
    item.updatedAt = new Date().toISOString();

    path.inProgressItems = path.items.filter(it => it.status === LearningPathItemStatus.IN_PROGRESS).length;
    path.progress = Math.round(path.items.reduce((acc, it) => acc + it.progress, 0) / path.items.length);
    path.updatedAt = new Date().toISOString();

    await this.persistLearningPath(path);
    return item;
  }

  /**
   * Update item progress percentage (0 - 100)
   */
  async updateItemProgress(userId: string, itemId: string, progress: number): Promise<LearningPathItemDTO> {
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    const path = await this.findPathContainingItem(userId, itemId);
    if (!path) throw new Error('Learning path item not found');

    const item = path.items.find(it => it.id === itemId);
    if (!item) throw new Error('Learning item not found');

    item.progress = clamped;
    item.updatedAt = new Date().toISOString();

    if (clamped === 100) {
      return this.completeItem(userId, itemId);
    } else if (clamped > 0 && item.status !== LearningPathItemStatus.IN_PROGRESS) {
      item.status = LearningPathItemStatus.IN_PROGRESS;
      if (!item.startedAt) item.startedAt = new Date().toISOString();
    }

    path.progress = Math.round(path.items.reduce((acc, it) => acc + it.progress, 0) / path.items.length);
    path.updatedAt = new Date().toISOString();

    await this.persistLearningPath(path);
    return item;
  }

  /**
   * Complete item: set progress 100%, unlock downstream locked items whose prerequisites are now met
   */
  async completeItem(userId: string, itemId: string): Promise<LearningPathItemDTO> {
    const path = await this.findPathContainingItem(userId, itemId);
    if (!path) throw new Error('Learning path item not found');

    const item = path.items.find(it => it.id === itemId);
    if (!item) throw new Error('Learning item not found');

    item.status = LearningPathItemStatus.COMPLETED;
    item.progress = 100;
    item.completedAt = new Date().toISOString();
    item.updatedAt = new Date().toISOString();

    // Scan downstream items: unlock any that were waiting on this skill!
    for (const downstream of path.items) {
      if (downstream.status === LearningPathItemStatus.LOCKED) {
        const matchingPrereq = downstream.prerequisites.find(p => p.id === item.skillId || p.name.toLowerCase() === item.skillName.toLowerCase());
        if (matchingPrereq) {
          matchingPrereq.isSatisfied = true;
        }

        // Check if all prerequisites are now satisfied
        const allSatisfied = downstream.prerequisites.every(p => p.isSatisfied);
        if (allSatisfied) {
          downstream.status = LearningPathItemStatus.AVAILABLE;
          downstream.updatedAt = new Date().toISOString();
        }
      }
    }

    path.completedItems = path.items.filter(it => it.status === LearningPathItemStatus.COMPLETED).length;
    path.inProgressItems = path.items.filter(it => it.status === LearningPathItemStatus.IN_PROGRESS).length;
    path.progress = Math.round(path.items.reduce((acc, it) => acc + it.progress, 0) / path.items.length);
    path.updatedAt = new Date().toISOString();

    if (path.completedItems === path.totalItems) {
      path.status = LearningPathStatus.COMPLETED;
      path.completedAt = new Date().toISOString();
    }

    await this.persistLearningPath(path);
    return item;
  }

  /**
   * Mark item as SKIPPED
   */
  async skipItem(userId: string, itemId: string): Promise<LearningPathItemDTO> {
    const path = await this.findPathContainingItem(userId, itemId);
    if (!path) throw new Error('Learning path item not found');

    const item = path.items.find(it => it.id === itemId);
    if (!item) throw new Error('Learning item not found');

    item.status = LearningPathItemStatus.SKIPPED;
    item.updatedAt = new Date().toISOString();

    path.updatedAt = new Date().toISOString();
    await this.persistLearningPath(path);
    return item;
  }

  /**
   * Summary for candidate dashboard integration
   */
  async getDashboardSummary(userId: string): Promise<LearningPathSummaryDTO | null> {
    const path = await this.getOrCreateUserLearningPath(userId);
    if (!path) return null;

    const currentFocusItem = path.items.find(it => it.status === LearningPathItemStatus.IN_PROGRESS) ||
      path.items.find(it => it.status === LearningPathItemStatus.AVAILABLE);

    const nextUpItem = path.items.find(it =>
      it.id !== currentFocusItem?.id &&
      (it.status === LearningPathItemStatus.AVAILABLE || it.status === LearningPathItemStatus.LOCKED)
    );

    const highPriorityGapsCount = path.items.filter(it =>
      it.priority === 'HIGH' && it.status !== LearningPathItemStatus.COMPLETED
    ).length;

    return {
      pathId: path.id,
      targetRoleId: path.targetRoleId,
      targetRoleTitle: path.targetRoleTitle,
      status: path.status,
      progress: path.progress,
      completedItems: path.completedItems,
      totalItems: path.totalItems,
      currentFocus: currentFocusItem ? {
        itemId: currentFocusItem.id,
        skillName: currentFocusItem.skillName,
        title: currentFocusItem.title,
        objective: currentFocusItem.objective,
        progress: currentFocusItem.progress,
      } : null,
      nextUp: nextUpItem ? {
        itemId: nextUpItem.id,
        skillName: nextUpItem.skillName,
        title: nextUpItem.title,
      } : null,
      highPriorityGapsCount,
    };
  }

  /**
   * Helper to find path containing item with strict ownership
   */
  private async findPathContainingItem(userId: string, itemId: string): Promise<LearningPathDTO | null> {
    for (const path of IN_MEMORY_PATHS.values()) {
      if (path.userId === userId && path.items.some(it => it.id === itemId)) {
        return path;
      }
    }

    try {
      const dbItem = await prismaClient.learningPathItem.findUnique({
        where: { id: itemId },
        include: { learningPath: true },
      });

      if (dbItem && dbItem.learningPath.userId === userId) {
        return this.getPathById(userId, dbItem.learningPathId);
      }
    } catch {
      // Offline
    }

    return null;
  }

  /**
   * Persist path either to PostgreSQL or in-memory
   */
  private async persistLearningPath(path: LearningPathDTO): Promise<void> {
    const memKey = `${path.userId}:${path.targetRoleId}`;
    IN_MEMORY_PATHS.set(memKey, path);
    IN_MEMORY_PATHS.set(path.id, path);

    try {
      await prismaClient.learningPath.upsert({
        where: { userId_targetRoleId: { userId: path.userId, targetRoleId: path.targetRoleId } },
        create: {
          id: path.id,
          userId: path.userId,
          targetRoleId: path.targetRoleId,
          title: path.title,
          description: path.description,
          status: path.status as LearningPathStatus,
          progress: path.progress,
          completedAt: path.completedAt ? new Date(path.completedAt) : null,
        },
        update: {
          title: path.title,
          description: path.description,
          status: path.status as LearningPathStatus,
          progress: path.progress,
          completedAt: path.completedAt ? new Date(path.completedAt) : null,
        },
      });

      for (const item of path.items) {
        await prismaClient.learningPathItem.upsert({
          where: { learningPathId_skillId: { learningPathId: path.id, skillId: item.skillId } },
          create: {
            id: item.id,
            learningPathId: path.id,
            skillId: item.skillId,
            resourceId: item.resourceId,
            title: item.title,
            objective: item.objective,
            priority: item.priority,
            order: item.order,
            status: item.status as LearningPathItemStatus,
            progress: item.progress,
            estimatedMinutes: item.estimatedMinutes,
            explanation: item.explanation,
            startedAt: item.startedAt ? new Date(item.startedAt) : null,
            completedAt: item.completedAt ? new Date(item.completedAt) : null,
          },
          update: {
            title: item.title,
            objective: item.objective,
            priority: item.priority,
            order: item.order,
            status: item.status as LearningPathItemStatus,
            progress: item.progress,
            estimatedMinutes: item.estimatedMinutes,
            explanation: item.explanation,
            startedAt: item.startedAt ? new Date(item.startedAt) : null,
            completedAt: item.completedAt ? new Date(item.completedAt) : null,
          },
        });
      }
    } catch {
      // Database is offline; in-memory persistence is active
    }
  }

  private formatDatabasePath(dbPath: any): LearningPathDTO {
    const items: LearningPathItemDTO[] = (dbPath.items || []).map((it: any) => ({
      id: it.id,
      learningPathId: it.learningPathId,
      skillId: it.skillId,
      skillName: it.skill?.name || 'Skill',
      skillSlug: it.skill?.slug || 'skill',
      skillCategory: it.skill?.category || 'PROGRAMMING',
      resourceId: it.resourceId,
      resource: it.resource ? {
        id: it.resource.id,
        title: it.resource.title,
        description: it.resource.description,
        url: it.resource.url,
        provider: it.resource.provider,
        type: it.resource.type,
        skillId: it.resource.skillId,
        difficulty: it.resource.difficulty,
        durationMinutes: it.resource.durationMinutes,
        rating: it.resource.rating,
        qualityScore: it.resource.qualityScore,
        verifiedSource: it.resource.verifiedSource,
      } : null,
      title: it.title,
      objective: it.objective,
      priority: it.priority,
      order: it.order,
      status: it.status,
      progress: it.progress,
      estimatedMinutes: it.estimatedMinutes || 120,
      explanation: Array.isArray(it.explanation) ? it.explanation : [],
      prerequisites: [],
      currentProficiency: 'BEGINNER',
      requiredProficiency: 'INTERMEDIATE',
      confidence: 50,
      startedAt: it.startedAt ? it.startedAt.toISOString() : null,
      completedAt: it.completedAt ? it.completedAt.toISOString() : null,
      createdAt: it.createdAt.toISOString(),
      updatedAt: it.updatedAt.toISOString(),
    }));

    const completedCount = items.filter(it => it.status === 'COMPLETED').length;
    const inProgressCount = items.filter(it => it.status === 'IN_PROGRESS').length;

    return {
      id: dbPath.id,
      userId: dbPath.userId,
      targetRoleId: dbPath.targetRoleId,
      targetRoleTitle: dbPath.targetRole?.title || 'Target Role',
      targetRoleSlug: dbPath.targetRole?.slug || 'target-role',
      title: dbPath.title,
      description: dbPath.description,
      status: dbPath.status,
      progress: dbPath.progress,
      totalItems: items.length,
      completedItems: completedCount,
      inProgressItems: inProgressCount,
      estimatedTotalMinutes: items.reduce((acc, it) => acc + it.estimatedMinutes, 0),
      items,
      createdAt: dbPath.createdAt.toISOString(),
      updatedAt: dbPath.updatedAt.toISOString(),
      completedAt: dbPath.completedAt ? dbPath.completedAt.toISOString() : null,
    };
  }
}

export const personalizedLearningPathService = new PersonalizedLearningPathService();
