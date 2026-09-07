# SkillSync API Reference

> **Status**: IMPLEMENTED — All endpoints below are implemented and tested
> **Base URL**: `http://localhost:4000` (dev) / `https://api.skillsync.example` (prod)
> **Authentication**: HttpOnly cookie (`skillsync_session`) with JWT payload
> **Rate Limiting**: 20 req/15min on `/auth/*` endpoints

---

## Table of Contents

1. [Health & Version](#health--version)
2. [Authentication](#authentication)
3. [Skill Intelligence](#skill-intelligence)
4. [Skill Graph](#skill-graph)
5. [AI Skill Extraction](#ai-skill-extraction)
6. [Resume Intelligence](#resume-intelligence)
7. [Learning & Gap Analysis](#learning--gap-analysis)

---

## Health & Version

### `GET /health`
Application health (no database).

**Response 200:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### `GET /health/db`
Database connectivity check.

**Response 200:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Response 503:**
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### `GET /api/version`
API version and phase info.

**Response 200:**
```json
{
  "version": "0.0.0",
  "phase": "9",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Authentication

All auth endpoints require `Content-Type: application/json`.
Session cookie (`skillsync_session`) set on successful register/login.

### `POST /auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "displayName": "John Doe"
}
```

**Validation:**
- Email: valid format, normalized to lowercase
- Username: optional, 3-30 chars, alphanumeric + `_` + `-`
- Password: min 8 chars, requires uppercase, lowercase, number, special char
- Display name: optional, max 100 chars

**Response 201:**
```json
{
  "user": {
    "id": "cmx123abc",
    "email": "user@example.com",
    "username": "johndoe",
    "status": "ACTIVE",
    "role": "STUDENT",
    "displayName": "John Doe"
  }
}
```

**Errors:**
- `409 CONFLICT` — Email/username exists
- `400 VALIDATION_ERROR` — Invalid input
- `500 SERVER_ERROR` — AUTH_SECRET not configured

### `POST /auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**
```json
{
  "user": {
    "id": "cmx123abc",
    "email": "user@example.com",
    "username": "johndoe",
    "status": "ACTIVE",
    "role": "STUDENT",
    "displayName": "John Doe"
  }
}
```

**Errors:**
- `401 UNAUTHORIZED` — Invalid credentials (generic)
- `403 FORBIDDEN` — Account not ACTIVE
- `500 SERVER_ERROR` — AUTH_SECRET not configured

### `POST /auth/logout`
Requires authentication.

**Response 200:**
```json
{ "message": "Logged out successfully" }
```

### `GET /auth/me`
Requires authentication.

**Response 200:**
```json
{
  "user": {
    "id": "cmx123abc",
    "email": "user@example.com",
    "username": "johndoe",
    "status": "ACTIVE",
    "role": "STUDENT",
    "displayName": "John Doe"
  }
}
```

**Errors:**
- `401 UNAUTHORIZED` — No session / expired
- `403 FORBIDDEN` — Account not ACTIVE

---

## Skill Intelligence

All endpoints require authentication (`authMiddleware`).
Base path: `/skill-intelligence`

### `GET /skill-intelligence`
Get authenticated user's skill intelligence summary.

**Response 200:**
```json
{
  "data": {
    "totalSkills": 5,
    "verifiedSkillsCount": 2,
    "averageConfidence": 78,
    "topSkills": [
      {
        "skill": { "id": "cmx...", "name": "TypeScript", "category": "PROGRAMMING" },
        "userSkill": { "id": "cmx...", "proficiencyLevel": "EXPERT", "verificationStatus": "VERIFIED", "confidence": 95, "yearsOfExperience": 5 },
        "intelligence": { "score": 0.95, "level": "VERY_HIGH", "evidenceCount": 3, "factors": {...} },
        "evidenceCount": 3,
        "evidenceTypes": ["PROJECT", "CERTIFICATE"]
      }
    ],
    "proficiencyDistribution": { "BEGINNER": 1, "INTERMEDIATE": 2, "ADVANCED": 1, "EXPERT": 1 },
    "verificationDistribution": { "UNVERIFIED": 3, "VERIFIED": 2 }
  }
}
```

### `GET /skill-intelligence/skills`
Get all user skills with full intelligence.

**Response 200:**
```json
{
  "data": [
    {
      "skill": { "id": "cmx...", "name": "TypeScript", "slug": "typescript", "category": "PROGRAMMING", "subcategory": "Languages" },
      "userSkill": { "id": "cmx...", "proficiencyLevel": "EXPERT", "yearsOfExperience": 5, "confidence": 95, "verificationStatus": "VERIFIED", "verificationMethod": "PROJECT_DEMONSTRATED", "verifiedAt": "2025-01-10T00:00:00.000Z" },
      "intelligence": { "score": 0.95, "level": "VERY_HIGH", "evidenceCount": 3, "factors": { "selfReportedBaseline": 0.1, "proficiencyBaseline": 0.85, "evidenceWeight": 0.45, "verificationBonus": 0.12, "recencyBonus": 0.05 } },
      "evidenceCount": 3,
      "evidenceTypes": ["SELF_REPORTED", "PROJECT", "CERTIFICATE"]
    }
  ]
}
```

### `GET /skill-intelligence/skills/:skillId`
Get intelligence for a specific skill.

**Response 200:** Same structure as single item in `/skills` array.

**Errors:**
- `404 NOT_FOUND` — Skill not in user's profile

### `POST /skill-intelligence/skills`
Add a skill to user's profile.

**Request:**
```json
{
  "skillId": "cmx...",           // required: skill CUID
  "proficiencyLevel": "EXPERT",  // optional: BEGINNER|INTERMEDIATE|ADVANCED|EXPERT (default: BEGINNER)
  "yearsOfExperience": 5,        // optional: 0-50
  "confidence": 50               // optional: 0-100 (default: 50)
}
```

**Response 201:**
```json
{
  "data": {
    "id": "cmx...",
    "skillId": "cmx...",
    "proficiencyLevel": "EXPERT",
    "yearsOfExperience": 5,
    "confidence": 50,
    "verificationStatus": "UNVERIFIED"
  }
}
```

**Errors:**
- `409 CONFLICT` — Skill already in profile
- `400 VALIDATION_ERROR` — Invalid skillId

### `PATCH /skill-intelligence/skills/:skillId`
Update user skill.

**Request (all optional):**
```json
{
  "proficiencyLevel": "ADVANCED",
  "yearsOfExperience": 4,
  "confidence": 80
}
```

**Response 200:**
```json
{ "data": { "id": "cmx...", "proficiencyLevel": "ADVANCED", "yearsOfExperience": 4, "confidence": 80, ... } }
```

**Errors:**
- `404 NOT_FOUND` — Skill not in profile

### `DELETE /skill-intelligence/skills/:skillId`
Remove skill from profile.

**Response 200:**
```json
{ "message": "Skill removed from profile" }
```

---

### Evidence Endpoints

### `GET /skill-intelligence/skills/:skillId/evidence`
Get all evidence for a user skill.

**Response 200:**
```json
{
  "data": [
    {
      "id": "cmx...",
      "userSkillId": "cmx...",
      "skillId": "cmx...",
      "type": "PROJECT",
      "title": "SkillSync Platform Development",
      "description": "Built core authentication and skill intelligence engine",
      "url": "https://github.com/skillsync/platform",
      "metadata": { "role": "Lead Engineer", "teamSize": 4 },
      "verifiedAt": null,
      "verifiedBy": null,
      "createdAt": "2025-01-10T00:00:00.000Z"
    }
  ]
}
```

### `POST /skill-intelligence/skills/:skillId/evidence`
Add evidence for a skill.

**Request:**
```json
{
  "userSkillId": "cmx...",        // must match the skill's userSkill.id
  "type": "PROJECT",              // PROJECT|CERTIFICATE|PORTFOLIO_ITEM|WORK_EXPERIENCE|ASSESSMENT_RESULT|SELF_REPORTED|OTHER
  "title": "SkillSync Platform",
  "description": "Core platform development",
  "url": "https://github.com/...",
  "metadata": { "role": "Lead" }
}
```

**Response 201:**
```json
{
  "data": {
    "id": "cmx...",
    "userSkillId": "cmx...",
    "type": "PROJECT",
    "title": "SkillSync Platform",
    ...
  }
}
```

**Errors:**
- `404 NOT_FOUND` — Skill not in profile
- `400 BAD_REQUEST` — userSkillId mismatch

### `PATCH /skill-intelligence/evidence/:evidenceId`
Update evidence.

**Request (all optional):**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "url": "https://new-url.com",
  "metadata": { "key": "value" }
}
```

**Response 200:** Updated evidence object.

### `DELETE /skill-intelligence/evidence/:evidenceId`
Delete evidence.

**Response 200:**
```json
{ "message": "Evidence deleted" }
```

---

### Project Skills Endpoints

### `GET /skill-intelligence/projects/:projectId/skills`
Get skills associated with a project (owner only).

**Response 200:**
```json
{
  "data": [
    { "id": "cmx...", "name": "TypeScript", "slug": "typescript", "category": "PROGRAMMING" }
  ]
}
```

### `POST /skill-intelligence/projects/:projectId/skills`
Associate skill with project (owner only).

**Request:**
```json
{ "skillId": "cmx..." }
```

**Response 201:**
```json
{ "data": { "projectId": "cmx...", "skillId": "cmx...", "skill": {...} } }
```

**Errors:**
- `409 CONFLICT` — Already associated

### `DELETE /skill-intelligence/projects/:projectId/skills/:skillId`
Remove skill from project (owner only).

**Response 200:**
```json
{ "message": "Skill removed from project" }
```

---

## Skill Graph

Base path: `/skill-graph`
Public read endpoints (no auth), write endpoints require auth.

### `GET /skill-graph/skills`
List all skills with pagination & filters.

**Query params:**
- `category` — SkillCategory enum
- `search` — name/slug contains (case-insensitive)
- `limit` — default 50, max 100
- `offset` — default 0

**Response 200:**
```json
{
  "data": {
    "skills": [
      { "id": "cmx...", "name": "TypeScript", "slug": "typescript", "category": "PROGRAMMING", "subcategory": "Languages", "isVerified": true, "demandLevel": "HIGH" }
    ],
    "total": 47
  }
}
```

### `GET /skill-graph/skills/:id`
Get skill details.

**Response 200:**
```json
{
  "data": {
    "id": "cmx...",
    "name": "TypeScript",
    "slug": "typescript",
    "description": "Strongly typed JavaScript...",
    "category": "PROGRAMMING",
    "subcategory": "Languages",
    "iconUrl": null,
    "isVerified": true,
    "demandLevel": "HIGH",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### Relationship Endpoints

### `GET /skill-graph/skills/:id/relationships`
All relationships for a skill.

**Response 200:**
```json
{
  "data": [
    { "id": "cmx...", "sourceSkillId": "cmx...", "targetSkillId": "cmx...", "type": "PREREQUISITE", "strength": 0.9, "sourceSkill": {...}, "targetSkill": {...} }
  ]
}
```

### `GET /skill-graph/skills/:id/related` — Related skills
### `GET /skill-graph/skills/:id/prerequisites` — Prerequisites
### `GET /skill-graph/skills/:id/subskills` — Subskills
### `GET /skill-graph/skills/:id/specializations` — Specializations
### `GET /skill-graph/skills/:id/complementary` — Complementary skills

All return:
```json
{ "data": [{ "skill": {...}, "type": "PREREQUISITE", "strength": 0.9 }] }
```

### `GET /skill-graph/skills/:id/graph`
Get skill graph with neighbors.

**Query:** `depth` (1-3, default 2)

**Response 200:**
```json
{
  "data": {
    "center": { "id": "cmx...", "name": "TypeScript" },
    "neighbors": [
      { "skill": {...}, "relationship": {...}, "distance": 1 }
    ]
  }
}
```

### `GET /skill-graph/skills/:id/path`
Find shortest path to another skill.

**Query:** `to` (target skill ID, required)

**Response 200:**
```json
{
  "data": {
    "path": [
      { "skill": {...}, "relationship": {...} },
      { "skill": {...}, "relationship": {...} }
    ],
    "distance": 2
  }
}
```

### `GET /skill-graph/skills/:id/gap`
Calculate skill gap for authenticated user. **Requires auth.**

**Response 200:**
```json
{
  "data": {
    "targetSkill": { "id": "cmx...", "name": "Machine Learning" },
    "readiness": "PARTIAL",
    "knownCount": 3,
    "partialCount": 2,
    "missingCount": 4,
    "foundationRequiredCount": 1,
    "prioritizedGaps": [
      { "skill": {...}, "status": "MISSING", "priority": 1, "requiredStrength": 0.9, "reason": "Direct prerequisite" }
    ]
  }
}
```

### Write Endpoints (Auth Required)

### `POST /skill-graph/skills/relationships`
Create skill relationship (admin).

**Request:**
```json
{
  "sourceSkillId": "cmx...",
  "targetSkillId": "cmx...",
  "type": "PREREQUISITE",  // PREREQUISITE|RELATED|SUBSKILL|SPECIALIZATION|COMPLEMENTARY
  "strength": 0.9          // 0-1, default 1.0
}
```

### `PATCH /skill-graph/skills/relationships/:id`
Update relationship (admin).

### `DELETE /skill-graph/skills/relationships/:id`
Delete relationship (admin).

---

## AI Skill Extraction

Base path: `/ai`
All endpoints require authentication.

### `POST /ai/skills/extract`
Extract skills from text.

**Request:**
```json
{
  "text": "I built a computer vision attendance system using Python, OpenCV, and TensorFlow for my university capstone project. I also have 2 years of experience with React and TypeScript building scalable web applications.",
  "context": "Senior capstone project"
}
```

**Validation:** text 10-50000 chars, context optional max 2000 chars.

**Response 200:**
```json
{
  "data": {
    "jobId": "cmx...",
    "skills": [
      {
        "originalName": "Python",
        "extractionConfidence": 0.95,
        "evidence": "Explicitly mentioned: 'using Python'",
        "normalized": {
          "matched": true,
          "matchedSkillId": "cmx...",
          "matchedSkillName": "Python",
          "confidence": 1.0,
          "reason": "Exact match found in catalog"
        }
      },
      {
        "originalName": "Computer Vision",
        "extractionConfidence": 0.88,
        "evidence": "Mentioned: 'computer vision attendance system'",
        "normalized": {
          "matched": true,
          "matchedSkillId": "cmx...",
          "matchedSkillName": "Computer Vision",
          "confidence": 0.95,
          "reason": "Matched via skill alias"
        }
      },
      {
        "originalName": "React",
        "extractionConfidence": 0.92,
        "evidence": "Explicitly mentioned: '2 years of experience with React'",
        "normalized": {
          "matched": true,
          "matchedSkillId": "cmx...",
          "matchedSkillName": "React",
          "confidence": 1.0,
          "reason": "Exact match found in catalog"
        }
      }
    ],
    "latencyMs": 1250
  }
}
```

**Errors:**
- `503 AI_NOT_CONFIGURED` — No AI provider configured
- `400 VALIDATION_ERROR` — Text too short/long
- `500 EXTRACTION_FAILED` — AI service error

### `GET /ai/skills/extract`
List user's extraction jobs.

**Query:** `limit` (default 20), `offset` (default 0)

**Response 200:**
```json
{
  "data": {
    "jobs": [
      {
        "id": "cmx...",
        "inputText": "I built...",
        "status": "COMPLETED",
        "providerType": "OPENAI",
        "model": "gpt-4o-mini",
        "inputTokens": 150,
        "outputTokens": 300,
        "latencyMs": 1250,
        "createdAt": "2025-01-15T10:00:00.000Z",
        "completedAt": "2025-01-15T10:00:01.000Z",
        "results": [
          { "id": "cmx...", "skillName": "Python", "isMatched": true, "confidence": 0.95 }
        ]
      }
    ],
    "total": 5
  }
}
```

### `GET /ai/skills/extract/:jobId`
Get extraction job with results.

**Response 200:** Full job with all results.

### `POST /ai/skills/normalize`
Normalize a skill name against catalog.

**Request:**
```json
{ "skillName": "TypeScript" }
```

**Response 200 (matched):**
```json
{
  "data": {
    "skillName": "TypeScript",
    "matched": true,
    "matchedSkillId": "cmx...",
    "matchedSkillName": "TypeScript",
    "confidence": 1.0,
    "reason": "Exact match found in catalog"
  }
}
```

**Response 200 (unmatched):**
```json
{
  "data": {
    "skillName": "UnknownSkill",
    "matched": false,
    "confidence": 0,
    "reason": "No matching skill found in catalog"
  }
}
```

### Skill Aliases (Admin)

- `GET /ai/skills/aliases` — List aliases
- `POST /ai/skills/aliases` — Create alias (requires `skillId`, `alias`)
- `DELETE /ai/skills/aliases/:id` — Delete alias

---

## Resume Intelligence

Base path: `/resumes`
All endpoints require authentication.

### `POST /resumes/upload`
Upload resume file (multipart/form-data).

**Form Data:**
- `file` — PDF, DOCX, or TXT (max 10MB)

**Response 201:**
```json
{
  "data": {
    "resumeId": "cmx...",
    "originalFilename": "resume.pdf",
    "status": "UPLOADED"
  }
}
```

### `POST /resumes` (Direct record creation)
Create resume record without file upload.

**Request:**
```json
{
  "fileName": "resume.pdf",
  "fileType": "PDF",
  "fileSize": 1024000,
  "mimeType": "application/pdf"
}
```

### `GET /resumes`
List user's resumes.

**Query:** `limit` (default 20), `offset` (default 0)

**Response 200:**
```json
{
  "data": {
    "resumes": [
      {
        "id": "cmx...",
        "originalFilename": "resume.pdf",
        "fileType": "PDF",
        "fileSize": 1024000,
        "status": "READY",
        "createdAt": "2025-01-15T10:00:00.000Z",
        "analysis": { "id": "cmx...", "status": "COMPLETED", "createdAt": "..." }
      }
    ],
    "total": 3
  }
}
```

### `GET /resumes/:id`
Get resume details with analysis.

**Response 200:**
```json
{
  "data": {
    "id": "cmx...",
    "originalFilename": "resume.pdf",
    "fileType": "PDF",
    "fileSize": 1024000,
    "status": "READY",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "analysis": {
      "id": "cmx...",
      "status": "COMPLETED",
      "model": "gpt-4o-mini",
      "providerType": "OPENAI",
      "personalInfo": { "name": "John Doe", "email": "john@example.com", "phone": "+1..." },
      "summary": "Senior Full-Stack Engineer...",
      "skills": [
        { "name": "TypeScript", "confidence": 0.95, "category": "PROGRAMMING" },
        { "name": "React", "confidence": 0.9, "category": "PROGRAMMING" }
      ],
      "experiences": [
        { "company": "Acme Corp", "role": "Senior Engineer", "startDate": "2022-01", "endDate": "present", "current": true, "description": "..." }
      ],
      "education": [
        { "institution": "Stanford", "degree": "BS Computer Science", "year": 2020 }
      ],
      "projects": [
        { "title": "SkillSync", "description": "..." }
      ],
      "certifications": []
    }
  }
}
```

### `POST /resumes/:id/analyze`
Analyze uploaded resume with AI.

**Request:**
```json
{ "resumeId": "cmx..." }
```

**Response 200:** Analysis object (same as GET `/resumes/:id/analysis`)

**Errors:**
- `503 AI_NOT_CONFIGURED`
- `400 INVALID_STATUS` — Resume not READY/UPLOADED
- `404 FILE_NOT_FOUND` — Storage object missing
- `500 ANALYSIS_FAILED`

### `GET /resumes/:id/analysis`
Get existing analysis results.

### `POST /resumes/:id/confirm`
Confirm analysis results → add skills/experiences to profile.

**Request:**
```json
{
  "acceptedSkills": ["TypeScript", "React", "Node.js"],
  "acceptedExperiences": ["Senior Engineer at Acme Corp"]
}
```

**Response 200:**
```json
{
  "message": "Analysis confirmed successfully",
  "data": {
    "addedSkillsCount": 3,
    "addedProjectsCount": 1
  }
}
```

### `DELETE /resumes/:id`
Soft delete resume.

**Response 200:**
```json
{ "message": "Resume deleted" }
```

---

## Learning & Gap Analysis

Base path: `/learning`
All endpoints require authentication (except public resource listing).

### `GET /learning/gap/:skillId`
Analyze skill gap for authenticated user.

**Response 200:**
```json
{
  "data": {
    "targetSkill": { "id": "cmx...", "name": "Machine Learning", "category": "DATA_SCIENCE" },
    "readiness": "PARTIAL",
    "knownCount": 3,
    "partialCount": 2,
    "missingCount": 4,
    "foundationRequiredCount": 1,
    "prioritizedGaps": [
      {
        "skill": { "id": "cmx...", "name": "Linear Algebra", "category": "DATA_SCIENCE" },
        "status": "MISSING",
        "priority": 1,
        "requiredStrength": 0.9,
        "userProficiencyLevel": null,
        "userConfidence": null,
        "reason": "Direct prerequisite with high strength"
      }
    ]
  }
}
```

### `GET /learning/path/:skillId`
Generate learning path for authenticated user.

**Response 200:**
```json
{
  "data": {
    "learningPath": {
      "targetSkillId": "cmx...",
      "milestones": [
        {
          "skill": { "id": "cmx...", "name": "Python", "category": "PROGRAMMING" },
          "order": 1,
          "targetProficiency": "INTERMEDIATE",
          "status": "ACTIVE",
          "estimatedHours": 20
        },
        {
          "skill": { "id": "cmx...", "name": "Linear Algebra", "category": "DATA_SCIENCE" },
          "order": 2,
          "targetProficiency": "BEGINNER",
          "status": "PENDING",
          "estimatedHours": 15
        }
      ],
      "totalMilestones": 5,
      "completedMilestones": 0,
      "estimatedDifficulty": "MEDIUM"
    },
    "gapAnalysis": { ... },
    "resources": {
      "cmx...": [
        {
          "id": "cmx...",
          "title": "Python for Data Science",
          "description": "Comprehensive Python course...",
          "url": "https://coursera.org/...",
          "provider": "Coursera",
          "type": "COURSE",
          "difficulty": "BEGINNER",
          "durationMinutes": 1200,
          "rating": 4.7,
          "qualityScore": 0.9,
          "verifiedSource": true
        }
      ]
    }
  }
}
```

### `GET /learning/plan/:skillId`
Combined learning plan (gap + path + resources).

**Response 200:**
```json
{
  "data": {
    "targetSkill": { "id": "cmx...", "name": "Machine Learning", "slug": "machine-learning", "category": "DATA_SCIENCE" },
    "readiness": "PARTIAL",
    "knownCount": 3,
    "partialCount": 2,
    "missingCount": 4,
    "foundationRequiredCount": 1,
    "prioritizedGaps": [...],
    "learningPath": { "milestones": [...], "totalMilestones": 5, "estimatedDifficulty": "MEDIUM" },
    "resources": { "cmx...": [...] }
  }
}
```

---

### Learning Resources (Public Read)

### `GET /learning/resources`
List resources with filters.

**Query params:**
- `skillId` — CUID
- `type` — COURSE|BOOK|VIDEO|DOCUMENTATION|ARTICLE|PROJECT|TUTORIAL
- `difficulty` — BEGINNER|INTERMEDIATE|ADVANCED|EXPERT
- `verifiedSource` — boolean
- `search` — text search
- `limit` (default 20, max 100)
- `offset` (default 0)

**Response 200:**
```json
{
  "data": {
    "resources": [
      {
        "id": "cmx...",
        "title": "Python for Data Science",
        "description": "...",
        "url": "https://...",
        "provider": "Coursera",
        "type": "COURSE",
        "skillId": "cmx...",
        "difficulty": "BEGINNER",
        "language": "en",
        "durationMinutes": 1200,
        "rating": 4.7,
        "qualityScore": 0.9,
        "verifiedSource": true,
        "skill": { "id": "cmx...", "name": "Python" }
      }
    ],
    "total": 150
  }
}
```

### `GET /learning/resources/types`
Get resource type counts.

### `GET /learning/resources/difficulties`
Get difficulty level counts.

### `GET /learning/resources/:skillId`
Get resources for a specific skill.

**Query:** `type`, `difficulty`, `verifiedOnly`, `limit` (default 20, max 50)

### `GET /learning/resources/detail/:resourceId`
Get single resource details.

---

### Admin Resource Management (Requires `adminMiddleware`)

### `POST /learning/resources`
Create learning resource.

**Request:**
```json
{
  "title": "Advanced TypeScript",
  "description": "Deep dive into...",
  "url": "https://...",
  "provider": "Frontend Masters",
  "type": "COURSE",
  "skillId": "cmx...",
  "difficulty": "ADVANCED",
  "language": "en",
  "durationMinutes": 480,
  "rating": 4.9,
  "qualityScore": 0.95,
  "verifiedSource": true
}
```

### `PATCH /learning/resources/:resourceId`
Update resource.

### `DELETE /learning/resources/:resourceId`
Delete resource.

---

## Error Format

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

**Common Codes:**
| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | No/invalid session |
| `FORBIDDEN` | 403 | Account not active / insufficient role |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate / constraint violation |
| `INVALID_STATUS` | 400 | Invalid state for operation |
| `AI_NOT_CONFIGURED` | 503 | AI provider not set up |
| `SERVER_ERROR` | 500 | Internal error / misconfiguration |

---

## Authentication Headers

No Authorization header needed — uses HttpOnly cookie automatically sent by browser.

**Cookie:** `skillsync_session=<JWT>`

**JWT Payload:**
```json
{
  "userId": "cmx...",
  "token": "session-token-from-db"
}
```

**Session:** 7-day expiry, stored in PostgreSQL `sessions` table, invalidated on logout.

---

## Rate Limits

| Endpoint | Window | Limit |
|----------|--------|-------|
| `/auth/*` | 15 min | 20 req |
| All other | — | None (in-memory, per-instance) |

*Production: Use Redis-backed rate limiter for multi-instance deployments.*