import { Injectable, Logger } from '@nestjs/common';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { BedrockAdapter } from './adapters/bedrock.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { OcrMappingInput, OcrMappingResult, IAiMappingAdapter } from './interfaces/ocr-mapping.interface';
import { VcFields } from '../../common/helper/vcFieldService';
import { getFieldSynonyms } from '../../config/field-synonyms.config';

/**
 * Service for mapping OCR extracted text to structured data based on vcFields configuration
 */
@Injectable()
export class OcrMappingService {
  private readonly logger = new Logger(OcrMappingService.name);
  private readonly ajv = new Ajv({ allErrors: true, strict: false });
  private readonly aiAdapter: IAiMappingAdapter;

  constructor() {
    addFormats(this.ajv);
    // Initialize adapter based on environment configuration
    const adapterType = (process.env.OCR_MAPPING_PROVIDER || 'bedrock').toLowerCase();
    if (adapterType === 'google-gemini') {
      this.aiAdapter = new GeminiAdapter();
    } else {
      this.aiAdapter = new BedrockAdapter();
    }
  }

  /**
   * Map OCR text to structured data after OCR processing
   * @param input - OCR mapping input containing text and document info
   * @param vcFields - VcFields configuration for the document type
   */
  async mapAfterOcr(input: OcrMappingInput, vcFields: VcFields): Promise<OcrMappingResult> {
    try {
      this.logger.log(`Starting OCR mapping for docType: ${input.docType}, docSubType: ${input.docSubType}`);
      this.logger.debug(`OCR text preview (first 500 chars): ${input.text.substring(0, 500)}...`);
      this.logger.debug(`Received vcFields with ${Object.keys(vcFields).length} fields: [${Object.keys(vcFields).join(', ')}]`);
      
      if (!vcFields || Object.keys(vcFields).length === 0) {
        this.logger.warn(`No vcFields provided for mapping`);
        return {
          mapped_data: {},
          missing_fields: [],
          confidence: 0,
          processing_method: 'keyword',
          warnings: ['No vcFields provided'],
        };
      }

      // Build JSON schema from vcFields
      const schema = this.vcFieldsToSchema(vcFields);
      let mappedData: Record<string, any> | null = null;
      let processingMethod: 'ai' | 'keyword' | 'hybrid' = 'keyword';

      // Try AI mapping first if adapter is configured
      const adapterType = (process.env.OCR_MAPPING_PROVIDER || 'bedrock').toLowerCase();
      this.logger.debug(`OCR mapping provider: ${adapterType}, AI configured: ${this.aiAdapter.isConfigured()}`);
      
      if ((adapterType === 'bedrock' || adapterType === 'google-gemini') && this.aiAdapter.isConfigured()) {
        try {
          this.logger.log(`Attempting AI-based mapping using ${adapterType}`);
          this.logger.debug(`Schema being sent to AI: ${JSON.stringify(schema, null, 2)}`);
          mappedData = await this.aiAdapter.mapTextToSchema(input.text, schema);
          this.logger.debug(`AI raw response: ${JSON.stringify(mappedData)}`);
          
          // Check if the response is the full AI response object instead of parsed JSON
          if (mappedData && typeof mappedData === 'object' && ('generation' in mappedData || 'content' in mappedData)) {
            this.logger.warn('AI returned full response object instead of parsed JSON, attempting to extract');
            mappedData = null; // Force fallback to keyword mapping
          }
          
          if (mappedData && Object.keys(mappedData).length > 0) {
            processingMethod = 'ai';
            this.logger.log(`AI mapping successful - extracted ${Object.keys(mappedData).length} fields`);
          } else {
            this.logger.warn('AI mapping returned empty or null result');
            mappedData = null;
          }
        } catch (error: any) {
          this.logger.error(`AI mapping failed: ${error?.message || error}`, error?.stack);
          this.logger.warn(`Falling back to keyword mapping`);
        }
      } else {
        this.logger.log(`Skipping AI mapping - adapter: ${adapterType}, configured: ${this.aiAdapter.isConfigured()}`);
      }

      // Fallback to keyword-based mapping if AI failed or not configured
      if (!mappedData || Object.keys(mappedData).length === 0) {
        this.logger.log('Using keyword-based mapping');
        this.logger.debug(`vcFields for keyword mapping: ${JSON.stringify(Object.keys(vcFields))}`);
        mappedData = this.keywordBasedMapping(input.text, vcFields);
        this.logger.debug(`Keyword mapping result: ${JSON.stringify(mappedData)}`);
        processingMethod = processingMethod === 'ai' ? 'hybrid' : 'keyword';
      }

      // Validate and normalize the mapped data
      const validationResult = this.validateAndNormalize(mappedData, vcFields);
      
      // Calculate confidence and missing fields
      const fieldNames = Object.keys(vcFields);
      const presentFields = Object.keys(validationResult.data).filter(
        key => validationResult.data[key] !== null && 
               validationResult.data[key] !== undefined && 
               String(validationResult.data[key]).trim() !== ''
      );
      const missingFields = fieldNames.filter(key => !presentFields.includes(key));
      const confidence = fieldNames.length > 0 ? Number((presentFields.length / fieldNames.length).toFixed(2)) : 0;

      this.logger.log(`Mapping completed: ${presentFields.length}/${fieldNames.length} fields mapped, confidence: ${confidence}, method: ${processingMethod}`);
      this.logger.debug(`Mapped fields: ${JSON.stringify(validationResult.data)}`);
      this.logger.debug(`Missing fields: ${JSON.stringify(missingFields)}`);

      return {
        mapped_data: validationResult.data,
        missing_fields: missingFields,
        confidence,
        processing_method: processingMethod,
        warnings: validationResult.warnings,
      };

    } catch (error: any) {
      this.logger.error(`OCR mapping failed: ${error?.message || error}`);
      return {
        mapped_data: {},
        missing_fields: [],
        confidence: 0,
        processing_method: 'keyword',
        warnings: [`Mapping failed: ${error?.message || error}`],
      };
    }
  }


  /**
   * Convert vcFields to JSON schema format
   */
  private vcFieldsToSchema(vcFields: VcFields): Record<string, any> {
    const properties: Record<string, any> = {};
    
    for (const [fieldName, fieldConfig] of Object.entries(vcFields)) {
      properties[fieldName] = {
        type: fieldConfig.type || 'string',
        description: fieldConfig.description || `Field: ${fieldName}`,
      };
    }

    return {
      type: 'object',
      properties,
      additionalProperties: false,
    };
  }

  /**
   * Keyword-based mapping using field synonyms
   */
  private keywordBasedMapping(text: string, vcFields: VcFields): Record<string, any> {
    const result: Record<string, any> = {};
    const normalizedText = text.toLowerCase();
    
    this.logger.debug(`Starting keyword mapping with ${Object.keys(vcFields).length} fields`);
    this.logger.debug(`Text length: ${text.length} characters`);

    for (const fieldName of Object.keys(vcFields)) {
      const fieldConfig = vcFields[fieldName];
      this.logger.debug(`Attempting to extract field: ${fieldName} (type: ${fieldConfig.type})`);
      
      const value = this.extractFieldValue(normalizedText, fieldName, fieldConfig.type);
      
      if (value !== null) {
        this.logger.debug(`✓ Extracted ${fieldName}: "${value}"`);
        result[fieldName] = value;
      } else {
        this.logger.debug(`✗ Failed to extract ${fieldName}`);
      }
    }

    this.logger.debug(`Keyword mapping completed: ${Object.keys(result).length} fields extracted`);
    return result;
  }

  /**
   * Extract field value using synonyms and patterns
   */
  private extractFieldValue(text: string, fieldName: string, fieldType?: string): any {
    const synonyms = getFieldSynonyms(fieldName.toLowerCase());
    this.logger.debug(`  Synonyms for ${fieldName}: [${synonyms.join(', ')}]`);
    
    // Test if any synonym exists in text (simple check)
    const foundSynonyms = synonyms.filter(syn => text.toLowerCase().includes(syn.toLowerCase()));
    if (foundSynonyms.length > 0) {
      this.logger.debug(`    Found synonyms in text: [${foundSynonyms.join(', ')}]`);
    } else {
      this.logger.debug(`    No synonyms found in text for ${fieldName}`);
    }
    
    // Try pattern matching with synonyms
    for (const synonym of synonyms) {
      this.logger.debug(`    Trying synonym: "${synonym}"`);
      const patterns = [
        // Pattern: "field: value" (strict colon pattern)
        new RegExp(`${this.escapeRegex(synonym)}\\s*:\\s*([^\\n\\r:]{1,100})`, 'i'),
        // Pattern: "field - value" (strict dash pattern)  
        new RegExp(`${this.escapeRegex(synonym)}\\s*-\\s*([^\\n\\r-]{1,100})`, 'i'),
        // Pattern: "field" followed by value on next line (limited length)
        new RegExp(`${this.escapeRegex(synonym)}\\s*\\n\\s*([^\\n\\r]{1,100})`, 'i'),
        // Pattern: "field" followed by value on same line (more flexible)
        new RegExp(`${this.escapeRegex(synonym)}\\s+([A-Za-z0-9][^\\n\\r]{0,99})`, 'i'),
        // Pattern: value after field with optional punctuation
        new RegExp(`${this.escapeRegex(synonym)}\\s*[:\\-\\.]?\\s*([A-Za-z0-9][^\\n\\r]{0,99})`, 'i'),
        // Pattern: more flexible word boundary (for cases like "Student's Name")
        new RegExp(`${this.escapeRegex(synonym)}\\s*[:\\-]?\\s*([^\\n\\r]{1,100})`, 'i'),
      ];

      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const match = pattern.exec(text);
        if (match?.[1]) {
          const rawValue = match[1].trim();
          this.logger.debug(`      Pattern ${i+1} matched: "${rawValue}"`);
          // Clean up common OCR artifacts
          const cleanedValue = this.cleanOcrValue(rawValue);
          this.logger.debug(`      Cleaned value: "${cleanedValue}"`);
          // Validate the extracted value is reasonable
          const isValid = this.isValidExtractedValue(cleanedValue, fieldName, fieldType);
          this.logger.debug(`      Validation result: ${isValid}`);
          if (isValid) {
            const coercedValue = this.coerceValue(cleanedValue, fieldType);
            this.logger.debug(`      Final coerced value: "${coercedValue}"`);
            return coercedValue;
          }
        }
      }
    }

    // Special patterns for numeric fields
    if (fieldType === 'number' || fieldType === 'integer') {
      return this.extractNumericValue(text, fieldName);
    }

    return null;
  }

  /**
   * Clean OCR value by removing common artifacts
   */
  private cleanOcrValue(value: string): string {
    return value
      .replace(/[^\w\s\-\.\/]/g, ' ') // Remove special chars except basic ones
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Validate if extracted value is reasonable for the field
   */
  private isValidExtractedValue(value: string, fieldName: string, fieldType?: string): boolean {
    if (!value || value.length < 1) return false;
    
    // Reject values that are too long or contain too many special characters
    if (value.length > 100) return false;
    
    // Reject values that are mostly punctuation or symbols (more lenient)
    const alphanumericRatio = (value.match(/[a-zA-Z0-9]/g) || []).length / value.length;
    if (alphanumericRatio < 0.2) return false;
    
    // Reject values that look like field labels or descriptions
    const lowerValue = value.toLowerCase();
    const rejectPatterns = [
      /^[^a-zA-Z0-9]*$/,
      /^\s*(:|-)?\s*$/,
      /^(enter|fill|write|type|click|select)/i,
    ];
    
    for (const pattern of rejectPatterns) {
      if (pattern.test(lowerValue)) return false;
    }
    
    // Field-specific validations (more lenient)
    if (fieldName.includes('name') && fieldType === 'string') {
      // Names should contain letters and be reasonable length
      if (!/[a-zA-Z]/.test(value) || value.length < 2) return false;
      // Allow more characters for names (numbers, spaces, dots, etc.)
      const namePattern = /^[a-zA-Z0-9\s.'\-\/]{2,100}$/;
      return namePattern.test(value);
    }
    
    if (fieldName.includes('percentage') || fieldName.includes('cgpa')) {
      // Should contain numbers
      return /\d/.test(value);
    }
    
    // For academic/institutional fields, be more lenient
    if (fieldName.includes('school') || fieldName.includes('college') || fieldName.includes('result')) {
      return value.length >= 2 && /[a-zA-Z0-9]/.test(value);
    }
    
    return true;
  }

  /**
   * Extract numeric values using specific patterns
   */
  private extractNumericValue(text: string, fieldName: string): number | null {
    const lowerFieldName = fieldName.toLowerCase();
    
    // Percentage patterns - look for numbers followed by %
    if (lowerFieldName.includes('percentage') || lowerFieldName.includes('percent')) {
      const patterns = [
        /(\d{1,3}(?:\.\d+)?)\s*%/g,
        /percentage\s*:?\s*(\d{1,3}(?:\.\d+)?)/gi,
        /percent\s*:?\s*(\d{1,3}(?:\.\d+)?)/gi,
      ];
      
      for (const pattern of patterns) {
        const match = pattern.exec(text);
        if (match) {
          const value = Number.parseFloat(match[1]);
          if (value >= 0 && value <= 100) return value;
        }
      }
    }
    
    // CGPA patterns - look for CGPA values (typically 0-10)
    if (lowerFieldName.includes('cgpa') || lowerFieldName.includes('gpa')) {
      const patterns = [
        /cgpa\s*:?\s*(\d(?:\.\d+)?)/gi,
        /gpa\s*:?\s*(\d(?:\.\d+)?)/gi,
        /cpi\s*:?\s*(\d(?:\.\d+)?)/gi,
      ];
      
      for (const pattern of patterns) {
        const match = pattern.exec(text);
        if (match) {
          const value = Number.parseFloat(match[1]);
          if (value >= 0 && value <= 10) return value;
        }
      }
    }
    
    // Marks patterns
    if (lowerFieldName.includes('marks') || lowerFieldName.includes('score')) {
      const patterns = [
        /marks\s*:?\s*(\d+)/gi,
        /score\s*:?\s*(\d+)/gi,
        /total\s*marks\s*:?\s*(\d+)/gi,
      ];
      
      for (const pattern of patterns) {
        const match = pattern.exec(text);
        if (match) {
          const value = Number.parseFloat(match[1]);
          if (value >= 0 && value <= 1000) return value; // Reasonable range for marks
        }
      }
    }
    
    // General numeric patterns with field synonyms
    const synonyms = getFieldSynonyms(lowerFieldName);
    for (const synonym of synonyms) {
      const pattern = new RegExp(`\\b${this.escapeRegex(synonym)}\\s*:?\\s*(\\d+(?:\\.\\d+)?)`, 'gi');
      const match = pattern.exec(text);
      if (match) {
        const value = Number.parseFloat(match[1]);
        // Basic validation - reject unreasonable values
        if (value >= 0 && value <= 10000) return value;
      }
    }
    
    return null;
  }

  /**
   * Coerce value to the specified type
   */
  private coerceValue(value: string, type?: string): any {
    if (!value?.trim()) return null;
    
    const trimmedValue = value.trim();
    
    switch (type) {
      case 'number':
      case 'integer': {
        const numericValue = trimmedValue.replace(/[^\d.-]/g, '');
        const parsed = Number.parseFloat(numericValue);
        if (!Number.isFinite(parsed)) return null;
        return type === 'integer' ? Math.round(parsed) : parsed;
      }
      case 'boolean': {
        const lowerValue = trimmedValue.toLowerCase();
        if (['true', 'yes', 'y', '1'].includes(lowerValue)) return true;
        if (['false', 'no', 'n', '0'].includes(lowerValue)) return false;
        return null;
      }
      default:
        return trimmedValue;
    }
  }

  /**
   * Validate and normalize mapped data
   */
  private validateAndNormalize(data: Record<string, any>, vcFields: VcFields): { data: Record<string, any>; warnings: string[] } {
    const warnings: string[] = [];
    const normalizedData: Record<string, any> = {};

    // Validate each field
    for (const [fieldName, fieldConfig] of Object.entries(vcFields)) {
      const value = data[fieldName];
      
      if (value != null) {
        // Type validation and coercion
        const coercedValue = this.coerceValue(String(value), fieldConfig.type);
        if (coercedValue !== null) {
          normalizedData[fieldName] = coercedValue;
        } else {
          warnings.push(`Failed to coerce value "${value}" for field "${fieldName}" to type "${fieldConfig.type}"`);
        }
      }
    }

    return { data: normalizedData, warnings };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
