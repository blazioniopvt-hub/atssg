import { Hono } from 'hono';
import { authMiddleware, adminMiddleware, type AuthVariables } from '../middleware/auth';
import { entitlementService } from '../services/billing/entitlement';
import { productionConfigValidator } from '../services/billing/production-config';

const billingRoute = new Hono<{ Variables: AuthVariables }>();

/**
 * GET /billing/plans
 * Returns available public subscription tiers and features
 */
billingRoute.get('/plans', (c) => {
  const plans = entitlementService.getAvailablePlans();
  return c.json({
    success: true,
    data: plans,
  });
});

/**
 * GET /billing/production-readiness
 * Operational readiness & config check (Admin only)
 */
billingRoute.get('/production-readiness', authMiddleware, adminMiddleware, (c) => {
  const status = productionConfigValidator.validate();
  return c.json({
    success: true,
    data: status,
  });
});

/**
 * GET /billing/subscription
 * Returns active subscription for current authenticated user
 */
billingRoute.get('/subscription', authMiddleware, async (c) => {
  const user = c.get('user');
  const subscription = await entitlementService.getUserSubscription(user.id);
  return c.json({
    success: true,
    data: subscription,
  });
});

/**
 * GET /billing/usage
 * Returns current month usage vs limits for metered actions
 */
billingRoute.get('/usage', authMiddleware, async (c) => {
  const user = c.get('user');
  const sub = await entitlementService.getUserSubscription(user.id);

  const actions = [
    'resumeUploadsPerMonth',
    'assessmentsPerMonth',
    'simulationsPerMonth',
    'aiCoachMessagesPerDay',
  ] as const;

  const usageReport: Record<string, any> = {};
  for (const act of actions) {
    const check = await entitlementService.canPerformAction(user.id, act);
    usageReport[act] = {
      allowed: check.allowed,
      currentUsage: check.currentUsage,
      limit: check.limit,
    };
  }

  return c.json({
    success: true,
    data: {
      planCode: sub.planCode,
      usage: usageReport,
    },
  });
});

/**
 * POST /billing/upgrade
 * Sets or upgrades the user's subscription plan
 */
billingRoute.post('/upgrade', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const { planCode } = body;

  const validPlans = entitlementService.getAvailablePlans().map((p) => p.planCode);
  if (!planCode || !validPlans.includes(planCode)) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_PLAN',
          message: `Invalid plan code. Valid plans are: ${validPlans.join(', ')}`,
        },
      },
      400
    );
  }

  entitlementService.setUserPlan(user.id, planCode);
  const updatedSub = await entitlementService.getUserSubscription(user.id);

  return c.json({
    success: true,
    data: updatedSub,
  });
});

export { billingRoute };
