// Learning Resource Service
// Manages learning resources associated with skills

import prismaClient from '../../lib/prisma';
import { LearningResourceType, ResourceDifficulty } from '@prisma/client';

export interface CreateResourceInput {
  title: string;
  description?: string;
  url: string;
  provider?: string;
  type: LearningResourceType;
  skillId: string;
  difficulty?: ResourceDifficulty;
  language?: string;
  durationMinutes?: number;
  rating?: number;
  qualityScore?: number;
  verifiedSource?: boolean;
}

export interface UpdateResourceInput {
  title?: string;
  description?: string;
  url?: string;
  provider?: string;
  type?: LearningResourceType;
  difficulty?: ResourceDifficulty;
  language?: string;
  durationMinutes?: number;
  rating?: number;
  qualityScore?: number;
  verifiedSource?: boolean;
}

export interface ResourceWithSkill {
  id: string;
  title: string;
  description: string | null;
  url: string;
  provider: string | null;
  type: LearningResourceType;
  skillId: string;
  difficulty: ResourceDifficulty | null;
  language: string | null;
  durationMinutes: number | null;
  rating: number | null;
  qualityScore: number | null;
  verifiedSource: boolean;
  lastCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  skill: {
    id: string;
    name: string;
    slug: string;
    category: string;
  } | null;
}

export interface ResourceFilters {
  skillId?: string;
  type?: LearningResourceType;
  difficulty?: ResourceDifficulty;
  verifiedSource?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export class LearningResourceService {
  async create(input: CreateResourceInput): Promise<ResourceWithSkill> {
    const skill = await prismaClient.skill.findUnique({
      where: { id: input.skillId },
      select: { id: true, name: true, slug: true, category: true },
    });

    if (!skill) {
      throw new Error('Skill not found');
    }

    const resource = await prismaClient.learningResource.create({
      data: {
        title: input.title,
        description: input.description,
        url: input.url,
        provider: input.provider,
        type: input.type,
        skillId: input.skillId,
        difficulty: input.difficulty,
        language: input.language ?? 'en',
        durationMinutes: input.durationMinutes,
        rating: input.rating,
        qualityScore: input.qualityScore,
        verifiedSource: input.verifiedSource ?? false,
      },
      include: {
        skill: {
          select: { id: true, name: true, slug: true, category: true },
        },
      },
    });

    return this.formatResource(resource);
  }

  async getById(id: string): Promise<ResourceWithSkill | null> {
    const resource = await prismaClient.learningResource.findUnique({
      where: { id },
      include: {
        skill: {
          select: { id: true, name: true, slug: true, category: true },
        },
      },
    });

    return resource ? this.formatResource(resource) : null;
  }

  async getBySkillId(skillId: string, filters?: { type?: LearningResourceType; difficulty?: ResourceDifficulty; verifiedOnly?: boolean; limit?: number }): Promise<ResourceWithSkill[]> {
    const where: any = {
      skillId,
      deletedAt: null,
    };

    if (filters?.type) where.type = filters.type;
    if (filters?.difficulty) where.difficulty = filters.difficulty;
    if (filters?.verifiedOnly) where.verifiedSource = true;

    const resources = await prismaClient.learningResource.findMany({
      where,
      include: {
        skill: {
          select: { id: true, name: true, slug: true, category: true },
        },
      },
      orderBy: [
        { verifiedSource: 'desc' },
        { qualityScore: 'desc' },
        { rating: 'desc' },
        { createdAt: 'asc' },
      ],
      take: filters?.limit ?? 20,
    });

    return resources.map(this.formatResource);
  }

  async list(filters: ResourceFilters = {}): Promise<{ resources: ResourceWithSkill[]; total: number }> {
    const where: any = { deletedAt: null };

    if (filters.skillId) where.skillId = filters.skillId;
    if (filters.type) where.type = filters.type;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.verifiedSource !== undefined) where.verifiedSource = filters.verifiedSource;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { provider: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [resources, total] = await Promise.all([
      prismaClient.learningResource.findMany({
        where,
        include: {
          skill: {
            select: { id: true, name: true, slug: true, category: true },
          },
        },
        orderBy: [
          { verifiedSource: 'desc' },
          { qualityScore: 'desc' },
          { rating: 'desc' },
          { createdAt: 'desc' },
        ],
        take: filters.limit ?? 20,
        skip: filters.offset ?? 0,
      }),
      prismaClient.learningResource.count({ where }),
    ]);

    return {
      resources: resources.map(this.formatResource),
      total,
    };
  }

  async update(id: string, input: UpdateResourceInput): Promise<ResourceWithSkill> {
    const resource = await prismaClient.learningResource.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        url: input.url,
        provider: input.provider,
        type: input.type,
        difficulty: input.difficulty,
        language: input.language,
        durationMinutes: input.durationMinutes,
        rating: input.rating,
        qualityScore: input.qualityScore,
        verifiedSource: input.verifiedSource,
        lastCheckedAt: new Date(),
      },
      include: {
        skill: {
          select: { id: true, name: true, slug: true, category: true },
        },
      },
    });

    return this.formatResource(resource);
  }

  async delete(id: string): Promise<void> {
    await prismaClient.learningResource.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getResourceTypes(): Promise<{ type: LearningResourceType; count: number }[]> {
    const results = await prismaClient.learningResource.groupBy({
      by: ['type'],
      where: { deletedAt: null },
      _count: { type: true },
    });

    return results.map((r: { type: LearningResourceType; _count: { type: number } }) => ({ type: r.type, count: r._count.type }));
  }

  async getResourceDifficulties(): Promise<{ difficulty: ResourceDifficulty | null; count: number }[]> {
    const results = await prismaClient.learningResource.groupBy({
      by: ['difficulty'],
      where: { deletedAt: null },
      _count: { difficulty: true },
    });

    return results.map((r: { difficulty: ResourceDifficulty | null; _count: { difficulty: number } }) => ({ difficulty: r.difficulty, count: r._count.difficulty }));
  }

  /**
   * Deterministic resource ranking engine for a specific skill gap
   * Formula: Score = S_rel * W_diff * W_prereq * Q * F
   */
  async rankResourcesForSkillGap(
    skillId: string,
    skillSlug: string,
    targetProficiency: string,
    currentProficiency = 'BEGINNER',
    prerequisitesSatisfied = true,
    limit = 5
  ): Promise<import('@skillsync/types').ResourceRecommendationDTO[]> {
    const slug = (skillSlug || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // 1. Fetch from database or fallback to curated catalog
    let candidates: ResourceWithSkill[] = [];
    try {
      candidates = await this.getBySkillId(skillId, { limit: 20 });
    } catch {
      // Database query failed or deferred
      candidates = [];
    }

    if (candidates.length === 0) {
      candidates = this.getCuratedResourcesForSlug(slug, skillId);
    }

    if (candidates.length === 0) {
      // Fallback generic high-quality documentation for any skill
      candidates = [
        {
          id: `res_doc_${slug}`,
          title: `${skillSlug.toUpperCase()} Official Documentation & Implementation Guide`,
          description: `Comprehensive reference manual, API specifications, tutorials, and best practices for ${skillSlug}.`,
          url: `https://www.google.com/search?q=${encodeURIComponent(skillSlug + ' documentation')}`,
          provider: 'Official Documentation',
          type: LearningResourceType.DOCUMENTATION,
          skillId,
          difficulty: (targetProficiency as ResourceDifficulty) || ResourceDifficulty.INTERMEDIATE,
          language: 'en',
          durationMinutes: 180,
          rating: 4.8,
          qualityScore: 0.95,
          verifiedSource: true,
          lastCheckedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          skill: { id: skillId, name: skillSlug, slug, category: 'PROGRAMMING' },
        },
      ];
    }

    // 2. Score and rank candidates deterministically
    const scored = candidates.map((res) => {
      const evaluation = this.calculateResourceScore(
        res,
        slug,
        targetProficiency,
        currentProficiency,
        prerequisitesSatisfied
      );

      const dto: import('@skillsync/types').LearningResourceDTO = {
        id: res.id,
        title: res.title,
        description: res.description,
        url: res.url,
        provider: res.provider,
        type: res.type,
        skillId: res.skillId,
        skillName: res.skill?.name || skillSlug,
        difficulty: res.difficulty,
        language: res.language,
        durationMinutes: res.durationMinutes,
        rating: res.rating,
        qualityScore: res.qualityScore,
        verifiedSource: res.verifiedSource,
      };

      return {
        resource: dto,
        score: evaluation.score,
        relevanceScore: evaluation.relevanceScore,
        difficultyFit: evaluation.difficultyFit,
        qualityFactor: evaluation.qualityFactor,
        explanation: evaluation.explanation,
      };
    });

    // 3. Sort deterministically descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  }

  /**
   * Deterministic scoring calculation
   */
  calculateResourceScore(
    resource: ResourceWithSkill,
    targetSlug: string,
    targetProficiency: string,
    currentProficiency: string,
    prerequisitesSatisfied: boolean
  ) {
    const resSlug = (resource.skill?.slug || '').toLowerCase();
    const relevanceScore = resSlug === targetSlug ? 1.0 : 0.8;

    const diffRank: Record<string, number> = {
      BEGINNER: 1,
      INTERMEDIATE: 2,
      ADVANCED: 3,
      EXPERT: 4,
    };

    const targetRank = diffRank[targetProficiency.toUpperCase()] || 2;
    const resRank = resource.difficulty ? diffRank[resource.difficulty] || 2 : 2;

    let difficultyFit = 0.85;
    if (resRank === targetRank) {
      difficultyFit = 1.0;
    } else if (resRank === targetRank - 1) {
      difficultyFit = 0.9;
    } else if (resRank > targetRank) {
      difficultyFit = 0.75;
    } else {
      difficultyFit = 0.6;
    }

    const prereqFactor = prerequisitesSatisfied ? 1.0 : 0.75;
    const qualityFactor = Math.min(1.0, (resource.qualityScore ?? 0.85) * (resource.verifiedSource ? 1.15 : 1.0));

    const score = Math.min(100, Math.max(0, Math.round(relevanceScore * difficultyFit * prereqFactor * qualityFactor * 100)));

    const explanation: string[] = [];
    if (relevanceScore === 1.0) {
      explanation.push(`Directly targets required skill: ${resource.skill?.name || targetSlug}`);
    }
    if (resRank === targetRank) {
      explanation.push(`Matches target proficiency level: ${targetProficiency}`);
    } else if (resRank === targetRank - 1) {
      explanation.push(`Bridges foundational knowledge towards ${targetProficiency}`);
    }
    if (resource.verifiedSource) {
      explanation.push(`Verified curated resource from ${resource.provider || 'official source'}`);
    }
    if (resource.rating && resource.rating >= 4.7) {
      explanation.push(`High user satisfaction rating (${resource.rating} / 5.0)`);
    }
    if (prerequisitesSatisfied) {
      explanation.push('Prerequisites are satisfied');
    } else {
      explanation.push('Has pending foundational prerequisites');
    }

    return {
      score,
      relevanceScore,
      difficultyFit,
      qualityFactor,
      explanation,
    };
  }

  /**
   * Curated high-reputation resources for core tech skills
   */
  private getCuratedResourcesForSlug(slug: string, skillId: string): ResourceWithSkill[] {
    const catalog: Record<string, Partial<ResourceWithSkill>[]> = {
      docker: [
        {
          id: 'res_cur_docker_1',
          title: 'Docker Getting Started & Container Foundations',
          description: 'Official Docker tutorial covering image builds, container lifecycles, and volume bindings.',
          url: 'https://docs.docker.com/get-started/',
          provider: 'Docker Official',
          type: LearningResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.BEGINNER,
          durationMinutes: 90,
          rating: 4.8,
          qualityScore: 0.95,
          verifiedSource: true,
        },
        {
          id: 'res_cur_docker_2',
          title: 'Production Multi-Stage Dockerfiles & Compose',
          description: 'Advanced patterns for lean production images, build caching, and multi-service orchestration.',
          url: 'https://docs.docker.com/build/building/multi-stage/',
          provider: 'Docker Documentation',
          type: LearningResourceType.TUTORIAL,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          durationMinutes: 150,
          rating: 4.9,
          qualityScore: 0.98,
          verifiedSource: true,
        },
      ],
      kubernetes: [
        {
          id: 'res_cur_k8s_1',
          title: 'Kubernetes Workload Concepts: Pods, Deployments & Services',
          description: 'Learn the architectural building blocks of Kubernetes cluster management and networking.',
          url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/',
          provider: 'CNCF / Linux Foundation',
          type: LearningResourceType.TUTORIAL,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          durationMinutes: 180,
          rating: 4.9,
          qualityScore: 0.97,
          verifiedSource: true,
        },
        {
          id: 'res_cur_k8s_2',
          title: 'Production Kubernetes Microservice Architecture with Helm',
          description: 'Enterprise deployment strategies, Helm chart packaging, ingress configuration, and rolling updates.',
          url: 'https://kubernetes.io/docs/concepts/workloads/',
          provider: 'Kubernetes Core',
          type: LearningResourceType.COURSE,
          difficulty: ResourceDifficulty.ADVANCED,
          durationMinutes: 240,
          rating: 4.9,
          qualityScore: 0.99,
          verifiedSource: true,
        },
      ],
      'machine-learning': [
        {
          id: 'res_cur_ml_1',
          title: 'Supervised Learning & Model Validation with Scikit-Learn',
          description: 'Official tutorial on regression, classification, cross-validation, and hyperparameter tuning.',
          url: 'https://scikit-learn.org/stable/tutorial/index.html',
          provider: 'Scikit-Learn Docs',
          type: LearningResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          durationMinutes: 180,
          rating: 4.9,
          qualityScore: 0.96,
          verifiedSource: true,
        },
        {
          id: 'res_cur_ml_2',
          title: 'Ensemble Learning & Gradient Boosted Decision Trees',
          description: 'Production patterns for XGBoost, LightGBM, and feature importance analysis.',
          url: 'https://scikit-learn.org/stable/modules/ensemble.html',
          provider: 'Scikit-Learn & Kaggle',
          type: LearningResourceType.COURSE,
          difficulty: ResourceDifficulty.ADVANCED,
          durationMinutes: 240,
          rating: 4.8,
          qualityScore: 0.97,
          verifiedSource: true,
        },
      ],
      'deep-learning': [
        {
          id: 'res_cur_dl_1',
          title: 'Deep Learning with PyTorch: A 60 Minute Blitz',
          description: 'Fundamental neural network modeling, autograd tensor computation, and training loops in PyTorch.',
          url: 'https://pytorch.org/tutorials/beginner/deep_learning_60min_blitz.html',
          provider: 'PyTorch Official',
          type: LearningResourceType.TUTORIAL,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          durationMinutes: 120,
          rating: 4.9,
          qualityScore: 0.98,
          verifiedSource: true,
        },
        {
          id: 'res_cur_dl_2',
          title: 'Transformers, Attention & Large Model Architectures',
          description: 'Implementing transformer blocks, multi-head attention, and fine-tuning pretrained foundations.',
          url: 'https://huggingface.co/docs/transformers/index',
          provider: 'Hugging Face & PyTorch',
          type: LearningResourceType.PROJECT,
          difficulty: ResourceDifficulty.ADVANCED,
          durationMinutes: 300,
          rating: 5.0,
          qualityScore: 0.99,
          verifiedSource: true,
        },
      ],
      mlops: [
        {
          id: 'res_cur_mlops_1',
          title: 'MLflow Experiment Tracking & Production Model Registry',
          description: 'Automate model lifecycle tracking, parameters, metrics logging, and staging-to-production transitions.',
          url: 'https://mlflow.org/docs/latest/tracking.html',
          provider: 'MLflow Open Source',
          type: LearningResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          durationMinutes: 150,
          rating: 4.8,
          qualityScore: 0.96,
          verifiedSource: true,
        },
        {
          id: 'res_cur_mlops_2',
          title: 'Full Stack MLOps: Automated Training & Low-Latency Serving',
          description: 'Deploy real-time inference pipelines, monitor data drift, and establish continuous machine learning.',
          url: 'https://fullstackdeeplearning.com/course/',
          provider: 'Full Stack Deep Learning',
          type: LearningResourceType.COURSE,
          difficulty: ResourceDifficulty.ADVANCED,
          durationMinutes: 240,
          rating: 4.9,
          qualityScore: 0.98,
          verifiedSource: true,
        },
      ],
      python: [
        {
          id: 'res_cur_py_1',
          title: 'The Python Tutorial: Idiomatic Syntax & Core Data Structures',
          description: 'Official comprehensive reference for modern Python language features and stdlib modules.',
          url: 'https://docs.python.org/3/tutorial/',
          provider: 'Python Software Foundation',
          type: LearningResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.BEGINNER,
          durationMinutes: 120,
          rating: 4.9,
          qualityScore: 0.98,
          verifiedSource: true,
        },
        {
          id: 'res_cur_py_2',
          title: 'Asynchronous Python & Asyncio Microservice Architecture',
          description: 'Master async/await, event loops, tasks, concurrency primitives, and async network IO.',
          url: 'https://docs.python.org/3/library/asyncio.html',
          provider: 'Python Software Foundation',
          type: LearningResourceType.COURSE,
          difficulty: ResourceDifficulty.ADVANCED,
          durationMinutes: 200,
          rating: 4.8,
          qualityScore: 0.97,
          verifiedSource: true,
        },
      ],
      typescript: [
        {
          id: 'res_cur_ts_1',
          title: 'The TypeScript Handbook: Core Types & Generics',
          description: 'Official handbook covering unions, interfaces, generic functions, and compiler configurations.',
          url: 'https://www.typescriptlang.org/docs/handbook/',
          provider: 'Microsoft TypeScript',
          type: LearningResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          durationMinutes: 150,
          rating: 4.9,
          qualityScore: 0.98,
          verifiedSource: true,
        },
        {
          id: 'res_cur_ts_2',
          title: 'Advanced Type-Level Programming & Conditional Types',
          description: 'Master mapped types, template literals, type inference with infer, and type challenges.',
          url: 'https://www.totaltypescript.com/tutorials',
          provider: 'Total TypeScript',
          type: LearningResourceType.COURSE,
          difficulty: ResourceDifficulty.ADVANCED,
          durationMinutes: 240,
          rating: 5.0,
          qualityScore: 0.99,
          verifiedSource: true,
        },
      ],
      react: [
        {
          id: 'res_cur_react_1',
          title: 'Thinking in React & State Architecture',
          description: 'Official interactive documentation on hooks, component composition, and state flow.',
          url: 'https://react.dev/learn',
          provider: 'React Core Team',
          type: LearningResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          durationMinutes: 180,
          rating: 4.9,
          qualityScore: 0.99,
          verifiedSource: true,
        },
      ],
      postgresql: [
        {
          id: 'res_cur_pg_1',
          title: 'PostgreSQL Tutorial & Relational Database Architecture',
          description: 'Learn relational queries, foreign keys, transaction isolation, and schema normalization.',
          url: 'https://www.postgresql.org/docs/current/tutorial.html',
          provider: 'PostgreSQL Core',
          type: LearningResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          durationMinutes: 150,
          rating: 4.8,
          qualityScore: 0.96,
          verifiedSource: true,
        },
      ],
      'ci-cd': [
        {
          id: 'res_cur_cicd_1',
          title: 'GitHub Actions: Automated CI/CD Workflows',
          description: 'Build automated test, lint, and container deployment pipelines with GitHub Actions.',
          url: 'https://docs.github.com/en/actions',
          provider: 'GitHub Documentation',
          type: LearningResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          durationMinutes: 120,
          rating: 4.8,
          qualityScore: 0.96,
          verifiedSource: true,
        },
      ],
    };

    const matches = catalog[slug] || [];
    return matches.map((m) => ({
      id: m.id || `res_${slug}_${Math.random().toString(36).slice(2, 7)}`,
      title: m.title || `${slug} Learning Resource`,
      description: m.description || null,
      url: m.url || `https://docs.skillsync.local/${slug}`,
      provider: m.provider || 'Curated Resource',
      type: m.type || LearningResourceType.DOCUMENTATION,
      skillId,
      difficulty: m.difficulty || ResourceDifficulty.INTERMEDIATE,
      language: 'en',
      durationMinutes: m.durationMinutes || 120,
      rating: m.rating || 4.8,
      qualityScore: m.qualityScore || 0.95,
      verifiedSource: m.verifiedSource ?? true,
      lastCheckedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      skill: { id: skillId, name: slug, slug, category: 'PROGRAMMING' },
    }));
  }

  private formatResource(resource: any): ResourceWithSkill {
    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      url: resource.url,
      provider: resource.provider,
      type: resource.type,
      skillId: resource.skillId,
      difficulty: resource.difficulty,
      language: resource.language,
      durationMinutes: resource.durationMinutes,
      rating: resource.rating,
      qualityScore: resource.qualityScore,
      verifiedSource: resource.verifiedSource,
      lastCheckedAt: resource.lastCheckedAt,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
      skill: resource.skill
        ? {
            id: resource.skill.id,
            name: resource.skill.name,
            slug: resource.skill.slug,
            category: resource.skill.category,
          }
        : null,
    };
  }
}

export const learningResourceService = new LearningResourceService();