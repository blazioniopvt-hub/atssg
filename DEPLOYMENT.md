# SkillSync Deployment Guide

> **Status**: PARTIALLY IMPLEMENTED — Docker builds work, deployment configs need finalization per target platform
> **Current Phase**: 9 (Skill Gap Analysis & Learning Path Engine)

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CDN / Edge    │────▶│  Load Balancer  │────▶│  Next.js Web    │
│  (Vercel/CloudFlare)   │  (AWS ALB/Nginx)  │  │  (port 3000)    │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                                 ▼                       ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  Hono API       │     │  PostgreSQL     │
                        │  (port 4000)    │────▶│  (Primary +     │
                        │                 │     │   Read Replica) │
                        └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
             ┌───────────┐ ┌───────────┐ ┌───────────┐
             │  Redis    │ │  S3/      │ │  AI       │
             │  (Cache,  │ │  Local    │ │  Provider │
             │  Sessions,│ │  Storage  │ │  (OpenAI/ │
             │  Rate Lim)│ │           │ │  Anthropic/│
             └───────────┘ └───────────┘ │  Local)   │
                                         └───────────┘
```

---

## Docker Build

### Multi-stage Dockerfile (API)

Create `apps/api/Dockerfile`:

```dockerfile
# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/*/package.json ./packages/*/
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspaces --include-workspace-root

# ---- Generate Prisma Client ----
FROM deps AS generate
COPY database/prisma ./database/prisma
RUN npm run db:generate --workspace=@skillsync/api

# ---- Build ----
FROM deps AS builder
COPY . .
RUN npm run build --workspace=@skillsync/api

# ---- Runtime ----
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy built artifacts
COPY --from=generate /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/database/prisma ./database/prisma

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 4000
CMD ["node", "dist/index.js"]
```

### Multi-stage Dockerfile (Web)

Create `apps/web/Dockerfile`:

```dockerfile
# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/*/package.json ./packages/*/
COPY apps/web/package.json ./apps/web/
RUN npm ci --workspaces --include-workspace-root

# ---- Build ----
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@skillsync/web

# ---- Runtime ----
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy standalone output
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/static ./.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./public

USER nodejs

EXPOSE 3000
CMD ["node", "server.js"]
```

### Build & Test Locally

```bash
# Build API
docker build -t skillsync-api -f apps/api/Dockerfile .

# Build Web
docker build -t skillsync-web -f apps/web/Dockerfile .

# Run with docker-compose (see below)
docker compose -f docker-compose.prod.yml up -d
```

---

## Docker Compose (Production)

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-skillsync}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME:-skillsync}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/prisma/migrations:/docker-entrypoint-initdb.d/migrations:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-skillsync}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - skillsync-network

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - skillsync-network

  api:
    image: skillsync-api:latest
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${DB_USER:-skillsync}:${DB_PASSWORD}@postgres:5432/${DB_NAME:-skillsync}?schema=public
      - AUTH_SECRET=${AUTH_SECRET}
      - SESSION_COOKIE_NAME=skillsync_session
      - SESSION_COOKIE_MAX_AGE=604800
      - APP_URL=${APP_URL}
      - REDIS_URL=redis://redis:6379
      # AI Providers
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - LOCAL_AI_BASE_URL=${LOCAL_AI_BASE_URL}
      - LOCAL_AI_MODEL=${LOCAL_AI_MODEL}
      # Storage
      - STORAGE_PROVIDER=${STORAGE_PROVIDER:-s3}
      - S3_BUCKET=${S3_BUCKET}
      - S3_REGION=${S3_REGION}
      - S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID}
      - S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY}
      - LOCAL_STORAGE_PATH=/app/storage
    ports:
      - "4000:4000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - skillsync-network
    volumes:
      - storage_data:/app/storage
    restart: unless-stopped

  web:
    image: skillsync-web:latest
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${APP_URL}/api
      - NEXT_PUBLIC_APP_URL=${APP_URL}
    ports:
      - "3000:3000"
    depends_on:
      - api
    networks:
      - skillsync-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
      - web
    networks:
      - skillsync-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  storage_data:

networks:
  skillsync-network:
    driver: bridge
```

---

## Environment Variables (Production)

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `AUTH_SECRET` | JWT signing secret (32+ chars) | `openssl rand -base64 32` |
| `APP_URL` | Public API URL (for CORS) | `https://api.skillsync.com` |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_COOKIE_NAME` | `skillsync_session` | Cookie name |
| `SESSION_COOKIE_MAX_AGE` | `604800` | 7 days in seconds |

### AI Providers (Choose at least one)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `LOCAL_AI_BASE_URL` | Ollama/local endpoint (e.g., `http://ollama:11434/v1`) |
| `LOCAL_AI_MODEL` | Model name (e.g., `llama3.1:8b`) |

### Storage

| Variable | Description |
|----------|-------------|
| `STORAGE_PROVIDER` | `s3` or `local` |
| `S3_BUCKET` | S3 bucket name |
| `S3_REGION` | AWS region |
| `S3_ACCESS_KEY_ID` | AWS access key |
| `S3_SECRET_ACCESS_KEY` | AWS secret key |
| `LOCAL_STORAGE_PATH` | Local path (default `/app/storage`) |

### Database (Alternative to DATABASE_URL)

| Variable | Description |
|----------|-------------|
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_NAME` | Database name |

### Redis

| Variable | Default |
|----------|---------|
| `REDIS_URL` | `redis://redis:6379` |

---

## Production Checklist

### Security
- [ ] `AUTH_SECRET` generated with `openssl rand -base64 32`
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] PostgreSQL: Strong password, non-default port, restricted SG
- [ ] Redis: Password protected, not publicly exposed
- [ ] HTTPS enforced (TLS 1.2+)
- [ ] CORS: `APP_URL` set to exact production domain
- [ ] Cookie: `Secure=true`, `SameSite=Lax`, `HttpOnly=true`
- [ ] Rate limiting: Redis-backed for multi-instance
- [ ] Secrets in vault/manager (not in repo/env files)

### Database
- [ ] Migrations applied: `npm run db:migrate:deploy`
- [ ] Connection pooling (PgBouncer for >100 connections)
- [ ] Read replica configured for scaling reads
- [ ] Automated backups (daily + point-in-time recovery)
- [ ] Monitoring: slow queries, connection count, disk usage

### API
- [ ] Health checks: `/health`, `/health/db`
- [ ] Logging: Structured JSON (Pino/Winston) → log aggregator
- [ ] Metrics: Prometheus `/metrics` endpoint
- [ ] Graceful shutdown: SIGTERM handling
- [ ] Request timeouts configured
- [ ] Body size limits (resume uploads)

### Web
- [ ] Next.js output: `standalone` (configured in `next.config.js`)
- [ ] Static assets: CDN cached (CloudFlare/Vercel Edge)
- [ ] CSP headers configured
- [ ] Image optimization domain allowlist

### AI / Resume Processing
- [ ] AI provider API keys valid & quota sufficient
- [ ] Local AI (Ollama) GPU-enabled if used
- [ ] Resume storage: S3 with versioning + lifecycle
- [ ] File upload: Size limit (10MB), type validation
- [ ] Async processing queue for large files (BullMQ + Redis)

### Monitoring & Observability
- [ ] Uptime monitoring (Pingdom/Datadog/Healthchecks.io)
- [ ] APM: Datadog/New Relic/Honeycomb
- [ ] Error tracking: Sentry
- [ ] Log aggregation: Loki/ELK/Datadog Logs
- [ ] Alerts: DB down, API 5xx >1%, queue lag, disk space

### CI/CD
- [ ] GitHub Actions: lint, typecheck, test, build
- [ ] Docker images pushed to registry (GHCR/ECR/Docker Hub)
- [ ] Database migrations run before deploy
- [ ] Blue-green or rolling deployment
- [ ] Smoke tests post-deploy
- [ ] Rollback procedure documented

---

## Deployment Options

### Option 1: Vercel (Web) + Railway/Render (API) — Recommended for Start

**Web on Vercel:**
```bash
# 1. Push to GitHub
# 2. Import in Vercel
# 3. Set env vars in Vercel dashboard
# 4. Deploy

# next.config.js must have:
output: 'standalone',
```

**API on Railway:**
```bash
# 1. railway login
# 2. railway init
# 3. railway add postgresql
# 4. railway add redis
# 5. Set env vars: railway variables set KEY=value
# 6. railway up

# Or use railway.toml:
# [build]
# builder = "dockerfile"
# dockerfilePath = "apps/api/Dockerfile"
```

**Pros:** Zero-config, auto-scaling, preview deployments
**Cons:** Cost at scale, less control

---

### Option 2: AWS ECS Fargate + RDS + ElastiCache

**Infrastructure (Terraform sketch):**
```hcl
# RDS PostgreSQL
resource "aws_db_instance" "skillsync" {
  engine               = "postgres"
  engine_version       = "16.2"
  instance_class       = "db.t3.medium"
  allocated_storage    = 100
  storage_encrypted    = true
  db_name              = "skillsync"
  username             = "skillsync"
  password             = var.db_password
  vpc_security_group_ids = [aws_security_group.rds.id]
  backup_retention_period = 7
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "skillsync" {
  replication_group_id       = "skillsync-redis"
  engine                     = "redis"
  engine_version             = "7.2"
  node_type                  = "cache.t3.micro"
  number_of_cache_clusters   = 2
  automatic_failover_enabled = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_password
}

# ECS Cluster + Services (API + Web)
# Use Fargate with ALB, target groups, auto-scaling
```

**Deploy:**
```bash
# Build & push
docker build -t $ECR_API_URL .
docker push $ECR_API_URL

# ECS service update
aws ecs update-service --cluster skillsync --service api --force-new-deployment
```

**Pros:** Full control, VPC isolation, enterprise features
**Cons:** Complex setup, operational overhead

---

### Option 3: Google Cloud Run

**API:**
```bash
gcloud run deploy skillsync-api \
  --image gcr.io/$PROJECT/skillsync-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=...,AUTH_SECRET=...,OPENAI_API_KEY=... \
  --add-cloudsql-instances $PROJECT:$REGION:skillsync-db \
  --memory 1Gi --cpu 1 --min-instances 1 --max-instances 10
```

**Web:**
```bash
gcloud run deploy skillsync-web \
  --image gcr.io/$PROJECT/skillsync-web \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_URL=https://skillsync-api-xxx.run.app \
  --memory 512Mi --cpu 1 --min-instances 1 --max-instances 10
```

**Pros:** Serverless containers, scale-to-zero, per-request billing
**Cons:** Cold starts, 60s request timeout (configure max 3600s)

---

### Option 4: Kubernetes (EKS/GKE/AKS)

**Helm Chart Structure:**
```
helm/skillsync/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── api-deployment.yaml
│   ├── web-deployment.yaml
│   ├── api-service.yaml
│   ├── web-service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── hpa.yaml
│   └── servicemonitor.yaml
```

**Key Configs:**
```yaml
# values.yaml
api:
  image: skillsync-api:latest
  replicas: 3
  resources:
    limits: { cpu: "1000m", memory: "1Gi" }
    requests: { cpu: "250m", memory: "512Mi" }
  env:
    DATABASE_URL: "postgresql://..."
    AUTH_SECRET: "..."
  autoscaling:
    minReplicas: 2
    maxReplicas: 20
    targetCPUUtilization: 70

web:
  image: skillsync-web:latest
  replicas: 3
  # ...

postgresql:
  enabled: true
  primary:
    persistence:
      size: 50Gi
  readReplicas:
    replicas: 1

redis:
  enabled: true
  cluster:
    enabled: false
  master:
    persistence:
      size: 5Gi
```

**Deploy:**
```bash
helm upgrade --install skillsync ./helm/skillsync \
  -n skillsync --create-namespace \
  -f values-prod.yaml
```

---

### Option 5: Docker Compose on Single VM (Low Cost)

**Use `docker-compose.prod.yml` above on a $20-40/mo VM (2-4 vCPU, 4-8GB RAM).**

**Setup:**
```bash
# On VM
git clone <repo>
cd skillsync
cp .env.example .env
# Edit .env with production values
docker compose -f docker-compose.prod.yml up -d

# Migrate
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

**Add systemd service for auto-restart:**
```ini
# /etc/systemd/system/skillsync.service
[Unit]
Description=SkillSync
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/skillsync
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable skillsync
systemctl start skillsync
```

---

## SSL/TLS Termination

### Nginx Config (`nginx/nginx.conf`):

```nginx
events { worker_connections 1024; }

http {
    upstream api {
        server api:4000;
    }
    upstream web {
        server web:3000;
    }

    server {
        listen 80;
        server_name skillsync.example.com api.skillsync.example.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name skillsync.example.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        location / {
            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    server {
        listen 443 ssl http2;
        server_name api.skillsync.example.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

**Get certs (Let's Encrypt):**
```bash
certbot certonly --standalone -d skillsync.example.com -d api.skillsync.example.com
# Copy to ./nginx/ssl/
```

---

## Scaling Considerations

| Component | Scaling Strategy |
|-----------|-----------------|
| **API** | Horizontal (stateless) — HPA on CPU/memory/custom metrics |
| **Web** | Horizontal (static export/CDN) — Vercel/CloudFlare handles |
| **PostgreSQL** | Read replicas for queries; vertical for writes; PgBouncer for pooling |
| **Redis** | Cluster mode for >256MB; read replicas |
| **AI** | Queue (BullMQ) + workers; batch requests |
| **Storage** | S3 (unlimited); CDN for downloads |

---

## Rollback Procedure

```bash
# Docker Compose
docker compose -f docker-compose.prod.yml pull api:v1.2.3
docker compose -f docker-compose.prod.yml up -d api

# ECS
aws ecs update-service --cluster skillsync --service api \
  --task-definition skillsync-api:123

# Kubernetes
helm rollback skillsync 3

# Vercel
vercel rollback <deployment-url>
```

---

## Cost Estimates (Monthly, USD)

| Setup | Est. Cost | Best For |
|-------|-----------|----------|
| Vercel (Hobby) + Railway (Hobby) | $0-20 | MVP, low traffic |
| Single VM (4 vCPU, 8GB) + Docker Compose | $24-40 | Small team, full control |
| AWS ECS Fargate + RDS + ElastiCache | $150-400 | Production, auto-scale |
| GCP Cloud Run + Cloud SQL + Memorystore | $100-300 | Serverless preference |
| Kubernetes (EKS) + RDS + ElastiCache | $500+ | Enterprise, multi-team |

---

## Quick Deploy Commands Reference

```bash
# Local prod test
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Railway
railway up

# Vercel
vercel --prod

# GCP Cloud Run
gcloud run deploy skillsync-api --image gcr.io/$PROJECT/skillsync-api --region us-central1
gcloud run deploy skillsync-web --image gcr.io/$PROJECT/skillsync-web --region us-central1

# Kubernetes
helm upgrade --install skillsync ./helm/skillsync -n skillsync -f values-prod.yaml
```