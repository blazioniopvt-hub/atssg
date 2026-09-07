# Database Migration Workflow

## Overview

This document describes the migration workflow for SkillSync's PostgreSQL database using Prisma Migrate.

## Prerequisites

- PostgreSQL 16+ (running via Docker Compose)
- Node.js 20+
- npm 10+
- Prisma CLI (installed as dev dependency)

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Verify `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skillsync?schema=public
   ```

3. Start PostgreSQL:
   ```bash
   docker compose -f infrastructure/docker/docker-compose.yml up -d
   ```

## Common Commands

### Generate Prisma Client
After any schema changes:
```bash
npm run db:generate
```

### Create New Migration
During development when schema changes:
```bash
npm run db:migrate -- --name descriptive_migration_name
```

This creates a new migration folder in `database/prisma/migrations/` with:
- `migration.sql` - The SQL to apply
- `migration_lock.toml` - Migration metadata

### Apply Pending Migrations
In development:
```bash
npm run db:migrate
```

In production/CI:
```bash
npm run db:migrate:deploy
```

### Push Schema Without Migration (Development Only)
For rapid prototyping without creating migration files:
```bash
npm run db:push
```

⚠️ **Warning**: `db push` does not create migration history. Use only for local experimentation.

### Reset Database (Development Only)
Complete reset with fresh migrations and seed:
```bash
# Stop containers and remove volumes
docker compose -f infrastructure/docker/docker-compose.yml down -v

# Start fresh
docker compose -f infrastructure/docker/docker-compose.yml up -d

# Wait for PostgreSQL to be ready
sleep 5

# Apply all migrations
npm run db:migrate:deploy

# Seed development data
npm run db:seed
```

### Open Prisma Studio
Visual database browser:
```bash
npm run db:studio
```

Opens at `http://localhost:5555`

## Migration File Structure

```
database/prisma/migrations/
├── 20250109000000_init/
│   ├── migration.sql      # SQL statements
│   └── migration_lock.toml # Metadata
├── 20250115000000_add_assessments/
│   ├── migration.sql
│   └── migration_lock.toml
└── migration_lock.toml     # Global migration state
```

## Naming Conventions

Migration names: `YYYYMMDDHHMMSS_short_description`
- Timestamp: when migration was created
- Description: kebab-case, imperative mood
  - `add_user_skills_table`
  - `add_verification_status_to_user_skills`
  - `create_opportunity_skills_relation`
  - `add_deleted_at_to_projects`

## Writing Migrations

### Automatic (Recommended)
Let Prisma generate SQL from schema changes:
```bash
# 1. Edit database/prisma/schema.prisma
# 2. Run:
npm run db:migrate -- --name add_new_feature
```

### Manual (Complex Changes)
For data migrations or complex transformations:

1. Create empty migration:
   ```bash
   npm run db:migrate -- --name manual_data_migration --create-only
   ```

2. Edit the generated `migration.sql` with custom SQL

3. Apply:
   ```bash
   npm run db:migrate
   ```

### Example: Data Migration
```sql
-- Add new column with default
ALTER TABLE "users" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- Backfill existing data based on location
UPDATE "users" 
SET "timezone" = CASE 
  WHEN "location" ILIKE '%new york%' THEN 'America/New_York'
  WHEN "location" ILIKE '%san francisco%' THEN 'America/Los_Angeles'
  WHEN "location" ILIKE '%london%' THEN 'Europe/London'
  ELSE 'UTC'
END;

-- Remove default after backfill
ALTER TABLE "users" ALTER COLUMN "timezone" DROP DEFAULT;
```

## Best Practices

### Do
- Always create migrations for schema changes
- Test migrations on a copy of production data
- Use transactions (Prisma wraps automatically)
- Add indexes in the same migration as the column
- Document breaking changes in migration name
- Keep migrations small and focused

### Don't
- Edit applied migrations (create new ones instead)
- Use `db push` in production
- Delete migration history
- Mix schema and data changes without testing
- Use destructive operations without backup plan

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/ci.yml`) runs:
1. `npm run db:generate` - Generate client
2. `npm run db:migrate:deploy` - Apply migrations to test DB
3. Tests run against migrated database

## Troubleshooting

### Migration Fails with "Database schema is not in sync"
```bash
# Option 1: Reset and reapply (development only)
npm run db:migrate:deploy -- --force

# Option 2: Create a new migration to fix
npm run db:migrate -- --name fix_schema_drift
```

### "Migration X already applied" but schema differs
1. Check migration_lock.toml for applied migrations
2. If in development: reset database and reapply
3. If in production: create corrective migration

### Lock Timeout During Migration
```sql
-- In migration.sql, set lock timeout
SET lock_timeout = '30s';
```

### Foreign Key Constraint Fails
Ensure referenced data exists before adding constraint:
```sql
-- 1. Add column without constraint
ALTER TABLE "projects" ADD COLUMN "owner_id" TEXT;

-- 2. Backfill data
UPDATE "projects" SET "owner_id" = (SELECT id FROM "users" LIMIT 1);

-- 3. Add constraint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" 
  FOREIGN KEY ("owner_id") REFERENCES "users"("id");
```

## Rollback Strategy

Prisma Migrate doesn't support automatic rollback. For rollback:

1. Create a new migration that reverses changes:
   ```bash
   npm run db:migrate -- --name rollback_feature_x
   ```

2. Write reverse SQL in the migration file

3. Apply:
   ```bash
   npm run db:migrate
   ```

## Production Checklist

Before deploying migrations to production:
- [ ] Migration tested on staging with production-like data
- [ ] Migration is backward compatible (no breaking changes)
- [ ] Migration doesn't lock tables for extended periods
- [ ] Rollback plan documented
- [ ] Database backup taken before deployment
- [ ] Migration can be applied during low-traffic window

## Useful Prisma Commands

```bash
# Validate schema
npx prisma validate --schema=database/prisma/schema.prisma

# Format schema
npx prisma format --schema=database/prisma/schema.prisma

# Show migration status
npx prisma migrate status --schema=database/prisma/schema.prisma

# Generate ER diagram (requires prisma-erd-generator)
npx prisma generate --schema=database/prisma/schema.prisma

# Introspect existing database
npx prisma db pull --schema=database/prisma/schema.prisma
```