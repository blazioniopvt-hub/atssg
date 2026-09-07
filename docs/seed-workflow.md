# Database Seed Workflow

## Overview

This document describes the seed workflow for SkillSync's development database.

## Seed File

Location: `database/prisma/seed/seed.ts`

The seed creates **development-only** data for local testing and development.

## Running the Seed

```bash
# From root
npm run db:seed

# Or from API package
cd apps/api && npm run db:seed
```

## What Gets Seeded

### Skills (10)
Verified skills across multiple categories:
- TypeScript (Programming) - HIGH demand
- React (Programming) - HIGH demand
- Node.js (Programming) - HIGH demand
- PostgreSQL (Programming) - HIGH demand
- Python (Programming/Data Science) - HIGH demand
- AWS (Operations) - HIGH demand
- Docker (Operations) - HIGH demand
- UI Design (Design) - MEDIUM demand
- Project Management (Management) - MEDIUM demand
- Machine Learning (Data Science) - HIGH demand

### Development User (1)
- Email: `dev@skillsync.local`
- Username: `devuser`
- Status: ACTIVE
- Password: Placeholder hash (NOT secure)

### Profile (1)
- Name: Dev User
- Headline: Full-stack Developer | SkillSync Core Team
- Location: San Francisco, CA
- Visibility: PUBLIC

### User Skills (5)
| Skill | Proficiency | Years | Confidence | Verification |
|-------|-------------|-------|------------|--------------|
| TypeScript | EXPERT | 5 | 95% | VERIFIED (Project) |
| React | ADVANCED | 4 | 90% | VERIFIED (Project) |
| Node.js | ADVANCED | 4 | 85% | VERIFIED (Project) |
| PostgreSQL | INTERMEDIATE | 3 | 80% | VERIFIED (Assessment) |
| AWS | INTERMEDIATE | 2 | 75% | PENDING (Certification) |

### Skill Evidence (3)
1. **Project**: SkillSync Platform Development (TypeScript)
2. **Project**: React Dashboard Application (React)
3. **Certificate**: PostgreSQL Certification (PostgreSQL)

### Organization (1)
- Name: SkillSync
- Type: COMPANY
- Size: STARTUP
- Industry: Technology

### Projects (2)
1. **SkillSync Platform** (IN_PROGRESS, PUBLIC)
   - Skills: TypeScript, React, Node.js, PostgreSQL, AWS, Docker
2. **SkillSync Dashboard** (COMPLETED, PUBLIC)
   - Skills: TypeScript, React, UI Design

### Team (1)
- Name: Core Team
- Owner: Dev User
- Organization: SkillSync

### Opportunities (3)
1. **Senior Full-Stack Engineer** (JOB, OPEN, Remote)
   - Salary: $150k-$220k
   - Required: TypeScript, React, Node.js, PostgreSQL
2. **Frontend Engineering Intern** (INTERNSHIP, OPEN, Remote)
   - Salary: $60k-$80k
   - Required: TypeScript, React
3. **Open Source Contributor** (PROJECT, OPEN, Remote)
   - Skills: TypeScript, React, Node.js (all optional)

## Seed Characteristics

### Deterministic
- Uses `upsert` operations (create or update)
- Running multiple times produces same result
- Safe to run on existing development database

### Development Only
⚠️ **DO NOT USE IN PRODUCTION**

The seed contains:
- Placeholder password hashes
- Realistic but fake personal data
- Hardcoded IDs and timestamps
- No security considerations

### Idempotent
```bash
# Safe to run multiple times
npm run db:seed
npm run db:seed
npm run db:seed
# Result: Same data, no duplicates
```

## Extending the Seed

### Adding New Skills
```typescript
await prisma.skill.upsert({
  where: { slug: 'new-skill' },
  update: {},
  create: {
    name: 'New Skill',
    slug: 'new-skill',
    description: 'Description',
    category: SkillCategory.PROGRAMMING,
    isVerified: true,
    demandLevel: DemandLevel.MEDIUM,
  },
});
```

### Adding New Users
```typescript
const user = await prisma.user.upsert({
  where: { email: 'new@skillsync.local' },
  update: {},
  create: {
    email: 'new@skillsync.local',
    username: 'newuser',
    passwordHash: 'dev-password-hash-placeholder',
    status: UserStatus.ACTIVE,
  },
});

await prisma.profile.upsert({
  where: { userId: user.id },
  update: {},
  create: {
    userId: user.id,
    firstName: 'New',
    lastName: 'User',
    // ...
  },
});
```

### Adding User Skills
```typescript
const skill = await prisma.skill.findUnique({ where: { slug: 'typescript' } });

await prisma.userSkill.upsert({
  where: { userId_skillId: { userId: user.id, skillId: skill.id } },
  update: {},
  create: {
    userId: user.id,
    skillId: skill.id,
    proficiencyLevel: ProficiencyLevel.INTERMEDIATE,
    yearsOfExperience: 2,
    confidence: 70,
    verificationStatus: VerificationStatus.UNVERIFIED,
  },
});
```

## Seed vs Migration

| Aspect | Migration | Seed |
|--------|-----------|------|
| Purpose | Schema changes | Initial data |
| Runs in | All environments | Development only |
| Reversible | Via new migration | Truncate tables |
| Contains | DDL (CREATE, ALTER) | DML (INSERT, UPDATE) |
| Versioned | Yes (timestamped) | No (single file) |

## Clearing Data (Development)

To completely reset and re-seed:
```bash
# Option 1: Full database reset
docker compose -f infrastructure/docker/docker-compose.yml down -v
docker compose -f infrastructure/docker/docker-compose.yml up -d
sleep 5
npm run db:migrate:deploy
npm run db:seed

# Option 2: Just clear data (keep schema)
# Connect to DB and run:
TRUNCATE TABLE "skill_evidence", "user_skills", "project_skills", 
  "project_members", "opportunity_skills", "opportunities", 
  "team_members", "teams", "projects", "organizations", 
  "profiles", "skills", "users" RESTART IDENTITY CASCADE;
npm run db:seed
```

## Testing Seed

Verify seed works correctly:
```bash
# 1. Run seed
npm run db:seed

# 2. Verify counts (run in Prisma Studio or SQL)
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM profiles) as profiles,
  (SELECT COUNT(*) FROM skills) as skills,
  (SELECT COUNT(*) FROM user_skills) as user_skills,
  (SELECT COUNT(*) FROM skill_evidence) as skill_evidence,
  (SELECT COUNT(*) FROM projects) as projects,
  (SELECT COUNT(*) FROM organizations) as organizations,
  (SELECT COUNT(*) FROM teams) as teams,
  (SELECT COUNT(*) FROM opportunities) as opportunities;

# Expected:
# users: 1, profiles: 1, skills: 10, user_skills: 5, 
# skill_evidence: 3, projects: 2, organizations: 1, teams: 1, opportunities: 3
```

## CI/CD Integration

Seed is NOT run in CI/CD pipelines. It's a development utility only.

For testing database operations in CI:
- Use test-specific fixtures
- Create minimal test data in `beforeEach`/`beforeAll`
- Clean up in `afterEach`/`afterAll`

## Security Notes

- Never commit real credentials to seed
- Password hashes are placeholders
- Seed data is clearly identifiable as development
- Production databases should never run this seed