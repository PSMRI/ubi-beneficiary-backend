/**
 * Prompts Configuration
 * Centralized AI prompts with env variable overrides
 */
const DEFAULT_PROMPTS = {
  ocrExtraction: `Extract all text from this document. Return only the extracted text, preserving layout as much as possible. No explanations or formatting.`,

  ocrMapping: `Extract data from the document text below. Return ONLY a JSON object. DOCUMENT TEXT: {extractedText} SCHEMA TO FILL: {schema} STRICT EXTRACTION RULES: 1. Use ONLY text that exists verbatim in the DOCUMENT TEXT above 2. If a field's value is NOT found in the document, set it to null 3. Never guess, infer, or create values 4. Never use a value from one field to fill a different field (e.g., issue date is NOT exam date) 5. For name fields: Extract only the individual's name, excluding relationship descriptors (S/O, D/O, W/O, etc.), Stop at relationship indicators or descriptive phrases, Include titles (Mr., Miss, Mrs., Dr.) only if part of the actual name, For compound names, extract the complete name but exclude any following relational information 6. For date fields: Only extract if the document explicitly labels that specific date type (e.g., Exam Date:, DOB:) 7. If a date exists but its purpose is unclear, set the field to null rather than guessing 8. Match field names to document labels - Date: near signature is likely issue date, not exam date 9. For address fields: Extract complete addresses but separate individual components when the schema requires specific parts 10. For numerical fields: Extract only the numbers relevant to the field, excluding any accompanying text or currency symbols unless specifically required. IMPORTANT: Ignore leading hyphens - in number fields (e.g., if document shows -223414178889127, extract 223414178889127 without the hyphen) 11. REJECT meaningless values: Never extract standalone punctuation marks (e.g., -, ., /, |) as field values. If only punctuation or whitespace is found, set the field to null 12. REJECT invalid values: For text fields (names, addresses, IDs), reject values that are ONLY punctuation, whitespace, or special characters. The value must contain at least one alphanumeric character 13. For number fields: If the extracted value is only a hyphen or other non-numeric character, set it to null. Always strip leading hyphens from number values before extraction (numbers like OTR numbers, IDs should never be negative). Return pure JSON starting with { and ending with }. No text before or after.`,

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
