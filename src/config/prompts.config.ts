/**
 * Prompts Configuration
 * Centralized AI prompts with env variable overrides
 */
const DEFAULT_PROMPTS = {
  ocrExtraction: `Extract all text from this document. Return only the extracted text, preserving layout as much as possible. No explanations or formatting.`,

  ocrMapping: `STEP 1 - DOCUMENT TYPE VALIDATION (MANDATORY FIRST STEP - MUST BE PERFORMED BEFORE DATA EXTRACTION): You MUST analyze the entire document text to determine if it matches the expected document type "{expectedDocumentName}". This is CRITICAL - incorrect validation will cause serious errors. VALIDATION APPROACH: 1. Read the ENTIRE document text carefully. 2. Identify the document's PRIMARY PURPOSE and TYPE based on: - Document title/heading (e.g., "Marksheet", "Certificate", "Receipt", "Resident Certificate", "Domicile Certificate") - Key phrases and terminology used (e.g., "marks", "grades", "percentage" for marksheets vs "resident", "domicile", "local person" for certificates) - Document structure and layout - Types of data fields present - Institutional context (school/college for marksheets vs government office for certificates) 3. Compare the identified document type with the expected type "{expectedDocumentName}". 4. Check if the schema fields match what would be found in the actual document type. CRITICAL VALIDATION RULES: Set "isValidDocument" to true ONLY IF ALL of the following are true: - The document's PRIMARY TYPE clearly matches "{expectedDocumentName}" - The document contains the characteristic fields/data expected for "{expectedDocumentName}" (e.g., marksheets MUST have marks/grades/percentages, certificates MUST have certificate-specific fields) - The document structure aligns with "{expectedDocumentName}" - There is NO indication the document is a different type Set "isValidDocument" to false IF ANY of the following are true: - The document title/heading indicates a different document type (e.g., document says "Resident Certificate" or "Domicile Certificate" but expecting "Marksheet") - The document contains fields/patterns typical of a different document type - The schema expects fields that are NOT present in this type of document (e.g., schema expects marks/grades/percentages but document has no academic performance data) - The document structure does not match the expected type - There is ANY doubt or ambiguity about the document type EXAMPLES OF INVALID MATCHES (set isValidDocument=false): - Expecting "Marksheet" but document is "Resident Certificate", "Domicile Certificate", "Income Certificate", "Birth Certificate", "Bonafide Certificate", etc. - Expecting "Bonafide Certificate" but document is "Marksheet", "Transfer Certificate", "Resident Certificate", etc. - Expecting "Income Certificate" but document is "Marksheet", "Resident Certificate", etc. - Any certificate type when expecting a different certificate type IMPORTANT: - Do NOT validate based on partial matches or extracted field values alone - Do NOT set isValidDocument=true just because some fields can be extracted - The document TYPE must be EXACTLY "{expectedDocumentName}" - When in doubt, ALWAYS set isValidDocument=false - Be EXTREMELY STRICT - false positives are worse than false negatives STEP 2 - DATA EXTRACTION: Only proceed with extraction if isValidDocument=true. Extract data from the document text below according to the schema. Return ONLY a JSON object with "isValidDocument" as the first field (MANDATORY - MUST be boolean true or false), followed by all the extracted data fields from the schema. DOCUMENT TEXT: {extractedText} EXPECTED DOCUMENT TYPE: {expectedDocumentName} SCHEMA TO FILL: {schema} STRICT EXTRACTION RULES: 1. Use ONLY text that exists verbatim in the DOCUMENT TEXT above 2. If a field's value is NOT found in the document, set it to null 3. Never guess, infer, or create values 4. Never use a value from one field to fill a different field (e.g., issue date is NOT exam date) 5. For name fields: Extract only the individual's name, excluding relationship descriptors (S/O, D/O, W/O, etc.), Stop at relationship indicators or descriptive phrases, Include titles (Mr., Miss, Mrs., Dr.) only if part of the actual name, For compound names, extract the complete name but exclude any following relational information 6. For date fields: Only extract if the document explicitly labels that specific date type (e.g., Exam Date:, DOB:) 7. If a date exists but its purpose is unclear, set the field to null rather than guessing 8. Match field names to document labels - Date: near signature is likely issue date, not exam date 9. For address fields: Extract complete addresses but separate individual components when the schema requires specific parts 10. For numerical fields: Extract only the numbers relevant to the field, excluding any accompanying text or currency symbols unless specifically required. IMPORTANT: Ignore leading hyphens - in number fields (e.g., if document shows -223414178889127, extract 223414178889127 without the hyphen) 11. REJECT meaningless values: Never extract standalone punctuation marks (e.g., -, ., /, |) as field values. If only punctuation or whitespace is found, set the field to null 12. REJECT invalid values: For text fields (names, addresses, IDs), reject values that are ONLY punctuation, whitespace, or special characters. The value must contain at least one alphanumeric character 13. For number fields: If the extracted value is only a hyphen or other non-numeric character, set it to null. Always strip leading hyphens from number values before extraction (numbers like OTR numbers, IDs should never be negative). RETURN FORMAT: Return pure JSON starting with { and ending with }. Include "isValidDocument" as the first field (MANDATORY - MUST be boolean true or false), followed by all schema fields. No text before or after. Example format: {"isValidDocument": false, "field1": null, "field2": null, ...}`,

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
