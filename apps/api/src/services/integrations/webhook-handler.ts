import crypto from 'crypto';
import prismaClient from '../../lib/prisma';
import { type WebhookEventDTO } from '@skillsync/types';

export const inMemoryWebhookEvents = new Map<string, WebhookEventDTO>();

export class WebhookHandlerService {
  /**
   * Verifies HMAC-SHA256 signature against secret
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;

    const cleanSig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expected = hmac.digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(cleanSig, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }

  /**
   * Prevents replay attacks by checking timestamp tolerance (default: 300s / 5 minutes)
   */
  verifyTimestamp(timestampHeader?: string, maxAgeSeconds: number = 300): boolean {
    if (!timestampHeader) return false;
    const ts = parseInt(timestampHeader, 10);
    if (isNaN(ts)) return false;

    const eventTimeMs = ts > 1e11 ? ts : ts * 1000;
    const nowMs = Date.now();
    const diffSeconds = Math.abs(nowMs - eventTimeMs) / 1000;

    return diffSeconds <= maxAgeSeconds;
  }

  /**
   * Processes webhook event idempotently
   */
  async processWebhook(data: {
    provider: string;
    eventId: string;
    eventType: string;
    payload: any;
    signature?: string;
    timestamp?: string;
    webhookSecret?: string;
  }): Promise<{ status: string; duplicate: boolean }> {
    const secret = data.webhookSecret || process.env.WEBHOOK_SECRET || 'skillsync-default-webhook-secret-key-min-32-chars';

    // 1. Signature check if signature is provided
    if (data.signature) {
      const payloadStr = typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload);
      const isValid = this.verifySignature(payloadStr, data.signature, secret);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
    }

    // 2. Replay check if timestamp is provided
    if (data.timestamp) {
      const isFresh = this.verifyTimestamp(data.timestamp);
      if (!isFresh) {
        throw new Error('Webhook timestamp outside allowed tolerance (replay attack rejected)');
      }
    }

    // 3. Deduplication check
    const eventKey = `${data.provider}:${data.eventId}`;
    try {
      const existing = await prismaClient.webhookEvent.findUnique({
        where: {
          provider_eventId: {
            provider: data.provider,
            eventId: data.eventId,
          },
        },
      });

      if (existing) {
        return { status: 'ALREADY_PROCESSED', duplicate: true };
      }

      await prismaClient.webhookEvent.create({
        data: {
          provider: data.provider,
          eventId: data.eventId,
          eventType: data.eventType,
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      return { status: 'PROCESSED', duplicate: false };
    } catch {
      // Memory fallback
      if (inMemoryWebhookEvents.has(eventKey)) {
        return { status: 'ALREADY_PROCESSED', duplicate: true };
      }

      inMemoryWebhookEvents.set(eventKey, {
        id: `we_${Date.now()}`,
        provider: data.provider,
        eventId: data.eventId,
        eventType: data.eventType,
        status: 'PROCESSED',
        processedAt: new Date(),
        createdAt: new Date(),
      });

      return { status: 'PROCESSED', duplicate: false };
    }
  }
}

export const webhookHandlerService = new WebhookHandlerService();
