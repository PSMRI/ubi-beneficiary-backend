import { Injectable, Logger } from '@nestjs/common';
import { AdminService } from '@modules/admin/admin.service';

/**
 * Document Configuration Interface with pre-validation settings
 */
export interface DocumentValidationConfig {
  name: string;
  label: string;
  docType: string;
  documentSubType: string;
  issueVC: string;
  preValidationEnabled?: string; // "yes" or "no"
  preValidationRequiredKeywords?: string[]; // Keywords that must be present for valid document
  preValidationExclusionKeywords?: string[]; // Keywords that indicate invalid document
  [key: string]: any; // Allow other fields
}

/**
 * Document Validation Result
 */
export interface DocumentValidationResult {
  isValid: boolean;
  reason?: string; // Reason for validation failure
  matchedKeywords?: string[]; // Keywords that were matched
}

/**
 * Service for keyword-based document validation
 * Validates documents based on preValidation configuration in vcConfiguration
 */
@Injectable()
export class DocumentValidationService {
  private readonly logger = new Logger(DocumentValidationService.name);

  constructor(private readonly adminService: AdminService) { }

  /**
   * Validate document based on keyword matching
   * @param extractedText - Text extracted from document via OCR
   * @param docType - Document type
   * @param docSubType - Document subtype
   * @returns Validation result with isValid flag and reason
   */
  async validateDocument(
    extractedText: string,
    docType: string,
    docSubType: string,
  ): Promise<DocumentValidationResult> {
    try {
      // Get document configuration
      const config = await this.getDocumentConfig(docType, docSubType);

      if (!config) {
        this.logger.warn(
          `No configuration found for docType: ${docType}, docSubType: ${docSubType}. Skipping validation.`,
        );
        return { isValid: true }; // If no config, allow document
      }

      // Check if pre-validation is enabled
      const preValidationEnabled = config.preValidationEnabled?.toLowerCase() === 'yes';

      if (!preValidationEnabled) {
        this.logger.log(
          `Pre-validation disabled for ${docType}/${docSubType}. Skipping keyword validation.`,
        );
        return { isValid: true };
      }

      this.logger.log(
        `Pre-validation enabled for ${docType}/${docSubType}. Performing keyword validation.`,
      );

      // Normalize extracted text for case-insensitive matching
      // Also normalize whitespace: convert newlines, tabs, multiple spaces to single space
      const normalizedText = extractedText
        .toLowerCase()
        .replaceAll('\n', ' ')  // Convert newlines to spaces
        .replaceAll('\r', ' ')  // Convert carriage returns to spaces
        .replaceAll('\t', ' ')  // Convert tabs to spaces
        // eslint-disable-next-line unicorn/prefer-string-replace-all
        .replace(/\s+/g, ' ')   // Convert multiple spaces to single space
        .trim();

      // Log a sample of the normalized text for debugging
      const textSample = normalizedText.substring(0, 200);
      this.logger.debug(
        `Normalized text sample (first 200 chars): "${textSample}..."`,
      );

      // Check exclusion keywords first (if present, document isextractedText invalid)
      if (config.preValidationExclusionKeywords && config.preValidationExclusionKeywords.length > 0) {
        this.logger.debug(
          `Checking ${config.preValidationExclusionKeywords.length} exclusion keyword(s): [${config.preValidationExclusionKeywords.join(', ')}]`,
        );

        const matchedExclusionKeywords = config.preValidationExclusionKeywords.filter((keyword) => {
          const normalizedKeyword = keyword.toLowerCase();
          const isFound = normalizedText.includes(normalizedKeyword);
          this.logger.debug(`  - Exclusion keyword "${keyword}" (normalized: "${normalizedKeyword}"): ${isFound ? 'FOUND ❌' : 'not found ✓'}`);
          return isFound;
        });

        if (matchedExclusionKeywords.length > 0) {
          this.logger.warn(
            `Document validation FAILED: Found exclusion keyword(s): ${matchedExclusionKeywords.join(', ')}`,
          );
          return {
            isValid: false,
            reason: `Document contains exclusion keyword(s): ${matchedExclusionKeywords.join(', ')}`,
            matchedKeywords: matchedExclusionKeywords,
          };
        }

        this.logger.debug(`No exclusion keywords found ✓`);
      }

      // Check required keywords (at least one must be present)
      if (config.preValidationRequiredKeywords && config.preValidationRequiredKeywords.length > 0) {
        this.logger.debug(
          `Checking ${config.preValidationRequiredKeywords.length} required keyword(s): [${config.preValidationRequiredKeywords.join(', ')}]`,
        );

        const matchedRequiredKeywords = config.preValidationRequiredKeywords.filter((keyword) => {
          const normalizedKeyword = keyword.toLowerCase();
          const isFound = normalizedText.includes(normalizedKeyword);
          this.logger.debug(`  - Required keyword "${keyword}" (normalized: "${normalizedKeyword}"): ${isFound ? 'FOUND ✓' : 'NOT FOUND ❌'}`);
          return isFound;
        });

        if (matchedRequiredKeywords.length === 0) {
          this.logger.warn(
            `Document validation FAILED: None of the required keywords found. Expected: ${config.preValidationRequiredKeywords.join(', ')}. ` +
            `Text sample: "${textSample}..."`,
          );
          return {
            isValid: false,
            reason: `Document does not contain any of the required keywords: ${config.preValidationRequiredKeywords.join(', ')}`,
            matchedKeywords: [],
          };
        }

        this.logger.log(
          `Document validation PASSED: Found required keyword(s): ${matchedRequiredKeywords.join(', ')} (matched ${matchedRequiredKeywords.length}/${config.preValidationRequiredKeywords.length})`,
        );
        return {
          isValid: true,
          matchedKeywords: matchedRequiredKeywords,
        };
      }

      // If no keywords configured, allow document
      this.logger.log(
        `No validation keywords configured for ${docType}/${docSubType}. Allowing document.`,
      );
      return { isValid: true };
    } catch (error: any) {
      this.logger.error(
        `Document validation error: ${error?.message || error}`,
        error.stack,
      );
      // On error, allow document to proceed (fail-open approach)
      return { isValid: true };
    }
  }

  /**
 * Perform post-validation on mapped document data using vcConfiguration
 * @param mappedData - Mapped document fields
 * @param docType - Document type
 * @param docSubType - Document subtype
 * @returns Validation result
 */

  async validatePostValidation(
    mappedData: Record<string, any>,
    docType: string,
    docSubType: string,
  ): Promise<{ isValid: boolean; reason?: string }> {
    try {
      const config = await this.getDocumentConfig(docType, docSubType);

      if (!config) {
        this.logger.warn(
          `No configuration found for docType: ${docType}, docSubType: ${docSubType}. Skipping post-validation.`,
        );
        return { isValid: true };
      }

      const postValidationEnabled =
        config.postValidationEnabled?.toLowerCase() === 'yes';

      if (!postValidationEnabled) {
        this.logger.log(
          `Post-validation disabled for ${docType}/${docSubType}. Skipping field validation.`,
        );
        return { isValid: true };
      }

      this.logger.log(
        `Post-validation enabled for ${docType}/${docSubType}. Performing mapped field validation.`,
      );

      const requiredFields: string[] =
        config.postValidationRequiredFields || [];

      const minRequiredRaw = config.postValidationFieldMappingNumbers;

      // Determine minimum required fields
      let minRequired =
        typeof minRequiredRaw === 'number' && minRequiredRaw > 0
          ? minRequiredRaw
          : requiredFields.length;

      // Configuration sanity check
      if (minRequired > requiredFields.length) {
        minRequired = requiredFields.length;
      }

      // Count matched fields
      let matchedCount = 0;

      for (const field of requiredFields) {
        if (
          mappedData?.mapped_data &&
          field in mappedData.mapped_data &&
          mappedData.mapped_data[field] != null
        ) {
          matchedCount++;
        }
      }

      if (matchedCount < minRequired) {
        this.logger.warn(
          `Post-validation FAILED: Only ${matchedCount}/${minRequired} required fields present.`,
        );
        return {
          isValid: false,
          reason: `Document does not contain minimum required mapped fields (${matchedCount}/${minRequired})`,
        };
      }

      this.logger.log(
        `Post-validation PASSED: ${matchedCount}/${minRequired} required mapped fields present.`,
      );

      return { isValid: true };
    } catch (error: any) {
      this.logger.error(
        `Post-validation error: ${error?.message || error}`,
        error.stack,
      );

      // Fail-open
      return { isValid: true };
    }
  }

  /**
   * Get document configuration from vcConfiguration
   * @param docType - Document type
   * @param docSubType - Document subtype
   * @returns Document configuration or null if not found
   */
  private async getDocumentConfig(
    docType: string,
    docSubType: string,
  ): Promise<DocumentValidationConfig | null> {
    try {
      const vcConfig = await this.adminService.getConfigByKey('vcConfiguration');

      if (!vcConfig?.value) {
        this.logger.warn('vcConfiguration not found in settings');
        return null;
      }

      // Handle both array and JSON string formats
      const configValue = Array.isArray(vcConfig.value)
        ? vcConfig.value
        : JSON.parse(vcConfig.value);

      if (!Array.isArray(configValue)) {
        this.logger.warn('vcConfiguration is not an array');
        return null;
      }

      // Find matching configuration
      const matchingConfig = configValue.find(
        (config: any) =>
          config.docType === docType && config.documentSubType === docSubType,
      );

      if (!matchingConfig) {
        this.logger.warn(
          `No matching configuration found for docType: ${docType}, documentSubType: ${docSubType}`,
        );
        return null;
      }

      return matchingConfig as DocumentValidationConfig;
    } catch (error: any) {
      this.logger.error(
        `Failed to get document configuration: ${error?.message || error}`,
        error.stack,
      );
      return null;
    }
  }
}

