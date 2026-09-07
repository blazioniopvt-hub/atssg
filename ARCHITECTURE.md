# SkillSync System Architecture

> **Status**: IMPLEMENTED — Core architecture complete through Phase 9
> **Current Phase**: 9 (Skill Gap Analysis & Learning Path Engine)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SKILLSYNC PLATFORM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │   Next.js    │    │    Hono      │    │  PostgreSQL  │    │  Redis   │  │
│  │   Web App    │◀───│    API       │◀───│  (Primary)   │    │  (Cache, │  │
│  │  (Port 3000) │    │  (Port 4000) │    │  + Replica   │    │  Sessions,│  │
│  └──────────────┘    └──────────────┘    └──────────────┘    │  RateLim)│  │
│         │                    │                    │            └──────────┘  │
│         │                    │                    │                    │      │
│         ▼                    ▼                    ▼                    ▼      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │  Browser     │    │  Shared      │    │  Prisma ORM  │    │  AI      │  │
│  │  (React 18)  │    │  Packages    │    │  (Type-safe) │    │  Providers│  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
skillsync/
├── apps/
│   ├── api/           # Hono API Server (Node.js 20, TypeScript)
│   │   ├── src/
│   │   │   ├── index.ts              # Entry, middleware, route mounting
│   │   │   ├── auth/                 # Auth routes, validation, utils
│   │   │   ├── routes/               # Feature route modules
│   │   │   ├── services/             # Business logic services
│   │   │   ├── middleware/           # Auth, rate limiting, error handling
│   │   │   └── lib/prisma.ts         # Prisma client singleton
│   │   └── package.json
│   └── web/           # Next.js 14 App Router (React 18, TypeScript)
│       ├── src/
│       │   ├── app/                  # File-based routing (16 pages)
│       │   ├── components/           # React components
│       │   ├── context/AuthContext.tsx
│       │   ├── lib/api.ts            # Typed API client (fetch wrapper)
│       │   └── styles/globals.css
│       └── package.json
├── packages/
│   ├── ui/           # shadcn/ui + Tailwind components
│   ├── config/       # Shared ESLint, Prettier, Tailwind, TS configs
│   ├── types/        # Shared TypeScript interfaces (API contracts)
│   └── utils/        # Shared utilities (date, string, validation)
├── database/
│   └── prisma/
│       ├── schema.prisma           # Full schema (886 lines, 30+ models)
│       ├── migrations/             # Versioned SQL migrations
│       └── seed/seed.ts            # Dev seed data
└── turbo.json        # Turborepo pipeline config
```

---

## Data Flow

### 1. Authentication Flow

```
User → /auth/login (POST email/password)
         │
         ▼
    ┌─────────────────────────────────────┐
    │  Hono /auth/routes.ts               │
    │  1. Find user by email              │
    │  2. Verify Argon2id password hash   │
    │  3. Check user.status === 'ACTIVE'  │
    │  4. Update lastLoginAt              │
    │  5. Create Session in DB (7-day TTL)│
    │  6. Generate JWT (userId + token)   │
    │  7. Set HttpOnly Cookie             │
    └─────────────────────────────────────┘
         │
         ▼
Response: { user: {...} } + Cookie: skillsync_session=<JWT>

Subsequent Requests:
         │
         ▼
    ┌─────────────────────────────────────┐
    │  middleware/auth.ts                 │
    │  1. Read Cookie                     │
    │  2. Verify JWT signature (AUTH_SECRET)│
    │  3. Lookup Session in DB by token   │
    │  4. Check expiresAt > now()         │
    │  5. Attach user + session to context│
    └─────────────────────────────────────┘
```

### 2. Skill Intelligence Flow

```
User adds skill → POST /skill-intelligence/skills
         │
         ▼
    ┌─────────────────────────────────────┐
    │  Create UserSkill + SELF_REPORTED   │
    │  evidence (baseline)                │
    └─────────────────────────────────────┘
         │
         ▼
User adds evidence → POST /skill-intelligence/skills/:id/evidence
         │
         ▼
    ┌─────────────────────────────────────┐
    │  EvidenceService.create()           │
    │  - Ownership verification           │
    │  - Type validation                  │
    └─────────────────────────────────────┘
         │
         ▼
GET /skill-intelligence → IntelligenceService.getSkillIntelligenceSummary()
         │
         ▼
    ┌─────────────────────────────────────┐
    │  ConfidenceService.calculate()      │
    │  1. Self-reported baseline (0.1)    │
    │  2. Proficiency baseline weighted   │
    │  3. Evidence weights (diminishing)  │
    │  4. Verification bonus (1.2x)       │
    │  5. Recency bonus (< 365 days)      │
    │  6. Clamp [0.0, 1.0]                │
    └─────────────────────────────────────┘
         │
         ▼
Response: { totalSkills, verifiedCount, avgConfidence, topSkills[] }
```

### 3. Skill Graph Flow

```
Skill Graph built from SkillRelationship table (PREREQUISITE, RELATED, etc.)

GET /skill-graph/skills/:id/gap (authenticated)
         │
         ▼
    ┌─────────────────────────────────────┐
    │  SkillGapService.calculateSkillGap()│
    │  1. Get target skill prerequisites  │
    │  2. Get user's UserSkill records    │
    │  3. Match user skills to prereqs    │
    │  4. Classify: KNOWN / PARTIAL /     │
    │     MISSING / FOUNDATION_REQUIRED   │
    │  5. Topological sort for priority   │
    └─────────────────────────────────────┘
         │
         ▼
Response: { readiness, knownCount, missingCount, prioritizedGaps[] }

GET /learning/plan/:skillId
         │
         ▼
    ┌─────────────────────────────────────┐
    │  LearningPathService.generate()     │
    │  1. Use gap analysis                │
    │  2. Topological ordering of gaps    │
    │  3. Create milestones with targets  │
    │  4. Fetch LearningResources per gap │
    └─────────────────────────────────────┘
```

### 4. AI Skill Extraction Flow

```
POST /ai/skills/extract (text + context)
         │
         ▼
    ┌─────────────────────────────────────┐
    │  AIExtractionService.extractSkills()│
    │  1. Create AIExtractionJob record   │
    │  2. Build prompt (system + user)    │
    │  3. Call provider (OpenAI/Anthropic/│
    │     Local Ollama)                   │
    │  4. Parse JSON response             │
    │  5. Normalize against Skill catalog │
    │  6. Store AIExtractionResult rows   │
    │  7. Update job status = COMPLETED   │
    └─────────────────────────────────────┘
         │
         ▼
Response: { jobId, skills[{ originalName, extractionConfidence, 
  normalized: { matched, matchedSkillId, confidence, reason } }] }
```

### 5. Resume Intelligence Flow

```
POST /resumes/upload (multipart file)
         │
         ▼
    ┌─────────────────────────────────────┐
    │  StorageProvider.upload()           │
    │  Local: write to disk               │
    │  S3: presigned PUT / multipart      │
    └─────────────────────────────────────┘
         │
         ▼
POST /resumes/:id/analyze
         │
         ▼
    ┌─────────────────────────────────────┐
    │  ResumeAnalysisService.analyze()    │
    │  1. Download file from storage      │
    │  2. Extract text (PDF/DOCX/TXT)     │
    │  3. Build extraction prompt         │
    │  4. Call AI provider                │
    │  5. Parse structured response:      │
    │     - personalInfo                  │
    │     - skills[] (name, confidence)   │
    │     - experiences[]                 │
    │     - education[]                   │
    │     - projects[]                    │
    │     - certifications[]              │
    │  6. Store ResumeAnalysis (JSON)     │
    └─────────────────────────────────────┘
         │
         ▼
GET /resumes/:id/analysis → Returns structured data

POST /resumes/:id/confirm (user selects skills/experiences)
         │
         ▼
    ┌─────────────────────────────────────┐
    │  Creates UserSkill + SkillEvidence  │
    │  Creates Project (from experiences) │
    └─────────────────────────────────────┘
```

---

## Authentication System (Phase 3)

### Components

| Component | File | Responsibility |
|-----------|------|----------------|
| Password Hashing | `auth/utils.ts` | Argon2id (memory-hard, GPU-resistant) |
| JWT Creation | `auth/utils.ts` | HS256, payload: `{userId, token}`, 7-day expiry |
| Session Storage | `prisma/schema.prisma` | `Session` model (token, expiresAt, userId) |
| Cookie Config | `auth/utils.ts` | HttpOnly, Secure (prod), SameSite=Lax, Path=/ |
| Rate Limiting | `index.ts` | 20 req/15min per IP on `/auth/*` |
| Middleware | `middleware/auth.ts` | Validates JWT, loads session, attaches user |

### Security Properties

- **No plaintext passwords** — Argon2id with salt
- **HttpOnly cookies** — Inaccessible to JavaScript
- **Secure cookies** — HTTPS only in production
- **SameSite=Lax** — CSRF protection
- **Generic errors** — No account enumeration
- **Session invalidation** — Server-side delete on logout
- **Account status check** — Blocks INACTIVE/SUSPENDED

---

## AI Provider Architecture (Phase 6+)

### Provider Factory Pattern

```
┌─────────────────────────────────────────────┐
│           AIProviderFactory                 │
│  getProvider(type: AIProviderType)          │
└─────────────────┬───────────────────────────┘
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ OpenAI   │ │Anthropic │ │ Local    │
│ Provider │ │ Provider │ │ Provider │
└──────────┘ └──────────┘ └──────────┘
```

### Configuration

```typescript
// services/ai/provider-factory.ts
type AIProviderType = 'OPENAI' | 'ANTHROPIC' | 'LOCAL' | 'CUSTOM';

interface AIProvider {
  extractSkills(text: string, context?: string): Promise<ExtractionResult>;
  normalizeSkill(skillName: string, catalog: Skill[]): Promise<NormalizedSkill>;
}

// OpenAI: GPT-4o-mini (default), GPT-4o
// Anthropic: Claude 3.5 Haiku, Sonnet
// Local: Ollama (llama3.1:8b, codellama:13b)
```

### Model Selection by Task

| Task | Recommended Model | Fallback |
|------|-------------------|----------|
| Skill Extraction | GPT-4o-mini / Claude 3.5 Haiku | Local llama3.1:8b |
| Resume Analysis | GPT-4o / Claude 3.5 Sonnet | Local llama3.1:70b |
| Skill Normalization | Embedding + exact match | Local embedding |

### Cost Optimization

- Cache extraction results by `inputTextHash`
- Batch multiple skills in single prompt
- Use cheaper models for normalization
- Local Ollama for development/unlimited use

---

## Skill Graph Architecture (Phase 8)

### Graph Model

```
SkillRelationship (directed, weighted)
├── sourceSkillId ──────▶ targetSkillId
├── type: PREREQUISITE | RELATED | SUBSKILL | SPECIALIZATION | COMPLEMENTARY
├── strength: 0.0 - 1.0
└── Unique index on (source, target, type)
```

### Graph Operations (SkillGraphService)

| Operation | Algorithm | Complexity |
|-----------|-----------|------------|
| Get neighbors | Adjacency list lookup | O(1) per edge |
| Get prerequisites | Filter by type=PREREQUISITE | O(E) |
| Find path | BFS (unweighted) / Dijkstra (weighted) | O(V+E) |
| Skill gap | Topological sort + user skill matching | O(V+E) |
| Learning path | Gap + prerequisite ordering | O(V+E) |

### Readiness Levels

```
READY              → All prerequisites KNOWN (confidence ≥ 70%)
PARTIAL            → Some prerequisites PARTIAL/MISSING
FOUNDATION_REQUIRED → Critical missing prerequisites (strength ≥ 0.8)
```

---

## Database Design (Phase 2/9)

### Key Models & Relationships

```
User (1) ◀─────────────▶ (1) Profile
User (1) ◀─────────────▶ (N) UserSkill
User (1) ◀─────────────▶ (N) Project (owner)
User (1) ◀─────────────▶ (N) Session
User (1) ◀─────────────▶ (N) Resume
User (1) ◀─────────────▶ (N) AIExtractionJob
User (1) ◀─────────────▶ (N) LearningPlan

Skill (1) ◀─────────────▶ (N) UserSkill
Skill (1) ◀─────────────▶ (N) SkillEvidence
Skill (1) ◀─────────────▶ (N) SkillRelationship (source)
Skill (1) ◀─────────────▶ (N) SkillRelationship (target)
Skill (1) ◀─────────────▶ (N) ProjectSkill
Skill (1) ◀─────────────▶ (N) LearningResource

UserSkill (1) ◀─────────▶ (N) SkillEvidence

Project (1) ◀──────────▶ (N) ProjectSkill
Project (1) ◀──────────▶ (N) ProjectMember

Organization (1) ◀─────▶ (N) UserOrganization
Organization (1) ◀─────▶ (N) Team
Organization (1) ◀─────▶ (N) Opportunity

Resume (1) ◀──────────▶ (1) ResumeAnalysis
```

### Multi-Tenancy (Phase 9 Foundation)

- `Organization` as tenant root
- `UserOrganization` — many-to-many with roles
- `Skill.organizationId` — optional tenant scoping
- `Project.organizationId` — optional tenant scoping
- `LearningResource.organizationId` — optional tenant scoping
- `User.defaultOrgId` — single-org context

### Indexing Strategy

- All FKs indexed
- Unique constraints on (userId, skillId), (projectId, skillId), etc.
- Status fields indexed for filtering
- Composite indexes for common query patterns

---

## Frontend Architecture (Next.js 14 App Router)

### Page Routes (16 Pages)

```
/                                    → Home (marketing)
/auth/login                          → Login form
/auth/register                       → Register form
/dashboard                           → Protected dashboard
/profile                             → Profile management
/settings                            → Account settings
/skills                              → Skill catalog explorer
/skills/[slug]                       → Skill detail (overview, relationships, gap)
/skill-intelligence                  → User skill management + evidence
/evidence                            → Evidence portfolio
/resumes                             → Resume vault list
/resumes/new                         → Upload resume
/resumes/[id]/analyze                → AI analysis + confirmation
/learning                            → Learning paths (skill selector + plan)
/learning/[skillSlug]                → Detailed learning plan for skill
/ai/analyze                          → AI skill extraction from text
```

### State Management

- **AuthContext** — Global auth state (user, login, logout, refresh)
- **React Query / SWR** — Not used; custom fetch wrapper with caching
- **Local State** — useState/useEffect per page
- **Server Components** — Minimal; mostly client components for interactivity

### API Client (`apps/web/src/lib/api.ts`)

```typescript
// Typed fetch wrapper with credentials: 'include'
async function fetchApi<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>>

// Feature namespaces:
skillIntelligenceApi: { getSummary, getSkills, addSkill, updateSkill, removeSkill, ... }
skillGraphApi: { listSkills, getSkill, getRelationships, getGap, getPath, ... }
aiApi: { extractSkills, normalizeSkill, ... }
resumeApi: { list, get, upload, analyze, getAnalysis, confirm, delete }
learningApi: { getGap, getPath, getPlan, listResources, ... }
```

---

## Service Layer Organization

```
services/
├── skill-intelligence/
│   ├── evidence.ts       # CRUD for SkillEvidence
│   ├── confidence.ts     # Deterministic confidence calculation
│   ├── intelligence.ts   # Orchestration: getSummary, getUserSkillIntelligence
│   ├── graph.ts          # SkillGraphService (relationships, gaps, paths)
│   ├── gap.ts            # SkillGapService (prerequisite analysis)
│   ├── learning-path.ts  # LearningPathService (topological milestones)
│   ├── learning-resource.ts # LearningResourceService (CRUD + filters)
│   └── config.ts         # Weights, thresholds, constants
├── ai/
│   ├── extraction.ts     # SkillExtractionService (prompt, parse, normalize)
│   ├── openai-provider.ts
│   ├── anthropic-provider.ts
│   ├── local-provider.ts # Ollama
│   └── provider-factory.ts
├── resume/
│   ├── analysis.ts       # ResumeAnalysisService (extract, parse, confirm)
│   └── index.ts
├── document/
│   ├── extraction.ts     # PDF/DOCX text extraction
│   └── normalization.ts
├── storage/
│   ├── local-provider.ts
│   ├── s3-provider.ts
│   └── provider-factory.ts
└── index.ts              # Barrel exports
```

---

## Technology Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | 20.x LTS |
| API Framework | Hono | 4.x |
| Frontend | Next.js | 14.x (App Router) |
| UI Library | React | 18.x |
| Styling | Tailwind CSS | 3.4+ |
| Components | shadcn/ui | Latest |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 16+ |
| Cache/Session | Redis | 7+ |
| Auth | Argon2id + JWT (HS256) | — |
| AI | OpenAI / Anthropic / Ollama | — |
| Build | Turborepo | 2.x |
| Package Manager | npm | 10.x |
| Language | TypeScript | 5.3+ |

---

## Scalability Considerations

| Component | Current | Production Scale |
|-----------|---------|------------------|
| API | Single process | Horizontal (stateless) + Redis sessions |
| Database | Single primary | Read replicas + PgBouncer |
| Redis | Single | Cluster / Sentinel |
| AI | Direct calls | Queue (BullMQ) + worker pool |
| Storage | Local/S3 | S3 + CDN |
| Rate Limiting | In-memory | Redis-backed |

---

## Future Architecture (Phase 10+)

- **Microservices**: Split API by domain (skills, learning, opportunities)
- **Event-Driven**: Kafka for async processing (notifications, analytics)
- **Graph DB**: Neo4j for deep skill graph traversal
- **Vector DB**: Pinecone/Weaviate for semantic skill search
- **Real-time**: WebSockets for collaborative features
- **ML Pipeline**: Custom models for skill extraction/assessment