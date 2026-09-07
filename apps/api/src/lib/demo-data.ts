// SkillSync In-Memory Demo Seed Repository
// Provides investor-ready fallback data when PostgreSQL is offline or DB is deferred.

export interface DemoUser {
  id: string;
  email: string;
  username: string;
  role: 'STUDENT' | 'RECRUITER' | 'FACULTY' | 'ADMIN';
  displayName: string;
  headline: string;
  location: string;
  avatarUrl: string;
  bio: string;
}

export const DEMO_USERS: Record<string, DemoUser> = {
  student: {
    id: 'usr_student_alex',
    email: 'alex.chen@stanford.edu',
    username: 'alexchen',
    role: 'STUDENT',
    displayName: 'Alex Chen',
    headline: 'Full-Stack & AI Systems Student Engineer',
    location: 'Palo Alto, CA',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Passionate about building scalable web software, distributed systems, and real-time AI tools.',
  },
  recruiter: {
    id: 'usr_recruiter_sarah',
    email: 'sarah.jenkins@stripe.com',
    username: 'sarahstripe',
    role: 'RECRUITER',
    displayName: 'Sarah Jenkins',
    headline: 'Senior Technical Talent Partner at Stripe',
    location: 'San Francisco, CA',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    bio: 'Finding exceptional engineering talent with verified skills and project evidence.',
  },
  faculty: {
    id: 'usr_faculty_marcus',
    email: 'marcus.davis@stanford.edu',
    username: 'profdavis',
    role: 'FACULTY',
    displayName: 'Prof. Marcus Davis',
    headline: 'Department Head & Placement Officer, Computer Science',
    location: 'Stanford, CA',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    bio: 'Helping students bridge academic knowledge with industry-validated skills.',
  },
};

export const DEMO_SKILLS = [
  { id: 'sk_ts', name: 'TypeScript', slug: 'typescript', category: 'PROGRAMMING', demandLevel: 'CRITICAL', isVerified: true, description: 'Typed superset of JavaScript for scalable systems.' },
  { id: 'sk_react', name: 'React', slug: 'react', category: 'PROGRAMMING', demandLevel: 'HIGH', isVerified: true, description: 'Frontend library for interactive component architectures.' },
  { id: 'sk_node', name: 'Node.js', slug: 'nodejs', category: 'PROGRAMMING', demandLevel: 'HIGH', isVerified: true, description: 'Asynchronous event-driven JavaScript backend runtime.' },
  { id: 'sk_python', name: 'Python', slug: 'python', category: 'DATA_SCIENCE', demandLevel: 'CRITICAL', isVerified: true, description: 'Core language for machine learning, data engineering, and automation.' },
  { id: 'sk_pytorch', name: 'PyTorch', slug: 'pytorch', category: 'DATA_SCIENCE', demandLevel: 'HIGH', isVerified: true, description: 'Deep learning framework for AI model research and production.' },
  { id: 'sk_postgres', name: 'PostgreSQL', slug: 'postgresql', category: 'PROGRAMMING', demandLevel: 'HIGH', isVerified: true, description: 'Advanced relational database system.' },
  { id: 'sk_docker', name: 'Docker', slug: 'docker', category: 'OPERATIONS', demandLevel: 'HIGH', isVerified: true, description: 'Containerization and container runtime platform.' },
  { id: 'sk_rag', name: 'RAG Systems', slug: 'rag-systems', category: 'DATA_SCIENCE', demandLevel: 'CRITICAL', isVerified: true, description: 'Retrieval-Augmented Generation architectures for LLMs.' },
];

export const DEMO_USER_SKILLS = [
  {
    id: 'usk_ts',
    skillId: 'sk_ts',
    proficiencyLevel: 'EXPERT',
    yearsOfExperience: 3.5,
    confidence: 94,
    verificationStatus: 'VERIFIED',
    verificationMethod: 'PROJECT_DEMONSTRATED',
    lastUsedAt: '2026-08-30T00:00:00.000Z',
    skill: DEMO_SKILLS[0],
    evidenceCount: 4,
    evidenceTypes: ['PROJECT', 'CERTIFICATE', 'ASSESSMENT_RESULT', 'WORK_EXPERIENCE'],
    hasProjectEvidence: true,
    intelligence: {
      score: 0.94,
      level: 'EXPERT',
      evidenceCount: 4,
      factors: {
        selfReported: 0.85,
        evidence: [
          { type: 'PROJECT', weight: 0.35, verified: true },
          { type: 'ASSESSMENT_RESULT', weight: 0.30, verified: true },
          { type: 'WORK_EXPERIENCE', weight: 0.25, verified: true },
          { type: 'CERTIFICATE', weight: 0.10, verified: true },
        ],
        proficiencyBaseline: 0.90,
        totalWeight: 1.0,
        evidenceCount: 4,
      },
    },
  },
  {
    id: 'usk_react',
    skillId: 'sk_react',
    proficiencyLevel: 'ADVANCED',
    yearsOfExperience: 3.0,
    confidence: 88,
    verificationStatus: 'VERIFIED',
    verificationMethod: 'PROJECT_DEMONSTRATED',
    lastUsedAt: '2026-09-01T00:00:00.000Z',
    skill: DEMO_SKILLS[1],
    evidenceCount: 3,
    evidenceTypes: ['PROJECT', 'PORTFOLIO_ITEM'],
    hasProjectEvidence: true,
    intelligence: {
      score: 0.88,
      level: 'ADVANCED',
      evidenceCount: 3,
      factors: {
        selfReported: 0.80,
        evidence: [
          { type: 'PROJECT', weight: 0.40, verified: true },
          { type: 'PORTFOLIO_ITEM', weight: 0.30, verified: true },
        ],
        proficiencyBaseline: 0.85,
        totalWeight: 0.70,
        evidenceCount: 3,
      },
    },
  },
  {
    id: 'usk_python',
    skillId: 'sk_python',
    proficiencyLevel: 'ADVANCED',
    yearsOfExperience: 2.5,
    confidence: 85,
    verificationStatus: 'VERIFIED',
    verificationMethod: 'ASSESSMENT_PASSED',
    lastUsedAt: '2026-08-28T00:00:00.000Z',
    skill: DEMO_SKILLS[3],
    evidenceCount: 2,
    evidenceTypes: ['ASSESSMENT_RESULT', 'PROJECT'],
    hasProjectEvidence: true,
    intelligence: {
      score: 0.85,
      level: 'ADVANCED',
      evidenceCount: 2,
      factors: {
        selfReported: 0.75,
        evidence: [
          { type: 'ASSESSMENT_RESULT', weight: 0.45, verified: true },
          { type: 'PROJECT', weight: 0.30, verified: true },
        ],
        proficiencyBaseline: 0.80,
        totalWeight: 0.75,
        evidenceCount: 2,
      },
    },
  },
  {
    id: 'usk_postgres',
    skillId: 'sk_postgres',
    proficiencyLevel: 'INTERMEDIATE',
    yearsOfExperience: 2.0,
    confidence: 72,
    verificationStatus: 'UNVERIFIED',
    verificationMethod: 'SELF_REPORTED',
    lastUsedAt: '2026-07-15T00:00:00.000Z',
    skill: DEMO_SKILLS[5],
    evidenceCount: 1,
    evidenceTypes: ['SELF_REPORTED'],
    hasProjectEvidence: false,
    intelligence: {
      score: 0.72,
      level: 'INTERMEDIATE',
      evidenceCount: 1,
      factors: {
        selfReported: 0.65,
        evidence: [
          { type: 'SELF_REPORTED', weight: 0.15, verified: false },
        ],
        proficiencyBaseline: 0.60,
        totalWeight: 0.15,
        evidenceCount: 1,
      },
    },
  },
];

export const DEMO_EVIDENCE = [
  {
    id: 'ev_1',
    userSkillId: 'usk_ts',
    skillId: 'sk_ts',
    type: 'PROJECT',
    title: 'SkillSync Real-Time Graph Engine',
    description: 'Designed and implemented high-performance TypeScript graph algorithms for topological skill prerequisite sorting.',
    url: 'https://github.com/alexchen/skillsync-engine',
    metadata: { stars: 142, commits: 88, language: 'TypeScript' },
    verifiedAt: '2026-08-10T00:00:00.000Z',
    verifiedBy: 'Peer Review & Automated Test Suite',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
    skill: DEMO_SKILLS[0],
  },
  {
    id: 'ev_2',
    userSkillId: 'usk_ts',
    skillId: 'sk_ts',
    type: 'ASSESSMENT_RESULT',
    title: 'Advanced TypeScript Systems Assessment',
    description: 'Passed 98th percentile in generics, type inference, conditional types, and AST transformations.',
    url: 'https://assessments.skillsync.com/verify/ts-98',
    metadata: { score: 98, percentile: 98, durationMin: 45 },
    verifiedAt: '2026-07-20T00:00:00.000Z',
    verifiedBy: 'SkillSync Assessment System',
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    skill: DEMO_SKILLS[0],
  },
  {
    id: 'ev_3',
    userSkillId: 'usk_react',
    skillId: 'sk_react',
    type: 'PORTFOLIO_ITEM',
    title: 'SaaS Talent Analytics Dashboard',
    description: 'Built dynamic React 18 dashboard with server components, streaming SSR, and custom visualization components.',
    url: 'https://alexchen.dev/projects/analytics-dashboard',
    metadata: { framework: 'Next.js 14', styling: 'Tailwind CSS' },
    verifiedAt: '2026-08-15T00:00:00.000Z',
    verifiedBy: 'Verified Portfolio Inspector',
    createdAt: '2026-08-15T00:00:00.000Z',
    updatedAt: '2026-08-15T00:00:00.000Z',
    skill: DEMO_SKILLS[1],
  },
];

export const DEMO_RESUME_ANALYSIS = {
  id: 'ra_alexchen',
  resumeId: 'res_alexchen_pdf',
  status: 'COMPLETED',
  model: 'gpt-4o-mini',
  providerType: 'openai',
  inputTokens: 1420,
  outputTokens: 680,
  latencyMs: 1250,
  personalInfo: {
    name: 'Alex Chen',
    email: 'alex.chen@stanford.edu',
    location: 'Palo Alto, CA',
    website: 'https://alexchen.dev',
  },
  summary: 'Senior CS student at Stanford with strong engineering experience in full-stack TypeScript, distributed systems, and real-time AI tools. Demonstrated track record of verified open-source and internship contributions.',
  skills: {
    'TypeScript': { level: 'EXPERT', confidence: 0.95, evidence: '3.5 years, multiple production projects' },
    'React': { level: 'ADVANCED', confidence: 0.90, evidence: 'Built production dashboards' },
    'Python': { level: 'ADVANCED', confidence: 0.85, evidence: 'ML research and PyTorch model fine-tuning' },
    'PostgreSQL': { level: 'INTERMEDIATE', confidence: 0.75, evidence: 'Schema design and query optimization' },
    'Docker': { level: 'INTERMEDIATE', confidence: 0.70, evidence: 'Containerized deployment setups' },
  },
  experiences: [
    {
      company: 'Stripe',
      role: 'Software Engineering Intern',
      period: 'Jun 2025 - Sep 2025',
      highlights: ['Optimized API throughput by 24% using TypeScript stream pipelines', 'Implemented automated webhook validation testing'],
    },
  ],
  education: [
    {
      degree: 'BS in Computer Science',
      school: 'Stanford University',
      year: 2026,
      gpa: '3.9 / 4.0',
    },
  ],
  projects: [
    {
      name: 'SkillSync Platform',
      description: 'AI-driven skill graph and talent verification engine',
      tech: ['TypeScript', 'Next.js', 'Hono', 'Prisma'],
    },
  ],
  certifications: [
    { name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', year: 2025 },
  ],
};

export const DEMO_OPPORTUNITIES = [
  {
    id: 'opp_stripe_fse',
    title: 'Senior Full-Stack Engineer (TypeScript & React)',
    company: 'Stripe',
    location: 'San Francisco, CA (Hybrid)',
    type: 'JOB',
    salaryMin: 165000,
    salaryMax: 210000,
    currency: 'USD',
    isRemote: true,
    description: 'Join the Core Dashboard team to build real-time financial toolings using TypeScript, React, and high-performance microservices.',
    requiredSkills: [
      { name: 'TypeScript', proficiency: 'EXPERT', required: true },
      { name: 'React', proficiency: 'ADVANCED', required: true },
      { name: 'PostgreSQL', proficiency: 'INTERMEDIATE', required: false },
    ],
    matchScore: 94,
    matchingReasons: [
      'Verified Expert proficiency in TypeScript',
      'Strong React portfolio evidence verified',
      'Previous internship experience in payments/infrastructure',
    ],
  },
  {
    id: 'opp_anthropic_ai',
    title: 'AI Systems & RAG Research Intern',
    company: 'Anthropic',
    location: 'San Francisco, CA',
    type: 'INTERNSHIP',
    salaryMin: 120000,
    salaryMax: 140000,
    currency: 'USD',
    isRemote: false,
    description: 'Work on cutting-edge retrieval augmented generation pipelines, prompt benchmarking, and model evaluation toolsets.',
    requiredSkills: [
      { name: 'Python', proficiency: 'ADVANCED', required: true },
      { name: 'PyTorch', proficiency: 'ADVANCED', required: true },
      { name: 'RAG Systems', proficiency: 'INTERMEDIATE', required: true },
    ],
    matchScore: 88,
    matchingReasons: [
      'Verified Python assessment score (98th percentile)',
      'Verified RAG project repository',
    ],
  },
  {
    id: 'opp_cloudflare_edge',
    title: 'Systems Infrastructure Engineer',
    company: 'Cloudflare',
    location: 'Austin, TX (Remote)',
    type: 'JOB',
    salaryMin: 150000,
    salaryMax: 195000,
    currency: 'USD',
    isRemote: true,
    description: 'Build low-latency edge worker runtimes and distributed serverless storage primitives.',
    requiredSkills: [
      { name: 'TypeScript', proficiency: 'ADVANCED', required: true },
      { name: 'Docker', proficiency: 'INTERMEDIATE', required: true },
      { name: 'Node.js', proficiency: 'ADVANCED', required: true },
    ],
    matchScore: 82,
    matchingReasons: [
      'Strong TypeScript score',
      'Containerization evidence verified',
    ],
  },
];

export const DEMO_COLLEGE_ANALYTICS = {
  institution: 'Stanford University - School of Engineering',
  totalStudents: 480,
  activeProfiles: 412,
  verifiedEvidenceCount: 1240,
  topSkillsDistribution: [
    { name: 'TypeScript', count: 320, percentage: 78, category: 'PROGRAMMING' },
    { name: 'Python', count: 285, percentage: 69, category: 'DATA_SCIENCE' },
    { name: 'React', count: 250, percentage: 61, category: 'PROGRAMMING' },
    { name: 'PostgreSQL', count: 190, percentage: 46, category: 'PROGRAMMING' },
    { name: 'PyTorch / AI', count: 165, percentage: 40, category: 'DATA_SCIENCE' },
    { name: 'Docker & DevOps', count: 140, percentage: 34, category: 'OPERATIONS' },
  ],
  industrySkillGaps: [
    { skill: 'Cloud Infrastructure (AWS/GCP)', studentCoverage: 28, industryDemand: 82, gap: 54, priority: 'HIGH' },
    { skill: 'RAG & Vector Databases', studentCoverage: 32, industryDemand: 76, gap: 44, priority: 'HIGH' },
    { skill: 'System Observability & Monitoring', studentCoverage: 18, industryDemand: 60, gap: 42, priority: 'MEDIUM' },
    { skill: 'GraphQL & API Design', studentCoverage: 45, industryDemand: 70, gap: 25, priority: 'LOW' },
  ],
  departmentBreakdown: [
    { department: 'Computer Science', students: 280, avgConfidence: 86, placementReadiness: '92%' },
    { department: 'Data Science & AI', students: 120, avgConfidence: 84, placementReadiness: '88%' },
    { department: 'Electrical Engineering', students: 80, avgConfidence: 76, placementReadiness: '79%' },
  ],
};
