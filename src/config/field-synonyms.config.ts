/**
 * Field synonyms configuration for OCR text mapping
 * Maps standardized field names to their possible variations found in documents
 * Organized by document types and common field categories
 */
export const FIELD_SYNONYMS: Record<string, string[]> = {
  // === PERSONAL INFORMATION ===
  firstname: ['first name', 'given name', 'forename'],
  middlename: ['middle name', 'middle initial'],
  lastname: ['last name', 'surname', 'family name'],
  fullname: ['full name', 'complete name', 'name', 'candidate name', 'student name', 'applicant name', 'beneficiary name', 'account holder name', 'customer name'],
  fathername: ['father name', 'father\'s name', 'fathers name', 'father', 'guardian name', 'parent name'],
  mothername: ['mother name', 'mother\'s name', 'mothers name', 'mother'],
  dob: ['date of birth', 'dob', 'birth date', 'born on'],
  age: ['age', 'years old', 'age in years'],
  gender: ['gender', 'sex', 'male/female', 'm/f'],
  
  // === ADDRESS INFORMATION ===
  address: ['address', 'permanent address', 'residential address', 'home address', 'correspondence address'],
  city: ['city', 'town', 'district', 'locality'],
  state: ['state', 'province', 'region'],
  pincode: ['pin code', 'postal code', 'zip code', 'pin', 'postal pin'],
  country: ['country', 'nation'],
  
  // === CONTACT INFORMATION ===
  phone: ['phone', 'mobile', 'contact number', 'phone number', 'mobile number', 'telephone'],
  email: ['email', 'email address', 'e-mail', 'email id', 'electronic mail'],
  
  // === IDENTIFICATION NUMBERS ===
  aadhar: ['aadhar', 'aadhaar', 'aadhar number', 'aadhaar number', 'uid'],
  pan: ['pan', 'pan number', 'permanent account number'],
  rollnumber: ['roll no', 'roll number', 'roll #', 'rollno', 'roll code'],
  registrationnumber: ['registration number', 'reg no', 'registration no', 'enrolment number', 'enrollment number'],
  studentid: ['student id', 'student number', 'id number', 'student identification'],
  udid: ['udid', 'unique disability id', 'disability id'],
  
  // === DOCUMENT INFORMATION ===
  certificatenumber: ['certificate number', 'cert no', 'certificate no', 'document number', 'reference number'],
  issuedate: ['issue date', 'issued on', 'date of issue', 'issued date', 'date of issuance'],
  expirydate: ['expiry date', 'valid till', 'expires on', 'valid upto', 'valid until', 'validity'],
  validfrom: ['valid from', 'validity from', 'effective from', 'valid since'],
  issuedby: ['issued by', 'issuer', 'issued from', 'authority', 'issuing authority'],
  
  // === ACADEMIC INFORMATION ===
  institutename: ['institute name', 'institution name', 'college name', 'university name', 'school name', 'school'],
  course: ['course', 'program', 'degree', 'qualification', 'stream'],
  subject: ['subject', 'specialization', 'major', 'branch'],
  academicyear: ['academic year', 'session', 'year', 'academic session', 'batch'],
  semester: ['semester', 'sem', 'term'],
  cgpa: ['cgpa', 'c.g.p.a', 'grade point', 'cpi', 'cumulative grade point average'],
  percentage: ['percentage', '%', 'percent', 'marks percentage', 'total percentage'],
  marks: ['marks', 'total marks', 'obtained marks', 'score'],
  grade: ['grade', 'letter grade', 'final grade', 'class'],
  result: ['result', 'status', 'outcome', 'remarks', 'declaration'],
  
  // === FINANCIAL INFORMATION ===
  annualincome: ['annual income', 'yearly income', 'total income', 'family income', 'gross income'],
  monthlyincome: ['monthly income', 'per month income', 'salary'],
  amount: ['amount', 'total amount', 'sum', 'value', 'fee', 'payment'],
  accountnumber: ['account number', 'account no', 'a/c no', 'bank account number'],
  ifsccode: ['ifsc code', 'ifsc', 'bank code', 'branch code'],
  bankname: ['bank name', 'bank', 'financial institution'],
  
  // === CATEGORY/CLASSIFICATION ===
  caste: ['caste', 'community', 'jati'],
  category: ['category', 'reservation category', 'quota', 'class'],
  religion: ['religion', 'faith', 'dharma'],
  
  // === DISABILITY INFORMATION ===
  disabilitytype: ['disability type', 'type of disability', 'handicap type', 'impairment type'],
  disabilitypercentage: ['disability percentage', 'handicap percentage', '% disability', 'degree of disability'],
  
  // === RECEIPT/PAYMENT INFORMATION ===
  receiptnumber: ['receipt number', 'receipt no', 'transaction id', 'payment id', 'reference id'],
  paymentdate: ['payment date', 'transaction date', 'paid on', 'date of payment'],
  paymentmethod: ['payment method', 'mode of payment', 'payment mode'],
  
  // === AUTHORITY/OFFICE INFORMATION ===
  officename: ['office name', 'department', 'ministry', 'authority name'],
  officerdesignation: ['officer designation', 'designation', 'post', 'rank'],
  officersignature: ['officer signature', 'signature', 'authorized signature'],
  
  // === STAMP DUTY INFORMATION ===
  stampduty: ['stamp duty', 'duty', 'government duty', 'revenue stamp'],
  stampvalue: ['stamp value', 'duty amount', 'stamp amount'],
  
  // === ENROLLMENT INFORMATION ===
  enrollmentnumber: ['enrollment number', 'enrolment number', 'admission number', 'student number'],
  enrollmentdate: ['enrollment date', 'admission date', 'date of enrollment'],
  
  // === DECLARATION INFORMATION ===
  declarationtext: ['declaration', 'declaration text', 'statement', 'affirmation'],
  witnessname: ['witness name', 'witness', 'attested by'],
  notaryname: ['notary name', 'notary public', 'commissioner'],
};

/**
 * Get synonyms for a field name
 * @param fieldName - The field name to get synonyms for
 * @returns Array of synonyms including the original field name
 */
export function getFieldSynonyms(fieldName: string): string[] {
  const normalizedField = fieldName.toLowerCase().trim();
  return [normalizedField, ...(FIELD_SYNONYMS[normalizedField] || [])];
}

/**
 * Get all configured field names
 * @returns Array of all field names that have synonyms configured
 */
export function getConfiguredFields(): string[] {
  return Object.keys(FIELD_SYNONYMS);
}

/**
 * Find the best matching field name for a given text
 * @param text - The text to match against field synonyms
 * @returns The field name that best matches the text, or null if no match found
 */
export function findMatchingField(text: string): string | null {
  const normalizedText = text.toLowerCase().trim();
  
  // First try exact match with field names
  if (FIELD_SYNONYMS[normalizedText]) {
    return normalizedText;
  }
  
  // Then try matching against synonyms
  for (const [fieldName, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    if (synonyms.some(synonym => synonym.toLowerCase() === normalizedText)) {
      return fieldName;
    }
  }
  
  // Try partial matching for compound field names
  for (const [fieldName, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    const allVariations = [fieldName, ...synonyms];
    if (allVariations.some(variation => 
      normalizedText.includes(variation.toLowerCase()) || 
      variation.toLowerCase().includes(normalizedText)
    )) {
      return fieldName;
    }
  }
  
  return null;
}

/**
 * Get field synonyms by category
 * @param category - The category to filter by (e.g., 'personal', 'academic', 'financial')
 * @returns Object containing field synonyms for the specified category
 */
export function getFieldsByCategory(category: string): Record<string, string[]> {
  const categoryMappings: Record<string, string[]> = {
    personal: ['firstname', 'middlename', 'lastname', 'fullname', 'fathername', 'mothername', 'dob', 'age', 'gender'],
    address: ['address', 'city', 'state', 'pincode', 'country'],
    contact: ['phone', 'email'],
    identification: ['aadhar', 'pan', 'rollnumber', 'registrationnumber', 'studentid', 'udid'],
    document: ['certificatenumber', 'issuedate', 'expirydate', 'validfrom', 'issuedby'],
    academic: ['institutename', 'course', 'subject', 'academicyear', 'semester', 'cgpa', 'percentage', 'marks', 'grade', 'result'],
    financial: ['annualincome', 'monthlyincome', 'amount', 'accountnumber', 'ifsccode', 'bankname'],
    classification: ['caste', 'category', 'religion'],
    disability: ['disabilitytype', 'disabilitypercentage'],
    payment: ['receiptnumber', 'paymentdate', 'paymentmethod'],
    authority: ['officename', 'officerdesignation', 'officersignature'],
    stamp: ['stampduty', 'stampvalue'],
    enrollment: ['enrollmentnumber', 'enrollmentdate'],
    declaration: ['declarationtext', 'witnessname', 'notaryname']
  };
  
  const categoryFields = categoryMappings[category.toLowerCase()] || [];
  const result: Record<string, string[]> = {};
  
  for (const field of categoryFields) {
    if (FIELD_SYNONYMS[field]) {
      result[field] = FIELD_SYNONYMS[field];
    }
  }
  
  return result;
}

/**
 * Validate if a field name exists in the configuration
 * @param fieldName - The field name to validate
 * @returns True if the field exists in the configuration
 */
export function isValidField(fieldName: string): boolean {
  return fieldName.toLowerCase() in FIELD_SYNONYMS;
}
