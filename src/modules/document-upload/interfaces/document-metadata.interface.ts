/**
 * Interface for document metadata
 * Used when uploading documents to provide context about the document
 */
export interface DocumentMetadata {
  docType: string;
  docSubType: string;
  docName: string;
  importedFrom: string;
}

