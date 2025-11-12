import { Module } from '@nestjs/common';
import { DocumentUploadService } from './document-upload.service';
import { StorageProviderModule } from '@services/storage-providers/storage-provider.module';

/**
 * Document Upload Module
 * Provides generic document upload functionality that can be used across the application
 * 
 * This module can be imported by any other module that needs file upload capabilities
 * (e.g., users, admin, organizations, etc.)
 */
@Module({
  imports: [StorageProviderModule],
  providers: [DocumentUploadService],
  exports: [DocumentUploadService],
})
export class DocumentUploadModule {}

