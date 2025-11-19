# AI Model Parameters Documentation

This document explains all AI model configuration parameters used in the OCR and mapping services.

## Table of Contents
- [Critical Parameters](#critical-parameters)
- [Optional Parameters](#optional-parameters)
- [Model-Specific Limits](#model-specific-limits)
- [Troubleshooting Guide](#troubleshooting-guide)

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

### AWS Bedrock - Meta Llama 3 8B Instruct
- **Model ID**: `meta.llama3-8b-instruct-v1:0`
- **Maximum max_gen_len**: `2048 tokens`
- **Exceeding limit**: Causes `ValidationException`

### Google Gemini 1.5 Flash
- **Model ID**: `gemini-1.5-flash`
- **Maximum maxOutputTokens**: `8192 tokens` (configurable, can go higher)

### Google Gemini 2.0 Flash Exp
- **Model ID**: `gemini-2.0-flash-exp`
- **Maximum maxOutputTokens**: `8192 tokens` (configurable, can go higher)

---

## Troubleshooting Guide

### Issue: JSON responses are incomplete/truncated
**Solution**: Increase `maxOutputTokens`/`maxTokens`
- For Gemini: Try `12288` or `16384`
- For Bedrock Llama 3 8B: Maximum is `2048`, consider switching to Gemini or Llama 3 70B

### Issue: Getting timeout errors on complex documents
**Solution**: Increase timeout values
- Mapping: Try `45000ms` (45 seconds)
- OCR: Try `90000ms` (90 seconds)

### Issue: Field names are inconsistent between requests
**Solution**: Lower temperature
- Current: `0.1`
- Try: `0.05` for even more consistency

### Issue: AI responses are too creative/wrong format
**Solution**: 
1. Lower temperature to `0.05`
2. Simplify and clarify prompts

### Issue: Responses seem limited in vocabulary
**Solution**: 
- Remove `topK` parameter entirely
- Or increase to `64` or `128`

### Issue: Cost optimization needed
**Solution**:
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
