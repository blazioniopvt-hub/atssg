import {
  User,
  Profile,
  Organization,
  UserOrganization,
  Skill,
  UserSkill,
  SkillEvidence,
  SkillRelationship,
  Project,
  ProjectSkill,
  ProjectMember,
  Team,
  TeamMember,
  Opportunity,
  OpportunitySkill,
  Application,
  LearningResource,
  LearningPlan,
  LearningMilestone,
  AIExtractionJob,
  AIExtractionResult,
  Resume,
  ResumeAnalysis,
  Session,
  VerificationToken,
  EvidenceType,
  ProficiencyLevel,
  VerificationStatus,
  SkillCategory,
  DemandLevel,
  ProjectStatus,
  ProjectVisibility,
  OrganizationType,
  OrganizationStatus,
  OpportunityType,
  OpportunityStatus,
  TeamRole,
  ProjectRole,
  UserRole,
  UserStatus,
  OrgUserRole,
  OrganizationSize,
  VerificationMethod,
  SkillRelationshipType,
  AIProviderType,
  AIExtractionStatus,
  ResumeStatus,
  ResumeAnalysisStatus,
  ResumeFileType,
  DuplicateDetectionStatus,
  LearningResourceType,
  ResourceDifficulty,
  LearningPlanStatus,
  ApplicationStatus,
  ProfileVisibility,
  PaginatedResponse,
} from '@skillsync/types';

export interface ISkillService {
  getAll(filters?: { category?: SkillCategory; organizationId?: string; search?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<Skill>>;
  getById(id: string): Promise<Skill | null>;
  getBySlug(slug: string, organizationId?: string): Promise<Skill | null>;
  create(input: { name: string; slug: string; description?: string; category: SkillCategory; subcategory?: string; iconUrl?: string; isVerified?: boolean; demandLevel?: DemandLevel; organizationId?: string }): Promise<Skill>;
  update(id: string, input: Partial<Skill>): Promise<Skill | null>;
  delete(id: string): Promise<boolean>;
}

export interface IUserSkillService {
  getByUserId(userId: string): Promise<UserSkill[]>;
  getByUserAndSkill(userId: string, skillId: string): Promise<UserSkill | null>;
  add(userId: string, input: { skillId: string; proficiencyLevel: ProficiencyLevel; yearsOfExperience?: number; confidence?: number }): Promise<UserSkill>;
  update(userId: string, skillId: string, input: { proficiencyLevel?: ProficiencyLevel; yearsOfExperience?: number; confidence?: number }): Promise<UserSkill | null>;
  remove(userId: string, skillId: string): Promise<boolean>;
}

export interface ISkillEvidenceService {
  getByUserSkill(userId: string, userSkillId: string): Promise<SkillEvidence[]>;
  getById(id: string): Promise<SkillEvidence | null>;
  create(userId: string, input: { userSkillId: string; type: EvidenceType; title: string; description?: string; url?: string; metadata?: Record<string, unknown> }): Promise<SkillEvidence>;
  update(userId: string, evidenceId: string, input: { title?: string; description?: string; url?: string; metadata?: Record<string, unknown> }): Promise<SkillEvidence | null>;
  delete(userId: string, evidenceId: string): Promise<boolean>;
}

export interface ISkillIntelligenceService {
  getSkillIntelligenceSummary(userId: string): Promise<{
    totalSkills: number;
    skillsByProficiency: Record<string, number>;
    skillsByConfidence: Record<string, number>;
    averageConfidence: number;
    topSkills: Array<{
      skill: { id: string; name: string; slug: string; category: string; subcategory: string | null };
      userSkill: { id: string; proficiencyLevel: ProficiencyLevel; yearsOfExperience: number | null; confidence: number | null; verificationStatus: VerificationStatus; verificationMethod: string | null; lastUsedAt: Date | null };
      intelligence: { score: number; level: string; evidenceCount: number; factors: Record<string, unknown> };
      evidenceCount: number;
      evidenceTypes: string[];
      hasProjectEvidence: boolean;
    }>;
  }>;
  getUserSkillIntelligence(userId: string): Promise<Array<{
    skill: { id: string; name: string; slug: string; category: string; subcategory: string | null };
    userSkill: { id: string; proficiencyLevel: ProficiencyLevel; yearsOfExperience: number | null; confidence: number | null; verificationStatus: VerificationStatus; verificationMethod: string | null; lastUsedAt: Date | null };
    intelligence: { score: number; level: string; evidenceCount: number; factors: Record<string, unknown> };
    evidenceCount: number;
    evidenceTypes: string[];
    hasProjectEvidence: boolean;
  }>>;
  getSkillIntelligence(userId: string, skillId: string): Promise<{
    skill: { id: string; name: string; slug: string; category: string; subcategory: string | null };
    userSkill: { id: string; proficiencyLevel: ProficiencyLevel; yearsOfExperience: number | null; confidence: number | null; verificationStatus: VerificationStatus; verificationMethod: string | null; lastUsedAt: Date | null };
    intelligence: { score: number; level: string; evidenceCount: number; factors: Record<string, unknown> };
    evidenceCount: number;
    evidenceTypes: string[];
    hasProjectEvidence: boolean;
  } | null>;
}

export interface ISkillGraphService {
  getGraph(): Promise<{ nodes: Array<{ id: string; name: string; slug: string; category: string; subcategory: string | null }>; edges: Array<{ source: string; target: string; type: SkillRelationshipType; strength: number }> }>;
  getRelationships(skillId: string): Promise<Array<{ skill: { id: string; name: string; slug: string; category: string; subcategory: string | null }; type: SkillRelationshipType; strength: number }>>;
  findPath(sourceSkillId: string, targetSkillId: string): Promise<{ source: { id: string; name: string; slug: string; category: string; subcategory: string | null }; target: { id: string; name: string; slug: string; category: string; subcategory: string | null }; path: Array<{ id: string; name: string; slug: string; category: string; subcategory: string | null }>; edges: Array<{ source: string; target: string; type: SkillRelationshipType; strength: number }>; distance: number } | null>;
  analyzeSkillGap(userId: string, targetSkillId: string): Promise<{
    targetSkill: { id: string; name: string; slug: string; category: string; subcategory: string | null };
    prerequisites: Array<{ skill: { id: string; name: string; slug: string; category: string; subcategory: string | null }; status: 'KNOWN' | 'MISSING' | 'PARTIAL'; userProficiencyLevel?: string; userConfidence?: number; requiredStrength?: number }>;
    userKnownSkills: Array<{ skill: { id: string; name: string; slug: string; category: string; subcategory: string | null }; status: 'KNOWN' | 'MISSING' | 'PARTIAL'; userProficiencyLevel?: string; userConfidence?: number; requiredStrength?: number }>;
    missingPrerequisites: Array<{ skill: { id: string; name: string; slug: string; category: string; subcategory: string | null }; status: 'KNOWN' | 'MISSING' | 'PARTIAL'; userProficiencyLevel?: string; userConfidence?: number; requiredStrength?: number }>;
  }>;
}

export interface IProjectService {
  getAll(filters?: { ownerId?: string; organizationId?: string; status?: ProjectStatus; page?: number; pageSize?: number }): Promise<PaginatedResponse<Project>>;
  getById(id: string): Promise<Project | null>;
  getByOwnerAndSlug(ownerId: string, slug: string): Promise<Project | null>;
  create(ownerId: string, input: { title: string; slug: string; description: string; longDescription?: string; status?: ProjectStatus; visibility?: ProjectVisibility; repositoryUrl?: string; liveUrl?: string; documentationUrl?: string; thumbnailUrl?: string; startDate?: Date; endDate?: Date; organizationId?: string }): Promise<Project>;
  update(id: string, input: Partial<Project>): Promise<Project | null>;
  delete(id: string): Promise<boolean>;
  getSkills(projectId: string): Promise<Array<{ id: string; name: string; slug: string; category: string }>>;
  addSkill(projectId: string, skillId: string): Promise<ProjectSkill>;
  removeSkill(projectId: string, skillId: string): Promise<boolean>;
  getMembers(projectId: string): Promise<ProjectMember[]>;
  addMember(projectId: string, userId: string, role?: ProjectRole): Promise<ProjectMember>;
  updateMember(projectId: string, userId: string, role: ProjectRole): Promise<ProjectMember | null>;
  removeMember(projectId: string, userId: string): Promise<boolean>;
}

export interface IOrganizationService {
  getAll(filters?: { type?: OrganizationType; status?: OrganizationStatus; page?: number; pageSize?: number }): Promise<PaginatedResponse<Organization>>;
  getById(id: string): Promise<Organization | null>;
  getBySlug(slug: string): Promise<Organization | null>;
  create(input: { name: string; slug: string; description?: string; logoUrl?: string; websiteUrl?: string; type?: OrganizationType; status?: OrganizationStatus; size?: OrganizationSize; industry?: string; headquarters?: string }): Promise<Organization>;
  update(id: string, input: Partial<Organization>): Promise<Organization | null>;
  delete(id: string): Promise<boolean>;
  getMembers(organizationId: string): Promise<UserOrganization[]>;
  addMember(organizationId: string, userId: string, role?: OrgUserRole): Promise<UserOrganization>;
  updateMember(organizationId: string, userId: string, role: OrgUserRole): Promise<UserOrganization | null>;
  removeMember(organizationId: string, userId: string): Promise<boolean>;
}

export interface IOpportunityService {
  getAll(filters?: { organizationId?: string; type?: OpportunityType; status?: OpportunityStatus; isRemote?: boolean; page?: number; pageSize?: number }): Promise<PaginatedResponse<Opportunity>>;
  getById(id: string): Promise<Opportunity | null>;
  create(organizationId: string | undefined, input: { title: string; description: string; type: OpportunityType; status?: OpportunityStatus; location?: string; isRemote?: boolean; salaryMin?: number; salaryMax?: number; currency?: string; applicationDeadline?: Date; requirements?: Record<string, unknown>; benefits?: Record<string, unknown> }): Promise<Opportunity>;
  update(id: string, input: Partial<Opportunity>): Promise<Opportunity | null>;
  delete(id: string): Promise<boolean>;
  getSkills(opportunityId: string): Promise<OpportunitySkill[]>;
  addSkill(opportunityId: string, skillId: string, isRequired?: boolean): Promise<OpportunitySkill>;
  removeSkill(opportunityId: string, skillId: string): Promise<boolean>;
  apply(opportunityId: string, userId: string, coverLetter?: string, resumeId?: string): Promise<Application>;
  getApplications(opportunityId: string): Promise<Application[]>;
  updateApplication(applicationId: string, status: ApplicationStatus, reviewedBy?: string): Promise<Application | null>;
}