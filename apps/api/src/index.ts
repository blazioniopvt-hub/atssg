// SkillSync API Entry Point
// Phase 3: Authentication & Identity System
// Phase 5: Skill Intelligence & Evidence Engine
// Phase 6: AI Skill Extraction & Normalization
// Phase 7: Resume/CV Intelligence
// Phase 8: Skill Graph & Relationship Intelligence
// Phase 10-15: Enterprise, Opportunity, Observability, Security & Production Hardening

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rateLimiter } from 'hono-rate-limiter';

import prismaClient from './lib/prisma';
import authRoutes from './auth/routes';
import skillIntelligenceRoutes from './routes/skill-intelligence';
import skillGraphRoutes from './routes/skill-graph';
import aiRoutes from './routes/ai/skills';
import resumeRoutes from './routes/resume';
import learningRoutes from './routes/learning';
import roleRoutes from './routes/roles';
import projectRoutes from './routes/projects';
import portfolioRoutes from './routes/portfolio';
import careerReadinessRoutes from './routes/career-readiness';
import careerSimulationRoutes from './routes/career-simulation';
import careerCoachRoutes from './routes/career-coach';
import organizationRoutes from './routes/organizations';
import opportunityRoutes from './routes/opportunities';
import applicationRoutes from './routes/applications';
import adminRoutes from './routes/admin';
import integrationsRoutes from './routes/integrations';
import { billingRoute } from './routes/billing';
import { securityGuard } from './services/security/security-guard';

const app = new Hono();

app.use('*', logger());

// Security Headers Middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
});

// Production-hardened CORS
const allowedOrigins = Array.from(new Set([
  'http://localhost:3000',
  'http://localhost:4000',
  ...(process.env.APP_URL ? [process.env.APP_URL.replace(/\/$/, '')] : []),
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/$/, '')) : []),
]));

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return allowedOrigins[0];
    const normalized = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalized)) {
      return origin;
    }
    return '';
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Hub-Signature-256',
    'X-SkillSync-Signature',
    'X-SkillSync-Timestamp',
    'X-Event-ID',
    'X-Event-Type',
  ],
}));

// Global Production-Safe Error Handler (Zero Secret Leaks)
app.onError((err, c) => {
  const sanitized = securityGuard.sanitizeError(err);
  console.error('[API Error]:', err);
  const status = (err as any).status || 500;
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' ? 'An internal server error occurred' : sanitized.message,
      },
    },
    status
  );
});

// Key generator for sliding-window rate limiters
const clientIpKey = (c: any) =>
  c.req.header('cf-connecting-ip') ||
  c.req.header('x-forwarded-for') ||
  c.req.header('x-real-ip') ||
  '127.0.0.1';

// Rate limiter for auth endpoints (brute-force defense: 20 req/15min)
const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  keyGenerator: clientIpKey,
});

// Rate limiter for expensive AI & simulation endpoints (60 req/15min)
const aiRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  keyGenerator: clientIpKey,
});

// Rate limiter for file upload endpoints (30 req/15min)
const uploadRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  keyGenerator: clientIpKey,
});

// Rate limiter for webhook intake endpoints (120 req/min)
const webhookRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  keyGenerator: clientIpKey,
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'SkillSync API',
    version: '1.0.0',
    status: 'ok',
    phase: '15 - Production Launch & Platform Readiness MVP',
  });
});

// Application health check (liveness probe)
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  });
});

// Database health check (readiness probe)
app.get('/health/db', async (c) => {
  try {
    await prismaClient.$queryRaw`SELECT 1`;
    return c.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    return c.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

// API version endpoint
app.get('/api/version', (c) => {
  return c.json({
    version: '1.0.0',
    phase: '15',
    timestamp: new Date().toISOString(),
  });
});

// Auth routes with rate limiting
app.use('/auth/*', authRateLimiter);
app.route('/auth', authRoutes);

// AI Skill Extraction & Coaching routes with abuse defense
app.use('/ai/*', aiRateLimiter);
app.route('/ai', aiRoutes);

app.use('/career-coach/sessions/*/messages', aiRateLimiter);
app.route('/career-coach', careerCoachRoutes);

app.use('/career-simulations/*', aiRateLimiter);
app.route('/career-simulations', careerSimulationRoutes);

// Resume routes with upload rate limiting
app.use('/resumes/upload', uploadRateLimiter);
app.route('/resumes', resumeRoutes);

// Skill Intelligence & Target Role routes
app.route('/skill-intelligence', roleRoutes);
app.route('/skill-intelligence', skillIntelligenceRoutes);

// Skill Graph routes
app.route('/skill-graph', skillGraphRoutes);

// Learning routes
app.route('/learning', learningRoutes);

// Phase 7: Work-Sample & Project Intelligence
app.route('/projects', projectRoutes);
app.route('/portfolio', portfolioRoutes);

// Phase 8: Career Readiness
app.route('/career-readiness', careerReadinessRoutes);

// Phase 10: Organization & College Intelligence
app.route('/organizations', organizationRoutes);

// Phase 11: Opportunity & Placement Intelligence
app.route('/opportunities', opportunityRoutes);
app.route('/applications', applicationRoutes);

// Phase 12: Analytics, Audit & Observability
app.route('/admin', adminRoutes);

// Phase 13: Integrations & External Data Intelligence
app.use('/integrations/webhooks/*', webhookRateLimiter);
app.route('/integrations', integrationsRoutes);

// Phase 15: Production Launch, Billing/Plans Foundation
app.route('/billing', billingRoute);

import { serve } from '@hono/node-server';

const port = Number(process.env.PORT) || 4000;
if (process.env.NODE_ENV !== 'test' && !process.env.NEXT_RUNTIME && process.env.NEXT_PHASE !== 'phase-production-build') {
  console.log(`Server is running on port ${port}`);
  serve({
    fetch: app.fetch,
    port,
  });
}

export { app };
export default app;