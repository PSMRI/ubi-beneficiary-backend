/**
 * Prompts Configuration
 * Centralized AI prompts with env variable overrides
 */
const DEFAULT_PROMPTS = {
  ocrExtraction: `Extract all text from this document. Return only the extracted text, preserving layout as much as possible. No explanations or formatting.`,

  ocrMapping: `Extract data from the document text below. Return ONLY a JSON object.

DOCUMENT TEXT:
{extractedText}

SCHEMA TO FILL:
{schema}

STRICT EXTRACTION RULES:
1. Use ONLY text that exists verbatim in the DOCUMENT TEXT above
2. If a field's value is NOT found in the document, set it to null
3. Never guess, infer, or create values
4. Never use a value from one field to fill a different field (e.g., issue date is NOT exam date)
5. For name fields: Keep full names together - don't split unless clearly separated in document
6. For date fields: Only extract if the document explicitly labels that specific date type (e.g., "Exam Date:", "DOB:")
7. If a date exists but its purpose is unclear, set the field to null rather than guessing
8. Match field names to document labels - "Date:" near signature is likely issue date, not exam date

Return pure JSON starting with { and ending with }. No text before or after.`,

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
