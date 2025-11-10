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

      const schema = this.vcFieldsToSchema(vcFields);
      const adapterType = (process.env.OCR_MAPPING_PROVIDER || 'bedrock').toLowerCase();
      this.logger.debug(`OCR mapping provider: ${adapterType}, AI configured: ${this.aiAdapter.isConfigured()}`);

      // Try AI first, then fallback to keywords if needed
      let mappedData: Record<string, any> | null = await this.tryAiMapping(adapterType, input.text, schema);
      let processingMethod: 'ai' | 'keyword' | 'hybrid' = mappedData && Object.keys(mappedData).length > 0 ? 'ai' : 'keyword';

      if (!mappedData || Object.keys(mappedData).length === 0) {
        this.logger.log('Using keyword-based mapping');
        this.logger.debug(`vcFields for keyword mapping: ${JSON.stringify(Object.keys(vcFields))}`);
        mappedData = this.keywordBasedMapping(input.text, vcFields);
        this.logger.debug(`Keyword mapping result: ${JSON.stringify(mappedData)}`);
        processingMethod = processingMethod === 'ai' ? 'hybrid' : 'keyword';
      }

      return this.computeResultFromMappedData(mappedData, vcFields, processingMethod);

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
  private async tryAiMapping(adapterType: string, text: string, schema: Record<string, any>): Promise<Record<string, any> | null> {
    if (!((adapterType === 'bedrock' || adapterType === 'google-gemini') && this.aiAdapter.isConfigured())) {
      this.logger.log(`Skipping AI mapping - adapter: ${adapterType}, configured: ${this.aiAdapter.isConfigured()}`);
      return null;
    }

    try {
      this.logger.log(`Attempting AI-based mapping using ${adapterType}`);
      this.logger.debug(`Schema being sent to AI: ${JSON.stringify(schema, null, 2)}`);
      const mappedData = await this.aiAdapter.mapTextToSchema(text, schema);
      this.logger.debug(`AI raw response: ${JSON.stringify(mappedData)}`);

      // Check if the response is the full AI response object instead of parsed JSON
      if (mappedData && typeof mappedData === 'object' && ('generation' in mappedData || 'content' in mappedData)) {
        this.logger.warn('AI returned full response object instead of parsed JSON, attempting to extract');
        return null;
      }

      if (mappedData && Object.keys(mappedData).length > 0) {
        this.logger.log(`AI mapping successful - extracted ${Object.keys(mappedData).length} fields`);
        return mappedData;
      }

      this.logger.warn('AI mapping returned empty or null result');
      return null;
    } catch (error: any) {
      this.logger.error(`AI mapping failed: ${error?.message || error}`, error?.stack);
      this.logger.warn(`Falling back to keyword mapping`);
      return null;
    }
  }

  /**
   * Compute validation, normalization, metrics and final result object
   */
  private computeResultFromMappedData(
    mappedData: Record<string, any> | null,
    vcFields: VcFields,
    processingMethod: 'ai' | 'keyword' | 'hybrid'
  ): OcrMappingResult {
    mappedData = mappedData || {};

    // Validate and normalize the mapped data
    const validationResult = this.validateAndNormalize(mappedData, vcFields);

    // Calculate confidence and missing fields
    const fieldNames = Object.keys(vcFields);
    const presentFields = Object.keys(validationResult.data).filter(
      key =>
        validationResult.data[key] !== null &&
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
      
      if (value === null) {
        this.logger.debug(`✗ Failed to extract ${fieldName}`);
      } else {
        this.logger.debug(`✓ Extracted ${fieldName}: "${value}"`);
        result[fieldName] = value;
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
        // Pattern: "field: value" - value until newline or next colon (most specific)
        new RegExp(`${this.escapeRegex(synonym)}\\s*:\\s*([A-Za-z0-9][^:\\n\\r]{0,50}?)(?=\\s*(?:[A-Z][a-z]+\\s*:|\\n|$))`, 'i'),
        // Pattern: "field - value" - value until newline or next dash
        new RegExp(`${this.escapeRegex(synonym)}\\s*-\\s*([A-Za-z0-9][^\\-\\n\\r]{0,50}?)(?=\\s*(?:[A-Z][a-z]+\\s*[-:]|\\n|$))`, 'i'),
        // Pattern: "field: value" - simpler version without lookahead
        new RegExp(`${this.escapeRegex(synonym)}\\s*:\\s*([A-Za-z0-9][^:\\n\\r]{0,50}?)\\s*(?:\\n|$)`, 'i'),
        // Pattern: "field" followed by value on next line
        new RegExp(`${this.escapeRegex(synonym)}\\s*\\n+\\s*([A-Za-z0-9][^\\n\\r]{0,50})`, 'i'),
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
          if (isValid === true) {
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
      .replaceAll(/[^\w\s./-]/g, ' ') // Remove special chars except basic ones
      .replaceAll(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Validate if extracted value is reasonable for the field
   */
  private isValidExtractedValue(value: string, fieldName: string, fieldType?: string): boolean {
    if (!value || value.length < 1 || value.length > 100) {
      return false;
    }
    
    // Reject values that are mostly punctuation or symbols
    const alphanumericRatio = (value.match(/[a-zA-Z0-9]/g) || []).length / value.length;
    if (alphanumericRatio < 0.2) {
      return false;
    }
    
    const lowerValue = value.toLowerCase().trim();
    
    // Check if value looks like a field label
    if (this.looksLikeFieldLabel(lowerValue)) {
      return false;
    }
    
    // Validate based on field type
    return this.validateByFieldType(value, fieldName, fieldType);
  }

  /**
   * Check if value looks like a field label rather than actual data
   */
  private looksLikeFieldLabel(lowerValue: string): boolean {
    const rejectPatterns = [
      /^[^a-zA-Z0-9]*$/,
      /^[\s:-]*$/,
      /^(enter|fill|write|type|click|select)/i,
    ];
    
    if (rejectPatterns.some(pattern => pattern.test(lowerValue))) {
      return true;
    }
    
    // Check for field label suffixes
    if (lowerValue.endsWith(' no.') || lowerValue.endsWith(' no') || 
        lowerValue.endsWith(' number') || lowerValue.endsWith(':') ||
        lowerValue.includes(' id:') || lowerValue.includes(' no:')) {
      return true;
    }
    
    // Check common field label patterns
    const labelPatterns = [
      /^(name|date|gender|mobile|phone|email|address|city|state|country|pincode|zip)\s*(no\.?|number|id)?$/i,
      /\b(aadhaar|aadhar|pan|voter|passport)\s*(no\.?|number|id)?$/i,
      /^(father|mother|guardian|spouse)'?s?\s*name$/i,
    ];
    
    return labelPatterns.some(pattern => pattern.test(lowerValue));
  }

  /**
   * Validate value based on field type and name
   */
  private validateByFieldType(value: string, fieldName: string, fieldType?: string): boolean {
    if (fieldName.includes('name') && fieldType === 'string') {
      if (!/[a-zA-Z]/.test(value) || value.length < 2) {
        return false;
      }
      const namePattern = /^[a-zA-Z0-9\s.'\-/]{2,100}$/;
      return namePattern.test(value);
    }
    
    if (fieldType === 'number' || fieldType === 'integer') {
      return /\d/.test(value);
    }
    
    if (fieldType === 'string') {
      return value.length >= 1 && /[a-zA-Z0-9]/.test(value);
    }
    
    return true;
  }

  /**
   * Extract numeric values using configurable patterns based on field synonyms
   */
  private extractNumericValue(text: string, fieldName: string): number | null {
    const synonyms = getFieldSynonyms(fieldName.toLowerCase());
    
    // Try pattern-based extraction first
    const patternResult = this.extractWithNumericPatterns(text, synonyms);
    if (patternResult !== null) {
      return patternResult;
    }
    
    // Fallback to proximity-based extraction
    return this.extractNearSynonyms(text, synonyms);
  }

  /**
   * Extract numeric value using predefined patterns
   */
  private extractWithNumericPatterns(text: string, synonyms: string[]): number | null {
    const numericPatterns = [
      { pattern: /(\d{1,3}(?:\.\d{1,2})?)\s*%/, range: [0, 100] as [number, number], suffix: '%' },
      { pattern: /(\d{1,2}(?:\.\d{1,2})?)/, range: [0, 10] as [number, number], suffix: '' },
      { pattern: /(\d{1,4})/, range: [0, 10000] as [number, number], suffix: '' }
    ];
    
    for (const synonym of synonyms) {
      const result = this.tryPatternMatching(text, synonym, numericPatterns);
      if (result !== null) {
        return result;
      }
    }
    
    return null;
  }

  /**
   * Try pattern matching for a specific synonym
   */
  private tryPatternMatching(text: string, synonym: string, patterns: Array<{pattern: RegExp, range: [number, number], suffix: string}>): number | null {
    const escapedSynonym = this.escapeRegex(synonym);
    
    for (const { pattern, range, suffix } of patterns) {
      const suffixPattern = suffix ? String.raw`\s*` + this.escapeRegex(suffix) : '';
      const fullPattern = new RegExp(
        String.raw`${escapedSynonym}\s*:?\s*${pattern.source}${suffixPattern}`,
        'i'
      );
      
      const match = fullPattern.exec(text);
      if (match?.[1]) {
        const value = Number.parseFloat(match[1]);
        if (this.isValueInRange(value, range)) {
          return value;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract numeric value by looking near synonyms
   */
  private extractNearSynonyms(text: string, synonyms: string[]): number | null {
    for (const synonym of synonyms) {
      const synonymIndex = text.toLowerCase().indexOf(synonym.toLowerCase());
      if (synonymIndex !== -1) {
        const result = this.extractNumberFromProximity(text, synonymIndex);
        if (result !== null) {
          return result;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract number from text near a specific index
   */
  private extractNumberFromProximity(text: string, index: number): number | null {
    const searchText = text.slice(index, index + 50);
    const numberPattern = /(\d+(?:\.\d+)?)/;
    const numberMatch = numberPattern.exec(searchText);
    
    if (numberMatch) {
      const value = Number.parseFloat(numberMatch[1]);
      if (this.isValueInRange(value, [0, 10000])) {
        return value;
      }
    }
    
    return null;
  }

  /**
   * Check if value is within specified range
   */
  private isValueInRange(value: number, range: [number, number]): boolean {
    return Number.isFinite(value) && value >= range[0] && value <= range[1];
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
        const numericValue = trimmedValue.replaceAll(/[^\d.-]/g, '');
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
      
      if (value !== null && value !== undefined) {
        // Type validation and coercion
        const coercedValue = this.coerceValue(String(value), fieldConfig.type);
        if (coercedValue === null) {
          warnings.push(`Failed to coerce value "${value}" for field "${fieldName}" to type "${fieldConfig.type}"`);
        } else {
          normalizedData[fieldName] = coercedValue;
        }
      }
    }

    return { data: normalizedData, warnings };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  }
}
