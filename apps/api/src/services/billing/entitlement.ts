import prismaClient from '../../lib/prisma';

export interface PlanFeatureMatrix {
  planCode: string;
  name: string;
  description: string;
  priceMonthlyUsd: number;
  limits: {
    resumeUploadsPerMonth: number;
    assessmentsPerMonth: number;
    simulationsPerMonth: number;
    aiCoachMessagesPerDay: number;
    customCohorts: boolean;
    exportAuditLogs: boolean;
  };
}

export const PLATFORM_PLANS: PlanFeatureMatrix[] = [
  {
    planCode: 'FREE',
    name: 'SkillSync Starter',
    description: 'Essential skill verification and basic career intelligence for students',
    priceMonthlyUsd: 0,
    limits: {
      resumeUploadsPerMonth: 3,
      assessmentsPerMonth: 5,
      simulationsPerMonth: 1,
      aiCoachMessagesPerDay: 10,
      customCohorts: false,
      exportAuditLogs: false,
    },
  },
  {
    planCode: 'PRO',
    name: 'SkillSync Pro',
    description: 'Unlimited assessments, advanced simulations, and expanded AI coach access',
    priceMonthlyUsd: 19,
    limits: {
      resumeUploadsPerMonth: 50,
      assessmentsPerMonth: 100,
      simulationsPerMonth: 20,
      aiCoachMessagesPerDay: 200,
      customCohorts: false,
      exportAuditLogs: false,
    },
  },
  {
    planCode: 'ORGANIZATION',
    name: 'Institutional & College Tier',
    description: 'Cohort intelligence, curriculum gap analytics, and multi-tenant placement tools',
    priceMonthlyUsd: 299,
    limits: {
      resumeUploadsPerMonth: 10000,
      assessmentsPerMonth: 50000,
      simulationsPerMonth: 10000,
      aiCoachMessagesPerDay: 100000,
      customCohorts: true,
      exportAuditLogs: true,
    },
  },
  {
    planCode: 'ENTERPRISE',
    name: 'Enterprise / Employer Partner',
    description: 'Dedicated ATS integrations, verified candidate search, custom benchmarks',
    priceMonthlyUsd: 999,
    limits: {
      resumeUploadsPerMonth: -1, // Unlimited
      assessmentsPerMonth: -1,
      simulationsPerMonth: -1,
      aiCoachMessagesPerDay: -1,
      customCohorts: true,
      exportAuditLogs: true,
    },
  },
];

export const inMemorySubscriptions = new Map<string, any>();
export const inMemoryUsageRecords = new Map<string, Map<string, number>>();

export class EntitlementService {
  /**
   * Returns all available platform subscription plans
   */
  getAvailablePlans(): PlanFeatureMatrix[] {
    return PLATFORM_PLANS;
  }

  /**
   * Retrieves user's active subscription plan, falling back to FREE
   */
  async getUserSubscription(userId: string): Promise<{
    planCode: string;
    status: string;
    features: PlanFeatureMatrix['limits'];
    currentPeriodEnd: Date;
  }> {
    try {
      const sub = await prismaClient.subscription.findFirst({
        where: { userId, status: 'ACTIVE' },
      });

      if (sub) {
        const matchingPlan = PLATFORM_PLANS.find((p) => p.planCode === sub.planCode);
        return {
          planCode: sub.planCode,
          status: sub.status,
          features: matchingPlan ? matchingPlan.limits : PLATFORM_PLANS[0].limits,
          currentPeriodEnd: sub.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 3600 * 1000),
        };
      }
    } catch {
      // Prisma offline, fallback to in-memory store
    }

    const memSub = inMemorySubscriptions.get(userId);
    if (memSub) {
      const matchingPlan = PLATFORM_PLANS.find((p) => p.planCode === memSub.planCode);
      return {
        planCode: memSub.planCode,
        status: memSub.status || 'ACTIVE',
        features: matchingPlan ? matchingPlan.limits : PLATFORM_PLANS[0].limits,
        currentPeriodEnd: memSub.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 3600 * 1000),
      };
    }

    // Default to FREE starter tier
    return {
      planCode: 'FREE',
      status: 'ACTIVE',
      features: PLATFORM_PLANS[0].limits,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    };
  }

  /**
   * Checks whether the user has entitlement to perform a specific action given their tier limits
   */
  async canPerformAction(
    userId: string,
    action: keyof PlanFeatureMatrix['limits']
  ): Promise<{
    allowed: boolean;
    reason?: string;
    currentUsage: number;
    limit: number | boolean;
  }> {
    const sub = await this.getUserSubscription(userId);
    const limit = sub.features[action];

    // Boolean features
    if (typeof limit === 'boolean') {
      return {
        allowed: limit,
        reason: limit ? undefined : `Feature [${action}] is not included in the ${sub.planCode} plan`,
        currentUsage: 0,
        limit,
      };
    }

    // Unlimited quota (-1)
    if (limit === -1) {
      return {
        allowed: true,
        currentUsage: 0,
        limit,
      };
    }

    // Numeric limits: check usage
    const userUsage = inMemoryUsageRecords.get(userId) || new Map<string, number>();
    const current = userUsage.get(action as string) || 0;

    if (current >= limit) {
      return {
        allowed: false,
        reason: `Monthly quota reached for [${action}] (${current}/${limit}) on the ${sub.planCode} plan`,
        currentUsage: current,
        limit,
      };
    }

    return {
      allowed: true,
      currentUsage: current,
      limit,
    };
  }

  /**
   * Increments usage for a given metered action
   */
  async recordUsage(userId: string, action: string, amount: number = 1): Promise<number> {
    if (!inMemoryUsageRecords.has(userId)) {
      inMemoryUsageRecords.set(userId, new Map());
    }
    const userUsage = inMemoryUsageRecords.get(userId)!;
    const current = userUsage.get(action) || 0;
    const updated = current + amount;
    userUsage.set(action, updated);
    return updated;
  }

  /**
   * Sets or updates user plan (for testing or subscription management)
   */
  setUserPlan(userId: string, planCode: string): void {
    inMemorySubscriptions.set(userId, {
      planCode,
      status: 'ACTIVE',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    });
  }

  /**
   * Clears usage and in-memory subscriptions
   */
  reset(): void {
    inMemorySubscriptions.clear();
    inMemoryUsageRecords.clear();
  }
}

export const entitlementService = new EntitlementService();
