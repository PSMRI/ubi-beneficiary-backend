import { Module } from '@nestjs/common';
import { OcrMappingService } from './ocr-mapping.service';
import { AdminModule } from '@modules/admin/admin.module';
import { VcFieldsService } from '../../common/helper/vcFieldService';

/**
 * OCR Mapping Module - Provides AI-based and keyword-based mapping of OCR text to structured data
 * 
 * Requires AdminModule to access vcConfiguration for document-specific OCR mapping prompts.
 * VcFields configuration should be passed as a parameter to the mapping methods.
 */
@Module({
  imports: [AdminModule],
  providers: [OcrMappingService, VcFieldsService],
  exports: [OcrMappingService],
})
export class OcrMappingModule {}
