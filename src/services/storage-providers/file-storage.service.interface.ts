export interface IFileStorageService {
  uploadFile(key: string, content: Buffer, isPublic?: boolean): Promise<string | null>;
  getFile(key: string): Promise<Buffer | null>;
  
  deleteFile?(key: string): Promise<boolean>;
  moveFile?(fromKey: string, toKey: string, isPublic?: boolean): Promise<boolean>;
  copyFile?(fromKey: string, toKey: string, isPublic?: boolean): Promise<boolean>;
  generateTemporaryUrl?(key: string, expiresAt?: Date): Promise<string | null>;
}
