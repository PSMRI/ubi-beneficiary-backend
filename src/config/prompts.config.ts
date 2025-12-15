/**
 * IMPROVED Prompts Configuration
 * Centralized AI prompts with generic document validation (no hardcoded document types)
 */
const DEFAULT_PROMPTS = {
  ocrExtraction: `Extract all text from this document. Return only the extracted text, preserving layout as much as possible. No explanations or formatting.`,

  ocrMapping: `YOU ARE A DOCUMENT SECURITY VALIDATOR. YOUR PRIMARY DUTY IS TO REJECT MISMATCHED DOCUMENTS.

OUTPUT: PURE JSON ONLY. NO TEXT. NO MARKDOWN. NO EXPLANATIONS.

==================================================================================
INPUTS (READ-ONLY)
==================================================================================

EXPECTED_DOCUMENT_TYPE: "{expectedDocumentName}"

DOCUMENT_TEXT:
{extractedText}

SCHEMA:
{schema}

==================================================================================
PHASE 1: DOCUMENT TYPE VALIDATION (MANDATORY - EXECUTE FIRST)
==================================================================================

CRITICAL: Your PRIMARY job is to CATCH WRONG DOCUMENTS. Be EXTREMELY suspicious.

VALIDATION APPROACH - SMART DOCUMENT MATCHING:

STEP 1: EXTRACT DOCUMENT TITLE FROM TEXT
- Read the FIRST 5-10 LINES of DOCUMENT_TEXT
- Identify the MAIN HEADING/TITLE (usually in CAPITAL LETTERS or prominent position)
- This is typically at the top of the document and may include:
  * Document name (e.g., "MARKSHEET", "OTR CERTIFICATE", "BONAFIDE CERTIFICATE")
  * Issuing authority name above/below the title
  * Letterhead or header information
- Extract the ACTUAL document title as it appears

STEP 2: SEMANTIC COMPARISON - Does Document Match Expected Type?
Compare the ACTUAL document title from STEP 1 with EXPECTED_DOCUMENT_TYPE: "{expectedDocumentName}"

MATCHING RULES:
1. DIRECT MATCH (BEST):
   - Exact match (case-insensitive): "OTR Certificate" == "otr certificate" ✓
   - Close variants: "OTR Certificate" == "OTR CERTIFICATE" ✓
   
2. WORD-ORDER VARIATIONS (ACCEPTABLE):
   - "Income Certificate" == "Certificate of Income" ✓
   - "Birth Certificate" == "Certificate of Birth" ✓
   - "Caste Certificate" == "Community Certificate" ✓
   
3. ABBREVIATION MATCHES (ACCEPTABLE):
   - If expected contains abbreviation, check if document has full form or vice versa
   - "OTR" could match "One Time Registration"
   - "TC" could match "Transfer Certificate"
   - "LC" could match "Leaving Certificate"

4. SYNONYM MATCHES (ACCEPTABLE):
   - "Marksheet" == "Grade Sheet" == "Report Card" == "Mark Certificate" ✓
   - "Bonafide Certificate" == "Bona Fide Certificate" == "Student Certificate" ✓
   - "Domicile Certificate" == "Residence Certificate" ✓

5. CLEAR MISMATCHES (REJECT):
   - Expected "Marksheet" but document says "Income Certificate" ✗
   - Expected "Birth Certificate" but document says "Bonafide Certificate" ✗
   - Expected "OTR Certificate" but document says "Caste Certificate" ✗
   - Documents from completely different categories ✗

STEP 3: CONTEXTUAL KEYWORD VALIDATION
After title matching, verify document authenticity by checking for contextual coherence:

A. IDENTIFY EXPECTED KEYWORDS from SCHEMA fields:
   - Look at the schema field names (e.g., student_name, marks, certificate_number, income_amount)
   - These indicate what KIND of document this should be
   - If schema has "marks", "subject", "grade" -> Academic document
   - If schema has "income", "salary", "annual_income" -> Financial document
   - If schema has "date_of_birth", "father_name", "place_of_birth" -> Identity document
   - If schema has "registration_number", "otr_number", "registration_date" -> Registration document

B. SCAN DOCUMENT_TEXT for related terms:
   - Count how many schema-related keywords appear in the document
   - Keywords should naturally appear in a genuine document of that type
   
C. KEYWORD THRESHOLD:
   - Found 0-1 schema field keywords in document -> SUSPICIOUS (may be wrong document)
   - Found 2-3 schema field keywords -> BORDERLINE (verify title match is strong)
   - Found 4+ schema field keywords -> GOOD (document likely correct)

STEP 4: CATEGORY COHERENCE CHECK
Documents fall into logical categories. Check if document and expected type are in the same category:

ACADEMIC CATEGORY:
- Marksheet, Report Card, Grade Sheet, Transcript
- Bonafide Certificate, Student Certificate
- Transfer Certificate, Leaving Certificate, Migration Certificate
- Character Certificate, Conduct Certificate

GOVERNMENT/CIVIL CATEGORY:
- Birth Certificate, Death Certificate
- Caste Certificate, Community Certificate, Tribe Certificate
- Domicile Certificate, Residence Certificate
- Income Certificate, Non-Creamy Layer Certificate

REGISTRATION CATEGORY:
- Registration Certificate, OTR Certificate
- Enrollment Certificate, Admission Certificate
- ID Card, Identity Certificate

FINANCIAL CATEGORY:
- Fee Receipt, Payment Receipt
- Salary Certificate, Employment Certificate
- Bank Statement, Income Proof

PROPERTY CATEGORY:
- Property Documents, Sale Deed
- Ration Card, Electricity Bill
- Address Proof

RULE: If expected category != document category -> HIGH SUSPICION (likely mismatch)

==================================================================================
DECISION LOGIC - SET isValidDocument
==================================================================================

SET isValidDocument = true ONLY IF ALL CONDITIONS MET:
1. Document title has STRONG MATCH with "{expectedDocumentName}" (direct, variant, or synonym)
2. Found at least 3 schema-related keywords in document text
3. Document category matches expected category (or registration/identity documents which are broad)
4. NO contradictory evidence (e.g., document clearly states it's a different type)
5. You are CONFIDENT (>90%) this is the correct document type

SET isValidDocument = false IF ANY OF THESE:
1. Document title is CLEARLY DIFFERENT from "{expectedDocumentName}"
2. Found less than 2 schema-related keywords
3. Document is from a completely different category
4. Title mentions a different document type explicitly
5. ANY doubt or uncertainty about document match

WHEN IN DOUBT -> ALWAYS SET isValidDocument = false

IF isValidDocument = false:
   STOP IMMEDIATELY. Return ONLY:
   {
     "isValidDocument": false
   }
   DO NOT extract any fields. DO NOT proceed to Phase 2.

==================================================================================
PHASE 2: DATA EXTRACTION (ONLY IF isValidDocument = true)
==================================================================================

EXTRACTION PRINCIPLES:

PRINCIPLE 1: YOU ARE A PHOTOCOPIER, NOT AN EDITOR
- Extract text EXACTLY as it appears character-by-character
- DO NOT clean, fix, correct, or improve any data
- DO NOT remove invalid characters
- DO NOT calculate missing values
- DO NOT reformat dates or standardize formats

PRINCIPLE 2: EXTRACT ONLY FROM DOCUMENT_TEXT
- Use ONLY text that exists verbatim in DOCUMENT_TEXT above
- If text is not in DOCUMENT_TEXT -> set to null
- NEVER invent, guess, calculate, or infer values

PRINCIPLE 3: EXTRACT ONLY SCHEMA FIELDS
- Extract ONLY fields listed in SCHEMA
- NEVER add extra fields
- Include ALL schema fields in output (use null if not found)

PRINCIPLE 4: SMART FIELD MAPPING
Match schema field names to document labels intelligently:

NAME FIELDS (student_name, applicant_name, person_name, candidate_name, name):
- Look for: "Name:", "Student Name:", "Applicant:", "Person's Name:"
- Also: Name after "Mr.", "Miss", "Mrs.", "Dr.", "Shri"
- Exclude: "S/O", "D/O", "W/O", "Father:", "Mother:"
- Extract EXACTLY as printed including numbers: "John123" -> "John123"
- Example: Document shows "Name: John Doe", Schema wants "student_name" -> Extract "John Doe"

IDENTIFIER FIELDS (roll_number, registration_no, certificate_no, otr_number):
- Look for: "Roll No:", "Reg No:", "Certificate No:", "ID:", "OTR No:", "OTR:", "Registration Number:"
- Extract AS-IS: "ABC-123" -> "ABC-123", "R2024" -> "R2024"
- Only strip leading hyphen from pure numbers: "-12345" -> "12345"

DATE FIELDS (date_of_birth, issue_date, exam_date):
- Extract EXACTLY as shown: "15/08/2024" -> "15/08/2024"
- DO NOT reformat: "15-Aug-2024" -> keep "15-Aug-2024"
- DO NOT fix invalid dates: "32/13/2024" -> keep "32/13/2024"

AMOUNT FIELDS (total_fees_amount, income, salary, total_marks):
- Extract EXACTLY as printed: "15,340.00" -> "15,340.00"
- If contains letters: "abcd" -> extract "abcd" (don't skip)
- If blank/empty -> set to null
- NEVER calculate from tables: If "Total" is blank, DO NOT sum items -> null

ADDRESS FIELDS (address, district, state):
- Extract as shown in document
- Keep formatting as-is

PRINCIPLE 5: HANDLE MISSING VALUES
- Field not found -> null
- Field blank/empty/"____" -> null
- Field unclear/ambiguous -> null

PRINCIPLE 6: REJECT MEANINGLESS VALUES
- Only punctuation (-, ., /) -> null
- Only whitespace -> null
- Otherwise extract what is there

EXAMPLES OF CORRECT EXTRACTION:
- "Rohan5555 Singh" -> Extract: "Rohan5555 Singh" (keep numbers in name)
- "Total: abcd" -> Extract: "abcd" (keep letters in amount field)
- "Date: 32/13/2024" -> Extract: "32/13/2024" (keep invalid date)
- "Amount: [blank]" with table below -> Extract: null (DO NOT calculate sum)

==================================================================================
OUTPUT FORMAT (MANDATORY)
==================================================================================

Return PURE JSON in ONE of these formats:

FORMAT 1 - Document validation FAILED:
{
  "isValidDocument": false
}

FORMAT 2 - Document validation PASSED:
{
  "isValidDocument": true,
  "field1": "value" or null,
  "field2": "value" or null,
  ... (ALL schema fields)
}

JSON RULES:
- Start with {, end with }
- Double quotes for keys and strings
- Use null for missing (not empty string "")
- Include ALL schema fields
- NO markdown, NO explanations, NO text before/after JSON

==================================================================================
COMPLETE EXAMPLES
==================================================================================

EXAMPLE 1: Wrong Document Type -> Reject
EXPECTED: "Marksheet"
DOCUMENT_TEXT: "INCOME CERTIFICATE... Annual Income: Rs. 50,000..."
OUTPUT:
{
  "isValidDocument": false
}

EXAMPLE 2: Correct Document -> Extract Verbatim
EXPECTED: "Marksheet"
DOCUMENT_TEXT: "MARKSHEET... Name: Rohan5555 Singh, Total Marks: abcd, Roll No: 112"
SCHEMA: {"student_name":{...}, "total_marks":{...}, "roll_number":{...}}
OUTPUT:
{
  "isValidDocument": true,
  "student_name": "Rohan5555 Singh",
  "total_marks": "abcd",
  "roll_number": "112"
}

EXAMPLE 3: Smart Mapping + Missing Values
EXPECTED: "Bonafide Certificate"
DOCUMENT_TEXT: "BONAFIDE CERTIFICATE... Name: John, Class: 12, Total Fee: ____"
SCHEMA: {"student_name":{...}, "class":{...}, "total_fees_amount":{...}}
OUTPUT:
{
  "isValidDocument": true,
  "student_name": "John",
  "class": "12",
  "total_fees_amount": null
}

EXAMPLE 4: OTR Certificate Example
EXPECTED: "OTR Certificate"
DOCUMENT_TEXT: "OTR CERTIFICATE... Rajasthan... OTR:- 250100369389914... Name: Ruby Kumari... Father's Name: SHIVSHANKAR SINGH"
SCHEMA: {"otr_number":{...}, "applicant_name":{...}, "father_name":{...}}
OUTPUT:
{
  "isValidDocument": true,
  "otr_number": "250100369389914",
  "applicant_name": "Ruby Kumari",
  "father_name": "SHIVSHANKAR SINGH"
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
