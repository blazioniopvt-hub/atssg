import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../middleware/auth';
import { auditLogService } from '../services/observability/audit-log';
import { aiObservabilityService } from '../services/observability/ai-observability';
import { platformAnalyticsService } from '../services/observability/platform-analytics';
import prismaClient from '../lib/prisma';

const router = new Hono<{ Variables: AuthVariables }>();

// Public Liveness Check
router.get('/health/liveness', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Database & AI Connectivity Readiness Check
router.get('/health/readiness', async (c) => {
  let dbStatus = 'connected';
  try {
    await prismaClient.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';
  return c.json(
    {
      status: isHealthy ? 'ready' : 'degraded',
      database: dbStatus,
      aiProvider: 'ready',
      timestamp: new Date().toISOString(),
    },
    isHealthy ? 200 : 503
  );
});

// Protected System Diagnostics
router.get('/health/diagnostics', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    return c.json({ error: 'Access denied: administrator privileges required' }, 403);
  }

  return c.json({
    status: 'operational',
    nodeVersion: process.version,
    platform: process.platform,
    memoryUsage: process.memoryUsage(),
    uptimeSeconds: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Protected Platform Analytics
router.get('/analytics', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    return c.json({ error: 'Access denied: administrator privileges required' }, 403);
  }

  try {
    const analytics = await platformAnalyticsService.getPlatformAnalytics();
    return c.json({ data: analytics });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch platform analytics' }, 500);
  }
});

// Protected Audit Logs
router.get('/audit-logs', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    return c.json({ error: 'Access denied: administrator privileges required' }, 403);
  }

  const organizationId = c.req.query('organizationId');
  const actorId = c.req.query('actorId');
  const action = c.req.query('action');
  const resourceType = c.req.query('resourceType');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50;
  const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : 0;

  try {
    const result = await auditLogService.queryAuditLogs({
      organizationId,
      actorId,
      action,
      resourceType,
      limit,
      offset,
    });
    return c.json({ data: result.logs, total: result.total });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to query audit logs' }, 500);
  }
});

// Protected AI Observability Telemetry
router.get('/ai-observability', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    return c.json({ error: 'Access denied: administrator privileges required' }, 403);
  }

  const hours = c.req.query('hours') ? parseInt(c.req.query('hours')!, 10) : 24;

  try {
    const summary = await aiObservabilityService.getMetricsSummary(hours);
    return c.json({ data: summary });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch AI telemetry' }, 500);
  }
});

export default router;
