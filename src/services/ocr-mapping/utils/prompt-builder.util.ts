/**
 * Common prompt builder utility for AI-based OCR text mapping
 */
export class PromptBuilderUtil {
  /**
   * Build a standardized prompt for AI models to map extracted text to JSON schema
   * @param extractedText - Raw text extracted from document
   * @param schema - Target JSON schema for mapping
   * @param docType - Optional document type for context-specific instructions
   * @returns Formatted prompt string
   */
  static buildMappingPrompt(
    extractedText: string, 
    schema: Record<string, any>, 
    docType?: string
  ): string {
    const contextualInstructions = this.getContextualInstructions(docType);
    
    return [
      'You are a helpful assistant that extracts and maps data from extracted text to a JSON schema.',
      '',
      'Extracted text from document:',
      extractedText,
      '',
      'Target JSON schema:',
      JSON.stringify(schema, null, 2),
      '',
      'Instructions:',
      '1. Analyze the extracted text carefully and identify the document type and structure',
      '2. Map the values from the text to the corresponding fields in the schema',
      '3. For numeric fields (amounts, percentages, numbers), extract numbers and convert to appropriate numeric types',
      '4. For text fields (names, addresses, descriptions), extract the corresponding text values exactly as they appear',
      '5. For date fields, preserve the format as it appears in the document (DD/MM/YYYY, MM/DD/YYYY, etc.)',
      '6. Look for common document patterns and field labels (case-insensitive matching)',
      '7. Handle variations in field names and labels (e.g., "Name", "Full Name", "Candidate Name")',
      '8. If a field cannot be found in the text, use null for that field',
      '9. Be precise and only extract data that is clearly present in the text',
      '10. Pay attention to document-specific terminology and formatting',
      ...contextualInstructions,
      '',
      'CRITICAL INSTRUCTIONS FOR RESPONSE FORMAT:',
      '- Return ONLY valid JSON - no explanatory text, no markdown, no code blocks',
      '- Do NOT wrap the JSON in ```json``` or ``` code blocks',
      '- Do NOT include phrases like "Here is the JSON object:" or similar',
      '- Start your response directly with { and end with }',
      '- No prefix, no suffix, no explanation - just the raw JSON object',
      '- Example of correct format: {"field1": "value1", "field2": "value2"}',
      '',
      'Return the mapped JSON object:',
    ].join('\n');
  }

  /**
   * Get contextual instructions based on document type
   * @param docType - Document type
   * @returns Array of contextual instructions
   */
  private static getContextualInstructions(docType?: string): string[] {
    if (!docType) {
      return [];
    }

    const normalizedDocType = docType.toLowerCase();
    
    const contextualInstructions: Record<string, string[]> = {
      'marksheet': [
        '11. Look for academic patterns like "Student Name:", "Roll No:", "Marks Obtained:", "Grade:", etc.',
        '12. Handle tabular data for subjects and marks',
        '13. Extract CGPA, percentage, and grade information accurately'
      ],
      'income certificate': [
        '11. Focus on income-related fields like "Annual Income:", "Monthly Income:", "Family Income"',
        '12. Extract issuing authority and certificate validity information',
        '13. Look for applicant details and family information'
      ],
      'caste certificate': [
        '11. Extract caste/community information and category details',
        '12. Look for issuing authority and certificate validity',
        '13. Focus on applicant personal details and family information'
      ],
      'udid certificate': [
        '11. Extract disability-related information and UDID number',
        '12. Look for disability type and percentage',
        '13. Focus on personal details and issuing authority information'
      ],
      'enrollment certificate': [
        '11. Extract enrollment details like enrollment number, course, institution',
        '12. Look for academic year and session information',
        '13. Focus on student details and institutional information'
      ],
      'bank account': [
        '11. Extract account details like account number, IFSC code, bank name',
        '12. Look for account holder information and account type',
        '13. Focus on banking details and customer information'
      ],
      'fee receipt': [
        '11. Extract payment details like amount, receipt number, payment date',
        '12. Look for fee breakdown and payment method',
        '13. Focus on student/payer details and institutional information'
      ],
      'payment receipt': [
        '11. Extract payment details like amount, receipt number, transaction ID',
        '12. Look for payment date, method, and purpose',
        '13. Focus on payer details and payment breakdown'
      ],
      'declaration certificate': [
        '11. Extract declaration details and purpose of declaration',
        '12. Look for declarant information and witness details',
        '13. Focus on legal/official declaration content'
      ]
    };

    return contextualInstructions[normalizedDocType] || [];
  }
}
