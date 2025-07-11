import { FieldType, FieldContext } from '@entities/field.entity';

export interface CustomFieldValue {
  fieldId: string;
  value: string;
}

export interface CustomFieldDefinition {
  fieldId: string;
  name?: string;
  label: string;
  type: FieldType;
  context: FieldContext;
  contextType?: string;
  fieldParams?: any;
  fieldAttributes?: any;
  sourceDetails?: any;
  dependsOn?: any;
  ordering: number;
  isRequired: boolean;
  isHidden: boolean;
  value?: string | null;
}

export interface EntityWithCustomFields {
  itemId: string;
  customFields: CustomFieldDefinition[];
}

export interface CreateCustomFieldValueDto {
  itemId: string;
  fields: CustomFieldValue[];
}

export interface CustomFieldFilter {
  [fieldName: string]: string | number | boolean;
} 