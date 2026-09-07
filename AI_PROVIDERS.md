# AI Provider Configuration

> **Status**: IMPLEMENTED — Multi-provider factory with OpenAI, Anthropic, Local (Ollama)
> **Phase**: 6+ (Skill Extraction, Resume Analysis, Normalization)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AIProviderFactory                        │
│  getProvider(type: AIProviderType): AIProvider             │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  OpenAIProvider│ │AnthropicProvider│ │ LocalProvider │
│  (GPT-4o-mini) │ │ (Claude 3.5)  │ │   (Ollama)    │
└───────────────┘ └───────────────┘ └───────────────┘
```

---

## Provider Interface

```typescript
// services/ai/types.ts
interface AIProvider {
  /** Extract skills from text with context */
  extractSkills(text: string, context?: string): Promise<ExtractionResult>;

  /** Normalize a skill name against catalog */
  normalizeSkill(skillName: string, catalog: Skill[]): Promise<NormalizedSkill>;
}

interface ExtractionResult {
  skills: ExtractedSkill[];
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  providerType: AIProviderType;
  model: string;
}

interface ExtractedSkill {
  originalName: string;
  extractionConfidence: number;  // 0-1
  evidence: string;              // Supporting snippet
  normalized: NormalizedSkill;
}

interface NormalizedSkill {
  matched: boolean;
  matchedSkillId?: string;
  matchedSkillName?: string;
  confidence: number;            // 0-1
  reason: string;
}
```

---

## Configuration

### Environment Variables

```env
# OpenAI (Primary)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini        # Default for extraction
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Anthropic (Alternative)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-haiku-20241022

# Local / Ollama (Free, Private)
LOCAL_AI_BASE_URL=http://localhost:11434/v1
LOCAL_AI_MODEL=llama3.1:8b
LOCAL_AI_EMBEDDING_MODEL=nomic-embed-text

# Provider Selection (optional - auto-detected)
# AI_PROVIDER=OPENAI | ANTHROPIC | LOCAL
```

### Auto-Detection Logic

```typescript
// services/ai/provider-factory.ts
function getDefaultProvider(): AIProviderType {
  if (process.env.OPENAI_API_KEY) return 'OPENAI';
  if (process.env.ANTHROPIC_API_KEY) return 'ANTHROPIC';
  if (process.env.LOCAL_AI_BASE_URL) return 'LOCAL';
  return 'LOCAL'; // Default fallback
}
```

---

## Provider Details

### 1. OpenAI Provider

**File:** `apps/api/src/services/ai/openai-provider.ts`

| Aspect | Configuration |
|--------|---------------|
| **Models** | `gpt-4o-mini` (default), `gpt-4o`, `gpt-3.5-turbo` |
| **Embeddings** | `text-embedding-3-small`, `text-embedding-3-large` |
| **Pricing** | ~$0.15/1M input, $0.60/1M output (gpt-4o-mini) |
| **Rate Limits** | Tier-based (RPM, TPM) |
| **Best For** | Production, highest accuracy, structured output |

**Setup:**
```bash
# Get API key from https://platform.openai.com/api-keys
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_MODEL=gpt-4o-mini
```

**Prompt Strategy:**
- System prompt: Role definition + output format (JSON schema)
- User prompt: Text + context + few-shot examples
- Temperature: 0.1 (deterministic)
- Response format: `json_object` (enforced)

---

### 2. Anthropic Provider

**File:** `apps/api/src/services/ai/anthropic-provider.ts`

| Aspect | Configuration |
|--------|---------------|
| **Models** | `claude-3-5-haiku-20241022` (default), `claude-3-5-sonnet-20241022` |
| **Pricing** | ~$0.25/1M input, $1.25/1M output (Haiku) |
| **Rate Limits** | Tier-based |
| **Best For** | Production, long context, reasoning |

**Setup:**
```bash
# Get API key from https://console.anthropic.com/
export ANTHROPIC_API_KEY=sk-ant-your-key-here
export ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```

**Prompt Strategy:**
- System prompt with XML-style structured output
- XML tags for skill list: `<skills><skill>...</skill></skills>`
- Temperature: 0.1

---

### 3. Local Provider (Ollama)

**File:** `apps/api/src/services/ai/local-provider.ts`

| Aspect | Configuration |
|--------|---------------|
| **Models** | `llama3.1:8b` (default), `llama3.1:70b`, `codellama:13b`, `mistral:7b` |
| **Hardware** | 8GB RAM (8b), 48GB RAM (70b), GPU recommended |
| **Cost** | Free (self-hosted) |
| **Privacy** | Full data locality |
| **Best For** | Development, offline, sensitive data, cost control |

**Setup:**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start server
ollama serve &

# Pull models
ollama pull llama3.1:8b
ollama pull nomic-embed-text  # for embeddings

# Configure
export LOCAL_AI_BASE_URL=http://localhost:11434/v1
export LOCAL_AI_MODEL=llama3.1:8b
export LOCAL_AI_EMBEDDING_MODEL=nomic-embed-text
```

**Model Recommendations by Task:**

| Task | Recommended Model | Min RAM |
|------|-------------------|---------|
| Skill Extraction | `llama3.1:8b` | 8 GB |
| Resume Analysis | `llama3.1:70b` or `codellama:13b` | 48 GB / 16 GB |
| Normalization | `nomic-embed-text` (embeddings) | 4 GB |

**Prompt Strategy:**
- Uses Ollama's OpenAI-compatible `/v1/chat/completions` endpoint
- Same prompt templates as OpenAI
- Lower temperature (0.05) for consistency
- Longer timeout (120s for 70b models)

---

## Task-to-Model Mapping

```typescript
// services/ai/config.ts
const TASK_MODEL_MAP = {
  // Skill extraction from text
  extractSkills: {
    primary: 'OPENAI',
    model: 'gpt-4o-mini',
    fallback: ['ANTHROPIC', 'LOCAL'],
  },

  // Resume parsing (needs more reasoning)
  analyzeResume: {
    primary: 'OPENAI',
    model: 'gpt-4o',
    fallback: ['ANTHROPIC', 'LOCAL'],
  },

  // Skill normalization (embeddings + exact match)
  normalizeSkill: {
    primary: 'LOCAL',  // Embeddings are cheap locally
    model: 'nomic-embed-text',
    fallback: ['OPENAI'],
  },
};
```

---

## Cost Optimization

### Caching Strategy

```typescript
// services/ai/extraction.ts
// Cache by input text hash
const inputTextHash = createHash('sha256').update(text).digest('hex');

const cached = await prisma.aIExtractionJob.findFirst({
  where: { inputTextHash, status: 'COMPLETED' },
});

if (cached) {
  return cached.results; // Skip AI call
}
```

### Batch Processing

```typescript
// Combine multiple skill extractions in one prompt
const batchPrompt = `
Extract skills from these ${texts.length} texts:
${texts.map((t, i) => `${i+1}. ${t}`).join('\n\n')}

Return JSON array of skill arrays.
`;
```

### Token Tracking

```typescript
// Every AI call logs tokens
await prisma.aIExtractionJob.create({
  data: {
    userId,
    inputText,
    inputTextHash,
    providerType,
    model,
    inputTokens: response.usage.prompt_tokens,
    outputTokens: response.usage.completion_tokens,
    latencyMs: Date.now() - startTime,
  },
});
```

**Estimated Costs (OpenAI gpt-4o-mini):**
| Operation | Avg Tokens | Cost |
|-----------|------------|------|
| Skill Extraction (500 chars) | ~300 in / 200 out | $0.00007 |
| Resume Analysis (5000 chars) | ~1500 in / 800 out | $0.0005 |
| Normalization (embedding) | ~100 in | $0.00001 |

---

## Development vs Production

### Development (Local Ollama)

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Pull models
ollama pull llama3.1:8b
ollama pull nomic-embed-text

# .env
LOCAL_AI_BASE_URL=http://localhost:11434/v1
LOCAL_AI_MODEL=llama3.1:8b
# No OPENAI_API_KEY needed
```

**Pros:** Free, private, no rate limits
**Cons:** Slower, less accurate, needs GPU for 70b

### Production (OpenAI/Anthropic)

```bash
# .env
OPENAI_API_KEY=sk-prod-key
OPENAI_MODEL=gpt-4o-mini
# Or
ANTHROPIC_API_KEY=sk-ant-prod-key
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```

**Pros:** Fast, accurate, managed infrastructure
**Cons:** Cost per request, rate limits, data leaves your infra

### Hybrid (Recommended)

```bash
# .env - Use local for dev, cloud for prod
NODE_ENV=production
OPENAI_API_KEY=sk-prod-key
OPENAI_MODEL=gpt-4o-mini

# For normalization, use local embeddings even in prod
LOCAL_AI_BASE_URL=http://ollama-cluster:11434/v1
LOCAL_AI_EMBEDDING_MODEL=nomic-embed-text
```

---

## Error Handling

```typescript
// services/ai/extraction.ts
try {
  const result = await provider.extractSkills(text, context);
  return result;
} catch (error) {
  if (error.message.includes('rate limit')) {
    throw new Error('RATE_LIMITED');
  }
  if (error.message.includes('insufficient quota')) {
    throw new Error('QUOTA_EXCEEDED');
  }
  if (error.message.includes('context length')) {
    throw new Error('INPUT_TOO_LONG');
  }
  if (error.message.includes('not configured')) {
    throw new Error('AI_NOT_CONFIGURED');
  }
  throw new Error('EXTRACTION_FAILED');
}
```

**API Error Responses:**
| Error Code | HTTP | Cause |
|------------|------|-------|
| `AI_NOT_CONFIGURED` | 503 | No provider configured |
| `RATE_LIMITED` | 429 | Provider rate limit |
| `QUOTA_EXCEEDED` | 402 | Billing issue |
| `INPUT_TOO_LONG` | 400 | Exceeds context window |
| `EXTRACTION_FAILED` | 500 | Generic failure |

---

## Monitoring & Observability

### Metrics to Track

```typescript
// Per-request logging
console.log({
  event: 'ai_extraction',
  provider: providerType,
  model,
  latencyMs,
  inputTokens,
  outputTokens,
  skillCount: result.skills.length,
  matchedCount: result.skills.filter(s => s.normalized.matched).length,
  userId,
});
```

### Dashboards

| Metric | Alert Threshold |
|--------|-----------------|
| Avg latency | > 10s (OpenAI), > 60s (Local 70b) |
| Error rate | > 5% |
| Cost/day | > $50 (configurable) |
| Queue depth | > 100 pending |
| Cache hit rate | < 30% |

---

## Testing Providers

```bash
# Test OpenAI
curl -X POST http://localhost:4000/ai/skills/extract \
  -H "Content-Type: application/json" \
  -H "Cookie: skillsync_session=..." \
  -d '{"text":"I know Python and React","context":"web dev"}'

# Test Local (Ollama must be running)
# Same endpoint, just ensure LOCAL_AI_BASE_URL is set
```

---

## Future Enhancements

1. **Model Router** — Automatic selection based on task complexity
2. **Fine-tuning** — Custom models for skill extraction
3. **RAG Pipeline** — Retrieve relevant skills from catalog before extraction
4. **Streaming** — Progressive UI updates during long extractions
5. **Evaluation Framework** — Benchmark providers against golden set
6. **Cost Attribution** — Per-user/per-org cost tracking