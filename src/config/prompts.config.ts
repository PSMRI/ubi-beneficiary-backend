/**
 * Prompts Configuration
 * Centralized AI prompts with env variable overrides
 */
const DEFAULT_PROMPTS = {
  ocrExtraction: `Extract all text from this document. Return only the extracted text, preserving layout as much as possible. No explanations or formatting.`,

  ocrMapping: `You are an expert in document data extraction. Using the provided text and target schema, extract and map relevant information.

DOCUMENT TEXT:
{extractedText}

TARGET SCHEMA:
{schema}

INSTRUCTIONS:
- For each schema field, find the most relevant value using field names, synonyms, and nearby context.
- Parse entities like names, IDs, dates, addresses, amounts, and categories intelligently.
- Clean and normalize data (trim spaces, consistent case, correct types).
- If a field cannot be determined, set it to null.
- Ensure all schema fields exist and match names exactly.

OUTPUT RULES:
- Return ONLY the final JSON object.
- Do NOT include markdown, explanations, or extra text.
- Start with { and end with }.
- Output must be valid, parseable JSON.

Example:
{"field1": "value1", "field2": "value2", "field3": null}`,

  validation: 'Test'
} as const;


// OCR extraction prompt (customizable via OCR_EXTRACTION_PROMPT)
export const OCR_EXTRACTION_PROMPT = process.env.OCR_EXTRACTION_PROMPT || DEFAULT_PROMPTS.ocrExtraction;

// OCR mapping prompt template (customizable via OCR_MAPPING_PROMPT_TEMPLATE)
export const OCR_MAPPING_PROMPT_TEMPLATE = process.env.OCR_MAPPING_PROMPT_TEMPLATE || DEFAULT_PROMPTS.ocrMapping;

// Validation prompt (customizable via AI_VALIDATION_PROMPT)
export const VALIDATION_PROMPT = process.env.AI_VALIDATION_PROMPT || DEFAULT_PROMPTS.validation;

// Prompt getter functions
export function getOcrExtractionPrompt(): string {
  return OCR_EXTRACTION_PROMPT;
}

export function getOcrMappingPromptTemplate(): string {
  return OCR_MAPPING_PROMPT_TEMPLATE;
}

export function buildOcrMappingPrompt(extractedText: string, schema: Record<string, any>): string {
  return OCR_MAPPING_PROMPT_TEMPLATE
    .replace('{extractedText}', extractedText)
    .replace('{schema}', JSON.stringify(schema, null, 2));
}

export function getValidationPrompt(): string {
  return VALIDATION_PROMPT;
}
