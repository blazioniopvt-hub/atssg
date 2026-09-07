# SkillSync Developer Setup Guide

> **Status**: IMPLEMENTED — All steps verified working as of Phase 9

## Prerequisites

| Tool | Version | Install Command |
|------|---------|-----------------|
| Node.js | 20.x LTS | `nvm install 20` / Download from nodejs.org |
| npm | 10.x | Included with Node.js 20 |
| Docker & Docker Compose | Latest | `brew install docker docker-compose` / Docker Desktop |
| PostgreSQL | 16+ | Via Docker (see below) |
| Git | Latest | `git --version` |

## Quick Start (TL;DR)

```bash
# 1. Clone & install
git clone <repo-url>
cd skillsync
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and AUTH_SECRET

# 3. Start PostgreSQL
docker compose -f infrastructure/docker/docker-compose.yml up -d

# 4. Wait for DB, then migrate & seed
sleep 5
npm run db:migrate:deploy
npm run db:seed

# 5. Start dev servers (API on :4000, Web on :3000)
npm run dev
```

## Detailed Setup

### 1. Repository & Dependencies

```bash
git clone <repository-url>
cd skillsync
npm install
```

This installs all workspace packages:
- `apps/api` — Hono API server (port 4000)
- `apps/web` — Next.js 14 frontend (port 3000)
- `packages/*` — Shared UI, config, types, utils

### 2. Environment Configuration

```bash
cp .env.example .env
```

**Required variables in `.env`:**

```env
# Database (PostgreSQL via Docker)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skillsync?schema=public

# Authentication (Phase 3)
AUTH_SECRET=your-super-secret-auth-key-change-in-production
SESSION_COOKIE_NAME=skillsync_session
SESSION_COOKIE_MAX_AGE=604800

# AI Providers (Phase 6+) — Optional for local dev
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# LOCAL_AI_BASE_URL=http://localhost:11434/v1  # Ollama
# LOCAL_AI_MODEL=llama3.1:8b

# Storage (Phase 7+) — Optional for local dev
# STORAGE_PROVIDER=local
# LOCAL_STORAGE_PATH=./storage
# S3_BUCKET=...
# S3_REGION=...
# S3_ACCESS_KEY_ID=...
# S3_SECRET_ACCESS_KEY=...
```

**Generate a secure AUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Start PostgreSQL

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

Verify it's healthy:
```bash
docker compose -f infrastructure/docker/docker-compose.yml ps
# Should show: postgres (healthy), redis (healthy)
```

### 4. Database Migrations

```bash
# Apply all migrations to fresh DB
npm run db:migrate:deploy

# Or during active development (creates new migration)
npm run db:migrate -- --name your_migration_name
```

**What runs:**
- `database/prisma/migrations/` — 9+ migrations covering all phases
- Latest migration: `20250110000001_skill_intelligence` (Phase 5)

### 5. Seed Development Data

```bash
npm run db:seed
```

**Creates (idempotent — safe to re-run):**
- 10 verified skills across categories
- Dev user: `dev@skillsync.local` / `devuser` (placeholder password)
- 5 user skills with varying proficiency
- 3 skill evidence records
- 1 organization (SkillSync)
- 2 projects with skill links
- 1 team
- 3 opportunities (job, internship, open-source)

**Verify seed:**
```bash
npx prisma studio  # Opens http://localhost:5555
```

### 6. Run Development Servers

```bash
# Terminal 1: API (port 4000)
npm run dev --workspace=@skillsync/api

# Terminal 2: Web (port 3000)
npm run dev --workspace=@skillsync/web
```

**Or both together:**
```bash
npm run dev  # Uses Turborepo
```

**Expected output:**
```
API:  Server is running on port 4000
Web:  █ Ready in 2.3s
       █ Local:  http://localhost:3000
```

### 7. Verify Everything Works

| Check | Command | Expected |
|-------|---------|----------|
| API health | `curl http://localhost:4000/health` | `{"status":"healthy",...}` |
| DB health | `curl http://localhost:4000/health/db` | `{"status":"healthy","database":"connected"}` |
| API version | `curl http://localhost:4000/api/version` | `{"version":"0.0.0","phase":"9"}` |
| Web loads | Open http://localhost:3000 | Home page with "Sign in" / "Create account" |
| Auth flow | Register → Login → Dashboard | Session cookie set, user data returned |
| Skill Intelligence | `GET /skill-intelligence` (authenticated) | Summary + skills list |
| Skill Graph | `GET /skill-graph/skills` | Paginated skill catalog |
| AI Extract | `POST /ai/skills/extract` (authenticated) | Extracted skills with confidence |
| Resume Upload | `POST /resumes/upload` (multipart) | Resume record created |
| Learning | `GET /learning/plan/:skillId` (authenticated) | Gap analysis + learning path |

## Project Structure

```
skillsync/
├── apps/
│   ├── api/           # Hono API (port 4000)
│   │   ├── src/
│   │   │   ├── index.ts              # Entry point, route mounting
│   │   │   ├── auth/routes.ts        # Register, Login, Logout, Me
│   │   │   ├── routes/skill-intelligence.ts
│   │   │   ├── routes/skill-graph.ts
│   │   │   ├── routes/ai/skills.ts
│   │   │   ├── routes/resume/*.ts
│   │   │   ├── routes/learning.ts
│   │   │   ├── services/             # Business logic
│   │   │   ├── middleware/auth.ts    # JWT + session validation
│   │   │   └── lib/prisma.ts         # Prisma client
│   │   └── package.json
│   └── web/           # Next.js 14 (port 3000)
│       ├── src/app/                  # App Router pages (16 routes)
│       ├── src/components/           # React components
│       ├── src/context/AuthContext.tsx
│       ├── src/lib/api.ts            # Typed API client
│       └── package.json
├── packages/
│   ├── ui/           # shadcn/ui components
│   ├── config/       # ESLint, Prettier, Tailwind, TS config
│   ├── types/        # Shared TypeScript interfaces
│   └── utils/        # Shared utilities
├── database/
│   └── prisma/
│       ├── schema.prisma          # Full schema (886 lines)
│       ├── migrations/            # Versioned migrations
│       └── seed/seed.ts           # Dev seed data
├── infrastructure/
│   └── docker/
│       └── docker-compose.yml     # PostgreSQL + Redis
└── turbo.json                     # Turborepo pipeline
```

## Common Commands

```bash
# Development
npm run dev                    # Start all (API + Web)
npm run dev --workspace=@skillsync/api
npm run dev --workspace=@skillsync/web

# Build
npm run build                  # Build all packages
npm run build --workspace=@skillsync/api
npm run build --workspace=@skillsync/web

# Lint & Format
npm run lint                   # ESLint all
npm run format                 # Prettier write

# Database
npm run db:generate            # Generate Prisma Client
npm run db:push                # Push schema (dev only, no migration)
npm run db:migrate             # Create + apply migration (dev)
npm run db:migrate:deploy      # Apply migrations (prod/CI)
npm run db:seed                # Seed dev data
npm run db:studio              # Open Prisma Studio

# Testing
npm run test                   # Run all tests (Jest + React Testing Library)
npm run test --workspace=@skillsync/api
npm run test --workspace=@skillsync/web
```

## Troubleshooting

### Database Connection Failed
```bash
# Check container status
docker compose -f infrastructure/docker/docker-compose.yml ps

# Check logs
docker compose -f infrastructure/docker/docker-compose.yml logs postgres

# Restart
docker compose -f infrastructure/docker/docker-compose.yml restart postgres
```

### Migration Errors
```bash
# Reset completely (dev only — destroys data)
docker compose -f infrastructure/docker/docker-compose.yml down -v
docker compose -f infrastructure/docker/docker-compose.yml up -d
sleep 5
npm run db:migrate:deploy
npm run db:seed
```

### Port Conflicts
- API defaults to **4000** — change in `apps/api/src/index.ts` or `PORT` env
- Web defaults to **3000** — change in `apps/web/package.json` dev script
- PostgreSQL on **5432**, Redis on **6379**

### Auth Issues
- Ensure `AUTH_SECRET` is set in `.env` (min 32 chars)
- Clear browser cookies for `localhost:3000`
- Check cookie domain: `SameSite=Lax`, `HttpOnly`, `Secure` in production

### AI Provider Not Configured
```
Error: AI_NOT_CONFIGURED
```
Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` or configure local Ollama:
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve &
ollama pull llama3.1:8b

# In .env
LOCAL_AI_BASE_URL=http://localhost:11434/v1
LOCAL_AI_MODEL=llama3.1:8b
```

### TypeScript Errors After Schema Changes
```bash
npm run db:generate
# Restart TypeScript server in VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

## IDE Setup (VS Code Recommended)

**Extensions:**
- Prisma
- Tailwind CSS IntelliSense
- ESLint
- Prettier

**Settings (`.vscode/settings.json`):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Useful Links

- **Prisma Studio**: `npm run db:studio` → http://localhost:5555
- **API Root**: http://localhost:4000
- **Web App**: http://localhost:3000
- **API Version**: http://localhost:4000/api/version
- **Health Checks**: `/health`, `/health/db`
- **Documentation**: `docs/` folder