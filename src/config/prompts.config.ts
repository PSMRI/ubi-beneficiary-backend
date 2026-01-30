/**
 * IMPROVED Prompts Configuration
 * Centralized AI prompts for document data extraction
 */
const DEFAULT_PROMPTS = {
  ocrExtraction: `Extract all text from this document. Return only the extracted text, preserving layout as much as possible. No explanations or formatting.`,

  ocrMapping: `YOU ARE A DOCUMENT DATA EXTRACTOR. YOUR JOB IS TO EXTRACT STRUCTURED DATA FROM DOCUMENTS. OUTPUT: PURE JSON ONLY. NO TEXT. NO MARKDOWN. NO EXPLANATIONS.

DOCUMENT_TEXT:
{extractedText}

SCHEMA:
{schema}

DATA EXTRACTION INSTRUCTIONS:

EXTRACTION PRINCIPLES:

PRINCIPLE 1: YOU ARE A PHOTOCOPIER, NOT AN EDITOR
- Extract text EXACTLY as it appears character-by-character.
- DO NOT clean, fix, correct, or improve any data.
- DO NOT remove invalid characters.
- DO NOT calculate missing values.
- DO NOT reformat dates or standardize formats.

PRINCIPLE 2: EXTRACT ONLY FROM DOCUMENT_TEXT
- Use ONLY text that exists verbatim in DOCUMENT_TEXT above.
- If text is not in DOCUMENT_TEXT then set to null.
- NEVER invent, guess, calculate, or infer values.

PRINCIPLE 3: EXTRACT ONLY SCHEMA FIELDS
- Extract ONLY fields listed in SCHEMA.
- NEVER add extra fields.
- Include ALL schema fields in output (use null if not found).

PRINCIPLE 4: SMART FIELD MAPPING
Match schema field names to document labels intelligently:

NAME FIELDS (student_name, applicant_name, person_name, candidate_name, name):
- Look for: Name:, Student Name:, Applicant:, Person Name:, Full Name:
- Also: Name after Mr., Miss, Mrs., Dr., Shri
- Exclude: S/O, D/O, W/O, Father:, Mother:, Father's Name:, Mother's Name:
- Extract EXACTLY as printed including numbers and special characters

IDENTIFIER FIELDS (roll_number, registration_no, certificate_no, otr_number):
- Look for: Roll No:, Reg No:, Certificate No:, ID:, OTR No:, OTR:, OTR:-, Registration Number:, Enrollment No:
- Extract AS-IS preserving all formatting: ABC-123 maps to ABC-123, R2024 maps to R2024
- Strip ONLY leading hyphens/colons from the immediate value: OTR:- 250100369389914 maps to 250100369389914
- Keep embedded hyphens: ABC-123-XYZ stays ABC-123-XYZ

DATE FIELDS (date_of_birth, issue_date, exam_date):
- Extract EXACTLY as shown preserving all formatting
- DO NOT reformat or standardize date formats
- DO NOT fix invalid dates - extract as-is

AMOUNT FIELDS (total_fees_amount, income, salary, total_marks):
- Extract EXACTLY as printed preserving commas, decimals, currency symbols
- If contains letters extract including letters (do not skip)
- If blank or empty then set to null
- NEVER calculate from tables: If Total is blank, DO NOT sum items then null

ADDRESS FIELDS (address, district, state):
- Extract as shown in document
- Keep formatting as-is

PARENT/FAMILY FIELDS (father_name, mother_name, guardian_name):
- Look for: Father's Name:, Father Name:, Mother's Name:, Mother Name:, Guardian:
- Extract EXACTLY as printed
- Do NOT confuse with applicant name

PRINCIPLE 5: HANDLE MISSING VALUES
- Field not found then null
- Field blank or empty then null
- Field unclear or ambiguous then null

PRINCIPLE 6: REJECT MEANINGLESS VALUES
- Only punctuation (dash, period, slash) then null
- Only whitespace then null
- Otherwise extract what is there

OUTPUT FORMAT (MANDATORY):
Return PURE JSON with all schema fields:
{
  "field1": "value or null",
  "field2": "value or null",
  ... (ALL schema fields)
}

JSON RULES:
- Start with {, end with }
- Double quotes for keys and strings
- Use null for missing (not empty string "")
- Include ALL schema fields
- NO markdown, NO explanations, NO text before or after JSON

EXAMPLE:
{
  "name": "John Doe",
  "father_name": "Richard Doe",
  "certificate_number": "ABC-12345",
  "issue_date": "15/01/2024",
  "marks": null
}

NOW PROCESS THE INPUTS. RETURN ONLY JSON.`,

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

export function buildOcrMappingPrompt(
  extractedText: string, 
  schema: Record<string, any>, 
  customPromptTemplate?: string | null
): string {
  // Use custom prompt template if provided and not empty, otherwise fall back to default
  const promptTemplate = (customPromptTemplate && customPromptTemplate.trim() !== '') 
    ? customPromptTemplate 
    : OCR_MAPPING_PROMPT_TEMPLATE;
  
  // Replace placeholders with actual values
  // Using replaceAll for all placeholders to ensure all occurrences are replaced
  // The placeholders are wrapped in curly braces to avoid replacing plain text
  let prompt = promptTemplate
    .replaceAll('{extractedText}', extractedText)
    .replaceAll('{schema}', JSON.stringify(schema, null, 2));
  
  return prompt;
}

// Validation prompt (customizable via AI_VALIDATION_PROMPT)
export function getValidationPrompt(): string {
  return VALIDATION_PROMPT;
}
