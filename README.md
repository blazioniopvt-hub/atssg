# SkillSync — AI-Powered Skills & Placement Intelligence Platform

SkillSync is an enterprise-grade AI skills intelligence and talent placement platform designed to discover, evaluate, develop, verify, and connect candidate skills with career opportunities, academic curricula, and employer pipelines.

---

## Current Status: Phase 15 Production-Hardened MVP

| Phase | Subsystem | Status | Highlights |
| :--- | :--- | :--- | :--- |
| **Phase 0** | Foundation | ✅ **VERIFIED** | Monorepo (Turborepo), npm workspaces, shared configs, Docker Compose |
| **Phase 1** | Core Platform | ✅ **VERIFIED** | User & profile taxonomy, Hono REST API, shared TypeScript schemas |
| **Phase 2** | Database Architecture | ✅ **VERIFIED** | PostgreSQL 16, Prisma ORM, 30+ relational models, multi-tenancy foundation |
| **Phase 3** | Authentication & Identity | ✅ **VERIFIED** | Argon2id hashing, 32-byte JWT session cookies (`HttpOnly`, `SameSite`), brute-force defense |
| **Phase 4** | Target Role Intelligence | ✅ **VERIFIED** | Role gap analysis, deterministic readiness scores, required skill mapping |
| **Phase 5** | Skill Intelligence & Evidence | ✅ **VERIFIED** | Multi-type evidence tracking, diminishing returns confidence calculation, verification workflow |
| **Phase 6** | AI Skill Extraction | ✅ **VERIFIED** | Multi-provider extraction (Fable 5.1, OpenAI, Anthropic, Local), canonical normalization |
| **Phase 7** | Work-Sample & Resume Intelligence | ✅ **VERIFIED** | AST static project inspection, PDF/DOCX/TXT resume parsing, non-downgrade skill confirmation |
| **Phase 8** | Career Readiness & Simulation | ✅ **VERIFIED** | Adaptive situational scenario engine, deterministic server grading, role comparison |
| **Phase 9** | AI Career Coach & NBA | ✅ **VERIFIED** | Grounded AI coaching, Next-Best-Action prioritization, prompt injection defense |
| **Phase 10** | Organization & College Intelligence | ✅ **VERIFIED** | Multi-tenant hierarchies, student cohort tracking, institutional skill gap analytics |
| **Phase 11** | Opportunity & Placement Intelligence | ✅ **VERIFIED** | Deterministic 4-pillar matching (Skill 35%, Confidence 25%, Projects 20%, Simulation 20%) |
| **Phase 12** | Analytics, Audit & Observability | ✅ **VERIFIED** | Audit logging with secret redaction, AI request telemetry, multi-tier health probes |
| **Phase 13** | Integrations & External Data | ✅ **VERIFIED** | Static Git metadata inspection, external job feed ingestion, HMAC-SHA256 verified webhooks |
| **Phase 14** | Security, Reliability & Hardening | ✅ **VERIFIED** | Centralized RBAC, IDOR guards, prompt injection defense, rate limiters, security headers |
| **Phase 15** | Production Launch & Billing Foundation | ✅ **VERIFIED** | Entitlement engine (`FREE`, `PRO`, `ORGANIZATION`, `ENTERPRISE`), standalone Next.js build |

---

## Technology Stack

- **Monorepo**: Turborepo, npm workspaces
- **Frontend (`apps/web`)**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, `@skillsync/ui`
- **Backend API (`apps/api`)**: Node.js (>=20), Hono v4, `@hono/zod-validator`, `@hono/node-server`
- **Database**: PostgreSQL 16, Prisma ORM 5.9
- **Authentication**: Argon2id password hashing, Jose JWTs in secure HttpOnly cookies
- **AI Models**: Multi-provider abstraction supporting Fable 5.1 (primary), OpenAI (GPT-4o), Anthropic (Claude 3.5 Haiku), and Local (Ollama)
- **Containerization**: Docker multi-stage builds, Docker Compose (`postgres:16-alpine`, `redis:7-alpine`)

---

## Repository Structure

```
skillsync/
├── apps/
│   ├── api/                 # Hono REST API backend
│   │   ├── src/
│   │   │   ├── auth/        # Authentication routes, validation, Argon2id & JWT utils
│   │   │   ├── middleware/  # RBAC, tenant isolation, auth guards, rate limiters
│   │   │   ├── routes/      # Endpoints (skills, resumes, learning, coach, orgs, opportunities)
│   │   │   ├── services/    # Deterministic domain logic (matching, evidence, simulation, AI)
│   │   │   └── __tests__/   # 14 automated Jest test suites (209 tests)
│   └── web/                 # Next.js 14 frontend (App Router)
│       └── src/
│           ├── app/         # App router pages (dashboard, college, employer, coach, etc.)
│           ├── components/  # Reusable AppShell, navigation, cards, badges
│           └── lib/         # Type-safe API client
├── database/
│   └── prisma/              # Prisma schema & relational migrations
├── docs/                    # Production readiness report & changelogs
├── infrastructure/
│   └── docker/              # Dockerfiles & docker-compose.yml
└── packages/
    ├── config/              # Shared ESLint and TypeScript configs
    ├── types/               # Shared domain interfaces and DTO schemas
    ├── ui/                  # Shared accessible UI design system components
    └── utils/               # Shared utility functions
```

---

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL 16 (optional for local testing; memory fallbacks active when offline)

### 1. Installation
```bash
npm install
```

### 2. Environment Setup
Copy the provided environment template:
```bash
cp .env.example .env
```
Key environment variables in `.env`:
```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skillsync?schema=public"
AUTH_SECRET="dev-secret-change-in-production-min-32-chars"
NEXT_PUBLIC_API_URL="http://localhost:4000"
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:4000"
AI_PROVIDER="fable"
FABLE_API_KEY="your-fable-api-key"
```

### 3. Database Initialization
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Running the Development Environment
```bash
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)
- REST API Server: [http://localhost:4000](http://localhost:4000)

---

## Testing & Quality Validation

Execute all automated verification suites:
```bash
# Typecheck across all 6 packages
npm run typecheck

# Run backend test suites (100% green)
npm run test

# Validate Prisma schema
npx prisma validate --schema=database/prisma/schema.prisma

# Next.js production build
npm --prefix apps/web run build
```

---

## Health Checks & Diagnostics

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | Public | Liveness probe returning server uptime |
| `/health/db` | `GET` | Public | Readiness probe checking database connectivity |
| `/admin/health/diagnostics` | `GET` | Admin | Server memory usage, platform details, Node version |
| `/billing/production-readiness` | `GET` | Admin | Operational environment variable validation |

---

## Security Architecture

1. **Deterministic Authority**: AI suggestions never overwrite verified database evidence. Candidate matching and readiness scores are 100% mathematical and explainable.
2. **Tenant Isolation**: Every organization-scoped resource requires explicit membership or super-admin privilege, preventing Insecure Direct Object References (IDOR).
3. **Prompt Injection Defense**: User input to AI models is filtered using `securityGuard.sanitizePromptInput()` to neutralize adversarial system instruction overrides.
4. **Secret Redaction**: Global error middleware sanitizes database credentials, passwords, and bearer tokens from client responses and audit logs.
5. **Rate Limiting**: Sliding-window rate limiting protects auth endpoints against brute force and shields AI endpoints from denial-of-service or credit depletion.

---

## Deployment

### Docker Deployment
```bash
# Start PostgreSQL and Redis
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# Build and run API container
docker build -f infrastructure/docker/Dockerfile.api -t skillsync-api .
docker run -p 4000:4000 --env-file .env skillsync-api

# Build and run Web container (standalone Next.js)
docker build -f infrastructure/docker/Dockerfile.web -t skillsync-web .
docker run -p 3000:3000 --env-file .env skillsync-web
```

---

## Documentation
- [Production Readiness Audit Report](docs/PRODUCTION_READINESS.md)
- [Production Hardening Changelog](docs/PRODUCTION_HARDENING_CHANGELOG.md)
- [Architecture Specifications](ARCHITECTURE.md)
- [API Documentation](API_DOCS.md)
- [Database Schema Reference](DATABASE_SCHEMA.md)