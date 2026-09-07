import type {
  SkillConfidenceDTO,
  LearningPathDTO,
  LearningPathItemDTO,
  LearningPathSummaryDTO,
  ResourceRecommendationDTO,
} from '@skillsync/types';

// API client for SkillSync frontend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export enum EvidenceType {
  PROJECT = 'PROJECT',
  CERTIFICATE = 'CERTIFICATE',
  PORTFOLIO_ITEM = 'PORTFOLIO_ITEM',
  EXPERIENCE = 'EXPERIENCE',
  ASSESSMENT_RESULT = 'ASSESSMENT_RESULT',
  OTHER = 'OTHER',
}

export interface User {
  id: string;
  email: string;
  username: string | null;
  status: string;
  role?: string;
  displayName: string | null;
}

export interface AuthResponse {
  user: User;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  isVerified?: boolean;
  demandLevel?: string | null;
}

export interface UserSkill {
  id: string;
  skillId: string;
  proficiencyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  yearsOfExperience: number | null;
  confidence: number | null;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationMethod: string | null;
  lastUsedAt: string | null;
}

export interface SkillIntelligenceItem {
  id?: string;
  skillId?: string;
  skill: Skill;
  userSkill: UserSkill;
  intelligence: {
    score: number;
    level: string;
    evidenceCount: number;
    factors: {
      selfReported: number;
      evidence: Array<{
        type: string;
        weight: number;
        verified: boolean;
      }>;
      proficiencyBaseline: number;
      totalWeight: number;
      evidenceCount: number;
    };
  };
  evidenceCount: number;
  evidenceTypes: string[];
  hasProjectEvidence: boolean;
}

export interface SkillIntelligenceSummary {
  totalSkills: number;
  verifiedSkillsCount?: number;
  skillsByProficiency: Record<string, number>;
  skillsByConfidence: Record<string, number>;
  averageConfidence: number;
  topSkills: SkillIntelligenceItem[];
}

export interface SkillEvidence {
  id: string;
  userSkillId: string;
  skillId: string | null;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  createdAt: string;
  updatedAt: string;
  skill?: {
    id: string;
    name: string;
    slug: string;
    category: string;
  } | null;
}

// Learning types
export type GapStatus = 'KNOWN' | 'PARTIAL' | 'MISSING' | 'FOUNDATION_REQUIRED';

export interface GapItem {
  skill: Skill;
  status: GapStatus;
  userProficiencyLevel?: string;
  userConfidence?: number;
  requiredStrength: number;
  proficiencyGap?: number;
  confidenceContext?: 'HIGH' | 'MEDIUM' | 'LOW';
  priority: number;
  priorityReason: string;
  targetProficiency: string;
}

export interface SkillGapResult {
  targetSkill: Skill;
  readiness: 'READY' | 'PARTIAL' | 'FOUNDATION_REQUIRED';
  prioritizedGaps: GapItem[];
  knownCount: number;
  partialCount: number;
  missingCount: number;
  foundationRequiredCount: number;
}

export type MilestoneStatus = 'KNOWN' | 'PARTIAL' | 'MISSING' | 'FOUNDATION_REQUIRED';

export interface LearningMilestone {
  skill: Skill;
  order: number;
  status: MilestoneStatus;
  targetProficiency: string;
  currentProficiency?: string;
  currentConfidence?: number;
  prerequisiteSkills: Skill[];
  estimatedDifficulty: 'LOW' | 'MEDIUM' | 'HIGH';
  priorityReason: string;
}

export interface LearningPath {
  targetSkill: Skill;
  milestones: LearningMilestone[];
  totalMilestones: number;
  completedMilestones: number;
  estimatedDifficulty: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface LearningPlanResult {
  targetSkill: Skill;
  readiness: 'READY' | 'PARTIAL' | 'FOUNDATION_REQUIRED';
  knownCount: number;
  partialCount: number;
  missingCount: number;
  foundationRequiredCount: number;
  prioritizedGaps: GapItem[];
  learningPath: LearningPath;
  resources: Record<string, LearningResourceSummary[]>;
}

export type LearningResourceType = 'COURSE' | 'BOOK' | 'VIDEO' | 'DOCUMENTATION' | 'ARTICLE' | 'PROJECT' | 'TUTORIAL';
export type ResourceDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface LearningResourceSummary {
  id: string;
  title: string;
  description: string | null;
  url: string;
  provider: string | null;
  type: LearningResourceType;
  difficulty: ResourceDifficulty | null;
  language: string | null;
  durationMinutes: number | null;
  rating: number | null;
  verifiedSource: boolean;
}

export interface LearningResourceFilters {
  skillId?: string;
  type?: LearningResourceType;
  difficulty?: ResourceDifficulty;
  verifiedSource?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LearningResourceListResult {
  resources: LearningResourceSummary[];
  total: number;
}

export interface LearningResourceTypeCount {
  type: LearningResourceType;
  count: number;
}

export interface LearningResourceDifficultyCount {
  difficulty: ResourceDifficulty | null;
  count: number;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Don't set Content-Type for FormData — the browser sets the correct
  // multipart/form-data boundary automatically.
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  let data: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: { message: text || response.statusText || 'Request failed' } };
      }
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const error = data as ErrorResponse | null;
    throw new Error(error?.error?.message || response.statusText || `Request failed with status ${response.status}`);
  }

  return (data ?? {}) as T;
}

export const authApi = {
  register: (data: { email: string; username?: string; password: string; displayName?: string }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  me: () =>
    request<AuthResponse>('/auth/me'),
};

export const skillIntelligenceApi = {
  getSummary: () =>
    request<{ data: SkillIntelligenceSummary }>('/skill-intelligence'),

  getSkills: () =>
    request<{ data: SkillIntelligenceItem[] }>('/skill-intelligence/skills'),

  getSkill: (skillId: string) =>
    request<{ data: SkillIntelligenceItem }>(`/skill-intelligence/skills/${skillId}`),

  addSkill: (data: { skillId: string; proficiencyLevel: string; yearsOfExperience?: number; confidence?: number }) =>
    request<{ data: { id: string; skillId: string; proficiencyLevel: string; yearsOfExperience: number | null; confidence: number; verificationStatus: string } }>('/skill-intelligence/skills', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSkill: (skillId: string, data: { proficiencyLevel?: string; yearsOfExperience?: number; confidence?: number }) =>
    request<{ data: { id: string; skillId: string; proficiencyLevel: string; yearsOfExperience: number | null; confidence: number; verificationStatus: string } }>(`/skill-intelligence/skills/${skillId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  removeSkill: (skillId: string) =>
    request<{ message: string }>(`/skill-intelligence/skills/${skillId}`, {
      method: 'DELETE',
    }),

  getEvidence: (skillId: string) =>
    request<{ data: SkillEvidence[] }>(`/skill-intelligence/skills/${skillId}/evidence`),

  addEvidence: (skillId: string, data: { userSkillId: string; type: string; title: string; description?: string; url?: string; metadata?: Record<string, unknown> }) =>
    request<{ data: SkillEvidence }>(`/skill-intelligence/skills/${skillId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEvidence: (evidenceId: string, data: { title?: string; description?: string; url?: string; metadata?: Record<string, unknown> }) =>
    request<{ data: SkillEvidence }>(`/skill-intelligence/evidence/${evidenceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteEvidence: (evidenceId: string) =>
    request<{ message: string }>(`/skill-intelligence/evidence/${evidenceId}`, {
      method: 'DELETE',
    }),

  getProjectSkills: (projectId: string) =>
    request<{ data: Skill[] }>(`/skill-intelligence/projects/${projectId}/skills`),

  addProjectSkill: (projectId: string, skillId: string) =>
    request<{ data: Skill }>(`/skill-intelligence/projects/${projectId}/skills`, {
      method: 'POST',
      body: JSON.stringify({ skillId }),
    }),

  removeProjectSkill: (projectId: string, skillId: string) =>
    request<{ message: string }>(`/skill-intelligence/projects/${projectId}/skills/${skillId}`, {
      method: 'DELETE',
    }),

  getSkillConfidence: (skillId: string) =>
    request<{ data: SkillConfidenceDTO }>(`/skill-intelligence/skills/${skillId}/confidence`),

  getAllSkillConfidences: () =>
    request<{ data: SkillConfidenceDTO[] }>('/skill-intelligence/skills/confidence'),
};

export const skillGraphApi = {
  getRelationships: (slug: string) =>
    request<{ data: any }>(`/skill-graph/skills/${slug}/relationships`),

  getRelated: (slug: string) =>
    request<{ data: any }>(`/skill-graph/skills/${slug}/related`),

  getPrerequisites: (slug: string) =>
    request<{ data: any }>(`/skill-graph/skills/${slug}/prerequisites`),

  getSubskills: (slug: string) =>
    request<{ data: any }>(`/skill-graph/skills/${slug}/subskills`),

  getSpecializations: (slug: string) =>
    request<{ data: any }>(`/skill-graph/skills/${slug}/specializations`),

  getComplementary: (slug: string) =>
    request<{ data: any }>(`/skill-graph/skills/${slug}/complementary`),

  getGraph: (slug: string, depth?: number) =>
    request<{ data: any }>(`/skill-graph/skills/${slug}/graph${depth ? `?depth=${depth}` : ''}`),

  findPath: (slug: string, targetSlug: string) =>
    request<{ data: any }>(`/skill-graph/skills/${slug}/path?to=${targetSlug}`),

  getGap: (slug: string) =>
    request<{ data: any }>(`/skill-graph/skills/${slug}/gap`),

  listSkills: (params?: { category?: string; search?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    return request<{ data: { skills: any[]; total: number } }>(`/skill-graph/skills?${searchParams.toString()}`);
  },

  getSkill: (slug: string) =>
    request<{ data: any }>(`/skill-graph/skills/${slug}`),
};

export const healthApi = {
  check: () =>
    request<{ status: string; timestamp: string }>('/health'),

  dbCheck: () =>
    request<{ status: string; database: string; timestamp: string }>('/health/db'),
};

export interface ExtractSkillsResponse {
  data: {
    jobId: string;
    skills: Array<{
      originalName: string;
      normalized: {
        skillName: string;
        matched: boolean;
        matchedSkillId?: string;
        matchedSkillName?: string;
        confidence: number;
        reason: string;
      };
      extractionConfidence: number;
      evidence: string;
      reason: string;
    }>;
    tokensUsed?: { input: number; output: number; total: number };
    latencyMs: number;
  };
}

export interface NormalizeSkillResponse {
  data: {
    skillName: string;
    matched: boolean;
    matchedSkillId?: string;
    matchedSkillName?: string;
    confidence: number;
    reason: string;
  };
}

export const aiApi = {
  extractSkills: (data: { text: string; context?: string }) =>
    request<ExtractSkillsResponse>('/ai/skills/extract', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getExtractionJob: (jobId: string) =>
    request<{ data: any }>(`/ai/skills/extract/${jobId}`),

  listExtractionJobs: (limit?: number, offset?: number) =>
    request<{ data: { jobs: any[]; total: number } }>(`/ai/skills/extract?limit=${limit || 20}&offset=${offset || 0}`),

  normalizeSkill: (skillName: string) =>
    request<NormalizeSkillResponse>('/ai/skills/normalize', {
      method: 'POST',
      body: JSON.stringify({ skillName }),
    }),
};

export const resumeApi = {
  analyze: (resumeId: string) =>
    request<{ data: any }>(`/resumes/${resumeId}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ resumeId }),
    }),

  getAnalysis: (resumeId: string) =>
    request<{ data: any }>(`/resumes/${resumeId}/analysis`),

  confirm: (resumeId: string, data?: { acceptedSkills?: string[]; acceptedExperiences?: string[] }) =>
    request<{ message: string; data: { addedSkillsCount: number; addedProjectsCount: number } }>(`/resumes/${resumeId}/confirm`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  upload: (file: File, resumeId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (resumeId) formData.append('resumeId', resumeId);
    return request<{ data: { resumeId: string } }>('/resumes/upload', {
      method: 'POST',
      body: formData,
    });
  },

  list: () =>
    request<{ data: { resumes: any[]; total: number } }>('/resumes'),

  delete: (resumeId: string) =>
    request<{ message: string }>(`/resumes/${resumeId}`, {
      method: 'DELETE',
    }),
};

export const learningApi = {
  // Skill Gap Analysis
  getGap: (skillId: string) =>
    request<{ data: SkillGapResult }>(`/learning/gap/${skillId}`),

  // Learning Path
  getPath: (skillId: string) =>
    request<{ data: { learningPath: LearningPath; gapAnalysis: SkillGapResult; resources: Record<string, LearningResourceSummary[]> } }>(`/learning/path/${skillId}`),

  // Combined Learning Plan
  getPlan: (skillId: string) =>
    request<{ data: LearningPlanResult }>(`/learning/plan/${skillId}`),

  // Learning Resources
  listResources: (filters?: LearningResourceFilters) => {
    const searchParams = new URLSearchParams();
    if (filters?.skillId) searchParams.set('skillId', filters.skillId);
    if (filters?.type) searchParams.set('type', filters.type);
    if (filters?.difficulty) searchParams.set('difficulty', filters.difficulty);
    if (filters?.verifiedSource !== undefined) searchParams.set('verifiedSource', filters.verifiedSource.toString());
    if (filters?.search) searchParams.set('search', filters.search);
    if (filters?.limit) searchParams.set('limit', filters.limit.toString());
    if (filters?.offset) searchParams.set('offset', filters.offset.toString());
    return request<{ data: LearningResourceListResult }>(`/learning/resources?${searchParams.toString()}`);
  },

  getResourceTypes: () =>
    request<{ data: LearningResourceTypeCount[] }>('/learning/resources/types'),

  getResourceDifficulties: () =>
    request<{ data: LearningResourceDifficultyCount[] }>('/learning/resources/difficulties'),

  getResourcesForSkill: (skillId: string, params?: { type?: LearningResourceType; difficulty?: ResourceDifficulty; verifiedOnly?: boolean; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.difficulty) searchParams.set('difficulty', params.difficulty);
    if (params?.verifiedOnly) searchParams.set('verifiedOnly', 'true');
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    return request<{ data: LearningResourceSummary[] }>(`/learning/resources/${skillId}?${searchParams.toString()}`);
  },

  getResource: (resourceId: string) =>
    request<{ data: LearningResourceSummary }>(`/learning/resources/detail/${resourceId}`),

  createResource: (data: { title: string; description?: string; url: string; provider?: string; type: LearningResourceType; skillId: string; difficulty?: ResourceDifficulty; language?: string; durationMinutes?: number; rating?: number; qualityScore?: number; verifiedSource?: boolean }) =>
    request<{ data: LearningResourceSummary }>('/learning/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateResource: (resourceId: string, data: { title?: string; description?: string; url?: string; provider?: string; type?: LearningResourceType; difficulty?: ResourceDifficulty; language?: string; durationMinutes?: number; rating?: number; qualityScore?: number; verifiedSource?: boolean }) =>
    request<{ data: LearningResourceSummary }>(`/learning/resources/${resourceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteResource: (resourceId: string) =>
    request<{ message: string }>(`/learning/resources/${resourceId}`, {
      method: 'DELETE',
    }),
};

export type {
  LearningPathDTO,
  LearningPathItemDTO,
  LearningPathSummaryDTO,
  ResourceRecommendationDTO,
};

export const learningPathApi = {
  getPath: (targetRoleId?: string) =>
    request<{ data: LearningPathDTO }>(targetRoleId ? `/learning/paths?targetRoleId=${targetRoleId}` : '/learning/paths'),

  generatePath: (targetRoleId?: string) =>
    request<{ data: LearningPathDTO }>('/learning/paths', {
      method: 'POST',
      body: JSON.stringify({ targetRoleId }),
    }),

  getPathById: (pathId: string) =>
    request<{ data: LearningPathDTO }>(`/learning/paths/${pathId}`),

  regeneratePath: (pathId: string) =>
    request<{ data: LearningPathDTO }>(`/learning/paths/${pathId}/regenerate`, {
      method: 'POST',
    }),

  startItem: (itemId: string) =>
    request<{ data: LearningPathItemDTO }>(`/learning/items/${itemId}/start`, {
      method: 'POST',
    }),

  updateProgress: (itemId: string, progress: number) =>
    request<{ data: LearningPathItemDTO }>(`/learning/items/${itemId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ progress }),
    }),

  completeItem: (itemId: string) =>
    request<{ data: LearningPathItemDTO }>(`/learning/items/${itemId}/complete`, {
      method: 'POST',
    }),

  skipItem: (itemId: string) =>
    request<{ data: LearningPathItemDTO }>(`/learning/items/${itemId}/skip`, {
      method: 'POST',
    }),

  getDashboardSummary: () =>
    request<{ data: LearningPathSummaryDTO | null }>('/learning/dashboard/summary'),

  getRecommendations: (skillId?: string) =>
    request<{ data: ResourceRecommendationDTO[] }>(skillId ? `/learning/recommendations/${skillId}` : '/learning/recommendations'),
};

export interface TargetRole {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  skillRequirements?: Array<{
    id: string;
    skillId: string;
    requiredProficiency: string;
    isRequired: boolean;
    importanceWeight: number;
    skill: Skill;
  }>;
}

export interface TargetRoleRequirementGap {
  skill: Skill;
  requiredProficiency: string;
  currentProficiency?: string | null;
  userProficiencyLevel?: string | null;
  importanceWeight?: number;
  isRequired: boolean;
  gap?: number;
  proficiencyGap?: number;
  status: 'MATCHED' | 'PARTIAL' | 'MISSING' | 'FOUNDATION_REQUIRED';
  priority?: number;
  priorityReason?: string;
  userConfidence?: number;
}

export interface TargetRoleSkillPriority {
  skill: {
    id: string;
    name: string;
    slug: string;
    category?: string;
  };
  priorityScore: number;
  importanceWeight: number;
  proficiencyGap: number;
  isRequired: boolean;
  reason: string;
  suggestedAction: string;
}

export interface TargetRoleGapSummary {
  totalRequirements: number;
  matchedCount: number;
  partialCount: number;
  missingCount: number;
  mandatoryMissingCount: number;
}

export interface TargetRoleGapResult {
  role: TargetRole;
  readinessScore: number;
  mandatoryReadinessScore: number;
  readinessPercentage: number;
  readinessLevel: 'HIGHLY_READY' | 'MODERATELY_READY' | 'FOUNDATION_REQUIRED';
  matched: TargetRoleRequirementGap[];
  partial: TargetRoleRequirementGap[];
  missing: TargetRoleRequirementGap[];
  optional: TargetRoleRequirementGap[];
  priorities: TargetRoleSkillPriority[];
  summary: TargetRoleGapSummary;
  averageSkillConfidence?: number;
  evidenceBackedSkillsCount?: number;
  matchedCount: number;
  partialCount: number;
  missingCount: number;
  foundationRequiredCount?: number;
  totalRequirementsCount: number;
  requirementGaps: TargetRoleRequirementGap[];
}

export const targetRoleApi = {
  listRoles: () =>
    request<{ data: TargetRole[] }>('/skill-intelligence/roles'),

  getRole: (id: string) =>
    request<{ data: TargetRole }>(`/skill-intelligence/roles/${id}`),

  getRoleGap: (roleId: string) =>
    request<{ data: TargetRoleGapResult }>(`/skill-intelligence/roles/${roleId}/gap`),

  getUserTargetRole: () =>
    request<{ data: { targetRole: TargetRole | null; gap: TargetRoleGapResult | null } }>('/skill-intelligence/target-role'),

  setTargetRole: (roleId: string) =>
    request<{ data: TargetRoleGapResult; role?: TargetRole }>('/skill-intelligence/target-role', {
      method: 'POST',
      body: JSON.stringify({ roleId, targetRoleId: roleId }),
    }),

  setUserTargetRole: (roleId: string) =>
    request<{ data: TargetRoleGapResult; role?: TargetRole }>('/skill-intelligence/target-role', {
      method: 'POST',
      body: JSON.stringify({ roleId, targetRoleId: roleId }),
    }),
};

// ============================================================
// PHASE 6: ASSESSMENT & RESOURCE DISCOVERY API
// ============================================================

export interface AssessmentQuestion {
  id: string;
  questionNumber: number;
  type: string;
  text: string;
  choices?: string[];
  codeSnippet?: string;
  difficulty: string;
  skillArea: string;
}

export interface Assessment {
  id: string;
  userId: string;
  skillId: string;
  skillName: string;
  skillSlug: string;
  learningPathItemId?: string | null;
  type: string;
  status: string;
  title: string;
  description?: string | null;
  timeLimit?: number | null;
  questions: AssessmentQuestion[];
  maxScore: number;
  score?: number | null;
  percentage?: number | null;
  gradedAt?: string | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentResult {
  assessmentId: string;
  skillId: string;
  skillName: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  feedback: {
    questionId: string;
    questionNumber: number;
    isCorrect: boolean;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
  }[];
  confidenceImpact: {
    previousConfidence: number;
    newConfidence: number;
    delta: number;
  };
  pathAdaptation: {
    itemsUnlocked: number;
    masteryAchieved: boolean;
  };
}

export interface ResourceDiscoveryResult {
  resources: LearningResource[];
  totalFound: number;
  skillId: string;
  skillName: string;
  appliedFilters: {
    difficulty?: string;
    type?: string;
    limit: number;
  };
}

export interface LearningResource {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  provider?: string | null;
  type: string;
  skillId: string;
  skillName?: string;
  difficulty?: string | null;
  durationMinutes?: number | null;
  rating?: number | null;
  qualityScore?: number | null;
  verifiedSource?: boolean;
}

export const assessmentApi = {
  createAssessment: (skillId: string, type?: string, learningPathItemId?: string) =>
    request<{ data: Assessment }>('/learning/assessments', {
      method: 'POST',
      body: JSON.stringify({ skillId, type: type || 'QUIZ', learningPathItemId }),
    }),

  listAssessments: () =>
    request<{ data: Assessment[] }>('/learning/assessments'),

  getAssessment: (id: string) =>
    request<{ data: Assessment }>(`/learning/assessments/${id}`),

  startAssessment: (id: string) =>
    request<{ data: Assessment }>(`/learning/assessments/${id}/start`, {
      method: 'POST',
    }),

  submitAssessment: (id: string, answers: Record<string, string>) =>
    request<{ data: AssessmentResult }>(`/learning/assessments/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  getAssessmentResult: (id: string) =>
    request<{ data: AssessmentResult }>(`/learning/assessments/${id}/result`),
};

export const resourceDiscoveryApi = {
  discoverResources: (skillId: string, difficulty?: string, type?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (difficulty) params.append('difficulty', difficulty);
    if (type) params.append('type', type);
    if (limit) params.append('limit', String(limit));
    const qs = params.toString();
    return request<{ data: ResourceDiscoveryResult }>(`/learning/discover/${skillId}${qs ? `?${qs}` : ''}`);
  },

  verifyResource: (resourceId: string) =>
    request<{ data: { verified: boolean; status: string; checkedAt: string } }>(`/learning/resources/${resourceId}/verify`, {
      method: 'POST',
    }),
};

// ============================================================
// PHASE 7: PROJECTS & PORTFOLIO API
// ============================================================

export const projectsApi = {
  listProjects: () =>
    request<{ data: any[] }>('/projects'),

  getProject: (id: string) =>
    request<{ data: any }>(`/projects/${id}`),

  createProject: (input: {
    title: string;
    description: string;
    longDescription?: string;
    source?: string;
    repositoryUrl?: string;
    liveUrl?: string;
    documentationUrl?: string;
    tags?: string[];
    skillSlugs?: string[];
  }) =>
    request<{ data: any }>('/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  analyzeProject: (id: string) =>
    request<{ data: any }>(`/projects/${id}/analyze`, {
      method: 'POST',
    }),

  deleteProject: (id: string) =>
    request<{ data: { success: boolean } }>(`/projects/${id}`, {
      method: 'DELETE',
    }),
};

export const portfolioApi = {
  getPortfolio: () =>
    request<{ data: any }>('/portfolio'),

  getDemonstratedSkills: () =>
    request<{ data: { strongEvidenceSkills: any[]; moderateEvidenceSkills: any[]; totalCount: number } }>('/portfolio/skills'),

  getMissingGaps: () =>
    request<{ data: { missingRoleEvidence: any[]; totalMissingCount: number } }>('/portfolio/gaps'),
};

// ============================================================
// PHASE 8: CAREER READINESS & SIMULATION API
// ============================================================

export const careerReadinessApi = {
  getReadiness: (roleId?: string) => {
    const qs = roleId ? `?roleId=${encodeURIComponent(roleId)}` : '';
    return request<{ data: any }>(`/career-readiness${qs}`);
  },

  compareRoles: () =>
    request<{ data: { userId: string; roles: any[] } }>('/career-readiness/compare'),
};

export const careerSimulationApi = {
  listSimulations: () =>
    request<{ data: any[] }>('/career-simulations'),

  createSimulation: (targetRoleId?: string) =>
    request<{ data: any }>('/career-simulations', {
      method: 'POST',
      body: JSON.stringify({ targetRoleId }),
    }),

  getSimulation: (id: string) =>
    request<{ data: any }>(`/career-simulations/${id}`),

  startSimulation: (id: string) =>
    request<{ data: any }>(`/career-simulations/${id}/start`, {
      method: 'POST',
    }),

  submitSimulation: (id: string, answers: Record<string, string>) =>
    request<{ data: any }>(`/career-simulations/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
};

// ============================================================
// PHASE 9: AI CAREER COACH API
// ============================================================

export const careerCoachApi = {
  getNextAction: (roleId?: string) => {
    const qs = roleId ? `?roleId=${encodeURIComponent(roleId)}` : '';
    return request<{ data: any }>(`/career-coach/next-action${qs}`);
  },

  getRecommendations: (roleId?: string) => {
    const qs = roleId ? `?roleId=${encodeURIComponent(roleId)}` : '';
    return request<{ data: any[] }>(`/career-coach/recommendations${qs}`);
  },

  listSessions: () =>
    request<{ data: any[] }>('/career-coach/sessions'),

  createSession: (targetRoleId?: string, title?: string) =>
    request<{ data: any }>('/career-coach/sessions', {
      method: 'POST',
      body: JSON.stringify({ targetRoleId, title }),
    }),

  getSession: (id: string) =>
    request<{ data: any }>(`/career-coach/sessions/${id}`),

  sendMessage: (sessionId: string, message: string) =>
    request<{ data: any }>(`/career-coach/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};

// ============================================================
// PHASE 10: ORGANIZATION & COLLEGE INTELLIGENCE API
// ============================================================

export const organizationApi = {
  list: () => request<{ data: any[] }>('/organizations'),
  get: (id: string) => request<{ data: any }>(`/organizations/${id}`),
  create: (body: any) =>
    request<{ data: any }>('/organizations', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getAnalytics: (id: string) => request<{ data: any }>(`/organizations/${id}/analytics`),
  listMembers: (id: string) => request<{ data: any[] }>(`/organizations/${id}/members`),
  inviteMember: (id: string, body: any) =>
    request<{ data: any }>(`/organizations/${id}/invitations`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listCohorts: (id: string) => request<{ data: any[] }>(`/organizations/${id}/cohorts`),
  createCohort: (id: string, body: any) =>
    request<{ data: any }>(`/organizations/${id}/cohorts`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ============================================================
// PHASE 11: OPPORTUNITY & PLACEMENT INTELLIGENCE API
// ============================================================

export const opportunityApi = {
  list: (params?: { type?: string; location?: string; isRemote?: boolean }) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return request<{ data: any[] }>(`/opportunities${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<{ data: any }>(`/opportunities/${id}`),
  create: (body: any) =>
    request<{ data: any }>('/opportunities', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getCandidates: (id: string) => request<{ data: any[] }>(`/opportunities/${id}/candidates`),
  apply: (id: string, body?: { resumeId?: string; coverLetter?: string }) =>
    request<{ data: any }>(`/opportunities/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify(body || {}),
    }),
  listApplications: () => request<{ data: any[] }>('/applications'),
  updateApplicationStatus: (id: string, status: string, notes?: string) =>
    request<{ data: any }>(`/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),
};

// ============================================================
// PHASE 12: ADMIN, OBSERVABILITY & AUDIT API
// ============================================================

export const adminApi = {
  getAnalytics: () => request<{ data: any }>('/admin/analytics'),
  getAuditLogs: (params?: { organizationId?: string; limit?: number }) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return request<{ data: any[] }>(`/admin/audit-logs${qs ? `?${qs}` : ''}`);
  },
  getAIObservability: (params?: { provider?: string; limit?: number }) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return request<{ data: any[] }>(`/admin/ai-observability${qs ? `?${qs}` : ''}`);
  },
};

// ============================================================
// PHASE 15: BILLING & ENTITLEMENT API
// ============================================================

export const billingApi = {
  getPlans: () => request<{ data: any[] }>('/billing/plans'),
  getProductionReadiness: () => request<{ data: any }>('/billing/production-readiness'),
  getSubscription: () => request<{ data: any }>('/billing/subscription'),
  getUsage: () => request<{ data: any }>('/billing/usage'),
  upgradePlan: (planCode: string) =>
    request<{ data: any }>('/billing/upgrade', {
      method: 'POST',
      body: JSON.stringify({ planCode }),
    }),
};