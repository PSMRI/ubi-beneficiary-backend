# Bedrock Model Switching Guide

Quick reference for switching between AWS Bedrock models without code changes.

## Supported Models

The system supports **3 AWS Bedrock models** with automatic parameter configuration:

| Model | Model ID | Max Tokens | Speed | Cost |
|-------|----------|------------|-------|------|
| **Claude Sonnet 4** | `anthropic.claude-sonnet-4-20250514-v1:0` | 4096 | Moderate | Higher |
| **OpenAI GPT** | `openai.gpt-oss-safeguard-120b` | 4096 | Fast | Moderate |
| **Llama 3 8B** | `meta.llama3-8b-instruct-v1:0` | 2048 | Fastest | Lowest |

**Note:** New versions (e.g., `claude-5`, `gpt-6`, `llama4`) automatically work with zero code changes!

---

## How to Switch Models

### Step 1: Edit `.env` File

Change **only one line** in your `.env` file:

```bash
OCR_MAPPING_BEDROCK_MODEL_ID=<model-id>
```

### Step 2: Choose Your Model

**For Maximum Accuracy:**
```bash
OCR_MAPPING_BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-20250514-v1:0
```

**For Balanced Performance (current default):**
```bash
OCR_MAPPING_BEDROCK_MODEL_ID=openai.gpt-oss-safeguard-120b
```

**For Speed & Cost Savings:**
```bash
OCR_MAPPING_BEDROCK_MODEL_ID=meta.llama3-8b-instruct-v1:0
```

### Step 3: Restart Application

```bash
npm run start:dev
```

That's it! No code changes needed.

---

## Auto-Configured Parameters

When you switch models, these parameters are **automatically adjusted**:

| Parameter | Claude | OpenAI | Llama |
|-----------|--------|--------|-------|
| `maxTokens` | 4096 | 4096 | 2048 |
| `temperature` | 0.1 | 0.1 | 0.1 |
| `topP` | 0.9 | 0.9 | 0.9 |
| `anthropicVersion` | bedrock-2023-05-31 | N/A | N/A |
| Request Format | Messages + version | Messages | Prompt-based |

**Configuration location**: `src/config/ai-models.config.ts`

**Detection method**: Prefix matching on model ID
- `anthropic.claude*` → Claude format
- `openai.gpt*` → OpenAI format  
- `meta.llama*` → Llama format

---

## Future Model Support

### New Versions Work Automatically

These models will work **with zero code changes**:

```bash
# Future Claude versions
anthropic.claude-sonnet-5-2026-v1:0  ✅
anthropic.claude-opus-4-2026-v1:0    ✅

# Future OpenAI versions  
openai.gpt-5-turbo-2026-v1:0         ✅
openai.gpt-oss-safeguard-2-v1:0      ✅

# Future Llama versions
meta.llama4-70b-instruct-v1:0        ✅
meta.llama3-405b-instruct-v1:0       ✅
```

### To Add New Model Family

If AWS releases a completely new model family (e.g., Cohere, Mistral), you need to update **2 places**:

1. **`src/config/ai-models.config.ts`** - Add detection + defaults:
   ```typescript
   // In detectModelFamily():
   if (id.startsWith('cohere.command')) return 'cohere';
   
   // In getModelDefaults():
   cohere: { maxTokens: 4000, temperature: 0.1, topP: 0.9 }
   ```

2. **`src/services/ocr-mapping/adapters/bedrock.adapter.ts`** - Add request format:
   ```typescript
   case 'cohere':
     return {
       prompt,
       max_tokens: this.config.maxTokens,
       ...
     };
   ```

That's it - simple and maintainable!

---

## When to Use Each Model

### Use Claude Sonnet 4 When:
- ✅ Processing complex multi-page documents
- ✅ Documents with 20+ fields
- ✅ Need highest extraction accuracy
- ✅ Cost is not primary concern
- ✅ Documents with nested/hierarchical data

### Use OpenAI GPT When:
- ✅ Need good balance of speed and accuracy
- ✅ Standard document types (marksheets, certificates)
- ✅ Moderate field count (10-20 fields)
- ✅ Production environment (current default)
- ✅ Reliable, well-tested performance

### Use Llama 3 8B When:
- ✅ Processing high volume of documents
- ✅ Budget constraints are important
- ✅ Simple documents with fewer fields (<15)
- ✅ Need fastest processing time
- ✅ Development/testing environments
- ⚠️ **Note**: 2048 token limit may truncate complex responses

---

## Response Format Differences

The system automatically handles different response formats:

### Claude Response:
```json
{
  "content": [
    {
      "text": "{\"name\":\"John\",\"age\":25}"
    }
  ]
}
```

### OpenAI Response:
```json
{
  "choices": [
    {
      "message": {
        "content": "{\"name\":\"John\",\"age\":25}"
      }
    }
  ]
}
```

### Llama Response:
```json
{
  "generation": "{\"name\":\"John\",\"age\":25}"
}
```

**Handled by**: `src/services/ocr-mapping/utils/json-parser.util.ts`

---

## Troubleshooting

### Problem: Token limit exceeded
**Solution**: 
- If using Llama (2048 limit): Switch to OpenAI or Claude
- If using OpenAI/Claude (4096 limit): Document too complex for auto-extraction

### Problem: Slow processing
**Solution**: Switch to Llama 3 8B for faster processing

### Problem: High costs
**Solution**: Switch to Llama 3 8B for 50-70% cost reduction

### Problem: Low accuracy
**Solution**: Switch to Claude Sonnet 4 for best accuracy

### Problem: Model not found error
**Solution**: 
1. Verify model ID spelling in `.env`
2. Check AWS Bedrock region has access to that model
3. Verify AWS credentials have Bedrock permissions

---

## Need More Control?

If you need to customize parameters beyond the defaults:

1. **Edit**: `src/config/ai-models.config.ts`
2. **Modify**: `MODEL_DEFAULTS` object
3. **Restart**: Application

See `docs/AI_MODEL_PARAMETERS.md` for detailed parameter documentation.

---

## Summary

- ✅ **Simple**: Change one line in `.env`
- ✅ **No code changes**: All parameters auto-configured
- ✅ **3 models supported**: Claude, OpenAI, Llama
- ✅ **Documented**: Full docs in `AI_MODEL_PARAMETERS.md`
- ✅ **Production-ready**: OpenAI is current default
