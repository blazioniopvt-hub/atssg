// AI Provider Types
// Common types for AI provider abstraction

export interface AIProviderConfig {
  providerType: AIProviderType;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export type AIProviderType = 'openai' | 'anthropic' | 'local' | 'fable' | 'custom';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'json' | 'text';
  timeoutMs?: number;
}

export interface AICompletionResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface AIProvider {
  readonly providerType: AIProviderType;
  readonly model: string;
  
  complete(options: AICompletionOptions): Promise<AICompletionResult>;
  isAvailable(): Promise<boolean>;
}

export interface AIProviderFactory {
  create(config: AIProviderConfig): AIProvider;
}