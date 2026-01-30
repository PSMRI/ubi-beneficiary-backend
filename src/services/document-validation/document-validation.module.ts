import { Module, Global } from '@nestjs/common';
import { DocumentValidationService } from './document-validation.service';
import { AdminModule } from '@modules/admin/admin.module';

/**
 * Document Validation Module
 * Provides keyword-based document validation services
 * 
 * @Global - Makes DocumentValidationService available throughout the application
 */
@Global()
@Module({
  imports: [AdminModule],
  providers: [DocumentValidationService],
  exports: [DocumentValidationService],
})
export class DocumentValidationModule {}

