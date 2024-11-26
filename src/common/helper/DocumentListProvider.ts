export class DocumentListProvider {
  private static readonly documentList = [
    { name: 'Income Certificate', documentSubType: 'incomeCertificate' },
    { name: 'Caste Certificate', documentSubType: 'casteCertificate' },
    {
      name: 'Disability Certificate',
      documentSubType: 'disabilityCertificate',
    },
    { name: 'Domicile Certificate', documentSubType: 'domicileCertificate' },
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
  ];

  // Method to retrieve the list
  public static getDocumentList() {
    return this.documentList;
  }

  // Method to retrieve the document subtypes as a Set for faster lookups
  public static getDocumentSubTypesSet(): Set<string> {
    return new Set(this.documentList.map((item) => item.documentSubType));
  }
}
