import { Module } from '@nestjs/common';
import { OcrMappingService } from './ocr-mapping.service';

/**
 * OCR Mapping Module - Provides AI-based and keyword-based mapping of OCR text to structured data
 * 
 * This module is now independent and doesn't require AdminModule dependency.
 * VcFields configuration should be passed as a parameter to the mapping methods.
 */
@Module({
  providers: [OcrMappingService],
  exports: [OcrMappingService],
})
export class OcrMappingModule {}
