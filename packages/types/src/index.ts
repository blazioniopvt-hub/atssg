import { z } from 'zod';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  email: string;
  username?: string;
  passwordHash?: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: Date;
  deletedAt?: Date;
  defaultOrgId?: string;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FACULTY = 'FACULTY',
  PLACEMENT_OFFICER = 'PLACEMENT_OFFICER',
  STUDENT = 'STUDENT',
  RECRUITER = 'RECRUITER',
  ALUMNI = 'ALUMNI',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export interface Profile extends BaseEntity {
  userId: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  headline?: string;
  location?: string;
  profileImageUrl?: string;
  websiteUrl?: string;
  visibility: ProfileVisibility;
}

export enum ProfileVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  CONNECTIONS_ONLY = 'CONNECTIONS_ONLY',
}

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  type: OrganizationType;
  status: OrganizationStatus;
  size?: OrganizationSize;
  industry?: string;
  headquarters?: string;
  deletedAt?: Date;
}

export enum OrganizationType {
  COMPANY = 'COMPANY',
  EDUCATIONAL = 'EDUCATIONAL',
  NON_PROFIT = 'NON_PROFIT',
  GOVERNMENT = 'GOVERNMENT',
  COMMUNITY = 'COMMUNITY',
  OTHER = 'OTHER',
}

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum OrganizationSize {
  STARTUP = 'STARTUP',
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  ENTERPRISE = 'ENTERPRISE',
}

export interface UserOrganization extends BaseEntity {
  userId: string;
  organizationId: string;
  role: OrgUserRole;
  joinedAt: Date;
}

export enum OrgUserRole {
  ORG_ADMIN = 'ORG_ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  CAREER_ADMIN = 'CAREER_ADMIN',
  FACULTY = 'FACULTY',
  MENTOR = 'MENTOR',
  RECRUITER = 'RECRUITER',
  CANDIDATE = 'CANDIDATE',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

export enum PlanCode {
  FREE = 'FREE',
  PRO = 'PRO',
  ORGANIZATION = 'ORGANIZATION',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIALING = 'TRIALING',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE',
}

export interface Skill extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  category: SkillCategory;
  subcategory?: string;
  iconUrl?: string;
  isVerified: boolean;
  demandLevel: DemandLevel;
  organizationId?: string;
  deletedAt?: Date;
}

export enum SkillCategory {
  PROGRAMMING = 'PROGRAMMING',
  DATA_SCIENCE = 'DATA_SCIENCE',
  DESIGN = 'DESIGN',
  MARKETING = 'MARKETING',
  PRODUCT = 'PRODUCT',
  MANAGEMENT = 'MANAGEMENT',
  SALES = 'SALES',
  OPERATIONS = 'OPERATIONS',
  FINANCE = 'FINANCE',
  HR = 'HR',
  LEGAL = 'LEGAL',
  OTHER = 'OTHER',
}

export enum DemandLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface SkillAlias extends BaseEntity {
  skillId: string;
  alias: string;
  normalizedAlias: string;
}

export interface UserSkill extends BaseEntity {
  userId: string;
  skillId: string;
  proficiencyLevel: ProficiencyLevel;
  yearsOfExperience?: number;
  confidence?: number;
  verificationStatus: VerificationStatus;
  verificationMethod?: VerificationMethod;
  verifiedAt?: Date;
  verifiedBy?: string;
  lastUsedAt?: Date;
}

export enum ProficiencyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum VerificationMethod {
  SELF_REPORTED = 'SELF_REPORTED',
  PEER_ENDORSED = 'PEER_ENDORSED',
  CERTIFICATION = 'CERTIFICATION',
  PROJECT_DEMONSTRATED = 'PROJECT_DEMONSTRATED',
  ASSESSMENT_PASSED = 'ASSESSMENT_PASSED',
  EMPLOYER_VERIFIED = 'EMPLOYER_VERIFIED',
}

export enum EvidenceType {
  PROJECT = 'PROJECT',
  CERTIFICATE = 'CERTIFICATE',
  PORTFOLIO_ITEM = 'PORTFOLIO_ITEM',
  WORK_EXPERIENCE = 'WORK_EXPERIENCE',
  ASSESSMENT_RESULT = 'ASSESSMENT_RESULT',
  WORK_SAMPLE = 'WORK_SAMPLE',
  SIMULATION_PERFORMANCE = 'SIMULATION_PERFORMANCE',
  SELF_REPORTED = 'SELF_REPORTED',
  OTHER = 'OTHER',
}

export interface SkillEvidence extends BaseEntity {
  userSkillId: string;
  skillId?: string;
  type: EvidenceType;
  title: string;
  description?: string;
  url?: string;
  metadata?: Record<string, unknown>;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export enum SkillRelationshipType {
  PREREQUISITE = 'PREREQUISITE',
  RELATED = 'RELATED',
  SUBSKILL = 'SUBSKILL',
  SPECIALIZATION = 'SPECIALIZATION',
  COMPLEMENTARY = 'COMPLEMENTARY',
}

export interface SkillRelationship extends BaseEntity {
  sourceSkillId: string;
  targetSkillId: string;
  type: SkillRelationshipType;
  strength: number;
}

export interface SkillRelationshipWithSkills extends SkillRelationship {
  sourceSkill: Skill;
  targetSkill: Skill;
}

export interface SkillGraphNode {
  id: string;
  name: string;
  slug: string;
  category: string;
  subcategory: string | null;
}

export interface SkillGraphEdge {
  source: string;
  target: string;
  type: SkillRelationshipType;
  strength: number;
}

export interface SkillGraph {
  nodes: SkillGraphNode[];
  edges: SkillGraphEdge[];
}

export interface SkillRelationshipDTO {
  skill: SkillGraphNode;
  type: SkillRelationshipType;
  strength: number;
}

export interface SkillRelationshipsResponse {
  skill: SkillGraphNode;
  relationships: SkillRelationshipDTO[];
}

export interface SkillPathResponse {
  source: SkillGraphNode;
  target: SkillGraphNode;
  path: SkillGraphNode[];
  edges: SkillGraphEdge[];
  distance: number;
}

export interface SkillGapItem {
  skill: SkillGraphNode;
  status: 'KNOWN' | 'MISSING' | 'PARTIAL';
  userProficiencyLevel?: string;
  userConfidence?: number;
  requiredStrength?: number;
}

export interface SkillGapAnalysis {
  targetSkill: SkillGraphNode;
  prerequisites: SkillGapItem[];
  userKnownSkills: SkillGapItem[];
  missingPrerequisites: SkillGapItem[];
}

export interface SkillIntelligenceItem {
  skill: {
    id: string;
    name: string;
    slug: string;
    category: string;
    subcategory: string | null;
  };
  userSkill: {
    id: string;
    proficiencyLevel: ProficiencyLevel;
    yearsOfExperience: number | null;
    confidence: number | null;
    verificationStatus: VerificationStatus;
    verificationMethod: string | null;
    lastUsedAt: Date | null;
  };
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
  skillsByProficiency: Record<string, number>;
  skillsByConfidence: Record<string, number>;
  averageConfidence: number;
  topSkills: SkillIntelligenceItem[];
}

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

export interface CreateUserSkillInput {
  skillId: string;
  proficiencyLevel: ProficiencyLevel;
  yearsOfExperience?: number;
  confidence?: number;
}

export interface UpdateUserSkillInput {
  proficiencyLevel?: ProficiencyLevel;
  yearsOfExperience?: number;
  confidence?: number;
}

export interface Project extends BaseEntity {
  ownerId: string;
  title: string;
  slug: string;
  description: string;
  longDescription?: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  repositoryUrl?: string;
  liveUrl?: string;
  documentationUrl?: string;
  thumbnailUrl?: string;
  startDate?: Date;
  endDate?: Date;
  deletedAt?: Date;
  organizationId?: string;
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
  CANCELLED = 'CANCELLED',
}

export enum ProjectVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  TEAM = 'TEAM',
  ORGANIZATION = 'ORGANIZATION',
}

export interface ProjectSkill extends BaseEntity {
  projectId: string;
  skillId: string;
}

export interface ProjectMember extends BaseEntity {
  userId: string;
  projectId: string;
  role: ProjectRole;
  joinedAt: Date;
}

export enum ProjectRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export interface Team extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  organizationId?: string;
  avatarUrl?: string;
  isPublic: boolean;
}

export interface TeamMember extends BaseEntity {
  userId: string;
  teamId: string;
  role: TeamRole;
  joinedAt: Date;
}

export enum TeamRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export interface Opportunity extends BaseEntity {
  organizationId?: string;
  title: string;
  description: string;
  type: OpportunityType;
  status: OpportunityStatus;
  location?: string;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  applicationDeadline?: Date;
  requirements?: Record<string, unknown>;
  benefits?: Record<string, unknown>;
  deletedAt?: Date;
}

export enum OpportunityType {
  JOB = 'JOB',
  INTERNSHIP = 'INTERNSHIP',
  FREELANCE = 'FREELANCE',
  PROJECT = 'PROJECT',
  COMPETITION = 'COMPETITION',
  LEARNING = 'LEARNING',
  OTHER = 'OTHER',
}

export enum OpportunityStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface OpportunitySkill extends BaseEntity {
  opportunityId: string;
  skillId: string;
  isRequired: boolean;
}

export interface Application extends BaseEntity {
  userId: string;
  opportunityId: string;
  status: ApplicationStatus;
  coverLetter?: string;
  resumeId?: string;
  appliedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export enum ApplicationStatus {
  DISCOVERED = 'DISCOVERED',
  SAVED = 'SAVED',
  READY_TO_APPLY = 'READY_TO_APPLY',
  APPLIED = 'APPLIED',
  SCREENING = 'SCREENING',
  INTERVIEW = 'INTERVIEW',
  OFFER = 'OFFER',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface LearningResource extends BaseEntity {
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
  verifiedSource: boolean;
  lastCheckedAt?: Date;
  deletedAt?: Date;
  organizationId?: string;
}

export enum LearningResourceType {
  COURSE = 'COURSE',
  BOOK = 'BOOK',
  VIDEO = 'VIDEO',
  DOCUMENTATION = 'DOCUMENTATION',
  ARTICLE = 'ARTICLE',
  PROJECT = 'PROJECT',
  TUTORIAL = 'TUTORIAL',
}

export enum ResourceDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export interface LearningPlan extends BaseEntity {
  userId: string;
  targetSkillId: string;
  status: LearningPlanStatus;
  currentMilestone: number;
  completedAt?: Date;
}

export enum LearningPlanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
  PAUSED = 'PAUSED',
}

export interface LearningMilestone extends BaseEntity {
  planId: string;
  skillId: string;
  order: number;
  targetProficiency: ProficiencyLevel;
  status: LearningPlanStatus;
  completedAt?: Date;
}

export enum AIProviderType {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  LOCAL = 'LOCAL',
  CUSTOM = 'CUSTOM',
}

export enum AIExtractionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface AIExtractionJob extends BaseEntity {
  userId: string;
  inputText: string;
  inputTextHash: string;
  status: AIExtractionStatus;
  providerType: AIProviderType;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  errorMessage?: string;
  completedAt?: Date;
}

export interface AIExtractionResult extends BaseEntity {
  jobId: string;
  skillName: string;
  skillSlug?: string;
  matchedSkillId?: string;
  isMatched: boolean;
  confidence: number;
  evidenceSnippet?: string;
  reasoning?: string;
}

export interface ExtractedSkill {
  name: string;
  evidence: string;
  confidence: number;
  reason: string;
}

export interface NormalizedSkill {
  skillName: string;
  matched: boolean;
  matchedSkillId?: string;
  matchedSkillName?: string;
  confidence: number;
  reason: string;
}

export interface AIExtractionResultDetail {
  originalName: string;
  normalized: NormalizedSkill;
  extractionConfidence: number;
  evidence: string;
  reason: string;
}

export interface ExtractionResult {
  jobId: string;
  skills: AIExtractionResultDetail[];
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  latencyMs: number;
}

export enum ResumeStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

export enum ResumeAnalysisStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ResumeFileType {
  PDF = 'PDF',
  DOCX = 'DOCX',
  TXT = 'TXT',
}

export enum DuplicateDetectionStatus {
  NONE = 'NONE',
  POSSIBLE_DUPLICATE = 'POSSIBLE_DUPLICATE',
  CONFIRMED_DUPLICATE = 'CONFIRMED_DUPLICATE',
}

export interface Resume extends BaseEntity {
  userId: string;
  originalFilename: string;
  storageKey: string;
  fileType: ResumeFileType;
  fileSize: number;
  status: ResumeStatus;
  mimeType?: string;
  deletedAt?: Date;
  organizationId?: string;
  analysis?: ResumeAnalysis;
}

export interface ResumeAnalysis extends BaseEntity {
  resumeId: string;
  status: ResumeAnalysisStatus;
  model?: string;
  providerType?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  errorMessage?: string;
  personalInfo?: Record<string, unknown>;
  summary?: string;
  skills?: Record<string, unknown>;
  experiences?: Record<string, unknown>;
  education?: Record<string, unknown>;
  projects?: Record<string, unknown>;
  certifications?: Record<string, unknown>;
  duplicateFlags?: Record<string, unknown>;
  completedAt?: Date;
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export interface Session extends BaseEntity {
  userId: string;
  token: string;
  expiresAt: Date;
  status: SessionStatus;
}

export enum VerificationTokenType {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TWO_FACTOR = 'TWO_FACTOR',
}

export interface VerificationToken extends BaseEntity {
  userId: string;
  token: string;
  type: VerificationTokenType;
  expiresAt: Date;
  usedAt?: Date;
}

export interface AuditLog extends BaseEntity {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface Notification extends BaseEntity {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  readAt?: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface SuccessResponse<T> {
  data: T;
  message?: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

export function createSuccessResponse<T>(data: T, message?: string, meta?: Partial<ApiResponse<T>['meta']>): ApiResponse<T> {
  return {
    data,
    message,
    meta: {
      requestId: meta?.requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: meta?.version || 'v1',
    },
  };
}

export function createErrorResponse(code: string, message: string, details?: Record<string, unknown>, meta?: Partial<ApiResponse<never>['meta']>): ApiResponse<never> {
  return {
    error: { code, message, details },
    meta: {
      requestId: meta?.requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: meta?.version || 'v1',
    },
  };
}

export function createPaginatedResponse<T>(data: T[], page: number, pageSize: number, total: number): ApiResponse<PaginatedResponse<T>> {
  return createSuccessResponse({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export type UUID = string & { readonly brand: unique symbol };
export type Email = string & { readonly brand: unique symbol };
export type URL = string & { readonly brand: unique symbol };
export type Slug = string & { readonly brand: unique symbol };

export function isUUID(value: string): value is UUID {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isEmail(value: string): value is Email {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isURL(value: string): value is URL {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function isSlug(value: string): value is Slug {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export type Json = Record<string, unknown>;

export interface RegisterInput {
  email: string;
  username?: string;
  password: string;
  role?: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  sessionId: string;
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

export const RegisterInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).optional(),
  password: z.string().min(8).max(128),
  role: z.nativeEnum(UserRole).optional(),
});

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const CreateUserSkillInputSchema = z.object({
  skillId: z.string().uuid(),
  proficiencyLevel: z.nativeEnum(ProficiencyLevel),
  yearsOfExperience: z.number().min(0).max(100).optional(),
  confidence: z.number().min(0).max(100).optional(),
});

export const UpdateUserSkillInputSchema = z.object({
  proficiencyLevel: z.nativeEnum(ProficiencyLevel).optional(),
  yearsOfExperience: z.number().min(0).max(100).optional(),
  confidence: z.number().min(0).max(100).optional(),
});

export const CreateEvidenceInputSchema = z.object({
  userSkillId: z.string().uuid(),
  type: z.nativeEnum(EvidenceType),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateProjectInputSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().min(1),
  longDescription: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  visibility: z.nativeEnum(ProjectVisibility).optional(),
  repositoryUrl: z.string().url().optional(),
  liveUrl: z.string().url().optional(),
  documentationUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  organizationId: z.string().uuid().optional(),
});

export const CreateOpportunityInputSchema = z.object({
  organizationId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  type: z.nativeEnum(OpportunityType),
  status: z.nativeEnum(OpportunityStatus).optional(),
  location: z.string().optional(),
  isRemote: z.boolean().optional(),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
  applicationDeadline: z.date().optional(),
  requirements: z.record(z.unknown()).optional(),
  benefits: z.record(z.unknown()).optional(),
});

export const CreateLearningResourceInputSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  url: z.string().url(),
  provider: z.string().optional(),
  type: z.nativeEnum(LearningResourceType),
  skillId: z.string().uuid(),
  difficulty: z.nativeEnum(ResourceDifficulty).optional(),
  language: z.string().length(2).optional(),
  durationMinutes: z.number().int().positive().optional(),
  rating: z.number().min(0).max(5).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  verifiedSource: z.boolean().optional(),
  organizationId: z.string().uuid().optional(),
});

// ============================================================
// TARGET ROLE INTELLIGENCE & SKILL GAP ENGINE
// ============================================================

export interface TargetRoleDTO extends BaseEntity {
  title: string;
  slug: string;
  description?: string | null;
  category: SkillCategory;
  iconUrl?: string | null;
  skillRequirements?: RoleSkillRequirementDTO[];
}

export interface RoleSkillRequirementDTO {
  id: string;
  targetRoleId: string;
  skillId: string;
  requiredProficiency: ProficiencyLevel | string;
  importanceWeight: number;
  isRequired: boolean;
  skill?: {
    id: string;
    name: string;
    slug: string;
    category?: string;
    subcategory?: string | null;
  };
}

export type TargetRoleGapStatus = 'MATCHED' | 'PARTIAL' | 'MISSING';

export interface TargetRoleSkillGapItem {
  skill: {
    id: string;
    name: string;
    slug: string;
    category?: string;
    subcategory?: string | null;
  };
  currentProficiency?: ProficiencyLevel | string | null;
  userProficiencyLevel?: ProficiencyLevel | string | null;
  requiredProficiency: ProficiencyLevel | string;
  importanceWeight: number;
  isRequired: boolean;
  gap: number;
  proficiencyGap: number;
  status: TargetRoleGapStatus;
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

export interface TargetRoleGapAnalysis {
  role: {
    id: string;
    title: string;
    slug: string;
    description?: string | null;
    category?: string;
  };
  readinessScore: number;
  mandatoryReadinessScore: number;
  readinessPercentage: number;
  readinessLevel: 'HIGHLY_READY' | 'MODERATELY_READY' | 'FOUNDATION_REQUIRED';
  matched: TargetRoleSkillGapItem[];
  partial: TargetRoleSkillGapItem[];
  missing: TargetRoleSkillGapItem[];
  optional: TargetRoleSkillGapItem[];
  priorities: TargetRoleSkillPriority[];
  summary: TargetRoleGapSummary;
  averageSkillConfidence?: number;
  evidenceBackedSkillsCount?: number;
  // Compatibility fields
  requirementGaps: TargetRoleSkillGapItem[];
  matchedCount: number;
  partialCount: number;
  missingCount: number;
  totalRequirementsCount: number;
}

// ============================================================
// PHASE 4: EVIDENCE INTELLIGENCE & SKILL CONFIDENCE TYPES
// ============================================================

export enum EvidenceSourceType {
  SELF_REPORTED = 'SELF_REPORTED',
  RESUME = 'RESUME',
  PROJECT = 'PROJECT',
  CERTIFICATION = 'CERTIFICATION',
  ASSESSMENT = 'ASSESSMENT',
  WORK_SAMPLE = 'WORK_SAMPLE',
  EXTERNAL = 'EXTERNAL',
  OTHER = 'OTHER',
}

export enum SkillVerificationStatus {
  CLAIMED = 'CLAIMED',
  SUPPORTED = 'SUPPORTED',
  STRONGLY_SUPPORTED = 'STRONGLY_SUPPORTED',
  VERIFIED = 'VERIFIED',
  CONFLICTING = 'CONFLICTING',
}

export interface SkillEvidenceItemDTO {
  id: string;
  userSkillId: string;
  skillId?: string | null;
  source: string;
  type: string;
  title: string;
  description?: string | null;
  quote?: string | null;
  url?: string | null;
  confidence: number;
  strength?: number;
  specificityScore?: number;
  recencyFactor?: number;
  verifiedAt?: Date | string | null;
  createdAt: Date | string;
  metadata?: Record<string, unknown> | null;
}

export interface SkillConfidenceConflict {
  type: string;
  message: string;
  evidenceA: string;
  evidenceB: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SkillConfidenceFactors {
  sourceReliability: number;
  specificityScore: number;
  recencyFactor: number;
  corroborationBonus: number;
  rawScore: number;
}

export interface SkillConfidenceDTO {
  skillId: string;
  skillName: string;
  skillSlug: string;
  proficiency: ProficiencyLevel | string;
  confidence: number; // 0 - 100
  verificationStatus: SkillVerificationStatus | string;
  evidenceCount: number;
  evidenceSources: string[];
  strongestEvidence?: {
    source: string;
    title: string;
    confidence: number;
    quote?: string;
  };
  conflicts: SkillConfidenceConflict[];
  factors: SkillConfidenceFactors;
  evidence: SkillEvidenceItemDTO[];
}

export const SetTargetRoleInputSchema = z.object({
  roleId: z.string().min(1).optional(),
  targetRoleId: z.string().min(1).optional(),
}).refine(data => Boolean(data.roleId || data.targetRoleId), {
  message: 'roleId or targetRoleId is required',
});

export type SetTargetRoleInput = z.infer<typeof SetTargetRoleInputSchema>;

// ============================================================
// PHASE 5: PERSONALIZED LEARNING PATH & RESOURCE INTELLIGENCE
// ============================================================

export enum LearningPathStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum LearningPathItemStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export type LearningGapPriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_ACTION_REQUIRED';

export interface LearningObjectiveDTO {
  skillId: string;
  skillName: string;
  title: string;
  objective: string;
  targetProficiency: ProficiencyLevel | string;
  currentProficiency?: ProficiencyLevel | string;
  estimatedMinutes: number;
}

export interface LearningResourceDTO {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  provider?: string | null;
  type: LearningResourceType | string;
  skillId: string;
  skillName?: string;
  difficulty?: ResourceDifficulty | string | null;
  language?: string | null;
  durationMinutes?: number | null;
  rating?: number | null;
  qualityScore?: number | null;
  verifiedSource?: boolean;
}

export interface ResourceRecommendationDTO {
  resource: LearningResourceDTO;
  score: number;
  relevanceScore: number;
  difficultyFit: number;
  qualityFactor: number;
  explanation: string[];
}

export interface LearningPathItemDTO {
  id: string;
  learningPathId: string;
  skillId: string;
  skillName: string;
  skillSlug: string;
  skillCategory?: string;
  resourceId?: string | null;
  resource?: LearningResourceDTO | null;
  title: string;
  objective: string;
  priority: LearningGapPriorityLevel | string;
  order: number;
  status: LearningPathItemStatus | string;
  progress: number; // 0 - 100
  estimatedMinutes: number;
  explanation: string[];
  prerequisites: {
    id: string;
    name: string;
    isSatisfied: boolean;
  }[];
  currentProficiency?: ProficiencyLevel | string;
  requiredProficiency: ProficiencyLevel | string;
  confidence?: number;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LearningPathDTO {
  id: string;
  userId: string;
  targetRoleId: string;
  targetRoleTitle: string;
  targetRoleSlug: string;
  title: string;
  description?: string | null;
  status: LearningPathStatus | string;
  progress: number; // 0 - 100
  totalItems: number;
  completedItems: number;
  inProgressItems: number;
  estimatedTotalMinutes: number;
  items: LearningPathItemDTO[];
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string | null;
}

export interface LearningPathSummaryDTO {
  pathId: string;
  targetRoleId: string;
  targetRoleTitle: string;
  status: LearningPathStatus | string;
  progress: number;
  completedItems: number;
  totalItems: number;
  currentFocus?: {
    itemId: string;
    skillName: string;
    title: string;
    objective: string;
    progress: number;
  } | null;
  nextUp?: {
    itemId: string;
    skillName: string;
    title: string;
  } | null;
  highPriorityGapsCount: number;
}

export const UpdateLearningItemProgressSchema = z.object({
  progress: z.number().min(0).max(100),
});

export type UpdateLearningItemProgressInput = z.infer<typeof UpdateLearningItemProgressSchema>;

export const GenerateLearningPathSchema = z.object({
  targetRoleId: z.string().min(1).optional(),
});

export type GenerateLearningPathInput = z.infer<typeof GenerateLearningPathSchema>;

// ============================================================
// PHASE 6: ASSESSMENT ENGINE & RESOURCE DISCOVERY
// ============================================================

export enum AssessmentType {
  QUIZ = 'QUIZ',
  PRACTICAL = 'PRACTICAL',
  PEER_REVIEW = 'PEER_REVIEW',
  SELF_CHECK = 'SELF_CHECK',
}

export enum AssessmentStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED',
  EXPIRED = 'EXPIRED',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  CODE_REVIEW = 'CODE_REVIEW',
}

export interface AssessmentQuestionDTO {
  id: string;
  questionNumber: number;
  type: QuestionType | string;
  text: string;
  choices?: string[];
  codeSnippet?: string;
  difficulty: ProficiencyLevel | string;
  skillArea: string;
  // NOTE: correctAnswer is NEVER exposed to client — server-only
}

export interface AssessmentDTO {
  id: string;
  userId: string;
  skillId: string;
  skillName: string;
  skillSlug: string;
  learningPathItemId?: string | null;
  type: AssessmentType | string;
  status: AssessmentStatus | string;
  title: string;
  description?: string | null;
  timeLimit?: number | null;
  questions: AssessmentQuestionDTO[];
  maxScore: number;
  score?: number | null;
  percentage?: number | null;
  gradedAt?: Date | string | null;
  startedAt?: Date | string | null;
  submittedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AssessmentAttemptDTO {
  id: string;
  assessmentId: string;
  attemptNumber: number;
  score: number;
  percentage: number;
  feedback: AssessmentQuestionFeedback[];
  submittedAt: Date | string;
  gradedAt?: Date | string | null;
}

export interface AssessmentQuestionFeedback {
  questionId: string;
  questionNumber: number;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
}

export interface AssessmentSubmissionInput {
  answers: Record<string, string>; // questionId -> answer
}

export const AssessmentSubmissionSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export interface AssessmentResultDTO {
  assessmentId: string;
  skillId: string;
  skillName: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  feedback: AssessmentQuestionFeedback[];
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

export interface CreateAssessmentInput {
  skillId: string;
  type?: AssessmentType | string;
  learningPathItemId?: string;
}

export const CreateAssessmentSchema = z.object({
  skillId: z.string().min(1),
  type: z.enum(['QUIZ', 'PRACTICAL', 'PEER_REVIEW', 'SELF_CHECK']).optional(),
  learningPathItemId: z.string().optional(),
});

export interface ResourceDiscoveryResultDTO {
  resources: LearningResourceDTO[];
  totalFound: number;
  skillId: string;
  skillName: string;
  appliedFilters: {
    difficulty?: string;
    type?: string;
    limit: number;
  };
}

// ============================================================
// PHASE 7: WORK-SAMPLE & PROJECT INTELLIGENCE
// ============================================================

export enum ProjectSource {
  MANUAL = 'MANUAL',
  RESUME = 'RESUME',
  GITHUB = 'GITHUB',
  PORTFOLIO = 'PORTFOLIO',
  DOCUMENT = 'DOCUMENT',
  WORK_SAMPLE = 'WORK_SAMPLE',
}

export interface DetectedProjectSkillDTO {
  skillId?: string;
  skillName: string;
  skillSlug: string;
  category?: string;
  proficiencyDemonstrated: ProficiencyLevel | string;
  evidenceSnippet: string;
  confidenceContribution: number; // 0 - 100
  reasoning: string;
}

export interface ProjectEvaluationDTO {
  id: string;
  projectId: string;
  technicalDepth: number;     // 0 - 100
  architecture: number;       // 0 - 100
  testing: number;            // 0 - 100
  documentation: number;      // 0 - 100
  deployment: number;         // 0 - 100
  overallQuality: number;     // 0 - 100
  detectedSkills: DetectedProjectSkillDTO[];
  summary?: string | null;
  strengths: string[];
  improvementAreas: string[];
  evaluatedAt: Date | string;
}

export interface ProjectDTO {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  description: string;
  longDescription?: string | null;
  source: ProjectSource | string;
  status: ProjectStatus | string;
  visibility: ProjectVisibility | string;
  repositoryUrl?: string | null;
  liveUrl?: string | null;
  documentationUrl?: string | null;
  thumbnailUrl?: string | null;
  roleAlignment?: number | null; // 0 - 100 percentage
  tags?: string[];
  skills: Array<{
    id: string;
    skillId: string;
    name: string;
    slug: string;
    category: string;
  }>;
  evaluation?: ProjectEvaluationDTO | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export const CreateProjectSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().min(10).max(1000),
  longDescription: z.string().optional(),
  source: z.enum(['MANUAL', 'RESUME', 'GITHUB', 'PORTFOLIO', 'DOCUMENT', 'WORK_SAMPLE']).optional(),
  repositoryUrl: z.string().url().optional().or(z.literal('')),
  liveUrl: z.string().url().optional().or(z.literal('')),
  documentationUrl: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  skillSlugs: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export interface PortfolioSkillEvidenceDTO {
  skillId: string;
  skillName: string;
  skillSlug: string;
  category: string;
  confidence: number;
  proficiencyLevel: ProficiencyLevel | string;
  projectCount: number;
  demonstratedProjects: Array<{
    projectId: string;
    projectTitle: string;
    projectQuality: number;
  }>;
  evidenceStrength: 'STRONG' | 'MODERATE' | 'DEVELOPING';
}

export interface PortfolioMissingEvidenceDTO {
  skillId: string;
  skillName: string;
  skillSlug: string;
  category: string;
  isRequired: boolean;
  requiredProficiency: ProficiencyLevel | string;
  recommendation: string;
}

export interface PortfolioIntelligenceDTO {
  userId: string;
  totalProjects: number;
  portfolioStrength: number; // 0 - 100
  averageProjectQuality: number; // 0 - 100
  demonstratedSkillsCount: number;
  strongEvidenceSkills: PortfolioSkillEvidenceDTO[];
  moderateEvidenceSkills: PortfolioSkillEvidenceDTO[];
  missingRoleEvidence: PortfolioMissingEvidenceDTO[];
  topProjects: ProjectDTO[];
}

// ============================================================
// PHASE 8: CAREER READINESS & SIMULATION
// ============================================================

export enum SimulationStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

export enum ReadinessLevel {
  NOT_READY = 'NOT_READY',
  EARLY_STAGE = 'EARLY_STAGE',
  DEVELOPING = 'DEVELOPING',
  ROLE_READY = 'ROLE_READY',
  STRONG_MATCH = 'STRONG_MATCH',
}

export interface ReadinessDimensionDTO {
  name: string;
  score: number; // 0 - 100
  weight: number; // relative weight
  status: 'EXEMPLARY' | 'ON_TRACK' | 'NEEDS_WORK' | 'CRITICAL_GAP';
  explanation: string;
}

export interface CareerReadinessDTO {
  userId: string;
  targetRoleId: string;
  targetRoleTitle: string;
  targetRoleSlug: string;
  overallReadiness: number; // 0 - 100
  readinessLevel: ReadinessLevel | string;
  readinessBadge: string;
  summary: string;
  dimensions: {
    technicalSkills: ReadinessDimensionDTO;
    evidenceStrength: ReadinessDimensionDTO;
    assessmentReadiness: ReadinessDimensionDTO;
    projectReadiness: ReadinessDimensionDTO;
    learningProgress: ReadinessDimensionDTO;
    roleAlignment: ReadinessDimensionDTO;
  };
  strengths: string[];
  criticalGaps: string[];
  recommendedFocus: string;
}

export interface RoleReadinessComparisonItemDTO {
  roleId: string;
  roleTitle: string;
  roleSlug: string;
  category: string;
  overallReadiness: number;
  readinessLevel: ReadinessLevel | string;
  matchedSkillsCount: number;
  totalRequirementsCount: number;
  isPrimaryTarget: boolean;
}

export interface RoleReadinessComparisonDTO {
  userId: string;
  roles: RoleReadinessComparisonItemDTO[];
}

export interface SimulationScenarioOptionDTO {
  id: string;
  text: string;
  skillWeight?: Record<string, number>;
}

export interface SimulationScenarioDTO {
  id: string;
  scenarioNumber: number;
  title: string;
  scenarioContext: string;
  challengePrompt: string;
  targetSkillAreas: string[];
  options: SimulationScenarioOptionDTO[];
  // NOTE: correctOptionId and rationale are NEVER exposed to client — server-only
}

export interface SimulationScenarioFeedbackDTO {
  scenarioId: string;
  scenarioNumber: number;
  userSelection: string;
  wasOptimal: boolean;
  scoreAwarded: number;
  maxScore: number;
  optimalChoiceExplanation: string;
  tradeOffAnalysis: string;
}

export interface CareerSimulationDTO {
  id: string;
  userId: string;
  targetRoleId: string;
  targetRoleTitle: string;
  title: string;
  description?: string | null;
  status: SimulationStatus | string;
  timeLimit?: number | null;
  scenarios: SimulationScenarioDTO[];
  maxScore: number;
  score?: number | null;
  percentage?: number | null;
  skillScores?: Record<string, number> | null;
  decisionQuality?: {
    architecturalSoundness: number;
    tradeoffAwareness: number;
    incidentResponse: number;
  } | null;
  weakAreas?: string[] | null;
  strongAreas?: string[] | null;
  startedAt?: Date | string | null;
  submittedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export const SimulationSubmissionSchema = z.object({
  answers: z.record(z.string(), z.string()), // scenarioId -> optionId
});

export type SimulationSubmissionInput = z.infer<typeof SimulationSubmissionSchema>;

export interface SimulationResultDTO {
  simulationId: string;
  targetRoleId: string;
  targetRoleTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  skillScores: Record<string, number>;
  strongAreas: string[];
  weakAreas: string[];
  feedback: SimulationScenarioFeedbackDTO[];
  readinessImpact: {
    previousReadiness: number;
    newReadiness: number;
    delta: number;
  };
  evidenceCreated: {
    evidenceId: string;
    skillsUpdated: string[];
  };
}

export const CreateSimulationSchema = z.object({
  targetRoleId: z.string().min(1).optional(),
});

export type CreateSimulationInput = z.infer<typeof CreateSimulationSchema>;

// ============================================================
// PHASE 9: AI CAREER COACH & NEXT-BEST-ACTION
// ============================================================

export enum CoachActionType {
  LEARN = 'LEARN',
  ASSESS = 'ASSESS',
  BUILD_PROJECT = 'BUILD_PROJECT',
  IMPROVE_PROJECT = 'IMPROVE_PROJECT',
  VERIFY_SKILL = 'VERIFY_SKILL',
  COMPLETE_PREREQUISITE = 'COMPLETE_PREREQUISITE',
  UPDATE_RESUME = 'UPDATE_RESUME',
  TAKE_SIMULATION = 'TAKE_SIMULATION',
}

export enum CoachSender {
  USER = 'USER',
  COACH = 'COACH',
  SYSTEM = 'SYSTEM',
}

export interface NextBestActionDTO {
  id: string;
  type: CoachActionType | string;
  title: string;
  subtitle: string;
  reason: string;
  skillName?: string;
  skillSlug?: string;
  targetRoleTitle?: string;
  priorityScore: number;
  supportingSignals: string[];
  expectedImpact: string;
  estimatedEffort: string;
  actionUrl: string;
  actionButtonText: string;
  actionPayload?: Record<string, unknown>;
}

export interface CareerCoachMessageDTO {
  id: string;
  sessionId: string;
  sender: CoachSender | string;
  content: string;
  structuredData?: {
    nextBestAction?: NextBestActionDTO;
    recommendedActions?: NextBestActionDTO[];
    contextInsights?: string[];
    quickPrompts?: string[];
  } | null;
  createdAt: Date | string;
}

export interface CareerCoachSessionDTO {
  id: string;
  userId: string;
  targetRoleId?: string | null;
  targetRoleTitle?: string | null;
  title: string;
  status: string;
  messages: CareerCoachMessageDTO[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export const CreateCoachSessionSchema = z.object({
  targetRoleId: z.string().optional(),
  title: z.string().optional(),
});

export type CreateCoachSessionInput = z.infer<typeof CreateCoachSessionSchema>;

export const SendCoachMessageSchema = z.object({
  message: z.string().min(1).max(2000),
});

export type SendCoachMessageInput = z.infer<typeof SendCoachMessageSchema>;

// ============================================================
// PHASE 10: ORGANIZATION & COLLEGE INTELLIGENCE TYPES
// ============================================================

export interface OrganizationInvitationDTO {
  id: string;
  organizationId: string;
  organizationName?: string;
  email: string;
  role: OrgUserRole | string;
  token: string;
  status: InvitationStatus | string;
  invitedById?: string | null;
  acceptedAt?: Date | string | null;
  expiresAt: Date | string;
  createdAt: Date | string;
}

export interface OrganizationDepartmentDTO {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  programsCount?: number;
  membersCount?: number;
  createdAt: Date | string;
}

export interface OrganizationProgramDTO {
  id: string;
  organizationId: string;
  departmentId?: string | null;
  departmentName?: string | null;
  name: string;
  code: string;
  degree?: string | null;
  cohortsCount?: number;
  membersCount?: number;
  createdAt: Date | string;
}

export interface OrganizationCohortDTO {
  id: string;
  organizationId: string;
  programId?: string | null;
  programName?: string | null;
  name: string;
  graduationYear?: number | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  membersCount?: number;
  createdAt: Date | string;
}

export interface OrganizationSettingsDTO {
  id: string;
  organizationId: string;
  allowedDomains?: string[] | null;
  requireVerification: boolean;
  allowStudentSelfEnroll: boolean;
  branding?: {
    primaryColor?: string;
    portalName?: string;
    logoUrl?: string;
    bannerUrl?: string;
  } | null;
}

export interface OrganizationMemberDTO {
  id: string;
  userId: string;
  organizationId: string;
  role: OrgUserRole | string;
  user: {
    id: string;
    email: string;
    username?: string | null;
    profile?: {
      firstName?: string | null;
      lastName?: string | null;
      avatarUrl?: string | null;
    } | null;
  };
  department?: OrganizationDepartmentDTO | null;
  program?: OrganizationProgramDTO | null;
  cohort?: OrganizationCohortDTO | null;
  joinedAt: Date | string;
}

export interface CollegeAnalyticsDTO {
  institution: string;
  totalStudents: number;
  activeProfiles: number;
  verifiedEvidenceCount: number;
  targetRoleDistribution: Array<{ role: string; count: number; percentage: number }>;
  averageReadiness: number;
  placementReadinessDistribution: {
    roleReady: number;
    developing: number;
    earlyStage: number;
  };
  curriculumGaps: Array<{
    skill: string;
    cohortMasteryPercent: number;
    industryRequiredPercent: number;
    gapDelta: number;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  assessmentPassRate: number;
  topDemonstratedSkills: Array<{ skill: string; verifiedCount: number }>;
}

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  type: z.nativeEnum(OrganizationType).optional(),
  websiteUrl: z.string().url().optional(),
  industry: z.string().optional(),
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const CreateInvitationSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(OrgUserRole).default(OrgUserRole.CANDIDATE),
});
export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;

export const CreateDepartmentSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).toUpperCase(),
  description: z.string().optional(),
});
export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>;

export const CreateCohortSchema = z.object({
  programId: z.string().optional(),
  name: z.string().min(2).max(100),
  graduationYear: z.number().int().min(2020).max(2050).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type CreateCohortInput = z.infer<typeof CreateCohortSchema>;

// ============================================================
// PHASE 11: OPPORTUNITY & PLACEMENT TYPES
// ============================================================

export interface OpportunityDTO {
  id: string;
  organizationId?: string | null;
  organizationName?: string;
  title: string;
  description: string;
  type: OpportunityType | string;
  status: OpportunityStatus | string;
  location?: string | null;
  isRemote: boolean;
  experienceLevel?: string | null;
  minReadinessScore?: number | null;
  isFeatured?: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  applicationDeadline?: Date | string | null;
  skills: Array<{
    id: string;
    skillId: string;
    skillName: string;
    skillSlug: string;
    isRequired: boolean;
  }>;
  matchScore?: number;
  matchLevel?: 'NOT_READY' | 'PARTIALLY_READY' | 'READY' | 'STRONG_MATCH';
  applicationsCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OpportunityMatchDTO {
  opportunityId: string;
  candidateId: string;
  matchScore: number; // 0-100 deterministic weighted score
  matchLevel: 'NOT_READY' | 'PARTIALLY_READY' | 'READY' | 'STRONG_MATCH';
  skillMatchScore: number;
  evidenceMatchScore: number;
  readinessMatchScore: number;
  projectEvidenceScore: number;
  matchedSkills: Array<{
    skillId: string;
    skillName: string;
    proficiency: string;
    confidence: number;
    hasEvidence: boolean;
  }>;
  missingSkills: Array<{
    skillId: string;
    skillName: string;
    isRequired: boolean;
  }>;
  blockers: string[];
  recommendations: string[];
  explanation: string;
}

export interface OpportunityCandidateMatchDTO {
  candidateId: string;
  name: string;
  email: string;
  matchScore: number;
  matchLevel: string;
  readinessScore: number;
  verifiedSkillsCount: number;
  strengths: string[];
  missingCriticalSkills: string[];
  appliedAt?: Date | string | null;
  applicationStatus?: string | null;
}

export interface ApplicationDTO {
  id: string;
  userId: string;
  opportunityId: string;
  opportunityTitle?: string;
  organizationName?: string;
  status: ApplicationStatus | string;
  matchScore?: number | null;
  matchDetails?: any;
  coverLetter?: string | null;
  resumeId?: string | null;
  appliedAt: Date | string;
  reviewedAt?: Date | string | null;
  reviewedBy?: string | null;
}

export const CreateOpportunitySchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(10),
  type: z.nativeEnum(OpportunityType).default(OpportunityType.JOB),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  experienceLevel: z.string().optional(),
  minReadinessScore: z.number().int().min(0).max(100).default(50),
  salaryMin: z.number().int().optional(),
  salaryMax: z.number().int().optional(),
  currency: z.string().default('USD'),
  applicationDeadline: z.string().optional(),
  skills: z.array(z.object({
    skillId: z.string(),
    isRequired: z.boolean().default(true),
  })).min(1),
});
export type CreateOpportunityInput = z.infer<typeof CreateOpportunitySchema>;

export const SubmitApplicationSchema = z.object({
  coverLetter: z.string().max(3000).optional(),
  resumeId: z.string().optional(),
});
export type SubmitApplicationInput = z.infer<typeof SubmitApplicationSchema>;

// ============================================================
// PHASE 12: OBSERVABILITY & AUDIT TYPES
// ============================================================

export interface AuditLogDTO {
  id: string;
  actorId?: string | null;
  actorEmail?: string | null;
  organizationId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date | string;
}

export interface AIRequestMetricDTO {
  id: string;
  provider: string;
  model: string;
  category: string;
  latencyMs: number;
  status: string;
  tokensUsed?: number | null;
  estimatedCostUsd?: number | null;
  error?: string | null;
  createdAt: Date | string;
}

export interface PlatformAnalyticsDTO {
  totalUsers: number;
  totalOrganizations: number;
  totalOpportunities: number;
  totalApplications: number;
  totalProjectsEvaluated: number;
  totalSimulationsCompleted: number;
  totalSkillsCataloged: number;
  topInDemandSkills: Array<{ skill: string; demandCount: number }>;
  averagePlatformReadiness: number;
  aiMetricsSummary: {
    totalRequests: number;
    successRate: number;
    avgLatencyMs: number;
    fallbackRate: number;
  };
}

// ============================================================
// PHASE 13: INTEGRATION TYPES
// ============================================================

export interface IntegrationConnectionDTO {
  id: string;
  userId?: string | null;
  organizationId?: string | null;
  provider: string;
  status: string;
  externalAccountId?: string | null;
  metadata?: any;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WebhookEventDTO {
  id: string;
  provider: string;
  eventId: string;
  eventType: string;
  status: string;
  processedAt?: Date | string | null;
  createdAt: Date | string;
}

// ============================================================
// PHASE 15: BILLING & ENTITLEMENT TYPES
// ============================================================

export interface PlanDTO {
  id: string;
  code: PlanCode | string;
  name: string;
  description?: string | null;
  priceMonthly: number;
  features?: string[] | null;
  limits: {
    maxResumes: number;
    maxProjects: number;
    maxSimulations: number;
    maxCoachMessages: number;
    allowInstitutionalAnalytics: boolean;
    allowOpportunityPosting: boolean;
  };
}

export interface SubscriptionDTO {
  id: string;
  userId?: string | null;
  organizationId?: string | null;
  planCode: PlanCode | string;
  status: SubscriptionStatus | string;
  currentPeriodStart: Date | string;
  currentPeriodEnd?: Date | string | null;
  cancelAtPeriodEnd: boolean;
  limits: PlanDTO['limits'];
}

export interface UsageRecordDTO {
  metric: string;
  count: number;
  limit: number;
  percentageUsed: number;
  period: string;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  metric: string;
  currentCount: number;
  limit: number;
  reason?: string;
}

export * from './mock-data';