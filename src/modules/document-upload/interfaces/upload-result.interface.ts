/**
 * Interface for upload operation result
 * Contains information about the uploaded file
 */
export interface UploadResult {
  filePath: string;
  fileExtension: string;
  docDatatype: string;
  uploadedAt: Date;
}

