import { Injectable, Logger } from '@nestjs/common';
import { AdminService } from '@modules/admin/admin.service';

export type VcFields = Record<string, { 
  type?: 'string' | 'number' | 'boolean' | 'integer';
  required?: boolean;
  description?: string;
}>;

/**
 * Service for managing vcFields configuration
 * Provides common methods to fetch and process vcFields from settings
 */
@Injectable()
export class VcFieldsService {
  private readonly logger = new Logger(VcFieldsService.name);

  constructor(private readonly adminService: AdminService) {}

  /**
   * Get vcFields configuration for a document type
   * @param docType - Document type (e.g., 'certificate')
   * @param docSubType - Document subtype (e.g., 'marksheet')
   * @returns VcFields configuration or null if not found
   */
  async getVcFields(docType: string, docSubType: string): Promise<VcFields | null> {
    try {
      this.logger.debug(`Fetching vcFields for docType: ${docType}, docSubType: ${docSubType}`);
      
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
      const matchingConfig = configValue.find((config: any) => 
        config.docType === docType && config.documentSubType === docSubType
      );

      if (!matchingConfig) {
        this.logger.warn(`No matching configuration found for docType: ${docType}, documentSubType: ${docSubType}`);
        return null;
      }

      // Parse vcFields if it's a string
      const vcFields = typeof matchingConfig.vcFields === 'string'
        ? JSON.parse(matchingConfig.vcFields)
        : matchingConfig.vcFields;

      if (!vcFields || typeof vcFields !== 'object') {
        this.logger.warn('vcFields is not a valid object');
        return null;
      }

      this.logger.debug(`Successfully resolved vcFields with ${Object.keys(vcFields).length} fields`);
      return vcFields as VcFields;

    } catch (error: any) {
      this.logger.error(`Failed to resolve vcFields: ${error?.message || error}`);
      throw new Error(`Failed to resolve vcFields: ${error?.message || error}`);
    }
  }

  /**
   * Convert vcFields to JSON schema format for AI processing
   * @param vcFields - VcFields configuration
   * @returns JSON schema object
   */
  vcFieldsToSchema(vcFields: VcFields): Record<string, any> {
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
   * Get field names from vcFields configuration
   * @param vcFields - VcFields configuration
   * @returns Array of field names
   */
  getFieldNames(vcFields: VcFields): string[] {
    return Object.keys(vcFields);
  }

  /**
   * Check if a field is required in vcFields configuration
   * @param vcFields - VcFields configuration
   * @param fieldName - Field name to check
   * @returns True if field is required
   */
  isFieldRequired(vcFields: VcFields, fieldName: string): boolean {
    return vcFields[fieldName]?.required === true;
  }

  /**
   * Get field type from vcFields configuration
   * @param vcFields - VcFields configuration
   * @param fieldName - Field name to get type for
   * @returns Field type or 'string' as default
   */
  getFieldType(vcFields: VcFields, fieldName: string): string {
    return vcFields[fieldName]?.type || 'string';
  }
}
