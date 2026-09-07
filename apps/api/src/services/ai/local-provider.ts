// Local Provider Implementation (for self-hosted models like Ollama, vLLM, etc.)
import { AIProvider, AIProviderConfig, AICompletionOptions, AICompletionResult, AIMessage } from './types';

export class LocalProvider implements AIProvider {
  readonly providerType = 'local' as const;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly defaultMaxTokens: number;
  private readonly defaultTemperature: number;
  private readonly timeoutMs: number;
  private readonly apiKey?: string;

  constructor(config: AIProviderConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434'; // Default Ollama URL
    this.model = config.model;
    this.defaultMaxTokens = config.maxTokens ?? 2048;
    this.defaultTemperature = config.temperature ?? 0.1;
    this.timeoutMs = config.timeoutMs ?? 60000; // Local models may be slower
    this.apiKey = config.apiKey;
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const startTime = Date.now();
    
    const messages = options.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Try OpenAI-compatible format first (works with vLLM, Ollama with OpenAI API)
    const requestBody = {
      model: this.model,
      messages,
      max_tokens: options.maxTokens ?? this.defaultMaxTokens,
      temperature: options.temperature ?? this.defaultTemperature,
      response_format: options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try Ollama native format as fallback
        return this.completeOllamaFormat(options, startTime);
      }

      const data = (await response.json()) as { choices: Array<{ message: { content: string } }>; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } };
      const latencyMs = Date.now() - startTime;

      const content = data.choices?.[0]?.message?.content || '';
      
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
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Local provider request timeout after ${this.timeoutMs}ms`);
      }
      // Try Ollama native format as fallback
      return this.completeOllamaFormat(options, startTime);
    }
  }

  private async completeOllamaFormat(options: AICompletionOptions, startTime: number): Promise<AICompletionResult> {
    const messages = options.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const requestBody = {
      model: this.model,
      messages,
      options: {
        num_predict: options.maxTokens ?? this.defaultMaxTokens,
        temperature: options.temperature ?? this.defaultTemperature,
      },
      format: options.responseFormat === 'json' ? 'json' : undefined,
      stream: false,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Local provider (Ollama) error: ${response.status}`);
      }

      const data = (await response.json()) as { message?: { content: string } };
      const latencyMs = Date.now() - startTime;

      const content = data.message?.content || '';
      
      return {
        content,
        latencyMs,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Try OpenAI-compatible endpoint first
      let response = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      if (!response.ok) {
        // Try Ollama native endpoint
        response = await fetch(`${this.baseUrl}/api/tags`, {
          method: 'GET',
          signal: controller.signal,
        });
      }
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}