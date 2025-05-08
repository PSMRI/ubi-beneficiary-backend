export class DocumentListProvider {
  private static readonly documentList = [
    { name: 'Income Certificate', documentSubType: 'incomeCertificate' },
    { name: 'Caste Certificate', documentSubType: 'casteCertificate' },
    {
      name: 'UDID Certificate',
      documentSubType: 'disabilityCertificate',
    },
    // { name: 'Domicile Certificate', documentSubType: 'domicileCertificate' },
    {
      name: 'Enrollment Certificate (with hosteller/day scholar information)',
      documentSubType: 'enrollmentCertificate',
    },
    { name: 'Marksheet', documentSubType: 'marksheet' },
    { name: 'Birth Certificate', documentSubType: 'birthCertificate' },
    { name: 'Aadhaar Card', documentSubType: 'aadhaar' },
    {
      name: 'Sports Competition participation certificate',
      documentSubType: 'participationCertificate',
    },
    { name: 'Jan Aadhaar Card', documentSubType: 'janAadharCertificate' },
    { name: 'Self Declaration Form', documentSubType: 'selfDeclarationForm' },
    { name: 'Fee Receipt', documentSubType: 'feeReceipt' },
    { name: 'Bank Account Details', documentSubType: 'bankAccountDetails' },
    { name: 'OTR Certificate', documentSubType: 'otrCertificate' },
  ];

  // Method to retrieve the list Bank Account Details
  public static getDocumentList() {
    return this.documentList;
  }

  // Method to retrieve the document subtypes as a Set for faster lookups
  public static getDocumentSubTypesSet(): Set<string> {
    return new Set(this.documentList.map((item) => item.documentSubType));
  }
}
