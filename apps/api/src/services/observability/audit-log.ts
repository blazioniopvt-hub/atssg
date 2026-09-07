import prismaClient from '../../lib/prisma';
import { type AuditLogDTO } from '@skillsync/types';

export const inMemoryAuditLogs: AuditLogDTO[] = [];

// Sensitive keys to automatically redact from audit metadata
const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'jwttoken',
  'sessiontoken',
  'secret',
  'apikey',
  'authorization',
  'creditcard',
  'credential',
]);

export function sanitizeMetadata(metadata: any): any {
  if (!metadata || typeof metadata !== 'object') return metadata;
  if (Array.isArray(metadata)) {
    return metadata.map(sanitizeMetadata);
  }

  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (REDACTED_KEYS.has(k.toLowerCase())) {
      clean[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      clean[k] = sanitizeMetadata(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export class AuditLogService {
  /**
   * Centralized audit logging with automatic secret redaction
   */
  async logAction(data: {
    actorId?: string | null;
    organizationId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    metadata?: Record<string, any> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<AuditLogDTO> {
    const cleanMeta = sanitizeMetadata(data.metadata);

    try {
      const record = await prismaClient.auditLog.create({
        data: {
          actorId: data.actorId || null,
          organizationId: data.organizationId || null,
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId || null,
          metadata: cleanMeta || undefined,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
        include: {
          actor: { select: { email: true } },
        },
      });

      return {
        id: record.id,
        actorId: record.actorId,
        actorEmail: record.actor?.email,
        organizationId: record.organizationId,
        action: record.action,
        resourceType: record.resourceType,
        resourceId: record.resourceId,
        metadata: record.metadata as any,
        ipAddress: record.ipAddress,
        userAgent: record.userAgent,
        createdAt: record.createdAt,
      };
    } catch {
      // Memory fallback
      const logRecord: AuditLogDTO = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        actorId: data.actorId || null,
        actorEmail: data.actorId ? `${data.actorId}@skillsync.io` : null,
        organizationId: data.organizationId || null,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId || null,
        metadata: cleanMeta || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        createdAt: new Date(),
      };
      inMemoryAuditLogs.push(logRecord);
      return logRecord;
    }
  }

  /**
   * Queries audit logs with pagination and filters
   */
  async queryAuditLogs(filters: {
    organizationId?: string;
    actorId?: string;
    action?: string;
    resourceType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLogDTO[]; total: number }> {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    try {
      const where: any = {};
      if (filters.organizationId) where.organizationId = filters.organizationId;
      if (filters.actorId) where.actorId = filters.actorId;
      if (filters.action) where.action = filters.action;
      if (filters.resourceType) where.resourceType = filters.resourceType;

      const [records, total] = await Promise.all([
        prismaClient.auditLog.findMany({
          where,
          include: { actor: { select: { email: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prismaClient.auditLog.count({ where }),
      ]);

      return {
        logs: records.map((r: any) => ({
          id: r.id,
          actorId: r.actorId,
          actorEmail: r.actor?.email,
          organizationId: r.organizationId,
          action: r.action,
          resourceType: r.resourceType,
          resourceId: r.resourceId,
          metadata: r.metadata as any,
          ipAddress: r.ipAddress,
          userAgent: r.userAgent,
          createdAt: r.createdAt,
        })),
        total,
      };
    } catch {
      let filtered = inMemoryAuditLogs.slice();
      if (filters.organizationId) filtered = filtered.filter(l => l.organizationId === filters.organizationId);
      if (filters.actorId) filtered = filtered.filter(l => l.actorId === filters.actorId);
      if (filters.action) filtered = filtered.filter(l => l.action === filters.action);
      if (filters.resourceType) filtered = filtered.filter(l => l.resourceType === filters.resourceType);

      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return {
        logs: filtered.slice(offset, offset + limit),
        total: filtered.length,
      };
    }
  }
}

export const auditLogService = new AuditLogService();
