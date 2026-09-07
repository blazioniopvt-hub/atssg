# SkillSync Skill Intelligence System

## Overview

The Skill Intelligence System is the core engine that transforms self-reported skills into evidence-backed, confidence-scored skill profiles. It provides the foundation for future AI-powered skill matching, recommendations, and assessments.

## Architecture

### Core Concepts

1. **Self-Reported Skills** - User declares proficiency in a skill
2. **Evidence** - Supporting proof (projects, certificates, portfolio, experience, assessments)
3. **Confidence Score** - Platform-calculated signal (0.0-1.0) representing how well-supported a skill claim is
4. **Verification Status** - UNVERIFIED, PENDING, VERIFIED, REJECTED

### Key Distinction: Proficiency vs Confidence

- **Proficiency** = User's self-declared level (BEGINNER → EXPERT)
- **Confidence** = Platform's assessment of how well-supported that claim is
- These are intentionally separate - a user can claim EXPERT with LOW confidence, or ADVANCED with HIGH confidence

## Database Models

### UserSkill (Enhanced)
```prisma
model UserSkill {
  id                String            @id @default(cuid())
  userId            String
  skillId           String
  proficiencyLevel  ProficiencyLevel  @default(BEGINNER)
  yearsOfExperience Float?
  confidence        Int?              @default(50)  // 0-100
  verificationStatus VerificationStatus @default(UNVERIFIED)
  verificationMethod VerificationMethod?
  verifiedAt        DateTime?
  verifiedBy        String?
  lastUsedAt        DateTime?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  skill             Skill             @relation(fields: [skillId], references: [id], onDelete: Cascade)
  evidence          SkillEvidence[]

  @@unique([userId, skillId])
  @@index([userId])
  @@index([skillId])
  @@index([proficiencyLevel])
  @@index([verificationStatus])
  @@map("user_skills")
}
```

### SkillEvidence
```prisma
model SkillEvidence {
  id              String       @id @default(cuid())
  userSkillId     String
  skillId         String?
  type            EvidenceType
  title           String
  description     String?
  url             String?
  metadata        Json?
  verifiedAt      DateTime?
  verifiedBy      String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  userSkill       UserSkill    @relation(fields: [userSkillId], references: [id], onDelete: Cascade)
  skill           Skill?       @relation(fields: [skillId], references: [id], onDelete: SetNull)

  @@index([userSkillId])
  @@index([skillId])
  @@index([type])
  @@map("skill_evidence")
}
```

### SkillRelationship (Graph Foundation)
```prisma
model SkillRelationship {
  id                String                 @id @default(cuid())
  sourceSkillId     String
  targetSkillId     String
  type              SkillRelationshipType
  strength          Float                  @default(1.0)
  createdAt         DateTime               @default(now())
  updatedAt         DateTime               @updatedAt

  sourceSkill       Skill                  @relation("SkillRelationshipsSource", fields: [sourceSkillId], references: [id], onDelete: Cascade)
  targetSkill       Skill                  @relation("SkillRelationshipsTarget", fields: [targetSkillId], references: [id], onDelete: Cascade)

  @@unique([sourceSkillId, targetSkillId, type])
  @@index([sourceSkillId])
  @@index([targetSkillId])
  @@index([type])
  @@map("skill_relationships")
}
```

### EvidenceType Enum
```prisma
enum EvidenceType {
  PROJECT
  CERTIFICATE
  PORTFOLIO_ITEM
  WORK_EXPERIENCE
  ASSESSMENT_RESULT
  SELF_REPORTED
  OTHER
}
```

## Services

### Evidence Service (`services/skill-intelligence/evidence.ts`)
Handles CRUD operations for skill evidence with ownership verification.

**Key Methods:**
- `create(userId, input)` - Add evidence with ownership check
- `getByUserSkill(userId, userSkillId)` - Get all evidence for a user skill
- `getProjectDerivedEvidence(userId, userSkillId)` - Derive evidence from user's projects
- `update(userId, evidenceId, input)` - Update evidence
- `delete(userId, evidenceId)` - Delete evidence

### Confidence Service (`services/skill-intelligence/confidence.ts`)
Deterministic confidence calculation based on evidence.

**Algorithm:**
1. Start with self-reported baseline (0.1)
2. Add proficiency baseline weighted by evidence presence
3. Add evidence weights with diminishing returns for same type
4. Apply verification bonus (1.2x for verified)
5. Apply recency factor for recent evidence (< 365 days)
6. Clamp to [0.0, 1.0]

**Output:**
```typescript
interface ConfidenceResult {
  score: number;        // 0.0 - 1.0
  level: string;        // VERY_HIGH, HIGH, MEDIUM, LOW, VERY_LOW
  evidenceCount: number;
  factors: ConfidenceFactors;
}
```

### Intelligence Service (`services/skill-intelligence/intelligence.ts`)
Main orchestration service for user skill intelligence.

**Key Methods:**
- `getUserSkillIntelligence(userId)` - Full intelligence for all user skills
- `getSkillIntelligence(userId, skillId)` - Intelligence for specific skill
- `getSkillIntelligenceSummary(userId)` - Aggregated summary
- `recalculateUserSkillIntelligence(userId)` - Trigger recalculation

## API Endpoints

### Skill Intelligence
- `GET /skill-intelligence` - Get user's skill intelligence summary
- `GET /skill-intelligence/skills` - Get all skills with intelligence
- `GET /skill-intelligence/skills/:skillId` - Get intelligence for specific skill
- `POST /skill-intelligence/skills` - Add skill to profile
- `PATCH /skill-intelligence/skills/:skillId` - Update user skill
- `DELETE /skill-intelligence/skills/:skillId` - Remove skill from profile

### Evidence
- `GET /skill-intelligence/skills/:skillId/evidence` - Get evidence for skill
- `POST /skill-intelligence/skills/:skillId/evidence` - Add evidence
- `PATCH /skill-intelligence/evidence/:evidenceId` - Update evidence
- `DELETE /skill-intelligence/evidence/:evidenceId` - Delete evidence

### Project Skills
- `GET /skill-intelligence/projects/:projectId/skills` - Get project skills
- `POST /skill-intelligence/projects/:projectId/skills` - Associate skill with project
- `DELETE /skill-intelligence/projects/:projectId/skills/:skillId` - Remove skill from project

## Frontend Components

### SkillIntelligencePage (`/skill-intelligence`)
Main page with:
- Skill intelligence summary dashboard
- Grid of skills with confidence scores
- Search and filter by proficiency
- Skill detail modal with evidence management

### Components
- `SkillIntelligenceCard` - Individual skill card with proficiency, confidence, evidence count
- `SkillIntelligenceSummary` - Dashboard with stats, distributions, top skills
- `EvidenceList` - Evidence management (CRUD) with inline editing
- `Badges` - Reusable badge components (ConfidenceBadge, ProficiencyBadge, EvidenceTypeBadge, VerificationStatusBadge)

## Confidence Calculation Details

### Evidence Weights
```typescript
const EVIDENCE_WEIGHTS = {
  SELF_REPORTED: 0.1,
  PROJECT: 0.3,
  CERTIFICATE: 0.25,
  PORTFOLIO_ITEM: 0.2,
  EXPERIENCE: 0.25,
  ASSESSMENT_RESULT: 0.4,
  OTHER: 0.15,
};
```

### Proficiency Baselines
```typescript
const PROFICIENCY_BASELINE = {
  BEGINNER: 0.1,
  INTERMEDIATE: 0.3,
  ADVANCED: 0.6,
  EXPERT: 0.85,
};
```

### Confidence Thresholds
```typescript
const CONFIDENCE_THRESHOLDS = {
  LOW: 0.3,
  MEDIUM: 0.5,
  HIGH: 0.7,
  VERY_HIGH: 0.85,
};
```

### Diminishing Returns
Each additional evidence item of the same type has 80% effectiveness of the previous.

### Verification Bonus
Verified evidence gets 1.2x weight multiplier.

### Recency Bonus
Evidence verified within 365 days adds up to 0.15 bonus (0.05 per item, max 3).

## Security

- All endpoints require authentication via HttpOnly cookie session
- Ownership verification on all mutations
- Generic error messages to prevent account enumeration
- Rate limiting: 20 requests per 15 minutes on auth endpoints
- HttpOnly, Secure, SameSite=Lax cookies

## Testing

All verification commands pass:
- `npm run build` ✅
- `npm run lint` ✅ (0 errors, warnings only)
- `npm run test` ✅
- `npm run typecheck` ✅ (via build)

## Known Limitations

1. **No real verification** - Phase 5 only supports UNVERIFIED evidence; VERIFIED status requires future verification mechanisms
2. **In-memory rate limiting** - Will need Redis for production multi-instance deployment
3. **No session cleanup job** - Expired sessions accumulate in database
4. **No email verification** - Per Phase 5 restrictions
5. **No MFA/OAuth** - Per Phase 5 restrictions
6. **No AI components** - Deterministic calculation only; AI integration points prepared but not implemented

## Future AI Integration Points

Prepared interfaces for:
- `SkillExtractionService` - Extract skills from resumes/portfolios
- `SkillNormalizationService` - Map variant skill names to canonical skills
- `SkillRecommendationService` - Suggest skills based on profile/goals
- `SkillAssessmentService` - Generate and evaluate assessments
- `SkillGraphService` - Graph-based skill relationships and traversal

## Database Migration

Migration: `20250110000001_skill_intelligence`
- Creates `skill_relationships` table
- Adds `SELF_REPORTED` to `EvidenceType` enum
- All foreign keys and indexes included

## Verification

All commands verified:
```bash
npm run build    ✅
npm run lint     ✅ (0 errors)
npm run test     ✅
npm run build    ✅ (production build)
```