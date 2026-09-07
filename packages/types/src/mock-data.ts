import {
  User,
  UserRole,
  UserStatus,
  Profile,
  ProfileVisibility,
  Organization,
  OrganizationType,
  OrganizationStatus,
  OrganizationSize,
  UserOrganization,
  OrgUserRole,
  Skill,
  SkillCategory,
  DemandLevel,
  SkillAlias,
  UserSkill,
  ProficiencyLevel,
  VerificationStatus,
  VerificationMethod,
  SkillEvidence,
  EvidenceType,
  SkillRelationship,
  SkillRelationshipType,
  Project,
  ProjectStatus,
  ProjectVisibility,
  ProjectSkill,
  ProjectMember,
  ProjectRole,
  Team,
  TeamMember,
  TeamRole,
  Opportunity,
  OpportunityType,
  OpportunityStatus,
  OpportunitySkill,
  Application,
  ApplicationStatus,
  LearningResource,
  LearningResourceType,
  ResourceDifficulty,
  LearningPlan,
  LearningPlanStatus,
  LearningMilestone,
  AIExtractionJob,
  AIExtractionStatus,
  AIProviderType,
  AIExtractionResult,
  Resume,
  ResumeStatus,
  ResumeFileType,
  ResumeAnalysis,
  ResumeAnalysisStatus,
  DuplicateDetectionStatus,
  Session,
  SessionStatus,
  VerificationToken,
  VerificationTokenType,
  AuditLog,
  Notification,
  Json,
} from './index';

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'usr_' + Math.random().toString(36).substring(2, 15),
    email: 'dev@skillsync.local',
    username: 'devuser',
    passwordHash: 'dev-password-hash-placeholder',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date(),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    deletedAt: undefined,
    defaultOrgId: 'org_skillsync',
    ...overrides,
  };
}

export function createMockOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org_skillsync',
    name: 'SkillSync',
    slug: 'skillsync',
    description: 'Intelligent platform for skills discovery and career development',
    logoUrl: undefined,
    websiteUrl: 'https://skillsync.local',
    type: OrganizationType.COMPANY,
    status: OrganizationStatus.ACTIVE,
    size: OrganizationSize.STARTUP,
    industry: 'Technology',
    headquarters: 'San Francisco, CA',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    deletedAt: undefined,
    ...overrides,
  };
}

export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'prof_devuser',
    userId: 'usr_devuser',
    firstName: 'Dev',
    lastName: 'User',
    displayName: 'Dev User',
    bio: 'Development user for SkillSync platform testing',
    headline: 'Full-stack Developer | SkillSync Core Team',
    location: 'San Francisco, CA',
    profileImageUrl: undefined,
    websiteUrl: 'https://skillsync.local',
    visibility: ProfileVisibility.PUBLIC,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockUserOrganization(overrides: Partial<UserOrganization> = {}): UserOrganization {
  return {
    id: 'uo_dev_skillsync',
    userId: 'usr_devuser',
    organizationId: 'org_skillsync',
    role: OrgUserRole.ORG_ADMIN,
    joinedAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockSkillCatalog(): Skill[] {
  const baseDate = new Date('2024-01-01');
  return [
    createMockSkill({
      id: 'skill_typescript',
      name: 'TypeScript',
      slug: 'typescript',
      description: 'Strongly typed programming language that builds on JavaScript',
      category: SkillCategory.PROGRAMMING,
      subcategory: 'Web Development',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    }),
    createMockSkill({
      id: 'skill_react',
      name: 'React',
      slug: 'react',
      description: 'JavaScript library for building user interfaces',
      category: SkillCategory.PROGRAMMING,
      subcategory: 'Frontend Development',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    }),
    createMockSkill({
      id: 'skill_nodejs',
      name: 'Node.js',
      slug: 'nodejs',
      description: 'JavaScript runtime built on Chrome V8 engine',
      category: SkillCategory.PROGRAMMING,
      subcategory: 'Backend Development',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    }),
    createMockSkill({
      id: 'skill_postgresql',
      name: 'PostgreSQL',
      slug: 'postgresql',
      description: 'Advanced open-source relational database',
      category: SkillCategory.PROGRAMMING,
      subcategory: 'Database',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    }),
    createMockSkill({
      id: 'skill_python',
      name: 'Python',
      slug: 'python',
      description: 'High-level programming language for general-purpose programming',
      category: SkillCategory.PROGRAMMING,
      subcategory: 'Data Science',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    }),
    createMockSkill({
      id: 'skill_aws',
      name: 'Amazon Web Services',
      slug: 'aws',
      description: 'Cloud computing platform',
      category: SkillCategory.OPERATIONS,
      subcategory: 'Cloud Infrastructure',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    }),
    createMockSkill({
      id: 'skill_docker',
      name: 'Docker',
      slug: 'docker',
      description: 'Containerization platform',
      category: SkillCategory.OPERATIONS,
      subcategory: 'DevOps',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    }),
    createMockSkill({
      id: 'skill_ui_design',
      name: 'UI Design',
      slug: 'ui-design',
      description: 'User interface design principles and tools',
      category: SkillCategory.DESIGN,
      subcategory: 'Product Design',
      isVerified: true,
      demandLevel: DemandLevel.MEDIUM,
    }),
    createMockSkill({
      id: 'skill_project_mgmt',
      name: 'Project Management',
      slug: 'project-management',
      description: 'Planning, executing, and closing projects',
      category: SkillCategory.MANAGEMENT,
      subcategory: 'Project Management',
      isVerified: true,
      demandLevel: DemandLevel.MEDIUM,
    }),
    createMockSkill({
      id: 'skill_ml',
      name: 'Machine Learning',
      slug: 'machine-learning',
      description: 'Algorithms and statistical models for AI',
      category: SkillCategory.DATA_SCIENCE,
      subcategory: 'Artificial Intelligence',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    }),
  ];
}

export function createMockSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'skill_' + Math.random().toString(36).substring(2, 10),
    name: 'Mock Skill',
    slug: 'mock-skill',
    description: 'A mock skill for testing',
    category: SkillCategory.PROGRAMMING,
    subcategory: 'Testing',
    iconUrl: undefined,
    isVerified: false,
    demandLevel: DemandLevel.MEDIUM,
    organizationId: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
    ...overrides,
  };
}

export function createMockSkillAlias(overrides: Partial<SkillAlias> = {}): SkillAlias {
  return {
    id: 'sa_' + Math.random().toString(36).substring(2, 10),
    skillId: 'skill_typescript',
    alias: 'TS',
    normalizedAlias: 'ts',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockUserSkill(overrides: Partial<UserSkill> = {}): UserSkill {
  return {
    id: 'us_' + Math.random().toString(36).substring(2, 15),
    userId: 'usr_devuser',
    skillId: 'skill_typescript',
    proficiencyLevel: ProficiencyLevel.EXPERT,
    yearsOfExperience: 5,
    confidence: 95,
    verificationStatus: VerificationStatus.VERIFIED,
    verificationMethod: VerificationMethod.PROJECT_DEMONSTRATED,
    verifiedAt: new Date(),
    verifiedBy: 'usr_devuser',
    lastUsedAt: new Date(),
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockSkillEvidence(overrides: Partial<SkillEvidence> = {}): SkillEvidence {
  return {
    id: 'se_' + Math.random().toString(36).substring(2, 15),
    userSkillId: 'us_devuser_typescript',
    skillId: 'skill_typescript',
    type: EvidenceType.PROJECT,
    title: 'SkillSync Platform Development',
    description: 'Built the core SkillSync platform using TypeScript',
    url: 'https://github.com/skillsync/platform',
    metadata: { repo: 'skillsync/platform', role: 'Lead Developer' },
    verifiedAt: new Date(),
    verifiedBy: 'usr_devuser',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockSkillRelationship(overrides: Partial<SkillRelationship> = {}): SkillRelationship {
  return {
    id: 'sr_' + Math.random().toString(36).substring(2, 15),
    sourceSkillId: 'skill_nodejs',
    targetSkillId: 'skill_react',
    type: SkillRelationshipType.PREREQUISITE,
    strength: 0.9,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj_skillsync_platform',
    ownerId: 'usr_devuser',
    title: 'SkillSync Platform',
    slug: 'skillsync-platform',
    description: 'Core platform for skills discovery, evaluation, and career development',
    longDescription: 'A comprehensive monorepo application built with Next.js, Hono, Prisma, and PostgreSQL.',
    status: ProjectStatus.IN_PROGRESS,
    visibility: ProjectVisibility.PUBLIC,
    repositoryUrl: 'https://github.com/skillsync/platform',
    liveUrl: 'https://skillsync.local',
    documentationUrl: undefined,
    thumbnailUrl: undefined,
    startDate: new Date('2024-01-15'),
    endDate: undefined,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    deletedAt: undefined,
    organizationId: 'org_skillsync',
    ...overrides,
  };
}

export function createMockProjectSkill(overrides: Partial<ProjectSkill> = {}): ProjectSkill {
  return {
    id: 'ps_' + Math.random().toString(36).substring(2, 15),
    projectId: 'proj_skillsync_platform',
    skillId: 'skill_typescript',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    ...overrides,
  };
}

export function createMockProjectMember(overrides: Partial<ProjectMember> = {}): ProjectMember {
  return {
    id: 'pm_' + Math.random().toString(36).substring(2, 15),
    userId: 'usr_devuser',
    projectId: 'proj_skillsync_platform',
    role: ProjectRole.OWNER,
    joinedAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team_core',
    name: 'Core Team',
    slug: 'core-team',
    description: 'Core development team for SkillSync platform',
    ownerId: 'usr_devuser',
    organizationId: 'org_skillsync',
    avatarUrl: undefined,
    isPublic: true,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockTeamMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 'tm_dev_core',
    userId: 'usr_devuser',
    teamId: 'team_core',
    role: TeamRole.OWNER,
    joinedAt: new Date('2024-01-20'),
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp_senior_fse',
    organizationId: 'org_skillsync',
    title: 'Senior Full-Stack Engineer',
    description: 'Join our core team to build the future of skills-based career development.',
    type: OpportunityType.JOB,
    status: OpportunityStatus.OPEN,
    location: 'San Francisco, CA',
    isRemote: true,
    salaryMin: 150000,
    salaryMax: 220000,
    currency: 'USD',
    applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    requirements: { skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'], experience: '5+ years' },
    benefits: { equity: '0.1-0.5%', health: '100% covered', remote: 'Fully remote' },
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    deletedAt: undefined,
    ...overrides,
  };
}

export function createMockOpportunitySkill(overrides: Partial<OpportunitySkill> = {}): OpportunitySkill {
  return {
    id: 'os_' + Math.random().toString(36).substring(2, 15),
    opportunityId: 'opp_senior_fse',
    skillId: 'skill_typescript',
    isRequired: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    ...overrides,
  };
}

export function createMockApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 'app_devuser_senior_fse',
    userId: 'usr_devuser',
    opportunityId: 'opp_senior_fse',
    status: ApplicationStatus.APPLIED,
    coverLetter: 'I am excited to apply...',
    resumeId: 'res_devuser_latest',
    appliedAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
    createdAt: new Date('2024-02-15'),
    reviewedAt: new Date('2024-02-16'),
    reviewedBy: 'usr_recruiter',
    ...overrides,
  };
}

export function createMockLearningResource(overrides: Partial<LearningResource> = {}): LearningResource {
  return {
    id: 'lr_typescript_handbook',
    title: 'TypeScript Handbook',
    description: 'The official TypeScript documentation and handbook',
    url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
    provider: 'TypeScript Team',
    type: LearningResourceType.DOCUMENTATION,
    skillId: 'skill_typescript',
    difficulty: ResourceDifficulty.BEGINNER,
    language: 'en',
    durationMinutes: undefined,
    rating: 4.8,
    qualityScore: 0.95,
    verifiedSource: true,
    lastCheckedAt: new Date(),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    deletedAt: undefined,
    organizationId: undefined,
    ...overrides,
  };
}

export function createMockLearningPlan(overrides: Partial<LearningPlan> = {}): LearningPlan {
  return {
    id: 'lp_devuser_ml',
    userId: 'usr_devuser',
    targetSkillId: 'skill_ml',
    status: LearningPlanStatus.ACTIVE,
    currentMilestone: 0,
    completedAt: undefined,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockLearningMilestone(overrides: Partial<LearningMilestone> = {}): LearningMilestone {
  return {
    id: 'lm_ml_1',
    planId: 'lp_devuser_ml',
    skillId: 'skill_python',
    order: 0,
    targetProficiency: ProficiencyLevel.INTERMEDIATE,
    status: LearningPlanStatus.ACTIVE,
    completedAt: undefined,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockAIExtractionJob(overrides: Partial<AIExtractionJob> = {}): AIExtractionJob {
  return {
    id: 'aej_' + Math.random().toString(36).substring(2, 15),
    userId: 'usr_devuser',
    inputText: 'I have 5 years of TypeScript experience...',
    inputTextHash: 'hash_' + Math.random().toString(36).substring(2, 15),
    status: AIExtractionStatus.COMPLETED,
    providerType: AIProviderType.OPENAI,
    model: 'gpt-4o-mini',
    inputTokens: 500,
    outputTokens: 200,
    latencyMs: 1500,
    errorMessage: undefined,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    completedAt: new Date('2024-02-01'),
    ...overrides,
  };
}

export function createMockAIExtractionResult(overrides: Partial<AIExtractionResult> = {}): AIExtractionResult {
  return {
    id: 'aer_' + Math.random().toString(36).substring(2, 15),
    jobId: 'aej_123',
    skillName: 'TypeScript',
    skillSlug: 'typescript',
    matchedSkillId: 'skill_typescript',
    isMatched: true,
    confidence: 0.95,
    evidenceSnippet: '5 years of TypeScript experience building production apps',
    reasoning: 'Direct match to verified skill',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    ...overrides,
  };
}

export function createMockResume(overrides: Partial<Resume> = {}): Resume {
  return {
    id: 'res_devuser_latest',
    userId: 'usr_devuser',
    originalFilename: 'resume.pdf',
    storageKey: 'uploads/usr_devuser/resume_123.pdf',
    fileType: ResumeFileType.PDF,
    fileSize: 102400,
    status: ResumeStatus.READY,
    mimeType: 'application/pdf',
    deletedAt: undefined,
    organizationId: 'org_skillsync',
    analysis: createMockResumeAnalysis(),
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
    ...overrides,
  };
}

export function createMockResumeAnalysis(overrides: Partial<ResumeAnalysis> = {}): ResumeAnalysis {
  return {
    id: 'ra_devuser_latest',
    resumeId: 'res_devuser_latest',
    status: ResumeAnalysisStatus.COMPLETED,
    model: 'gpt-4o-mini',
    providerType: 'openai',
    inputTokens: 1000,
    outputTokens: 500,
    latencyMs: 2000,
    errorMessage: undefined,
    personalInfo: { name: 'Dev User', email: 'dev@skillsync.local', location: 'San Francisco, CA' },
    summary: 'Full-stack developer with 5+ years experience...',
    skills: { 'TypeScript': 5, 'React': 4, 'Node.js': 4, 'PostgreSQL': 3 },
    experiences: [{ company: 'SkillSync', role: 'Lead Developer', years: 2 }] as any,
    education: [{ degree: 'BS Computer Science', school: 'Stanford', year: 2019 }] as any,
    projects: [{ name: 'SkillSync Platform', description: 'Core platform', skills: ['TypeScript', 'React'] }] as any,
    certifications: [{ name: 'AWS Certified', issuer: 'Amazon', year: 2023 }] as any,
    duplicateFlags: {},
    completedAt: new Date('2024-02-10'),
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
    ...overrides,
  };
}

export function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess_' + Math.random().toString(36).substring(2, 15),
    userId: 'usr_devuser',
    token: 'token_' + Math.random().toString(36).substring(2, 30),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: SessionStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockVerificationToken(overrides: Partial<VerificationToken> = {}): VerificationToken {
  return {
    id: 'vt_' + Math.random().toString(36).substring(2, 15),
    userId: 'usr_devuser',
    token: 'vt_token_' + Math.random().toString(36).substring(2, 30),
    type: VerificationTokenType.EMAIL_VERIFICATION,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    usedAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'al_' + Math.random().toString(36).substring(2, 15),
    userId: 'usr_devuser',
    action: 'CREATE',
    entityType: 'UserSkill',
    entityId: 'us_devuser_typescript',
    oldData: undefined,
    newData: { skillId: 'skill_typescript', proficiencyLevel: 'EXPERT' },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0...',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif_' + Math.random().toString(36).substring(2, 15),
    userId: 'usr_devuser',
    type: 'SKILL_VERIFIED',
    title: 'Skill Verified',
    message: 'Your TypeScript skill has been verified!',
    data: { skillId: 'skill_typescript' },
    readAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export const mockData = {
  get user() { return createMockUser(); },
  get organization() { return createMockOrganization(); },
  get profile() { return createMockProfile(); },
  get userOrganization() { return createMockUserOrganization(); },
  get skills() { return createMockSkillCatalog(); },
  get skillAlias() { return createMockSkillAlias(); },
  get userSkill() { return createMockUserSkill(); },
  get skillEvidence() { return createMockSkillEvidence(); },
  get skillRelationship() { return createMockSkillRelationship(); },
  get project() { return createMockProject(); },
  get projectSkill() { return createMockProjectSkill(); },
  get projectMember() { return createMockProjectMember(); },
  get team() { return createMockTeam(); },
  get teamMember() { return createMockTeamMember(); },
  get opportunity() { return createMockOpportunity(); },
  get opportunitySkill() { return createMockOpportunitySkill(); },
  get application() { return createMockApplication(); },
  get learningResource() { return createMockLearningResource(); },
  get learningPlan() { return createMockLearningPlan(); },
  get learningMilestone() { return createMockLearningMilestone(); },
  get aiExtractionJob() { return createMockAIExtractionJob(); },
  get aiExtractionResult() { return createMockAIExtractionResult(); },
  get resume() { return createMockResume(); },
  get resumeAnalysis() { return createMockResumeAnalysis(); },
  get session() { return createMockSession(); },
  get verificationToken() { return createMockVerificationToken(); },
  get auditLog() { return createMockAuditLog(); },
  get notification() { return createMockNotification(); },
};