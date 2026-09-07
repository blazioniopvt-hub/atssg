// Test app factory - creates a Hono app without starting the server
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rateLimiter } from 'hono-rate-limiter';

// Set test environment variables
(process.env as any).AUTH_SECRET = process.env.AUTH_SECRET || 'dev-secret-change-in-production-min-32-chars';
(process.env as any).NODE_ENV = 'test';

import prismaClient from '../lib/prisma';
import authRoutes from '../auth/routes';
import skillIntelligenceRoutes from '../routes/skill-intelligence';
import skillGraphRoutes from '../routes/skill-graph';
import aiRoutes from '../routes/ai/skills';
import resumeRoutes from '../routes/resume';
import learningRoutes from '../routes/learning';
import roleRoutes from '../routes/roles';
import projectRoutes from '../routes/projects';
import portfolioRoutes from '../routes/portfolio';
import careerReadinessRoutes from '../routes/career-readiness';
import careerSimulationRoutes from '../routes/career-simulation';
import careerCoachRoutes from '../routes/career-coach';
import organizationRoutes from '../routes/organizations';
import opportunityRoutes from '../routes/opportunities';
import applicationRoutes from '../routes/applications';
import adminRoutes from '../routes/admin';
import integrationsRoutes from '../routes/integrations';
import { billingRoute } from '../routes/billing';

export function createTestApp() {
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
  });

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
  }));

  const authRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === 'test' ? 1000 : 20,
    standardHeaders: true,
    keyGenerator: (c) => c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'anonymous',
  });

  app.get('/', (c) => {
    return c.json({
      name: 'SkillSync API',
      version: '0.0.0',
      status: 'ok',
      phase: '10 - Target Role Intelligence & AI Production MVP',
    });
  });

  app.get('/health', (c) => {
    return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

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

  app.get('/api/version', (c) => {
    return c.json({
      version: '0.0.0',
      phase: '10',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/auth/*', authRateLimiter);
  app.route('/auth', authRoutes);
  app.route('/skill-intelligence', roleRoutes);
  app.route('/skill-intelligence', skillIntelligenceRoutes);
  app.route('/skill-graph', skillGraphRoutes);
  app.route('/ai', aiRoutes);
  app.route('/resumes', resumeRoutes);
  app.route('/learning', learningRoutes);
  app.route('/projects', projectRoutes);
  app.route('/portfolio', portfolioRoutes);
  app.route('/career-readiness', careerReadinessRoutes);
  app.route('/career-simulations', careerSimulationRoutes);
  app.route('/career-coach', careerCoachRoutes);
  app.route('/organizations', organizationRoutes);
  app.route('/opportunities', opportunityRoutes);
  app.route('/applications', applicationRoutes);
  app.route('/admin', adminRoutes);
  app.route('/integrations', integrationsRoutes);
  app.route('/billing', billingRoute);

  return app;
}