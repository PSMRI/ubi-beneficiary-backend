/**
 * Field synonyms configuration for OCR text mapping
 * Maps field names to their possible variations found in documents
 */
export const FIELD_SYNONYMS: Record<string, string[]> = {
  // Name fields
  firstname: ['first name', 'given name', 'name', 'candidate name', 'student name', 'applicant name', 'student\'s name'],
  middlename: ['middle name', 'middle initial'],
  lastname: ['last name', 'surname', 'family name'],
  fullname: ['full name', 'complete name', 'name', 'candidate name', 'student name', 'student\'s name'],
  
  // Parent information
  fathername: ['father name', 'father\'s name', 'fathers name', 'father', 'guardian name'],
  mothername: ['mother name', 'mother\'s name', 'mothers name', 'mother'],
  
  // Educational institution
  schoolname: ['school name', 'institution', 'college', 'institute', 'university', 'school', 'college / +2 school\'s name', '+2 school\'s name', 'school\'s name'],
  schoolid: ['school id', 'school code', 'institution id', 'college id'],
  institutename: ['institute name', 'institution name', 'college name', 'university name'],
  
  // Academic performance
  cgpa: ['cgpa', 'c.g.p.a', 'grade point', 'cpi', 'cumulative grade point average'],
  cgpamax: ['cgpa max', 'maximum cgpa', 'cgpa out of', 'max cgpa'],
  percentage: ['percentage', '%', 'percent', 'marks percentage', 'total percentage'],
  marks: ['marks', 'total marks', 'obtained marks', 'score'],
  marksmax: ['full marks', 'maximum marks', 'total marks', 'marks out of', 'max marks'],
  markstotal: ['marks obtained', 'total obtained', 'obtained marks', 'total score'],
  grade: ['grade', 'letter grade', 'final grade'],
  result: ['result', 'status', 'outcome', 'remarks'],
  currentclass: ['current class', 'class', 'standard', 'grade'],
  previousclass: ['previous class', 'last class', 'prev class'],
  
  // Personal information
  dob: ['date of birth', 'dob', 'birth date', 'born on', 'date of birth'],
  age: ['age', 'years old', 'age in years'],
  gender: ['gender', 'sex', 'male/female'],
  
  // Identification
  rollnumber: ['roll no', 'roll number', 'roll #', 'rollno', 'roll code'],
  rollcode: ['roll code', 'code', 'student code'],
  registrationnumber: ['registration number', 'reg no', 'registration no', 'enrolment number'],
  studentid: ['student id', 'student number', 'id number', 'student identification'],
  studentuniqueid: ['student unique id', 'unique id', 'student id', 'unique student id', 'sl. no', 'serial number'],
  
  // Address
  address: ['address', 'permanent address', 'residential address', 'home address'],
  city: ['city', 'town', 'district'],
  state: ['state', 'province'],
  pincode: ['pin code', 'postal code', 'zip code', 'pin'],
  issuingauthorityaddress: ['issuing authority address', 'authority address', 'issuer address'],
  issuingauthoritydistrict: ['issuing authority district', 'authority district', 'issuer district'],
  issuingauthoritypin: ['issuing authority pin', 'authority pin', 'issuer pin'],
  issuingauthoritystate: ['issuing authority state', 'authority state', 'issuer state'],
  issuingauthoritycountry: ['issuing authority country', 'authority country', 'issuer country'],
  
  // Contact
  phone: ['phone', 'mobile', 'contact number', 'phone number', 'mobile number'],
  email: ['email', 'email address', 'e-mail', 'email id'],
  
  // Document specific
  certificatenumber: ['certificate number', 'cert no', 'certificate no', 'document number'],
  issuedate: ['issue date', 'issued on', 'date of issue', 'issued date'],
  issueddate: ['issued date', 'issue date', 'date of issue', 'issued on'],
  validfrom: ['valid from', 'validity from', 'effective from'],
  validto: ['valid to', 'valid till', 'expires on', 'expiry date'],
  validupto: ['valid upto', 'valid till', 'expires on', 'expiry date', 'valid until'],
  examdate: ['exam date', 'examination date', 'test date', 'date of exam'],
  academicyear: ['academic year', 'session', 'year', 'academic session'],
  issuedby: ['issued by', 'issuer', 'issued from', 'authority'],
  issuerauthority: ['issuer authority', 'issuing authority', 'authority', 'issued by'],
  
  // Income related
  annualincome: ['annual income', 'yearly income', 'total income', 'family income'],
  monthlyincome: ['monthly income', 'per month income'],
  
  // Caste/Category
  caste: ['caste', 'community', 'category'],
  category: ['category', 'reservation category', 'quota'],
  
  // Course/Subject
  course: ['course', 'program', 'degree', 'qualification'],
  subject: ['subject', 'stream', 'specialization', 'major'],
  year: ['year', 'academic year', 'passing year', 'completion year'],
  
  // Disability related
  disabilitytype: ['disability type', 'type of disability', 'handicap type'],
  disabilitypercentage: ['disability percentage', 'handicap percentage', '% disability'],
};

/**
 * Get synonyms for a field name
 * @param fieldName - The field name to get synonyms for
 * @returns Array of synonyms including the original field name
 */
export function getFieldSynonyms(fieldName: string): string[] {
  const normalizedField = fieldName.toLowerCase();
  return [normalizedField, ...(FIELD_SYNONYMS[normalizedField] || [])];
}

/**
 * Get all configured field names
 * @returns Array of all field names that have synonyms configured
 */
export function getConfiguredFields(): string[] {
  return Object.keys(FIELD_SYNONYMS);
}
