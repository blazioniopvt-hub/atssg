// AI Provider Factory
import { AIProvider, AIProviderConfig, AIProviderType, AIProviderFactory } from './types';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';
import { LocalProvider } from './local-provider';
import { FableProvider } from './fable-provider';

export class DefaultAIProviderFactory implements AIProviderFactory {
  create(config: AIProviderConfig): AIProvider {
    switch (config.providerType) {
      case 'fable':
        return new FableProvider(config);
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'local':
        return new LocalProvider(config);
      case 'custom':
        return new LocalProvider(config);
      default:
        throw new Error(`Unknown AI provider type: ${config.providerType}`);
    }
  }
}

export const aiProviderFactory = new DefaultAIProviderFactory();

// Convenience function to create provider from environment
export function createProviderFromEnv(): AIProvider | null {
  let providerType = (process.env.AI_PROVIDER || '').toLowerCase() as AIProviderType;

  if (!providerType) {
    if (process.env.FABLE_API_KEY) {
      providerType = 'fable';
    } else if (process.env.OPENAI_API_KEY) {
      providerType = 'openai';
    } else if (process.env.ANTHROPIC_API_KEY) {
      providerType = 'anthropic';
    } else {
      providerType = 'local';
    }
  }

  const apiKey =
    providerType === 'fable'
      ? process.env.FABLE_API_KEY || process.env.AI_API_KEY
      : providerType === 'openai'
      ? process.env.OPENAI_API_KEY || process.env.AI_API_KEY
      : providerType === 'anthropic'
      ? process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY
      : process.env.AI_API_KEY;

  const baseUrl =
    providerType === 'fable'
      ? process.env.FABLE_BASE_URL || process.env.AI_BASE_URL
      : process.env.AI_BASE_URL;

  const model =
    providerType === 'fable'
      ? process.env.FABLE_MODEL || process.env.AI_MODEL || 'fable-5.1'
      : process.env.AI_MODEL || 'gpt-4o-mini';

  const config: AIProviderConfig = {
    providerType,
    apiKey,
    baseUrl,
    model,
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2048', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.1'),
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10),
  };

  return aiProviderFactory.create(config);
}