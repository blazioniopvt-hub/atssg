# SkillSync Production Hardening Changelog

This changelog records all architectural, security, reliability, configuration, and verification changes made during the final production hardening pass.

---

### 1. Security & Access Control

#### `apps/api/src/middleware/auth.ts`
- **What Changed**: Enforced strict 401 Unauthorized in production (`NODE_ENV === 'production'`) when a session record is absent or deleted from the database.
- **Why It Changed**: Prevented authentication bypass where deleted/revoked sessions would otherwise fall back to a mock demo user (`usr_student_alex`).
- **Behavior Changed**: Revoked sessions in production now strictly fail with 401 Unauthorized. Non-production environments retain offline fallback for developer convenience.

#### `apps/api/src/routes/ai/skills.ts`
- **What Changed**: Attached `adminMiddleware` to `GET /ai/skills/aliases`, `POST /ai/skills/aliases`, and `DELETE /ai/skills/aliases/:id`.
- **Why It Changed**: Prevented broken access control where any student role could mutate global skill aliases.
- **Behavior Changed**: Only administrators (`ADMIN`, `SUPER_ADMIN`) can manage skill aliases.

#### `apps/api/src/routes/skill-graph.ts`
- **What Changed**: Attached `adminMiddleware` to `POST /skills/relationships`, `PATCH /skills/relationships/:id`, and `DELETE /skills/relationships/:id`.
- **Why It Changed**: Prevented unauthorized modification or deletion of global skill graph relationships by candidate accounts.
- **Behavior Changed**: Relationship mutations now strictly require administrator privileges.

#### `apps/api/src/routes/billing.ts`
- **What Changed**: Protected `GET /billing/production-readiness` with `authMiddleware` and `adminMiddleware`.
- **Why It Changed**: Prevented unauthenticated information disclosure of server environment variable configuration.
- **Behavior Changed**: Route now requires an authenticated administrator session.

#### `apps/api/src/routes/learning.ts`
- **What Changed**: Protected `POST /learning/resources/:id/verify` with `adminMiddleware`.
- **Why It Changed**: Prevented arbitrary non-privileged users from marking external learning resources as officially verified.
- **Behavior Changed**: Resource verification restricted to administrators.

---

### 2. Network & Abuse Hardening

#### `apps/api/src/index.ts` & `apps/api/src/__tests__/test-app.ts`
- **What Changed**:
  - Added HTTP security headers middleware (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `HSTS` in production).
  - Hardened CORS configuration to disallow untrusted origins (returns empty string instead of fallback origin).
  - Added tiered sliding-window rate limiters for AI (`aiRateLimiter`: 60 req/15m), file uploads (`uploadRateLimiter`: 30 req/15m), and webhooks (`webhookRateLimiter`: 120 req/m).
  - Added centralized error handler `app.onError` with `securityGuard.sanitizeError()` to mask database connection strings and sensitive credentials.
- **Why It Changed**: Protected against clickjacking, MIME sniffing, DoS attacks, API credit exhaustion, and secret leakage.
- **Behavior Changed**: Secure headers attached to all responses; expensive endpoints rate-limited.

---

### 3. AI Safety & Integration Resilience

#### `apps/api/src/services/ai/extraction.ts`
- **What Changed**: Applied `securityGuard.sanitizePromptInput()` before interpolating user input into extraction prompt templates.
- **Why It Changed**: Neutralized adversarial prompt injection attempts (`ignore previous instructions`, delimiter manipulation).
- **Behavior Changed**: Malicious prompt directives are safely neutralized before reaching LLM inference.

#### `apps/api/src/services/skill-intelligence/career-coach.ts`
- **What Changed**: Applied `securityGuard.sanitizePromptInput()` to user messages before invoking LLM completions.
- **Why It Changed**: Prevented prompt injection and jailbreak attacks targeting the AI career coach.
- **Behavior Changed**: Adversarial instructions neutralized while maintaining natural conversation flow.

#### `apps/api/src/services/ai/provider-factory.ts`
- **What Changed**: Updated `createProviderFromEnv()` to check `OPENAI_API_KEY` for OpenAI and `ANTHROPIC_API_KEY` for Anthropic, with fallback to `AI_API_KEY`.
- **Why It Changed**: Enabled standard third-party provider environment variable conventions.
- **Behavior Changed**: Multiple AI providers correctly resolve credentials from standard environment variable names.

#### `apps/api/src/services/billing/production-config.ts`
- **What Changed**: Allowed `AUTH_SECRET` as a valid alias for `JWT_SECRET`.
- **Why It Changed**: Prevented false-positive configuration warnings when `AUTH_SECRET` is configured.
- **Behavior Changed**: Configuration validation succeeds with standard `AUTH_SECRET`.

---

### 4. Frontend & Container Build Hardening

#### `apps/web/src/app/college/page.tsx`
- **What Changed**: Removed illegal cross-workspace relative import from `../../../../api/src/lib/demo-data`, defined typed `CollegeAnalyticsData` interface, and resolved missing properties.
- **Why It Changed**: Fixed TypeScript compile error that blocked `npm run typecheck` in `@skillsync/web`.
- **Behavior Changed**: Clean workspace isolation and 100% type-safe college intelligence portal.

#### `apps/web/src/lib/api.ts`
- **What Changed**: Hardened `request<T>()` to safely parse JSON and gracefully handle non-JSON / HTML error responses.
- **Why It Changed**: Prevented client-side uncaught `SyntaxError` when backend or gateway returns 502/504 HTML error pages.
- **Behavior Changed**: Safe error propagation to React UI components.

#### `apps/web/next.config.js`
- **What Changed**:
  - Added `output: 'standalone'` for Docker containerization.
  - Added HTTP security headers (`Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`).
  - Removed `ignoreBuildErrors: true` now that all TypeScript errors are resolved.
- **Why It Changed**: Enabled standalone container builds with `Dockerfile.web` and enforced browser security policies.
- **Behavior Changed**: Next.js production builds validate types strictly and output optimized standalone bundles.

---

### 5. Configuration & Documentation

#### `.env.example`
- **What Changed**: Added complete production environment variable template with `ALLOWED_ORIGINS`, `WEBHOOK_SECRET`, `PORT`, and credential guidance.
- **Why It Changed**: Provided a safe, comprehensive guide for production deployment operators.

#### `docs/PRODUCTION_READINESS.md`
- **What Changed**: Created formal production readiness audit report with component evaluations, risk analysis, and deployment checklist.
