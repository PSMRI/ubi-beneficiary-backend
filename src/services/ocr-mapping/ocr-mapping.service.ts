import { Injectable, Logger } from '@nestjs/common';
import { BedrockAdapter } from './adapters/bedrock.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { OcrMappingInput, OcrMappingResult, IAiMappingAdapter } from './interfaces/ocr-mapping.interface';
import { VcFields, VcFieldsService } from '../../common/helper/vcFieldService';

/**
 * Service for mapping OCR extracted text to structured data based on vcFields configuration
 */
@Injectable()
export class OcrMappingService {
  private readonly logger = new Logger(OcrMappingService.name);
  private readonly aiAdapter: IAiMappingAdapter;

  constructor(private readonly vcFieldsService: VcFieldsService) {
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
   * @param locale - Language locale for validation messages (en, hi)
   */
  async mapAfterOcr(input: OcrMappingInput, vcFields: VcFields, locale: string = 'en'): Promise<OcrMappingResult> {
    try {
      this.logger.log(`OCR mapping started: ${input.docType}/${input.docSubType}, locale: ${locale}`);
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

      const schema = this.vcFieldsToSchema(vcFields);
      const adapterType = (process.env.OCR_MAPPING_PROVIDER || 'bedrock').toLowerCase();

      // Fetch document-specific OCR mapping prompt from vcConfiguration
      let customPromptTemplate: string | null = null;
      try {
        customPromptTemplate = await this.vcFieldsService.getOcrMappingPrompt(input.docType, input.docSubType);
        if (customPromptTemplate) {
          this.logger.log(`✅ Found ocrMappingPrompt in vcConfiguration for ${input.docType}/${input.docSubType} - using document-specific prompt`);
        } else {
          this.logger.log(`ℹ️ No ocrMappingPrompt found in vcConfiguration for ${input.docType}/${input.docSubType} - using default template`);
        }
      } catch (error: any) {
        this.logger.warn(`Failed to fetch document-specific prompt: ${error?.message || error}. Using default template.`);
      }

      // Use AI mapping
      const startTime = Date.now();
      const mappedData: Record<string, any> | null = await this.tryAiMapping(adapterType, input.text, schema, customPromptTemplate);
      this.logger.log(`⏱️ AI Mapping Logic took: ${Date.now() - startTime}ms`);
      
      // Log raw mapped data from AI
      if (mappedData && Object.keys(mappedData).length > 0) {
        this.logger.log(`📋 Raw mapped data from AI (${Object.keys(mappedData).length} fields):`);
        Object.entries(mappedData).forEach(([field, value]) => {
          this.logger.log(`  - ${field}: ${JSON.stringify(value)}`);
        });
      } else {
        this.logger.warn('No data mapped by AI - returning empty result');
      }
      
      const processingMethod: 'ai' | 'keyword' | 'hybrid' = mappedData && Object.keys(mappedData).length > 0 ? 'ai' : 'keyword';

      return this.computeResultFromMappedData(mappedData, vcFields, processingMethod, locale);

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
   * Attempt to map using AI adapter, returns null on any failure or unexpected response
   */
  private async tryAiMapping(
    adapterType: string, 
    text: string, 
    schema: Record<string, any>, 
    customPromptTemplate?: string | null
  ): Promise<Record<string, any> | null> {
    if (!((adapterType === 'bedrock' || adapterType === 'google-gemini') && this.aiAdapter.isConfigured())) {
      return null;
    }

    try {
      const mappedData = await this.aiAdapter.mapTextToSchema(text, schema, undefined, customPromptTemplate);

      // Check if the response is the full AI response object instead of parsed JSON
      if (mappedData && typeof mappedData === 'object' && ('generation' in mappedData || 'content' in mappedData)) {
        this.logger.warn('AI returned unparsed response object');
        return null;
      }

      if (mappedData && Object.keys(mappedData).length > 0) {
        const fieldCount = Object.keys(schema.properties || {}).length;
        this.logger.log(`AI mapping successful: ${Object.keys(mappedData).length}/${fieldCount} fields extracted`);
        return mappedData;
      }

      this.logger.warn('⚠️ AI mapping returned empty result');
      return null;
    } catch (error: any) {
      this.logger.error(`AI mapping failed: ${error?.message || error}`);
      return null;
    }
  }

  /**
   * Compute validation, normalization, metrics and final result object
   */
  private computeResultFromMappedData(
    mappedData: Record<string, any> | null,
    vcFields: VcFields,
    processingMethod: 'ai' | 'keyword' | 'hybrid',
    locale: string = 'en',
  ): OcrMappingResult {
    mappedData = mappedData || {};

    // Validate and normalize the mapped data
    const validationResult = this.validateAndNormalize(mappedData, vcFields, locale);

    // Filter to only document fields for metrics calculation
    const documentFieldNames = Object.keys(vcFields).filter(
      fieldName => vcFields[fieldName].document_field !== false
    );

    const presentFields = Object.keys(validationResult.data).filter(
      key =>
        validationResult.data[key] !== null &&
        validationResult.data[key] !== undefined &&
        String(validationResult.data[key]).trim() !== ''
    );
    
    const missingFields = documentFieldNames.filter(key => !presentFields.includes(key));
    
    // Identify missing required document fields (excluding non-document fields)
    const missingRequiredFields = missingFields.filter(fieldName => 
      vcFields[fieldName]?.required === true && vcFields[fieldName]?.document_field !== false
    );
    
    const confidence = documentFieldNames.length > 0 ? Number((presentFields.length / documentFieldNames.length).toFixed(2)) : 0;

    this.logger.log(`Mapping complete: ${presentFields.length}/${documentFieldNames.length} fields (${Math.round(confidence * 100)}% confidence) - Method: ${processingMethod}`);
    
    // Log final mapped data with values
    if (Object.keys(validationResult.data).length > 0) {
      this.logger.log(`✅ Final mapped data after validation (${Object.keys(validationResult.data).length} fields):`);
      Object.entries(validationResult.data).forEach(([field, value]) => {
        const fieldType = typeof value;
        const displayValue = value === null || value === undefined 
          ? 'null' 
          : fieldType === 'object' 
            ? JSON.stringify(value).substring(0, 100) + (JSON.stringify(value).length > 100 ? '...' : '')
            : String(value).substring(0, 100) + (String(value).length > 100 ? '...' : '');
        this.logger.log(`  ✓ ${field} [${fieldType}]: ${displayValue}`);
      });
    } else {
      this.logger.warn('⚠️ No fields successfully mapped after validation');
    }
    
    if (missingRequiredFields.length > 0) {
      this.logger.warn(`Missing ${missingRequiredFields.length} required field(s): [${missingRequiredFields.join(', ')}]`);
    }

    // Log validation errors if any
    if (validationResult.validationErrors.length > 0) {
      this.logger.error(`❌ Validation failed for ${validationResult.validationErrors.length} field(s):`);
      validationResult.validationErrors.forEach(err => {
        this.logger.error(`  ✗ ${err.field}: ${err.error} [constraint: ${err.constraint}]`);
      });
    }

    return {
      mapped_data: validationResult.data,
      missing_fields: missingFields,
      confidence,
      processing_method: processingMethod,
      warnings: validationResult.warnings,
      validationErrors: validationResult.validationErrors.length > 0 ? validationResult.validationErrors : undefined,
    };
  }


  /**
   * Convert vcFields to JSON schema format
   */
  private vcFieldsToSchema(vcFields: VcFields): Record<string, any> {
    const properties: Record<string, any> = {};
    
    for (const [fieldName, fieldConfig] of Object.entries(vcFields)) {
      // Skip fields that are not document fields (document_field: false)
      // Default to true if document_field is not specified
      const isDocumentField = fieldConfig.document_field !== false;
      
      if (!isDocumentField) {
        this.logger.debug(`Skipping non-document field: ${fieldName} (role: ${fieldConfig.role || 'N/A'})`);
        continue;
      }

      const propertySchema: Record<string, any> = {
        type: fieldConfig.type || 'string',
        description: fieldConfig.description || fieldName.replaceAll('_', ' '),
      };

      // Add validation constraints to help AI understand requirements
      if (fieldConfig.maxLength) {
        propertySchema.maxLength = fieldConfig.maxLength;
      }
      if (fieldConfig.minLength) {
        propertySchema.minLength = fieldConfig.minLength;
      }
      if (fieldConfig.pattern) {
        propertySchema.pattern = fieldConfig.pattern;
      }
      if (fieldConfig.format) {
        propertySchema.format = fieldConfig.format;
      }
      if (fieldConfig.enum && fieldConfig.enum.length > 0) {
        propertySchema.enum = fieldConfig.enum;
      }

      properties[fieldName] = propertySchema;
    }

    return {
      type: 'object',
      properties,
      additionalProperties: false,
    };
  }




  /**
   * Convert value to the specified type
   */
  private convertValueToType(value: string, type?: string): any {
    if (!value?.trim()) return null;
    
    const trimmedValue = value.trim();
    
    switch (type) {
      case 'number':
      case 'integer': {
        // Remove all non-numeric characters except dots and hyphens
        let numericValue = trimmedValue.replaceAll(/[^\d.-]/g, '');
        
        // Strip leading hyphens - identifiers like OTR numbers should never be negative
        // This handles cases where OCR extracts "-223414178889127" as a negative number
        numericValue = numericValue.replace(/^-+/, '');
        
        // If only hyphens/dots remain after stripping, return null
        if (!numericValue || /^[\s.-]+$/.test(numericValue)) return null;
        
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
  private validateAndNormalize(data: Record<string, any>, vcFields: VcFields, language: string = 'en'): { 
    data: Record<string, any>; 
    warnings: string[]; 
    validationErrors: Array<{ field: string; error: string; constraint: string }>;
  } {
    const warnings: string[] = [];
    const validationErrors: Array<{ field: string; error: string; constraint: string }> = [];
    const normalizedData: Record<string, any> = {};

    // Validate each field
    for (const [fieldName, fieldConfig] of Object.entries(vcFields)) {
      const value = data[fieldName];
      
      if (value !== null && value !== undefined) {
        const validationResult = this.validateAndConvertField(value, fieldName, fieldConfig, language);
        
        if (validationResult.warning) {
          warnings.push(validationResult.warning);
        }

        if (validationResult.validationErrors && validationResult.validationErrors.length > 0) {
          validationErrors.push(...validationResult.validationErrors);
        }
        
        if (validationResult.value !== null) {
          normalizedData[fieldName] = validationResult.value;
        }
      }
    }

    return { data: normalizedData, warnings, validationErrors };
  }  /**
   * Validate and convert a single field value to its correct type
   */
  private validateAndConvertField(
    value: any, 
    fieldName: string, 
    fieldConfig: any,
    language: string = 'en'
  ): { 
    value: any; 
    warning?: string;
    validationErrors?: Array<{ field: string; error: string; constraint: string }>;
  } {
    const validationErrors: Array<{ field: string; error: string; constraint: string }> = [];
    
    // Get validation messages from config
    const validationMessages = fieldConfig.validationMessages?.[language] || fieldConfig.validationMessages?.['en'] || {};

    // Check if value is meaningless (only punctuation/whitespace)
    if (this.isMeaninglessValue(value, fieldConfig.type)) {
      return {
        value: null,
        warning: `Rejected meaningless value "${value}" for field "${fieldName}"`
      };
    }

    // Handle object types directly (like original_vc)
    if (fieldConfig.type === 'object' && typeof value === 'object') {
      return { value };
    }

    // Type validation and coercion for primitive types
    const convertedValue = this.convertValueToType(String(value), fieldConfig.type);
    if (convertedValue === null) {
      return {
        value: null,
        warning: `Failed to convert value "${value}" for field "${fieldName}" to type "${fieldConfig.type}"`
      };
    }

    // Validate constraints on the converted value
    const stringValue = String(convertedValue);

    // Check minLength constraint (for strings)
    if (fieldConfig.minLength && (fieldConfig.type === 'string' || !fieldConfig.type)) {
      if (stringValue.length < fieldConfig.minLength) {
        const errorMessage = validationMessages.minLength || 
          `Field must be at least ${fieldConfig.minLength} characters (found ${stringValue.length})`;
        validationErrors.push({
          field: fieldName,
          error: errorMessage,
          constraint: 'minLength'
        });
      }
    }

    // Check maxLength constraint (for strings)
    if (fieldConfig.maxLength && (fieldConfig.type === 'string' || !fieldConfig.type)) {
      if (stringValue.length > fieldConfig.maxLength) {
        const errorMessage = validationMessages.maxLength || 
          `Field exceeds maximum length of ${fieldConfig.maxLength} characters (found ${stringValue.length})`;
        validationErrors.push({
          field: fieldName,
          error: errorMessage,
          constraint: 'maxLength'
        });
      }
    }

    // Check pattern constraint (regex validation)
    if (fieldConfig.pattern) {
      try {
        const regex = new RegExp(fieldConfig.pattern);
        if (!regex.test(stringValue)) {
          const errorMessage = validationMessages.pattern || 
            `Field does not match required pattern: ${fieldConfig.pattern}`;
          validationErrors.push({
            field: fieldName,
            error: errorMessage,
            constraint: 'pattern'
          });
        }
      } catch (regexError) {
        this.logger.warn(`Invalid regex pattern for field "${fieldName}": ${fieldConfig.pattern}`, regexError);
      }
    }

    // Check enum constraint
    if (fieldConfig.enum && fieldConfig.enum.length > 0) {
      if (!fieldConfig.enum.includes(stringValue)) {
        const errorMessage = validationMessages.enum || 
          `Field must be one of: ${fieldConfig.enum.join(', ')}`;
        validationErrors.push({
          field: fieldName,
          error: errorMessage,
          constraint: 'enum'
        });
      }
    }

    return { 
      value: convertedValue,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined
    };
  }

  /**
   * Check if a value is meaningless (only punctuation, whitespace, or special characters)
   */
  private isMeaninglessValue(value: any, fieldType?: string): boolean {
    if (value === null || value === undefined) return true;
    
    const stringValue = String(value).trim();
    
    // Empty strings are meaningless
    if (stringValue === '') return true;
    
    // For string fields: must contain at least one alphanumeric character
    if (fieldType === 'string' || !fieldType) {
      // Check if value contains only punctuation, whitespace, or special characters
      // Allow hyphens only if they're part of a larger alphanumeric string (e.g., "A-123")
      // Support Unicode letters and numbers (including Hindi/Devanagari, Arabic, Chinese, etc.)
      const hasAlphanumeric = /[\p{L}\p{N}]/u.test(stringValue);
      if (!hasAlphanumeric) {
        return true; // Only punctuation/whitespace
      }
      
      // Reject standalone hyphens or values that are only hyphens with whitespace
      if (/^[\s-]+$/.test(stringValue)) {
        return true;
      }
    }
    
    // For number fields: standalone hyphens are meaningless
    if (fieldType === 'number' || fieldType === 'integer') {
      if (/^[\s.-]+$/.test(stringValue)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  }
}
