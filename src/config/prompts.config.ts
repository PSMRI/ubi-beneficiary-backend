/**
 * Prompts Configuration
 * Centralized AI prompts with env variable overrides
 */
const DEFAULT_PROMPTS = {
  ocrExtraction: `Extract all text from this document. Return only the extracted text, preserving layout as much as possible. No explanations or formatting.`,

  ocrMapping: `CRITICAL INSTRUCTION: YOU MUST COMPLETE DOCUMENT VALIDATION FIRST BEFORE ANY DATA EXTRACTION

PHASE 1: DOCUMENT TYPE VALIDATION (MANDATORY - DO NOT SKIP)

STOP! Read this entire section before proceeding to extraction.

Your PRIMARY TASK is to determine if the uploaded document is actually a "{expectedDocumentName}".
Many documents are uploaded incorrectly. You MUST catch mismatches BEFORE attempting extraction.

DOCUMENT TEXT TO ANALYZE:
{extractedText}

EXPECTED DOCUMENT TYPE:
"{expectedDocumentName}"

VALIDATION PROCESS (Follow in order):

STEP 1: READ THE DOCUMENT TITLE/HEADING
   - What does the document call itself?
   - Look for the main title at the top of the document
   - This is the STRONGEST indicator of document type

STEP 2: IDENTIFY DOCUMENT CATEGORY
   - What is this document's purpose?
   - Is it an academic document (marksheet, certificate, transcript)?
   - Is it a government certificate (birth, caste, income, domicile)?
   - Is it an identity document (Aadhaar, PAN, etc.)?
   - Is it something else entirely?

STEP 3: EXAMINE THE SCHEMA FIELDS
   Schema provided: {schema}
   
   - What type of data does this schema expect?
   - Do these fields make sense for the document you're analyzing?
   - Example: If schema has "marks", "grades", "subjects" then it expects academic document
   - Example: If schema has "income", "annual salary" then it expects income certificate
   - Example: If schema has "caste", "category" then it expects caste certificate

STEP 4: COMPARE DOCUMENT CONTENT VS SCHEMA EXPECTATIONS
   Ask yourself:
   - Does the document contain the types of fields the schema expects?
   - Is the document structure compatible with what "{expectedDocumentName}" should be?
   - Are key identifying fields from the schema present in the document?

STEP 5: MAKE YOUR VALIDATION DECISION

   Set "isValidDocument": true ONLY IF ALL OF THESE ARE TRUE:
   - Document title/heading matches or clearly indicates "{expectedDocumentName}"
   - Document category aligns with "{expectedDocumentName}" type
   - Document contains the characteristic fields expected in the schema
   - Document structure is appropriate for "{expectedDocumentName}"
   - You have HIGH CONFIDENCE this is the correct document type

   Set "isValidDocument": false IF ANY OF THESE ARE TRUE:
   - Document title/heading indicates a DIFFERENT document type
   - Document category does not match "{expectedDocumentName}" category
   - Document is missing most/all of the key fields from schema
   - Document structure does not fit "{expectedDocumentName}" format
   - You have ANY doubt or uncertainty about the document type
   - Document appears to be completely unrelated content

CRITICAL RULES:
- DO NOT proceed to extraction if document type doesn't match
- DO NOT set isValidDocument=true just because you can extract SOME fields
- DO NOT ignore mismatches between document title and expected type
- DO NOT assume partial matches mean valid document
- DO be extremely strict - false rejection is better than false acceptance
- DO trust the document's own title/heading as primary indicator
- DO set isValidDocument=false when uncertain

PHASE 2: DATA EXTRACTION (ONLY IF isValidDocument=true from Phase 1)

IF YOU SET isValidDocument=false IN PHASE 1:
   - Return immediately with {"isValidDocument": false, ...all fields as null}
   - DO NOT attempt to extract any data
   - DO NOT try to fill schema fields

IF YOU SET isValidDocument=true IN PHASE 1:
   - Proceed with careful data extraction following the rules below

EXTRACTION RULES:
1. Use ONLY text that exists verbatim in the DOCUMENT TEXT
2. If a field's value is NOT found in the document, set it to null
3. Never guess, infer, or create values not present in the source text
4. Never use a value from one field to fill a different field
5. For name fields:
   - Extract only the individual's name
   - Exclude relationship descriptors (S/O, D/O, W/O, etc.)
   - Include titles (Mr., Miss, Mrs., Dr.) only if part of the actual name
6. For date fields:
   - Only extract if the document explicitly labels that specific date type
   - If a date's purpose is unclear, set to null rather than guessing
7. For address fields:
   - Extract complete addresses but separate components per schema requirements
8. For numerical fields:
   - Extract only numbers relevant to the field
   - Strip leading hyphens from numbers (e.g., "-12345" becomes "12345")
   - Exclude text or currency symbols unless specifically required
9. REJECT meaningless values:
   - Never extract standalone punctuation (-, ., /, |)
   - If only punctuation or whitespace found, set to null
10. REJECT invalid values:
    - For text fields, values must contain at least one alphanumeric character
    - Reject values that are ONLY punctuation, whitespace, or special characters
11. For number fields:
    - If extracted value is only hyphen or non-numeric character, set to null

OUTPUT FORMAT (MANDATORY)

Return ONLY pure JSON. No markdown. No explanations. No code blocks.

Structure:
{
  "isValidDocument": true/false,
  "field1": "value" or null,
  "field2": "value" or null,
  ...all other schema fields...
}

REMEMBER:
- If isValidDocument=false, set ALL other fields to null
- Start JSON with { and end with }
- No text before or after the JSON
- No comments or explanations`,

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

export function buildOcrMappingPrompt(extractedText: string, schema: Record<string, any>, expectedDocumentName: string): string {
  // Validate expectedDocumentName is provided
  if (!expectedDocumentName || expectedDocumentName.trim() === '') {
    throw new Error('EXPECTED_DOCUMENT_NAME_REQUIRED');
  }
  
  let prompt = OCR_MAPPING_PROMPT_TEMPLATE
    .replace('{extractedText}', extractedText)
    .replace('{schema}', JSON.stringify(schema, null, 2));
  
  // Replace expectedDocumentName placeholder with the provided docName
  const documentName = expectedDocumentName.trim();
  prompt = prompt.replaceAll('{expectedDocumentName}', documentName);
  
  return prompt;
}

export function getValidationPrompt(): string {
  return VALIDATION_PROMPT;
}
