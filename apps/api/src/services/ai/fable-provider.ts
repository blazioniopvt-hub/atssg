// Fable 5.1 AI Provider Implementation
import { AIProvider, AIProviderConfig, AICompletionOptions, AICompletionResult } from './types';

export class FableProvider implements AIProvider {
  readonly providerType = 'fable' as const;
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultMaxTokens: number;
  private readonly defaultTemperature: number;
  private readonly timeoutMs: number;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || process.env.FABLE_API_KEY || '';
    this.baseUrl = config.baseUrl || process.env.FABLE_BASE_URL || 'https://api.fable.ai/v1';
    this.model = config.model || process.env.FABLE_MODEL || 'fable-5.1';
    this.defaultMaxTokens = config.maxTokens ?? 2048;
    this.defaultTemperature = config.temperature ?? 0.1;
    this.timeoutMs = config.timeoutMs ?? 30000;
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const startTime = Date.now();

    if (!this.apiKey) {
      throw new Error('Fable 5.1 API key not configured. Set FABLE_API_KEY environment variable.');
    }

    const messages = options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const requestBody = {
      model: this.model,
      messages,
      max_tokens: options.maxTokens ?? this.defaultMaxTokens,
      temperature: options.temperature ?? this.defaultTemperature,
      response_format: options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
    };

    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 500ms, 1500ms
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs);

      try {
        const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Fable-Client': 'SkillSync-Engine/1.0',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const status = response.status;
          const errorPayload = await response.json().catch(() => ({}));
          const safeErrorMsg = `Fable API returned status ${status}: ${(errorPayload as any)?.error?.message || 'Unknown provider error'}`;

          // If rate-limited or transient server error, retry
          if ((status === 429 || status >= 500) && attempt < maxRetries) {
            lastError = new Error(safeErrorMsg);
            continue;
          }

          throw new Error(safeErrorMsg);
        }

        const data: {
          choices: Array<{ message: { content: string } }>;
          usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
        } = await response.json() as any;

        const latencyMs = Date.now() - startTime;
        let content = data.choices?.[0]?.message?.content || '';

        // If JSON output requested, cleanse markdown code blocks if wrapped by model
        if (options.responseFormat === 'json') {
          content = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        }

        return {
          content,
          usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          } : undefined,
          latencyMs,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Fable request timed out after ${options.timeoutMs ?? this.timeoutMs}ms`);
        }
        if (attempt === maxRetries) {
          throw error;
        }
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError || new Error('Fable completion failed after retries');
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}
