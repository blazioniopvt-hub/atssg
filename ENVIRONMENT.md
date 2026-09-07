# Environment Variables Reference

> **Status**: IMPLEMENTED — All variables documented from actual codebase
> **Scope**: API (Hono), Web (Next.js), Database, AI, Storage, Auth
> **Mock Mode**: Several features work without external dependencies

---

## Quick Reference

| Variable | Required | Default | Environment |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes* | — | All |
| `AUTH_SECRET` | Yes | — | All |
| `OPENAI_API_KEY` | No | — | Production |
| `ANTHROPIC_API_KEY` | No | — | Production |
| `LOCAL_AI_BASE_URL` | No | `http://localhost:11434/v1` | Dev/Local |

*Required unless using mock mode

---

## Core Application

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Runtime environment | `development` \| `production` \| `test` |
| `PORT` | API server port | `4000` |
| `APP_URL` | Public API URL (CORS origin) | `https://api.skillsync.com` |

---

## Database

| Variable | Description | Required | Notes |
|----------|-------------|----------|-------|
| `DATABASE_URL` | PostgreSQL connection string | Yes* | `postgresql://user:pass@host:5432/db?schema=public` |
| `DB_USER` | Alternative: DB username | No* | Used in docker-compose |
| `DB_PASSWORD` | Alternative: DB password | No* | Used in docker-compose |
| `DB_NAME` | Alternative: DB name | No* | Used in docker-compose |

**Mock Mode**: Set `DATABASE_URL=mock` to run without PostgreSQL (limited functionality)

---

## Authentication (Phase 3)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `AUTH_SECRET` | JWT signing secret (32+ chars) | Yes | Generate: `openssl rand -base64 32` |
| `SESSION_COOKIE_NAME` | Session cookie name | No | `skillsync_session` |
| `SESSION_COOKIE_MAX_AGE` | Cookie max age (seconds) | No | `604800` (7 days) |
| `SESSION_COOKIE_DOMAIN` | Cookie domain (for subdomain sharing) | No | `.skillsync.com` |

**Security Notes:**
- `AUTH_SECRET` must be 32+ characters, keep secret
- In production: `SESSION_COOKIE_SECURE=true`, `SAME_SITE=lax`
- HttpOnly cookies — inaccessible to JavaScript

---

## AI Providers (Phase 6+)

### OpenAI
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key | No* | — |
| `OPENAI_MODEL` | Chat model | No | `gpt-4o-mini` |
| `OPENAI_EMBEDDING_MODEL` | Embedding model | No | `text-embedding-3-small` |
| `OPENAI_ORG_ID` | Organization ID | No | — |

### Anthropic
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key | No* | — |
| `ANTHROPIC_MODEL` | Chat model | No | `claude-3-5-haiku-20241022` |

### Local / Ollama (Free, Private)
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `LOCAL_AI_BASE_URL` | Ollama base URL | No | `http://localhost:11434/v1` |
| `LOCAL_AI_MODEL` | Chat model | No | `llama3.1:8b` |
| `LOCAL_AI_EMBEDDING_MODEL` | Embedding model | No | `nomic-embed-text` |

### Provider Selection
| Variable | Description | Default |
|----------|-------------|---------|
| `AI_PROVIDER` | Force provider | Auto-detect: OpenAI → Anthropic → Local |

**Auto-Detection Logic:**
```typescript
if (process.env.OPENAI_API_KEY) return 'OPENAI';
if (process.env.ANTHROPIC_API_KEY) return 'ANTHROPIC';
if (process.env.LOCAL_AI_BASE_URL) return 'LOCAL';
return 'LOCAL';
```

**Mock Mode**: Set `AI_PROVIDER=mock` to return deterministic mock responses (no external calls)

---

## Storage (Phase 7+)

### Local Storage (Default)
| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_PROVIDER` | `local` \| `s3` | `local` |
| `LOCAL_STORAGE_PATH` | Filesystem path | `./storage` |

### AWS S3
| Variable | Description | Required |
|----------|-------------|----------|
| `STORAGE_PROVIDER` | Must be `s3` | Yes |
| `S3_BUCKET` | Bucket name | Yes |
| `S3_REGION` | AWS region | Yes |
| `S3_ACCESS_KEY_ID` | Access key | Yes |
| `S3_SECRET_ACCESS_KEY` | Secret key | Yes |
| `S3_ENDPOINT` | Custom endpoint (MinIO, etc.) | No |

**Mock Mode**: `STORAGE_PROVIDER=mock` returns fake upload URLs

---

## Redis (Sessions, Cache, Rate Limiting)

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `REDIS_PASSWORD` | Password (if secured) | — |
| `REDIS_DB` | Database number | `0` |

**Production**: Use managed Redis (ElastiCache, Cloud Memorystore, Upstash)
**Mock Mode**: In-memory rate limiter (no Redis needed for dev)

---

## Frontend (Next.js Web)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | API base URL | Yes | `http://localhost:4000` |
| `NEXT_PUBLIC_APP_URL` | Web app URL | Yes | `http://localhost:3000` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | No | `ws://localhost:4000` |
| `NEXT_PUBLIC_MOCK_MODE` | Enable mock API | No | `false` |

**Note**: `NEXT_PUBLIC_` prefix exposes to browser bundle

---

## Email (Future / Phase 10+)

| Variable | Description | Status |
|----------|-------------|--------|
| `SMTP_HOST` | SMTP server | PLANNED |
| `SMTP_PORT` | SMTP port | PLANNED |
| `SMTP_USER` | SMTP username | PLANNED |
| `SMTP_PASS` | SMTP password | PLANNED |
| `EMAIL_FROM` | From address | PLANNED |

---

## Monitoring & Observability

| Variable | Description | Status |
|----------|-------------|--------|
| `SENTRY_DSN` | Sentry error tracking | PLANNED |
| `DATADOG_API_KEY` | Datadog APM | PLANNED |
| `LOG_LEVEL` | Log level | `info` |
| `LOG_FORMAT` | `json` \| `pretty` | `json` (prod) |

---

## Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_AI_EXTRACTION` | Skill extraction endpoint | `true` |
| `ENABLE_RESUME_ANALYSIS` | Resume parsing | `true` |
| `ENABLE_LEARNING_PATHS` | Gap analysis & learning | `true` |
| `ENABLE_MULTI_TENANCY` | Organization scoping | `true` |
| `ENABLE_MOCK_MODE` | Global mock mode | `false` |

---

## Complete .env.example

```bash
# ============================================================
# CORE
# ============================================================
NODE_ENV=development
PORT=4000
APP_URL=http://localhost:4000

# ============================================================
# DATABASE (Required unless MOCK_DATABASE=true)
# ============================================================
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skillsync?schema=public
# Alternative individual vars (for docker-compose):
# DB_USER=postgres
# DB_PASSWORD=postgres
# DB_NAME=skillsync

# ============================================================
# AUTHENTICATION (Required)
# ============================================================
AUTH_SECRET=your-super-secret-auth-key-change-in-production-min-32-chars
SESSION_COOKIE_NAME=skillsync_session
SESSION_COOKIE_MAX_AGE=604800
# SESSION_COOKIE_DOMAIN=.skillsync.com  # For subdomain sharing in prod

# ============================================================
# AI PROVIDERS (Optional - at least one for AI features)
# ============================================================
# OpenAI
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini
# OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Anthropic
# ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-3-5-haiku-20241022

# Local / Ollama (Free)
# LOCAL_AI_BASE_URL=http://localhost:11434/v1
# LOCAL_AI_MODEL=llama3.1:8b
# LOCAL_AI_EMBEDDING_MODEL=nomic-embed-text

# Force provider (auto-detect if not set)
# AI_PROVIDER=OPENAI

# ============================================================
# STORAGE (Optional - defaults to local)
# ============================================================
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./storage

# AWS S3 (if STORAGE_PROVIDER=s3)
# S3_BUCKET=skillsync-uploads
# S3_REGION=us-east-1
# S3_ACCESS_KEY_ID=...
# S3_SECRET_ACCESS_KEY=...
# S3_ENDPOINT=  # For MinIO/localstack

# ============================================================
# REDIS (Optional - in-memory fallback for dev)
# ============================================================
REDIS_URL=redis://localhost:6379

# ============================================================
# FRONTEND (Next.js)
# ============================================================
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_MOCK_MODE=false

# ============================================================
# FEATURE FLAGS
# ============================================================
ENABLE_AI_EXTRACTION=true
ENABLE_RESUME_ANALYSIS=true
ENABLE_LEARNING_PATHS=true
ENABLE_MULTI_TENANCY=true
ENABLE_MOCK_MODE=false

# ============================================================
# MONITORING (Optional)
# ============================================================
# SENTRY_DSN=...
# DATADOG_API_KEY=...
LOG_LEVEL=info
LOG_FORMAT=pretty
```

---

## Environment-Specific Overrides

### Development (.env.local)
```bash
NODE_ENV=development
LOG_FORMAT=pretty
NEXT_PUBLIC_MOCK_MODE=false  # Set true to test without API keys
ENABLE_MOCK_MODE=false
```

### Preview (Vercel Preview Deployments)
```bash
NODE_ENV=production
APP_URL=https://skillsync-api-git-branch-org.vercel.app
NEXT_PUBLIC_API_URL=https://skillsync-api-git-branch-org.vercel.app
NEXT_PUBLIC_APP_URL=https://skillsync-web-git-branch-org.vercel.app
LOG_FORMAT=json
```

### Production
```bash
NODE_ENV=production
APP_URL=https://api.skillsync.com
NEXT_PUBLIC_API_URL=https://api.skillsync.com
NEXT_PUBLIC_APP_URL=https://skillsync.com
SESSION_COOKIE_DOMAIN=.skillsync.com
LOG_FORMAT=json
LOG_LEVEL=warn
# All secrets from vault/secrets manager
```

---

## Mock Mode Quick Start

For development without external dependencies:

```bash
# .env.local
DATABASE_URL=mock
AI_PROVIDER=mock
STORAGE_PROVIDER=mock
REDIS_URL=mock
ENABLE_MOCK_MODE=true
NEXT_PUBLIC_MOCK_MODE=true
AUTH_SECRET=dev-secret-key-for-testing-only-min-32-chars
```

**What works in mock mode:**
- ✅ Auth (register, login, logout, me)
- ✅ Skill CRUD (in-memory)
- ✅ Skill Intelligence (deterministic confidence)
- ✅ Skill Graph (static relationships)
- ✅ AI Extraction (returns mock skills)
- ✅ Resume Upload (fake analysis)
- ✅ Learning Paths (static gaps)

**What doesn't work:**
- ❌ Persistent data (resets on restart)
- ❌ Real AI responses
- ❌ File storage
- ❌ Multi-instance scaling

---

## Validation Script

```bash
# Check required vars are set
npm run env:validate

# Or manually:
node -e "
const required = ['DATABASE_URL', 'AUTH_SECRET'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing:', missing.join(', '));
  process.exit(1);
}
console.log('All required vars present');
"
```

---

## Security Checklist

- [ ] `AUTH_SECRET` generated with `openssl rand -base64 32`
- [ ] No secrets in `.env.example` or repo
- [ ] Production secrets in vault (1Password, AWS Secrets Manager, Vercel Env)
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] `REDIS_URL` uses TLS in production
- [ ] `SESSION_COOKIE_SECURE=true` in production
- [ ] `CORS` origin restricted to exact domains
- [ ] Rate limiting enabled on auth endpoints