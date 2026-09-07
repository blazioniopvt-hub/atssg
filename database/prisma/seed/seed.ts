// SkillSync Database Seed
// Phase 2: Development seed data
// This seed creates minimal development data only.
// DO NOT use real personal information.

import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from monorepo root and current directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })
dotenv.config()
import { PrismaClient, UserRole, UserStatus, ProfileVisibility, ProficiencyLevel, VerificationStatus, SkillCategory, DemandLevel, ProjectStatus, ProjectVisibility, OrganizationType, OrganizationStatus, OpportunityType, OpportunityStatus, TeamRole, ProjectRole, OrganizationSize, VerificationMethod, EvidenceType, SkillRelationshipType, LearningResourceType, ResourceDifficulty } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing data in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Clearing existing data...')
    await prisma.roleSkillRequirement.deleteMany()
    await prisma.targetRole.deleteMany()
    await prisma.skillEvidence.deleteMany()
    await prisma.userSkill.deleteMany()
    await prisma.projectSkill.deleteMany()
    await prisma.projectMember.deleteMany()
    await prisma.opportunitySkill.deleteMany()
    await prisma.opportunity.deleteMany()
    await prisma.project.deleteMany()
    await prisma.teamMember.deleteMany()
    await prisma.team.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.profile.deleteMany()
    await prisma.skill.deleteMany()
    await prisma.user.deleteMany()
  }

  // Create skills
  console.log('🎯 Creating skills...')
  const skillDefinitions = [
    {
      name: 'TypeScript',
      slug: 'typescript',
      description: 'Strongly typed programming language that builds on JavaScript',
      category: SkillCategory.PROGRAMMING,
      subcategory: 'Web Development',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
    {
      name: 'React',
      slug: 'react',
      description: 'JavaScript library for building user interfaces',
      category: SkillCategory.PROGRAMMING,
      subcategory: 'Frontend Development',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
    {
      name: 'Node.js',
      slug: 'nodejs',
      description: 'JavaScript runtime built on Chrome V8 engine',
      category: SkillCategory.PROGRAMMING,
      subcategory: 'Backend Development',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
    {
      name: 'PostgreSQL',
      slug: 'postgresql',
      description: 'Advanced open-source relational database',
      category: SkillCategory.PROGRAMMING,
      subcategory: 'Database',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
    {
      name: 'Python',
      slug: 'python',
      description: 'High-level programming language for general-purpose programming',
      category: SkillCategory.PROGRAMMING,
      subcategory: 'Data Science',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
    {
      name: 'Amazon Web Services',
      slug: 'aws',
      description: 'Cloud computing platform',
      category: SkillCategory.OPERATIONS,
      subcategory: 'Cloud Infrastructure',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
    {
      name: 'Docker',
      slug: 'docker',
      description: 'Containerization platform',
      category: SkillCategory.OPERATIONS,
      subcategory: 'DevOps',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
    {
      name: 'UI Design',
      slug: 'ui-design',
      description: 'User interface design principles and tools',
      category: SkillCategory.DESIGN,
      subcategory: 'Product Design',
      isVerified: true,
      demandLevel: DemandLevel.MEDIUM,
    },
    {
      name: 'Project Management',
      slug: 'project-management',
      description: 'Planning, executing, and closing projects',
      category: SkillCategory.MANAGEMENT,
      subcategory: 'Project Management',
      isVerified: true,
      demandLevel: DemandLevel.MEDIUM,
    },
    {
      name: 'Machine Learning',
      slug: 'machine-learning',
      description: 'Algorithms and statistical models for AI',
      category: SkillCategory.DATA_SCIENCE,
      subcategory: 'Artificial Intelligence',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
    {
      name: 'Data Analysis & Statistics',
      slug: 'data-analysis',
      description: 'Statistical modeling, exploratory data analysis, and quantitative insights',
      category: SkillCategory.DATA_SCIENCE,
      subcategory: 'Analytics',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
    {
      name: 'Deep Learning',
      slug: 'deep-learning',
      description: 'Neural networks, PyTorch, TensorFlow, and deep representation learning',
      category: SkillCategory.DATA_SCIENCE,
      subcategory: 'Artificial Intelligence',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
    {
      name: 'Kubernetes',
      slug: 'kubernetes',
      description: 'Automated container deployment, scaling, and cluster management',
      category: SkillCategory.OPERATIONS,
      subcategory: 'Cloud Infrastructure',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
    {
      name: 'CI/CD Pipelines',
      slug: 'ci-cd',
      description: 'Continuous integration, continuous deployment, and automated release pipelines',
      category: SkillCategory.OPERATIONS,
      subcategory: 'DevOps',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
    {
      name: 'Network Security',
      slug: 'network-security',
      description: 'Securing network architectures, firewalls, and cryptographic protocols',
      category: SkillCategory.OPERATIONS,
      subcategory: 'Cybersecurity',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
    {
      name: 'Ethical Hacking & Pen Testing',
      slug: 'ethical-hacking',
      description: 'Vulnerability assessment, penetration testing, and security auditing',
      category: SkillCategory.OPERATIONS,
      subcategory: 'Cybersecurity',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
    {
      name: 'SIEM & Threat Monitoring',
      slug: 'siem',
      description: 'Security incident and event monitoring, threat detection, and log analysis',
      category: SkillCategory.OPERATIONS,
      subcategory: 'Cybersecurity',
      isVerified: true,
      demandLevel: DemandLevel.HIGH,
    },
  ];

  const skills = [];
  for (const s of skillDefinitions) {
    const existing = await prisma.skill.findFirst({
      where: { slug: s.slug, organizationId: null },
    });
    if (existing) {
      skills.push(existing);
    } else {
      const created = await prisma.skill.create({
        data: { ...s, organizationId: null },
      });
      skills.push(created);
    }
  }

  console.log(`✅ Created ${skills.length} skills`)

  // Create a development user
  console.log('👤 Creating development user...')
  const devUser = await prisma.user.upsert({
    where: { email: 'dev@skillsync.local' },
    update: { role: UserRole.ADMIN },
    create: {
      email: 'dev@skillsync.local',
      username: 'devuser',
      passwordHash: 'dev-password-hash-placeholder', // NOT a real hash - for development only
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  })

  // Create profile for dev user
  await prisma.profile.upsert({
    where: { userId: devUser.id },
    update: {},
    create: {
      userId: devUser.id,
      firstName: 'Dev',
      lastName: 'User',
      displayName: 'Dev User',
      bio: 'Development user for SkillSync platform testing',
      headline: 'Full-stack Developer | SkillSync Core Team',
      location: 'San Francisco, CA',
      websiteUrl: 'https://skillsync.local',
      visibility: ProfileVisibility.PUBLIC,
    },
  })

  console.log('✅ Created development user and profile')

  // Create user skills for dev user
  console.log('🎯 Assigning skills to development user...')
  const userSkills = await Promise.all([
    prisma.userSkill.upsert({
      where: { userId_skillId: { userId: devUser.id, skillId: skills[0].id } }, // TypeScript
      update: {},
      create: {
        userId: devUser.id,
        skillId: skills[0].id,
        proficiencyLevel: ProficiencyLevel.EXPERT,
        yearsOfExperience: 5,
        confidence: 95,
        verificationStatus: VerificationStatus.VERIFIED,
        verificationMethod: VerificationMethod.PROJECT_DEMONSTRATED,
        verifiedAt: new Date(),
      },
    }),
    prisma.userSkill.upsert({
      where: { userId_skillId: { userId: devUser.id, skillId: skills[1].id } }, // React
      update: {},
      create: {
        userId: devUser.id,
        skillId: skills[1].id,
        proficiencyLevel: ProficiencyLevel.ADVANCED,
        yearsOfExperience: 4,
        confidence: 90,
        verificationStatus: VerificationStatus.VERIFIED,
        verificationMethod: VerificationMethod.PROJECT_DEMONSTRATED,
        verifiedAt: new Date(),
      },
    }),
    prisma.userSkill.upsert({
      where: { userId_skillId: { userId: devUser.id, skillId: skills[2].id } }, // Node.js
      update: {},
      create: {
        userId: devUser.id,
        skillId: skills[2].id,
        proficiencyLevel: ProficiencyLevel.ADVANCED,
        yearsOfExperience: 4,
        confidence: 85,
        verificationStatus: VerificationStatus.VERIFIED,
        verificationMethod: VerificationMethod.PROJECT_DEMONSTRATED,
        verifiedAt: new Date(),
      },
    }),
    prisma.userSkill.upsert({
      where: { userId_skillId: { userId: devUser.id, skillId: skills[3].id } }, // PostgreSQL
      update: {},
      create: {
        userId: devUser.id,
        skillId: skills[3].id,
        proficiencyLevel: ProficiencyLevel.INTERMEDIATE,
        yearsOfExperience: 3,
        confidence: 80,
        verificationStatus: VerificationStatus.VERIFIED,
        verificationMethod: VerificationMethod.ASSESSMENT_PASSED,
        verifiedAt: new Date(),
      },
    }),
    prisma.userSkill.upsert({
      where: { userId_skillId: { userId: devUser.id, skillId: skills[5].id } }, // AWS
      update: {},
      create: {
        userId: devUser.id,
        skillId: skills[5].id,
        proficiencyLevel: ProficiencyLevel.INTERMEDIATE,
        yearsOfExperience: 2,
        confidence: 75,
        verificationStatus: VerificationStatus.PENDING,
        verificationMethod: VerificationMethod.CERTIFICATION,
      },
    }),
  ])

  console.log(`✅ Created ${userSkills.length} user skills`)

  // Create skill evidence
  console.log('📜 Creating skill evidence...')
  await Promise.all([
    prisma.skillEvidence.create({
      data: {
        userSkillId: userSkills[0].id,
        skillId: skills[0].id,
        type: EvidenceType.PROJECT,
        title: 'SkillSync Platform Development',
        description: 'Built the core SkillSync platform using TypeScript, including monorepo architecture, API design, and database schema.',
        url: 'https://github.com/skillsync/platform',
        metadata: { repo: 'skillsync/platform', role: 'Lead Developer' },
        verifiedAt: new Date(),
        verifiedBy: devUser.id,
      },
    }),
    prisma.skillEvidence.create({
      data: {
        userSkillId: userSkills[1].id,
        skillId: skills[1].id,
        type: EvidenceType.PROJECT,
        title: 'React Dashboard Application',
        description: 'Developed a complex dashboard with React, TypeScript, and Tailwind CSS.',
        url: 'https://github.com/skillsync/dashboard',
        metadata: { repo: 'skillsync/dashboard', role: 'Frontend Lead' },
        verifiedAt: new Date(),
        verifiedBy: devUser.id,
      },
    }),
    prisma.skillEvidence.create({
      data: {
        userSkillId: userSkills[3].id,
        skillId: skills[3].id,
        type: EvidenceType.CERTIFICATE,
        title: 'PostgreSQL Certification',
        description: 'Completed PostgreSQL administration and performance tuning certification.',
        url: 'https://example.com/cert/postgresql',
        metadata: { issuer: 'PostgreSQL Global Development Group', year: 2023 },
        verifiedAt: new Date(),
        verifiedBy: devUser.id,
      },
    }),
  ])

  console.log('✅ Created skill evidence')

  // Create organization
  console.log('🏢 Creating organization...')
  const org = await prisma.organization.upsert({
    where: { slug: 'skillsync' },
    update: {},
    create: {
      name: 'SkillSync',
      slug: 'skillsync',
      description: 'Intelligent platform for skills discovery and career development',
      websiteUrl: 'https://skillsync.local',
      type: OrganizationType.COMPANY,
      status: OrganizationStatus.ACTIVE,
      size: OrganizationSize.STARTUP,
      industry: 'Technology',
      headquarters: 'San Francisco, CA',
    },
  })

  console.log('✅ Created organization')

  // Create projects
  console.log('📁 Creating projects...')
  const projects = await Promise.all([
    prisma.project.upsert({
      where: { ownerId_slug: { ownerId: devUser.id, slug: 'skillsync-platform' } },
      update: {},
      create: {
        ownerId: devUser.id,
        title: 'SkillSync Platform',
        slug: 'skillsync-platform',
        description: 'Core platform for skills discovery, evaluation, and career development',
        longDescription: 'A comprehensive monorepo application built with Next.js, Hono, Prisma, and PostgreSQL. Features include user profiles, skill management, project showcase, team collaboration, and opportunity matching.',
        status: ProjectStatus.IN_PROGRESS,
        visibility: ProjectVisibility.PUBLIC,
        repositoryUrl: 'https://github.com/skillsync/platform',
        liveUrl: 'https://skillsync.local',
        startDate: new Date('2024-01-15'),
      },
    }),
    prisma.project.upsert({
      where: { ownerId_slug: { ownerId: devUser.id, slug: 'skillsync-dashboard' } },
      update: {},
      create: {
        ownerId: devUser.id,
        title: 'SkillSync Dashboard',
        slug: 'skillsync-dashboard',
        description: 'User dashboard for skill tracking and career insights',
        longDescription: 'React-based dashboard with real-time skill proficiency visualization, project portfolio, and learning path recommendations.',
        status: ProjectStatus.COMPLETED,
        visibility: ProjectVisibility.PUBLIC,
        repositoryUrl: 'https://github.com/skillsync/dashboard',
        liveUrl: 'https://dashboard.skillsync.local',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-06-15'),
      },
    }),
  ])

  console.log(`✅ Created ${projects.length} projects`)

  // Create project skills
  console.log('🔗 Linking skills to projects...')
  await Promise.all([
    prisma.projectSkill.create({
      data: { projectId: projects[0].id, skillId: skills[0].id }, // TypeScript
    }),
    prisma.projectSkill.create({
      data: { projectId: projects[0].id, skillId: skills[1].id }, // React
    }),
    prisma.projectSkill.create({
      data: { projectId: projects[0].id, skillId: skills[2].id }, // Node.js
    }),
    prisma.projectSkill.create({
      data: { projectId: projects[0].id, skillId: skills[3].id }, // PostgreSQL
    }),
    prisma.projectSkill.create({
      data: { projectId: projects[0].id, skillId: skills[5].id }, // AWS
    }),
    prisma.projectSkill.create({
      data: { projectId: projects[0].id, skillId: skills[6].id }, // Docker
    }),
    prisma.projectSkill.create({
      data: { projectId: projects[1].id, skillId: skills[0].id }, // TypeScript
    }),
    prisma.projectSkill.create({
      data: { projectId: projects[1].id, skillId: skills[1].id }, // React
    }),
    prisma.projectSkill.create({
      data: { projectId: projects[1].id, skillId: skills[7].id }, // UI Design
    }),
  ])

  console.log('✅ Linked skills to projects')

  // Create skill relationships (Skill Graph)
  console.log('🔗 Creating skill relationships...')
  const skillRelationships = await Promise.all([
    // Programming language foundations
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[4].id, targetSkillId: skills[0].id, type: 'PREREQUISITE' } }, // Python -> TypeScript (as a general programming foundation)
      update: {},
      create: { sourceSkillId: skills[4].id, targetSkillId: skills[0].id, type: 'PREREQUISITE', strength: 0.7 },
    }),
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[2].id, targetSkillId: skills[1].id, type: 'PREREQUISITE' } }, // Node.js -> React
      update: {},
      create: { sourceSkillId: skills[2].id, targetSkillId: skills[1].id, type: 'PREREQUISITE', strength: 0.9 },
    }),
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[0].id, targetSkillId: skills[1].id, type: 'PREREQUISITE' } }, // TypeScript -> React
      update: {},
      create: { sourceSkillId: skills[0].id, targetSkillId: skills[1].id, type: 'PREREQUISITE', strength: 0.8 },
    }),
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[0].id, targetSkillId: skills[2].id, type: 'PREREQUISITE' } }, // TypeScript -> Node.js
      update: {},
      create: { sourceSkillId: skills[0].id, targetSkillId: skills[2].id, type: 'PREREQUISITE', strength: 0.8 },
    }),
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[3].id, targetSkillId: skills[2].id, type: 'PREREQUISITE' } }, // PostgreSQL -> Node.js (backend)
      update: {},
      create: { sourceSkillId: skills[3].id, targetSkillId: skills[2].id, type: 'PREREQUISITE', strength: 0.7 },
    }),

    // AI/ML Prerequisites
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[4].id, targetSkillId: skills[9].id, type: 'PREREQUISITE' } }, // Python -> Machine Learning
      update: {},
      create: { sourceSkillId: skills[4].id, targetSkillId: skills[9].id, type: 'PREREQUISITE', strength: 0.95 },
    }),

    // Web Development Relationships
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[1].id, targetSkillId: skills[7].id, type: 'RELATED' } }, // React <-> UI Design
      update: {},
      create: { sourceSkillId: skills[1].id, targetSkillId: skills[7].id, type: 'RELATED', strength: 0.8 },
    }),
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[0].id, targetSkillId: skills[5].id, type: 'RELATED' } }, // TypeScript <-> AWS
      update: {},
      create: { sourceSkillId: skills[0].id, targetSkillId: skills[5].id, type: 'RELATED', strength: 0.6 },
    }),
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[2].id, targetSkillId: skills[5].id, type: 'RELATED' } }, // Node.js <-> AWS
      update: {},
      create: { sourceSkillId: skills[2].id, targetSkillId: skills[5].id, type: 'RELATED', strength: 0.7 },
    }),
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[6].id, targetSkillId: skills[5].id, type: 'RELATED' } }, // Docker <-> AWS
      update: {},
      create: { sourceSkillId: skills[6].id, targetSkillId: skills[5].id, type: 'RELATED', strength: 0.8 },
    }),

    // Subskills
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[7].id, targetSkillId: skills[1].id, type: 'SUBSKILL' } }, // UI Design is a subskill of React (React Native, etc.)
      update: {},
      create: { sourceSkillId: skills[7].id, targetSkillId: skills[1].id, type: 'SUBSKILL', strength: 0.6 },
    }),

    // Complementary
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[0].id, targetSkillId: skills[3].id, type: 'COMPLEMENTARY' } }, // TypeScript + PostgreSQL
      update: {},
      create: { sourceSkillId: skills[0].id, targetSkillId: skills[3].id, type: 'COMPLEMENTARY', strength: 0.8 },
    }),
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[5].id, targetSkillId: skills[6].id, type: 'COMPLEMENTARY' } }, // AWS + Docker
      update: {},
      create: { sourceSkillId: skills[5].id, targetSkillId: skills[6].id, type: 'COMPLEMENTARY', strength: 0.9 },
    }),
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[1].id, targetSkillId: skills[2].id, type: 'COMPLEMENTARY' } }, // React + Node.js
      update: {},
      create: { sourceSkillId: skills[1].id, targetSkillId: skills[2].id, type: 'COMPLEMENTARY', strength: 0.85 },
    }),
    prisma.skillRelationship.upsert({
      where: { sourceSkillId_targetSkillId_type: { sourceSkillId: skills[4].id, targetSkillId: skills[3].id, type: 'COMPLEMENTARY' } }, // Python + PostgreSQL (Data Science + DB)
      update: {},
      create: { sourceSkillId: skills[4].id, targetSkillId: skills[3].id, type: 'COMPLEMENTARY', strength: 0.75 },
    }),
  ])

  console.log(`✅ Created ${skillRelationships.length} skill relationships`)
  console.log('👥 Creating team...')
  const team = await prisma.team.upsert({
    where: { ownerId_slug: { ownerId: devUser.id, slug: 'core-team' } },
    update: {},
    create: {
      name: 'Core Team',
      slug: 'core-team',
      description: 'Core development team for SkillSync platform',
      ownerId: devUser.id,
      organizationId: org.id,
      isPublic: true,
    },
  })

  // Add dev user as team owner
  await prisma.teamMember.upsert({
    where: { userId_teamId: { userId: devUser.id, teamId: team.id } },
    update: {},
    create: {
      userId: devUser.id,
      teamId: team.id,
      role: TeamRole.OWNER,
    },
  })

  console.log('✅ Created team')

  // Create opportunities
  console.log('💼 Creating opportunities...')
  await Promise.all([
    prisma.opportunity.create({
      data: {
        organizationId: org.id,
        title: 'Senior Full-Stack Engineer',
        description: 'Join our core team to build the future of skills-based career development. Work with TypeScript, React, Node.js, and PostgreSQL in a modern monorepo architecture.',
        type: OpportunityType.JOB,
        status: OpportunityStatus.OPEN,
        location: 'San Francisco, CA',
        isRemote: true,
        salaryMin: 150000,
        salaryMax: 220000,
        currency: 'USD',
        applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        requirements: { skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'], experience: '5+ years' },
        benefits: { equity: '0.1-0.5%', health: '100% covered', remote: 'Fully remote' },
        skills: {
          create: [
            { skillId: skills[0].id, isRequired: true }, // TypeScript
            { skillId: skills[1].id, isRequired: true }, // React
            { skillId: skills[2].id, isRequired: true }, // Node.js
            { skillId: skills[3].id, isRequired: true }, // PostgreSQL
          ],
        },
      },
    }),
    prisma.opportunity.create({
      data: {
        organizationId: org.id,
        title: 'Frontend Engineering Intern',
        description: 'Summer internship working on the SkillSync dashboard and user-facing features. Mentorship from senior engineers included.',
        type: OpportunityType.INTERNSHIP,
        status: OpportunityStatus.OPEN,
        location: 'Remote',
        isRemote: true,
        salaryMin: 60000,
        salaryMax: 80000,
        currency: 'USD',
        applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        requirements: { skills: ['TypeScript', 'React', 'CSS'], experience: 'Student or recent graduate' },
        benefits: { mentorship: true, flexibleHours: true },
        skills: {
          create: [
            { skillId: skills[0].id, isRequired: true }, // TypeScript
            { skillId: skills[1].id, isRequired: true }, // React
            { skillId: skills[7].id, isRequired: false }, // UI Design
          ],
        },
      },
    }),
    prisma.opportunity.create({
      data: {
        organizationId: org.id,
        title: 'Open Source Contributor - SkillSync',
        description: 'Contribute to the open-source SkillSync platform. Good first issues available. Great for portfolio building.',
        type: OpportunityType.PROJECT,
        status: OpportunityStatus.OPEN,
        location: 'Remote',
        isRemote: true,
        requirements: { skills: ['TypeScript', 'React', 'Node.js'], experience: 'Any level welcome' },
        benefits: { openSource: true, community: 'Active Discord community' },
        skills: {
          create: [
            { skillId: skills[0].id, isRequired: false }, // TypeScript
            { skillId: skills[1].id, isRequired: false }, // React
            { skillId: skills[2].id, isRequired: false }, // Node.js
          ],
        },
      },
    }),
  ])

  console.log('✅ Created opportunities')

  // Create learning resources
  console.log('📚 Creating learning resources...')
  await Promise.all([
    // TypeScript resources
    prisma.learningResource.create({
      data: {
        title: 'TypeScript Handbook',
        description: 'The official TypeScript documentation and handbook',
        url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
        provider: 'TypeScript Team',
        type: LearningResourceType.DOCUMENTATION,
        skillId: skills[0].id, // TypeScript
        difficulty: ResourceDifficulty.BEGINNER,
        language: 'en',
        verifiedSource: true,
        qualityScore: 0.95,
        rating: 4.8,
      },
    }),
    prisma.learningResource.create({
      data: {
        title: 'TypeScript Deep Dive',
        description: 'Comprehensive guide to TypeScript by Basarat Ali Syed',
        url: 'https://basarat.gitbook.io/typescript/',
        provider: 'Basarat Ali Syed',
        type: LearningResourceType.BOOK,
        skillId: skills[0].id, // TypeScript
        difficulty: ResourceDifficulty.INTERMEDIATE,
        language: 'en',
        verifiedSource: true,
        qualityScore: 0.9,
        rating: 4.9,
      },
    }),
    // React resources
    prisma.learningResource.create({
      data: {
        title: 'React Official Tutorial',
        description: 'Official React tutorial for beginners',
        url: 'https://react.dev/learn',
        provider: 'React Team',
        type: LearningResourceType.TUTORIAL,
        skillId: skills[1].id, // React
        difficulty: ResourceDifficulty.BEGINNER,
        language: 'en',
        verifiedSource: true,
        qualityScore: 0.95,
        rating: 4.7,
      },
    }),
    prisma.learningResource.create({
      data: {
        title: 'Advanced React Patterns',
        description: 'Advanced patterns and best practices for React development',
        url: 'https://kentcdodds.com/blog/advanced-react-patterns',
        provider: 'Kent C. Dodds',
        type: LearningResourceType.ARTICLE,
        skillId: skills[1].id, // React
        difficulty: ResourceDifficulty.ADVANCED,
        language: 'en',
        verifiedSource: true,
        qualityScore: 0.85,
        rating: 4.6,
      },
    }),
    // Node.js resources
    prisma.learningResource.create({
      data: {
        title: 'Node.js Official Documentation',
        description: 'Official Node.js documentation and guides',
        url: 'https://nodejs.org/en/docs/',
        provider: 'Node.js Foundation',
        type: LearningResourceType.DOCUMENTATION,
        skillId: skills[2].id, // Node.js
        difficulty: ResourceDifficulty.BEGINNER,
        language: 'en',
        verifiedSource: true,
        qualityScore: 0.9,
        rating: 4.5,
      },
    }),
    // PostgreSQL resources
    prisma.learningResource.create({
      data: {
        title: 'PostgreSQL Tutorial',
        description: 'Comprehensive PostgreSQL tutorial for beginners',
        url: 'https://www.postgresqltutorial.com/',
        provider: 'PostgreSQL Tutorial',
        type: LearningResourceType.TUTORIAL,
        skillId: skills[3].id, // PostgreSQL
        difficulty: ResourceDifficulty.BEGINNER,
        language: 'en',
        verifiedSource: true,
        qualityScore: 0.85,
        rating: 4.4,
      },
    }),
    // Python resources
    prisma.learningResource.create({
      data: {
        title: 'Python Official Tutorial',
        description: 'Official Python tutorial from python.org',
        url: 'https://docs.python.org/3/tutorial/',
        provider: 'Python Software Foundation',
        type: LearningResourceType.DOCUMENTATION,
        skillId: skills[4].id, // Python
        difficulty: ResourceDifficulty.BEGINNER,
        language: 'en',
        verifiedSource: true,
        qualityScore: 0.95,
        rating: 4.8,
      },
    }),
    prisma.learningResource.create({
      data: {
        title: 'Automate the Boring Stuff with Python',
        description: 'Practical programming for total beginners',
        url: 'https://automatetheboringstuff.com/',
        provider: 'Al Sweigart',
        type: LearningResourceType.BOOK,
        skillId: skills[4].id, // Python
        difficulty: ResourceDifficulty.BEGINNER,
        language: 'en',
        verifiedSource: true,
        qualityScore: 0.9,
        rating: 4.7,
      },
    }),
    // AWS resources
    prisma.learningResource.create({
      data: {
        title: 'AWS Fundamentals',
        description: 'AWS cloud fundamentals and core services',
        url: 'https://aws.amazon.com/training/digital/',
        provider: 'Amazon Web Services',
        type: LearningResourceType.COURSE,
        skillId: skills[5].id, // AWS
        difficulty: ResourceDifficulty.BEGINNER,
        language: 'en',
        durationMinutes: 480,
        verifiedSource: true,
        qualityScore: 0.9,
        rating: 4.5,
      },
    }),
    // Docker resources
    prisma.learningResource.create({
      data: {
        title: 'Docker Official Documentation',
        description: 'Official Docker documentation and getting started guides',
        url: 'https://docs.docker.com/',
        provider: 'Docker Inc.',
        type: LearningResourceType.DOCUMENTATION,
        skillId: skills[6].id, // Docker
        difficulty: ResourceDifficulty.BEGINNER,
        language: 'en',
        verifiedSource: true,
        qualityScore: 0.9,
        rating: 4.6,
      },
    }),
    // UI Design resources
    prisma.learningResource.create({
      data: {
        title: 'Refactoring UI',
        description: 'Learn to design better user interfaces',
        url: 'https://refactoringui.com/',
        provider: 'Adam Wathan & Steve Schoger',
        type: LearningResourceType.BOOK,
        skillId: skills[7].id, // UI Design
        difficulty: ResourceDifficulty.INTERMEDIATE,
        language: 'en',
        verifiedSource: true,
        qualityScore: 0.85,
        rating: 4.9,
      },
    }),
    // Project Management resources
    prisma.learningResource.create({
      data: {
        title: 'Agile Project Management with Scrum',
        description: 'Introduction to Scrum and agile project management',
        url: 'https://www.scrum.org/resources/what-is-scrum',
        provider: 'Scrum.org',
        type: LearningResourceType.DOCUMENTATION,
        skillId: skills[8].id, // Project Management
        difficulty: ResourceDifficulty.BEGINNER,
        language: 'en',
        verifiedSource: true,
        qualityScore: 0.8,
        rating: 4.4,
      },
    }),
    // Machine Learning resources
    prisma.learningResource.create({
      data: {
        title: 'Machine Learning Crash Course',
        description: 'Google\'s practical introduction to machine learning',
        url: 'https://developers.google.com/machine-learning/crash-course',
        provider: 'Google',
        type: LearningResourceType.COURSE,
        skillId: skills[9].id, // Machine Learning
        difficulty: ResourceDifficulty.INTERMEDIATE,
        language: 'en',
        durationMinutes: 900,
        verifiedSource: true,
        qualityScore: 0.95,
        rating: 4.8,
      },
    }),
    prisma.learningResource.create({
      data: {
        title: 'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow',
        description: 'Comprehensive guide to machine learning with Python',
        url: 'https://www.oreilly.com/library/view/hands-on-machine-learning/9781492032632/',
        provider: 'Aurélien Géron',
        type: LearningResourceType.BOOK,
        skillId: skills[9].id, // Machine Learning
        difficulty: ResourceDifficulty.ADVANCED,
        language: 'en',
        verifiedSource: true,
        qualityScore: 0.9,
        rating: 4.9,
      },
    }),
  ])

  console.log('📚 Creating learning resources...')
  // ... (resources created above)
  console.log('✅ Created learning resources')

  // Create Target Roles & Role Skill Requirements
  console.log('🎯 Creating Target Roles & Requirements...')
  const getSkill = (slug: string) => {
    const s = skills.find((item) => item.slug === slug);
    if (!s) throw new Error(`Skill with slug ${slug} not found in seed.`);
    return s;
  };

  const fullStackRole = await prisma.targetRole.upsert({
    where: { slug: 'full-stack-engineer' },
    update: {},
    create: {
      title: 'Full-Stack Engineer',
      slug: 'full-stack-engineer',
      description: 'Build modern web applications with frontend reactivity, backend microservices, and relational database systems.',
      category: SkillCategory.PROGRAMMING,
      skillRequirements: {
        create: [
          { skillId: getSkill('typescript').id, requiredProficiency: ProficiencyLevel.EXPERT, importanceWeight: 3.0, isRequired: true },
          { skillId: getSkill('react').id, requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 3.0, isRequired: true },
          { skillId: getSkill('nodejs').id, requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 3.0, isRequired: true },
          { skillId: getSkill('postgresql').id, requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 2.0, isRequired: true },
          { skillId: getSkill('docker').id, requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 1.0, isRequired: false },
          { skillId: getSkill('aws').id, requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 1.0, isRequired: false },
        ],
      },
    },
  });

  const aiRole = await prisma.targetRole.upsert({
    where: { slug: 'ai-ml-engineer' },
    update: {},
    create: {
      title: 'AI / ML Engineer',
      slug: 'ai-ml-engineer',
      description: 'Develop AI pipelines, model integrations, retrieval augmented generation systems, and data infrastructure.',
      category: SkillCategory.DATA_SCIENCE,
      skillRequirements: {
        create: [
          { skillId: getSkill('python').id, requiredProficiency: ProficiencyLevel.EXPERT, importanceWeight: 3.0, isRequired: true },
          { skillId: getSkill('machine-learning').id, requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 3.0, isRequired: true },
          { skillId: getSkill('deep-learning').id, requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 2.5, isRequired: true },
          { skillId: getSkill('postgresql').id, requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 1.0, isRequired: false },
          { skillId: getSkill('docker').id, requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 1.0, isRequired: false },
        ],
      },
    },
  });

  const dataScientistRole = await prisma.targetRole.upsert({
    where: { slug: 'data-scientist' },
    update: {},
    create: {
      title: 'Data Scientist',
      slug: 'data-scientist',
      description: 'Extract statistical insights, build predictive models, and optimize decision-making using advanced mathematical analysis.',
      category: SkillCategory.DATA_SCIENCE,
      skillRequirements: {
        create: [
          { skillId: getSkill('python').id, requiredProficiency: ProficiencyLevel.EXPERT, importanceWeight: 3.0, isRequired: true },
          { skillId: getSkill('data-analysis').id, requiredProficiency: ProficiencyLevel.EXPERT, importanceWeight: 3.0, isRequired: true },
          { skillId: getSkill('machine-learning').id, requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 2.5, isRequired: true },
          { skillId: getSkill('postgresql').id, requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 2.0, isRequired: true },
        ],
      },
    },
  });

  const devopsRole = await prisma.targetRole.upsert({
    where: { slug: 'devops-engineer' },
    update: {},
    create: {
      title: 'DevOps Engineer',
      slug: 'devops-engineer',
      description: 'Architect scalable cloud infrastructure, containerized orchestrations, and automated deployment pipelines.',
      category: SkillCategory.OPERATIONS,
      skillRequirements: {
        create: [
          { skillId: getSkill('docker').id, requiredProficiency: ProficiencyLevel.EXPERT, importanceWeight: 3.0, isRequired: true },
          { skillId: getSkill('kubernetes').id, requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 3.0, isRequired: true },
          { skillId: getSkill('aws').id, requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 3.0, isRequired: true },
          { skillId: getSkill('ci-cd').id, requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 2.5, isRequired: true },
          { skillId: getSkill('python').id, requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 1.5, isRequired: false },
        ],
      },
    },
  });

  const securityRole = await prisma.targetRole.upsert({
    where: { slug: 'cybersecurity-analyst' },
    update: {},
    create: {
      title: 'Cybersecurity Analyst',
      slug: 'cybersecurity-analyst',
      description: 'Defend corporate network perimeters, detect vulnerabilities, analyze security logs, and enforce cryptographic standards.',
      category: SkillCategory.OPERATIONS,
      skillRequirements: {
        create: [
          { skillId: getSkill('network-security').id, requiredProficiency: ProficiencyLevel.EXPERT, importanceWeight: 3.0, isRequired: true },
          { skillId: getSkill('siem').id, requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 3.0, isRequired: true },
          { skillId: getSkill('ethical-hacking').id, requiredProficiency: ProficiencyLevel.ADVANCED, importanceWeight: 2.5, isRequired: true },
          { skillId: getSkill('python').id, requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 1.5, isRequired: false },
          { skillId: getSkill('docker').id, requiredProficiency: ProficiencyLevel.INTERMEDIATE, importanceWeight: 1.0, isRequired: false },
        ],
      },
    },
  });

  // Assign dev user's profile to Full-Stack Engineer target role
  await prisma.profile.update({
    where: { userId: devUser.id },
    data: { targetRoleId: fullStackRole.id },
  });

  console.log('✅ Created Target Roles & Requirements')

  // Verify data
  console.log('\n📊 Seed verification:')
  console.log('\n📊 Seed verification:')
  const userCount = await prisma.user.count()
  const profileCount = await prisma.profile.count()
  const skillCount = await prisma.skill.count()
  const userSkillCount = await prisma.userSkill.count()
  const evidenceCount = await prisma.skillEvidence.count()
  const projectCount = await prisma.project.count()
  const orgCount = await prisma.organization.count()
  const teamCount = await prisma.team.count()
  const opportunityCount = await prisma.opportunity.count()
  const learningResourceCount = await prisma.learningResource.count()

  console.log(`  Users: ${userCount}`)
  console.log(`  Profiles: ${profileCount}`)
  console.log(`  Skills: ${skillCount}`)
  console.log(`  User Skills: ${userSkillCount}`)
  console.log(`  Skill Evidence: ${evidenceCount}`)
  console.log(`  Projects: ${projectCount}`)
  console.log(`  Organizations: ${orgCount}`)
  console.log(`  Teams: ${teamCount}`)
  console.log(`  Opportunities: ${opportunityCount}`)
  console.log(`  Learning Resources: ${learningResourceCount}`)

  console.log('\n✨ Seed completed successfully!')
  console.log('⚠️  NOTE: This is DEVELOPMENT seed data only.')
  console.log('⚠️  DO NOT use in production.')
  console.log('⚠️  Password hashes are PLACEHOLDERS only.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })