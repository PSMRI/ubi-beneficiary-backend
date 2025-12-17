/**
 * IMPROVED Prompts Configuration
 * Centralized AI prompts with generic document validation (no hardcoded document types)
 */
const DEFAULT_PROMPTS = {
  ocrExtraction: `Extract all text from this document. Return only the extracted text, preserving layout as much as possible. No explanations or formatting.`,

  ocrMapping: `YOU ARE A DOCUMENT SECURITY VALIDATOR. YOUR PRIMARY DUTY IS TO REJECT MISMATCHED DOCUMENTS. OUTPUT: PURE JSON ONLY. NO TEXT. NO MARKDOWN. NO EXPLANATIONS.

DOCUMENT_TEXT:
{extractedText}

SCHEMA:
{schema}

PHASE 1: DOCUMENT TYPE VALIDATION (MANDATORY - EXECUTE FIRST): CRITICAL: Your PRIMARY job is to CATCH WRONG DOCUMENTS. Be EXTREMELY suspicious. VALIDATION APPROACH - SMART DOCUMENT MATCHING: SPECIAL EXCEPTION FOR OTR DOCUMENTS ONLY: IF {expectedDocumentName} contains OTR or One Time Registration (case-insensitive), APPLY RELAXED VALIDATION: 1. Check if document contains OTR identifier pattern: Look for OTR followed by colon, hyphen, or space and then a number (e.g., OTR:- 250100369389914, OTR: 250100369389914, OTR 250100369389914). This can appear ANYWHERE in the document (header, body, profile section). 2. Check for at least 3 profile/identity fields from schema: Look for fields like name, applicant_name, father_name, mother_name, date_of_birth, mobile, gender, address in the document. 3. IF BOTH CONDITIONS MET (OTR identifier found AND 3+ schema fields present): SET isValidDocument equals true IMMEDIATELY. SKIP all other validation steps. PROCEED directly to Phase 2 extraction. This includes profile pages, registration pages, or any document showing OTR number with user details. 4. Document title or heading is NOT required for OTR documents. Words like My Profile, Profile Details, Registration Details are ACCEPTABLE for OTR only. FOR ALL OTHER DOCUMENTS (NON-OTR): APPLY EXTREMELY STRICT VALIDATION. NO EXCEPTIONS. NO RELAXATION. MANDATORY STEP 1: ANALYZE DOCUMENT TITLE AND HEADER (CRITICAL - FIRST 5-10 LINES): Read ONLY the FIRST 5-10 LINES of DOCUMENT_TEXT carefully. This is the MOST IMPORTANT STEP for non-OTR documents. Look for: A. MAIN DOCUMENT TITLE: Usually in CAPITAL LETTERS, BOLD, or prominent font at the top. This is typically the PRIMARY indicator of document type. Common positions: Line 1 to 5 of the document. Examples of what to look for: Certificate title, Document name, Form title, Official heading. B. ISSUING AUTHORITY: Organization name or government department name near the title. Often appears above or below the main title. C. DOCUMENT PURPOSE KEYWORDS: Words that indicate document type in the header section. Extract the EXACT document title text as it appears in these first lines. This title is your PRIMARY validation criterion. MANDATORY STEP 2: STRICT TITLE MATCHING (NO TOLERANCE FOR MISMATCH): Compare the extracted title from STEP 1 with EXPECTED_DOCUMENT_TYPE: {expectedDocumentName}. STRICT MATCHING RULES FOR NON-OTR DOCUMENTS: 1. DIRECT MATCH (REQUIRED): Document title MUST match {expectedDocumentName} either exactly or with close variants. Case-insensitive comparison allowed. Plural/singular variations allowed. 2. WORD-ORDER VARIATIONS (LIMITED ACCEPTANCE): Only accept if meaning is identical. Example: Income Certificate equals Certificate of Income. Be cautious: different word order can mean different documents. 3. SYNONYM MATCHES (VERY LIMITED): Only accept well-established synonyms for the same document type. Example: Mark Sheet equals Marksheet equals Grade Sheet. Be strict: many similar-sounding documents are actually different types. 4. REJECT IMMEDIATELY IF: Title explicitly states a DIFFERENT document type. Title mentions a different category of document. Title is missing or unclear in first 5-10 lines. Title has contradictory information. MANDATORY STEP 3: UNIQUE FIELD AND KEYWORD VALIDATION (CRITICAL): A. IDENTIFY DOCUMENT-SPECIFIC UNIQUE FIELDS (MOST IMPORTANT): Look at SCHEMA field names and identify UNIQUE fields that are specific to THIS document type ONLY. IGNORE COMMON FIELDS that appear in all documents: DO NOT count: name, applicant_name, person_name, student_name, candidate_name (these are in ALL documents). DO NOT count: father_name, mother_name, parent_name, guardian_name (common family fields). DO NOT count: date_of_birth, dob, birth_date (common in many documents). DO NOT count: address, district, state, city, pincode (common location fields). DO NOT count: mobile, phone, email, contact (common contact fields). DO NOT count: gender, age (common demographic fields). COUNT ONLY UNIQUE FIELDS specific to document type: Academic documents: roll_number, enrollment_number, marks, total_marks, percentage, grade, subject, class, standard, semester, exam_date, passing_year, institution_name, university_name. Government documents: certificate_number, certificate_date, issuing_authority, caste, category, income, annual_income, validity_period, domicile, residence_proof. Registration documents: registration_number, registration_date, application_number, otr_number, registration_status. Financial documents: amount, total_amount, fee_amount, receipt_number, transaction_id, payment_date, invoice_number. Property documents: property_id, ration_card_number, electricity_account_number, consumer_number. B. Scan DOCUMENT_TEXT for UNIQUE field values and keywords. Look for the actual field labels or related terms in the document. C. STRICT UNIQUE FIELD THRESHOLD FOR NON-OTR: Found 0-1 UNIQUE schema fields in document: REJECT immediately (common fields do not count). Found 2 UNIQUE schema fields: HIGH SUSPICION - only accept if title match is PERFECT AND both unique fields clearly present. Found 3+ UNIQUE schema fields: PROCEED to category check. CRITICAL: If schema has UNIQUE fields but document does NOT contain those field labels or values then REJECT immediately. Example: Schema expects marks and roll_number but document only has name and father_name then REJECT. D. CATEGORY COHERENCE (MANDATORY): Document MUST belong to same category as expected type. Categories: ACADEMIC (certificates, mark sheets, transcripts), GOVERNMENT/CIVIL (birth, caste, domicile, income certificates), FINANCIAL (receipts, salary, income proof), PROPERTY (address proof, utility bills). IF categories do NOT match: REJECT immediately. DECISION LOGIC FOR NON-OTR DOCUMENTS (EXTREMELY STRICT): SET isValidDocument equals true ONLY IF ALL CONDITIONS MET: 1. Document title in first 5-10 lines has STRONG MATCH with {expectedDocumentName}. 2. Found at least 2 UNIQUE document-specific fields (NOT common fields like name, father_name, dob) in document text. 3. Document category EXACTLY matches expected category. 4. NO contradictory evidence whatsoever. 5. You are HIGHLY CONFIDENT (97 percent or more) this is the correct document type. 6. The document has UNIQUE characteristics that distinguish it from other document types. SET isValidDocument equals false IF ANY OF THESE: 1. Document title in first 5-10 lines is DIFFERENT from {expectedDocumentName}. 2. Title is missing, unclear, or ambiguous in header section. 3. Found less than 2 UNIQUE schema-related fields (common fields like name do not count). 4. Document contains ONLY common fields (name, father_name, dob, address) but NO unique fields. 5. Document category does not match expected category. 6. Schema expects unique fields but document does not contain them. 7. Confidence level is below 97 percent. 8. ANY doubt, uncertainty, or suspicion about document match. 9. Document could potentially be a different type. 10. Document appears generic without distinguishing characteristics. CRITICAL CONFIDENCE RULE: If you cannot find clear UNIQUE identifiers or characteristics that distinguish this document from other types then SET isValidDocument equals false. Presence of common fields (name, father_name, mother_name, dob, address, mobile) alone is NOT sufficient evidence. You MUST find document-specific unique fields to validate. WHEN IN DOUBT: ALWAYS SET isValidDocument equals false for non-OTR documents. BETTER TO REJECT a correct document than ACCEPT a wrong one. LOW CONFIDENCE equals REJECT. IF isValidDocument equals false: STOP IMMEDIATELY. Return ONLY: open_brace isValidDocument: false close_brace. DO NOT extract any fields. DO NOT proceed to Phase 2. PHASE 2: DATA EXTRACTION (ONLY IF isValidDocument equals true): EXTRACTION PRINCIPLES: PRINCIPLE 1: YOU ARE A PHOTOCOPIER, NOT AN EDITOR - Extract text EXACTLY as it appears character-by-character. DO NOT clean, fix, correct, or improve any data. DO NOT remove invalid characters. DO NOT calculate missing values. DO NOT reformat dates or standardize formats. PRINCIPLE 2: EXTRACT ONLY FROM DOCUMENT_TEXT - Use ONLY text that exists verbatim in DOCUMENT_TEXT above. If text is not in DOCUMENT_TEXT then set to null. NEVER invent, guess, calculate, or infer values. PRINCIPLE 3: EXTRACT ONLY SCHEMA FIELDS - Extract ONLY fields listed in SCHEMA. NEVER add extra fields. Include ALL schema fields in output (use null if not found). PRINCIPLE 4: SMART FIELD MAPPING. Match schema field names to document labels intelligently: NAME FIELDS (student_name, applicant_name, person_name, candidate_name, name): Look for: Name:, Student Name:, Applicant:, Person is Name:, Full Name:. Also: Name after Mr., Miss, Mrs., Dr., Shri. Exclude: S/O, D/O, W/O, Father:, Mother:, Father's Name:, Mother's Name:. Extract EXACTLY as printed including numbers and special characters. IDENTIFIER FIELDS (roll_number, registration_no, certificate_no, otr_number): Look for: Roll No:, Reg No:, Certificate No:, ID:, OTR No:, OTR:, OTR:-, Registration Number:, Enrollment No:. Extract AS-IS preserving all formatting: ABC-123 maps to ABC-123, R2024 maps to R2024. Strip ONLY leading hyphens/colons from the immediate value: OTR:- 250100369389914 maps to 250100369389914. Keep embedded hyphens: ABC-123-XYZ stays ABC-123-XYZ. DATE FIELDS (date_of_birth, issue_date, exam_date): Extract EXACTLY as shown preserving all formatting. DO NOT reformat or standardize date formats. DO NOT fix invalid dates - extract as-is. AMOUNT FIELDS (total_fees_amount, income, salary, total_marks): Extract EXACTLY as printed preserving commas, decimals, currency symbols. If contains letters extract including letters (do not skip). If blank or empty then set to null. NEVER calculate from tables: If Total is blank, DO NOT sum items then null. ADDRESS FIELDS (address, district, state): Extract as shown in document. Keep formatting as-is. PARENT/FAMILY FIELDS (father_name, mother_name, guardian_name): Look for: Father's Name:, Father is Name:, Mother's Name:, Mother is Name:, Guardian:. Extract EXACTLY as printed. Do NOT confuse with applicant name. PRINCIPLE 5: HANDLE MISSING VALUES - Field not found then null. Field blank or empty or blank then null. Field unclear or ambiguous then null. PRINCIPLE 6: REJECT MEANINGLESS VALUES - Only punctuation (dash, period, slash) then null. Only whitespace then null. Otherwise extract what is there. OUTPUT FORMAT (MANDATORY): Return PURE JSON in ONE of these formats: FORMAT 1 dash Document validation FAILED: open_brace isValidDocument: false close_brace. FORMAT 2 dash Document validation PASSED: open_brace isValidDocument: true, field1: value or null, field2: value or null, open_paren ALL schema fields close_paren close_brace. JSON RULES: Start with open_brace, end with close_brace. Double quotes for keys and strings. Use null for missing (not empty string open_quote close_quote). Include ALL schema fields. NO markdown, NO explanations, NO text before or after JSON. EXAMPLES: EXAMPLE 1 dash Wrong Document: OUTPUT: open_brace isValidDocument: false close_brace. EXAMPLE 2 dash Valid Document: OUTPUT: open_brace isValidDocument: true, field1: extracted value, field2: null close_brace. NOW PROCESS THE INPUTS. RETURN ONLY JSON.`,

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
  expectedDocumentName: string,
  customPromptTemplate?: string | null
): string {
  // Validate expectedDocumentName is provided
  if (!expectedDocumentName || expectedDocumentName.trim() === '') {
    throw new Error('EXPECTED_DOCUMENT_NAME_REQUIRED');
  }
  
  // Use custom prompt template if provided and not empty, otherwise fall back to default
  const promptTemplate = (customPromptTemplate && customPromptTemplate.trim() !== '') 
    ? customPromptTemplate 
    : OCR_MAPPING_PROMPT_TEMPLATE;
  
  // Replace placeholders with actual values
  // Using replaceAll for all placeholders to ensure all occurrences are replaced
  // The placeholders are wrapped in curly braces to avoid replacing plain text
  let prompt = promptTemplate
    .replaceAll('{extractedText}', extractedText)
    .replaceAll('{schema}', JSON.stringify(schema, null, 2))
    .replaceAll('{expectedDocumentName}', expectedDocumentName.trim());
  
  return prompt;
}

export function getValidationPrompt(): string {
  return VALIDATION_PROMPT;
}
