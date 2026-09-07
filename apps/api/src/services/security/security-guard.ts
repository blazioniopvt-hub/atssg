import { auditLogService } from '../observability/audit-log';

export interface AuthenticatedActor {
  id: string;
  email?: string;
  role: string;
  organizationId?: string | null;
  orgRoles?: Record<string, string>; // orgId -> OrgUserRole
}

export class SecurityGuard {
  // In-memory rate limiting store: key -> Array of timestamps
  private rateLimitStore: Map<string, number[]> = new Map();

  // Adversarial prompt injection signatures
  private promptInjectionPatterns: Array<{ name: string; regex: RegExp }> = [
    { name: 'ignore_previous', regex: /ignore\s+(all\s+|any\s+|the\s+)?(previous|prior|above)\s+(instructions|directives|rules|prompts)/i },
    { name: 'system_override', regex: /(system\s*prompt\s*override|override\s+system\s+instructions)/i },
    { name: 'jailbreak_dan', regex: /(you\s+are\s+now|act\s+as)\s+(DAN|unrestricted|developer\s+mode|jailbroken)/i },
    { name: 'reveal_prompt', regex: /(reveal|leak|print|show|output)\s+(your\s+)?(system\s+prompt|instructions|initial\s+prompt|internal\s+rules|api\s*keys?)/i },
    { name: 'delimiters_injection', regex: /(<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]|```system)/i },
    { name: 'disregard_safety', regex: /(disregard|bypass|disable)\s+(all\s+)?(safety|ethical|content\s+filters?)/i },
  ];

  /**
   * Enforces role-based access control against a list of allowed roles.
   */
  enforceRole(actorRole: string, allowedRoles: string[]): boolean {
    if (actorRole === 'SUPER_ADMIN') return true;
    return allowedRoles.includes(actorRole);
  }

  /**
   * Prevents IDOR and Cross-Tenant Data Access.
   * Asserts that an actor has permission to access a tenant-scoped resource.
   */
  assertTenantAccess(actor: AuthenticatedActor, targetOrgId: string): boolean {
    if (actor.role === 'SUPER_ADMIN') {
      return true;
    }

    if (actor.organizationId === targetOrgId) {
      return true;
    }

    if (actor.orgRoles && actor.orgRoles[targetOrgId]) {
      return true;
    }

    throw new Error(`Access Denied: Actor [${actor.id}] does not belong to organization [${targetOrgId}]`);
  }

  /**
   * Asserts that an actor has permission to access a user-scoped resource (IDOR protection).
   */
  assertUserResourceAccess(actor: AuthenticatedActor, targetUserId: string): boolean {
    if (actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN') {
      return true;
    }

    if (actor.id === targetUserId) {
      return true;
    }

    throw new Error(`Access Denied: Actor [${actor.id}] cannot access resource owned by [${targetUserId}]`);
  }

  /**
   * Defends against Prompt Injection attacks before inputs reach LLMs.
   * Detects adversarial instructions, neutralizes delimiters, and returns sanitized text.
   */
  sanitizePromptInput(input: string): {
    sanitized: string;
    flagged: boolean;
    detectedPatterns: string[];
  } {
    if (!input || typeof input !== 'string') {
      return { sanitized: '', flagged: false, detectedPatterns: [] };
    }

    const detectedPatterns: string[] = [];

    for (const pattern of this.promptInjectionPatterns) {
      if (pattern.regex.test(input)) {
        detectedPatterns.push(pattern.name);
      }
    }

    let sanitized = input;

    // Neutralize dangerous delimiters and common jailbreak tokens
    sanitized = sanitized
      .replace(/<\|im_start\|>/gi, '[neutralized_delimiter]')
      .replace(/<\|im_end\|>/gi, '[neutralized_delimiter]')
      .replace(/\[INST\]/gi, '[neutralized_inst]')
      .replace(/\[\/INST\]/gi, '[neutralized_inst]')
      .replace(/```system/gi, '```text');

    // If adversarial pattern was detected, neutralize the explicit command
    for (const pattern of this.promptInjectionPatterns) {
      sanitized = sanitized.replace(pattern.regex, '[BLOCKED_INJECTION_DIRECTIVE]');
    }

    const flagged = detectedPatterns.length > 0;

    return {
      sanitized: sanitized.trim(),
      flagged,
      detectedPatterns,
    };
  }

  /**
   * Sanitizes strings to prevent XSS and HTML injection in user-supplied fields.
   */
  sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') return '';

    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:[^\s"'>]+/gi, '')
      .replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
      .replace(/<[^>]*>/g, (tag) => {
        // Strip out any tag that isn't safe text
        return tag.replace(/[<>]/g, '');
      });
  }

  /**
   * Sanitizes error messages to prevent leaking secrets, credentials, or internal stack details.
   */
  sanitizeError(error: any): { message: string; safe: boolean } {
    const rawMessage = error instanceof Error ? error.message : String(error);

    // Check for sensitive leakage patterns (DB URLs, API keys, JWT secrets)
    const sensitivePatterns = [
      /postgres:\/\/[^@]+@/gi,
      /mongodb(\+srv)?:\/\/[^@]+@/gi,
      /bearer\s+[a-zA-Z0-9_.-]+/gi,
      /sk-[a-zA-Z0-9]{20,}/gi,
      /ai_za[0-9A-Za-z-_]{35}/gi,
      /password\s*[:=]\s*[^\s,;]+/gi,
    ];

    let sanitizedMessage = rawMessage;
    let leaked = false;

    for (const pattern of sensitivePatterns) {
      if (pattern.test(rawMessage)) {
        leaked = true;
        sanitizedMessage = sanitizedMessage.replace(pattern, '[REDACTED_CREDENTIAL]');
      }
    }

    if (leaked) {
      return {
        message: sanitizedMessage,
        safe: false,
      };
    }

    return {
      message: sanitizedMessage,
      safe: true,
    };
  }

  /**
   * Sliding window in-memory rate limiter.
   */
  checkRateLimit(
    key: string,
    limit: number = 60,
    windowMs: number = 60000
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const timestamps = this.rateLimitStore.get(key) || [];

    // Filter out timestamps outside the sliding window
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= limit) {
      this.rateLimitStore.set(key, validTimestamps);
      return {
        allowed: false,
        remaining: 0,
        resetTime: validTimestamps[0] + windowMs,
      };
    }

    validTimestamps.push(now);
    this.rateLimitStore.set(key, validTimestamps);

    return {
      allowed: true,
      remaining: limit - validTimestamps.length,
      resetTime: now + windowMs,
    };
  }

  /**
   * Reset rate limits (primarily for testing)
   */
  resetRateLimits(): void {
    this.rateLimitStore.clear();
  }
}

export const securityGuard = new SecurityGuard();
