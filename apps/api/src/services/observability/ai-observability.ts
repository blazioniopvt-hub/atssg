import prismaClient from '../../lib/prisma';
import { type AIRequestMetricDTO } from '@skillsync/types';

export const inMemoryAiMetrics: AIRequestMetricDTO[] = [];

export class AIObservabilityService {
  /**
   * Records metadata for an AI execution
   */
  async recordMetric(data: {
    provider: string;
    model: string;
    category: string;
    latencyMs: number;
    status: 'SUCCESS' | 'FALLBACK' | 'ERROR';
    tokensUsed?: number;
    estimatedCostUsd?: number;
    error?: string;
  }): Promise<AIRequestMetricDTO> {
    try {
      const record = await prismaClient.aIRequestMetric.create({
        data: {
          provider: data.provider,
          model: data.model,
          category: data.category,
          latencyMs: data.latencyMs,
          status: data.status,
          tokensUsed: data.tokensUsed || null,
          estimatedCostUsd: data.estimatedCostUsd || null,
          error: data.error || null,
        },
      });

      return {
        id: record.id,
        provider: record.provider,
        model: record.model,
        category: record.category,
        latencyMs: record.latencyMs,
        status: record.status,
        tokensUsed: record.tokensUsed,
        estimatedCostUsd: record.estimatedCostUsd,
        error: record.error,
        createdAt: record.createdAt,
      };
    } catch {
      // Memory fallback
      const metric: AIRequestMetricDTO = {
        id: `aimetric_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        provider: data.provider,
        model: data.model,
        category: data.category,
        latencyMs: data.latencyMs,
        status: data.status,
        tokensUsed: data.tokensUsed || null,
        estimatedCostUsd: data.estimatedCostUsd || null,
        error: data.error || null,
        createdAt: new Date(),
      };
      inMemoryAiMetrics.push(metric);
      return metric;
    }
  }

  /**
   * Computes telemetry summary comparing providers and model performance
   */
  async getMetricsSummary(hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    let metrics: AIRequestMetricDTO[] = [];
    try {
      metrics = await prismaClient.aIRequestMetric.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      metrics = inMemoryAiMetrics.filter(m => new Date(m.createdAt) >= since);
    }

    const totalRequests = metrics.length;
    if (totalRequests === 0) {
      return {
        totalRequests: 0,
        successRate: 100,
        avgLatencyMs: 250,
        fallbackRate: 0,
        totalEstimatedCostUsd: 0,
        byProvider: {},
      };
    }

    let successCount = 0;
    let fallbackCount = 0;
    let totalLatency = 0;
    let totalCost = 0;
    const byProvider: Record<string, { requests: number; errors: number; avgLatency: number }> = {};

    for (const m of metrics) {
      if (m.status === 'SUCCESS') successCount++;
      if (m.status === 'FALLBACK') fallbackCount++;
      totalLatency += m.latencyMs;
      totalCost += m.estimatedCostUsd || 0;

      if (!byProvider[m.provider]) {
        byProvider[m.provider] = { requests: 0, errors: 0, avgLatency: 0 };
      }
      byProvider[m.provider].requests++;
      if (m.status === 'ERROR') byProvider[m.provider].errors++;
    }

    return {
      totalRequests,
      successRate: Math.round((successCount / totalRequests) * 100),
      avgLatencyMs: Math.round(totalLatency / totalRequests),
      fallbackRate: Math.round((fallbackCount / totalRequests) * 100),
      totalEstimatedCostUsd: Math.round(totalCost * 10000) / 10000,
      byProvider,
    };
  }
}

export const aiObservabilityService = new AIObservabilityService();
