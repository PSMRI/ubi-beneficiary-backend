# AI Model Parameters Documentation

This document explains all AI model configuration parameters used in the OCR and mapping services.

## Table of Contents
- [Supported Bedrock Models](#supported-bedrock-models)
- [Critical Parameters](#critical-parameters)
- [Optional Parameters](#optional-parameters)
- [Model-Specific Limits](#model-specific-limits)
- [Troubleshooting Guide](#troubleshooting-guide)

---

## Supported Bedrock Models

The system supports **3 AWS Bedrock models** for OCR mapping. Simply change `OCR_MAPPING_BEDROCK_MODEL_ID` in your `.env` file:

### 1. **Anthropic Claude Sonnet 4** (Recommended for Accuracy)
```bash
OCR_MAPPING_BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-20250514-v1:0
```
- **Best for**: Maximum accuracy on complex documents
- **Max tokens**: 4096 (auto-configured)
- **Speed**: Moderate
- **Cost**: Higher
- **Request format**: Messages API with `anthropic_version`
- **Use when**: You need highest accuracy and have complex/multi-page documents

### 2. **OpenAI GPT OSS Safeguard** (Balanced)
```bash
OCR_MAPPING_BEDROCK_MODEL_ID=openai.gpt-oss-safeguard-120b
```
- **Best for**: Good balance of accuracy and speed
- **Max tokens**: 4096 (auto-configured)
- **Speed**: Fast
- **Cost**: Moderate
- **Request format**: Messages API (OpenAI-style)
- **Use when**: You need reliable performance with reasonable costs (Current default)

### 3. **Meta Llama 3 8B** (Fast & Cost-Effective)
```bash
OCR_MAPPING_BEDROCK_MODEL_ID=meta.llama3-8b-instruct-v1:0
```
- **Best for**: High-volume processing with budget constraints
- **Max tokens**: 2048 (auto-configured)
- **Speed**: Fastest
- **Cost**: Lowest
- **Request format**: Prompt-based with `max_gen_len`
- **Use when**: Processing many simple documents with fewer fields

### Auto-Configuration

All model-specific parameters (max tokens, temperature, topP, etc.) are **automatically configured** based on the model you select. No additional environment variables needed!

**Configuration happens in**: `src/config/ai-models.config.ts`

---

## Critical Parameters

### Temperature (0.0 - 1.0)
**Purpose**: Controls randomness in AI responses
- `0.0` = Completely deterministic (same input = same output)
- `0.1` = Very low randomness (recommended for structured data extraction)
- `0.5` = Moderate randomness
- `1.0` = High randomness (creative but inconsistent)

**Current Setting**: `0.1`
**Why**: Ensures consistent field names and JSON structure across multiple documents
**When to change**: Only if you need more creative responses (not recommended for data extraction)

---

### maxOutputTokens / maxTokens
**Purpose**: Maximum number of tokens (words/pieces) the AI can generate
- `1 token ≈ 0.75 words` in English
- `2048 tokens ≈ 1500+ words` (enough for JSON with 20-25 fields)
- `8192 tokens ≈ 6000+ words` (for complex JSON with 28+ fields)

**Current Settings**:
- **Gemini**: `8192` - Allows complete JSON responses for documents with many fields
- **Bedrock Llama 3 8B**: `2048` - **MAXIMUM LIMIT for this model**

**Important Notes**:
- Bedrock Llama 3 8B has a hard limit of 2048 tokens
- Exceeding this causes `ValidationException` errors
- Use Llama 3 70B or Claude models if you need more than 2048 tokens

**When to change**:
- **Increase**: If you see truncated responses ending with "..."
- **Decrease**: To save costs (but risk incomplete responses)

---

### maxGenLen (Bedrock/Llama only)
**Purpose**: Maximum generation length for Llama models (similar to maxTokens)
**Current Setting**: `2048`
**Why**: Must match maxTokens and cannot exceed model's maximum
**When to change**: Should always match maxTokens value

---

### Timeout (milliseconds)
**Purpose**: How long to wait for AI response before giving up
- `30000ms` = 30 seconds (mapping operations)
- `60000ms` = 60 seconds (OCR text extraction)

**Why these values**: Complex documents with many fields need time to process

**When to change**:
- **Increase**: If you get timeout errors on large/complex documents
- **Decrease**: For faster failures (but risk losing complex document processing)

---

## Optional Parameters

### topP (0.0 - 1.0)
**Purpose**: Nucleus sampling - what percentage of probable words to consider
- `0.9` = Consider top 90% most likely words
- `1.0` = Consider all possible words

**Current Setting**: `1.0`
**Why**: Allows AI to use its full vocabulary for better field extraction
**Impact if removed**: Minimal - model will use defaults (~0.9)

---

### topK
**Purpose**: Limits AI to consider only top K most likely next words
**Current Setting**: `32`
**Why**: Balances response quality with vocabulary diversity
**Impact if removed**: Minimal - model will use defaults

---

### validationTimeout
**Purpose**: Timeout for validation operations only (not main OCR/mapping)
**Current Setting**: `10000ms`
**Impact**: Minimal - only affects quick validation checks

---

### validationMaxTokens
**Purpose**: Token limit for validation responses only
**Current Setting**: `10 tokens`
**Impact**: Minimal - only affects validation responses

---

## Model-Specific Limits

### AWS Bedrock - Anthropic Claude Sonnet 4
- **Model ID**: `anthropic.claude-sonnet-4-20250514-v1:0`
- **Maximum max_tokens**: `4096 tokens` (auto-configured)
- **Request format**: Requires `anthropic_version` field
- **Response format**: `{ content: [{ text: "..." }] }`
- **Best use**: Complex documents with many fields

### AWS Bedrock - OpenAI GPT OSS Safeguard
- **Model ID**: `openai.gpt-oss-safeguard-120b`
- **Maximum max_tokens**: `4096 tokens` (auto-configured)
- **Request format**: Messages API (OpenAI-style)
- **Response format**: `{ choices: [{ message: { content: "..." } }] }`
- **Best use**: General-purpose document processing

### AWS Bedrock - Meta Llama 3 8B Instruct
- **Model ID**: `meta.llama3-8b-instruct-v1:0`
- **Maximum max_gen_len**: `2048 tokens` (auto-configured)
- **Request format**: Prompt-based (different from others!)
- **Response format**: `{ generation: "..." }`
- **Exceeding limit**: Causes `ValidationException`
- **Best use**: High-volume, simple documents

### Google Gemini 1.5 Flash
- **Model ID**: `gemini-1.5-flash`
- **Maximum maxOutputTokens**: `8192 tokens` (configurable, can go higher)

### Google Gemini 2.0 Flash Exp
- **Model ID**: `gemini-2.0-flash-exp`
- **Maximum maxOutputTokens**: `8192 tokens` (configurable, can go higher)

---

## Troubleshooting Guide

### Issue: Want to switch Bedrock models
**Solution**: Just change one line in `.env`:
```bash
# For best accuracy
OCR_MAPPING_BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-20250514-v1:0

# For balanced performance (current default)
OCR_MAPPING_BEDROCK_MODEL_ID=openai.gpt-oss-safeguard-120b

# For fastest/cheapest
OCR_MAPPING_BEDROCK_MODEL_ID=meta.llama3-8b-instruct-v1:0
```
All parameters automatically adjust!

### Issue: JSON responses are incomplete/truncated
**Solution**: Switch to a model with higher token limit
- **Current model**: Llama 3 (2048 tokens) → Switch to OpenAI or Claude (4096 tokens)
- **Already using Claude/OpenAI**: Check document complexity, may need custom prompts

### Issue: Getting timeout errors on complex documents
**Solution**: 
1. Try Claude Sonnet 4 (best for complex docs)
2. If still timing out, increase timeout in `ai-models.config.ts`

### Issue: Costs are too high
**Solution**: Switch to Llama 3 8B for cost savings
```bash
OCR_MAPPING_BEDROCK_MODEL_ID=meta.llama3-8b-instruct-v1:0
```
Note: Llama has 2048 token limit, suitable for simpler documents

### Issue: Field names are inconsistent between requests
**Solution**: Already optimized (temperature = 0.1 for all models)
- If still inconsistent, check prompt configuration in `prompts.config.ts`

### Issue: Model returns errors about max_tokens
**Solution**: Model-specific issue
- **Llama**: Hardcoded at 2048, cannot increase
- **Claude/OpenAI**: Auto-configured to 4096, if you modified config, check `ai-models.config.ts`
- Reduce `maxOutputTokens` to `4096` (test for truncation first)
- Reduce timeouts to `15000ms` for mapping (test for failures first)

### Issue: ValidationException on Bedrock
**Solution**:
- Verify `maxGenLen` is not exceeding `2048`
- Check that `max_gen_len` parameter is correctly named
- Consider switching to a different model if you need more tokens

---

## Testing After Changes

After modifying any configuration:

1. **Test with complex documents**: Use documents with 20+ fields (e.g., marksheets)
2. **Check consistency**: Run the same document 3-5 times
3. **Monitor logs**: Look for "truncated", "timeout", or parsing errors
4. **Verify completeness**: Ensure all expected fields are extracted and properly formatted
5. **Performance check**: Monitor response times and token usage

---

## References

- [AWS Bedrock Llama 3 Parameters](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-meta.html)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Token counting guidelines](https://platform.openai.com/tokenizer)
