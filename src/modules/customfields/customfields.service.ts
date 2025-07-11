import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Field, FieldType, FieldContext } from '@entities/field.entity';
import { FieldValue } from '@entities/field-value.entity';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { CreateFieldValueDto } from './dto/create-field-value.dto';
import { QueryFieldsDto } from './dto/query-fields.dto';

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(Field)
    private readonly fieldRepository: Repository<Field>,
    @InjectRepository(FieldValue)
    private readonly fieldValueRepository: Repository<FieldValue>,
  ) {}

  async createField(createFieldDto: CreateFieldDto): Promise<Field> {
    const field = this.fieldRepository.create(createFieldDto);
    return await this.fieldRepository.save(field);
  }

  async findAllFields(queryDto: QueryFieldsDto = {}): Promise<Field[]> {
    const queryBuilder = this.fieldRepository.createQueryBuilder('field');

    if (queryDto.context) {
      queryBuilder.andWhere('field.context = :context', { context: queryDto.context });
    }

    if (queryDto.contextType) {
      queryBuilder.andWhere('field.contextType = :contextType', { contextType: queryDto.contextType });
    }

    if (queryDto.type) {
      queryBuilder.andWhere('field.type = :type', { type: queryDto.type });
    }

    if (queryDto.isRequired !== undefined) {
      queryBuilder.andWhere('field.isRequired = :isRequired', { isRequired: queryDto.isRequired });
    }

    if (queryDto.isHidden !== undefined) {
      queryBuilder.andWhere('field.isHidden = :isHidden', { isHidden: queryDto.isHidden });
    }

    queryBuilder.orderBy('field.ordering', 'ASC');
    queryBuilder.addOrderBy('field.createdAt', 'ASC');

    return await queryBuilder.getMany();
  }

  async findFieldById(fieldId: string): Promise<Field> {
    const field = await this.fieldRepository.findOne({ where: { fieldId } });
    if (!field) {
      throw new NotFoundException(`Field with ID ${fieldId} not found`);
    }
    return field;
  }

  async updateField(fieldId: string, updateFieldDto: UpdateFieldDto): Promise<Field> {
    const field = await this.findFieldById(fieldId);
    Object.assign(field, updateFieldDto);
    return await this.fieldRepository.save(field);
  }

  async deleteField(fieldId: string): Promise<void> {
    const field = await this.findFieldById(fieldId);
    await this.fieldRepository.remove(field);
  }

  async createOrUpdateFieldValues(createFieldValueDto: CreateFieldValueDto): Promise<FieldValue[]> {
    const { itemId, fields } = createFieldValueDto;
    const results: FieldValue[] = [];

    for (const fieldItem of fields) {
      const { fieldId, value } = fieldItem;

      // Validate that the field exists
      const field = await this.findFieldById(fieldId);
      
      // Validate value based on field type
      this.validateFieldValue(field, value);

      // Check if field value already exists
      let fieldValue = await this.fieldValueRepository.findOne({
        where: { fieldId, itemId },
      });

      if (fieldValue) {
        // Update existing value
        fieldValue.value = value;
        fieldValue = await this.fieldValueRepository.save(fieldValue);
      } else {
        // Create new value
        fieldValue = this.fieldValueRepository.create({
          fieldId,
          itemId,
          value,
        });
        fieldValue = await this.fieldValueRepository.save(fieldValue);
      }

      results.push(fieldValue);
    }

    return results;
  }

  async getFieldValuesByItemId(itemId: string): Promise<FieldValue[]> {
    return await this.fieldValueRepository.find({
      where: { itemId },
      relations: ['field'],
      order: { field: { ordering: 'ASC' } },
    });
  }

  async getEntityWithCustomFields(itemId: string, context: FieldContext): Promise<any> {
    // Get all fields for the context
    const fields = await this.findAllFields({ context });
    
    // Get field values for the item
    const fieldValues = await this.getFieldValuesByItemId(itemId);
    
    // Create a map of field values by fieldId
    const fieldValuesMap = new Map();
    fieldValues.forEach(fv => {
      fieldValuesMap.set(fv.fieldId, fv.value);
    });

    // Combine fields with their values
    const customFields = fields.map(field => ({
      fieldId: field.fieldId,
      name: field.name,
      label: field.label,
      type: field.type,
      context: field.context,
      contextType: field.contextType,
      fieldParams: field.fieldParams,
      fieldAttributes: field.fieldAttributes,
      sourceDetails: field.sourceDetails,
      dependsOn: field.dependsOn,
      ordering: field.ordering,
      isRequired: field.isRequired,
      isHidden: field.isHidden,
      value: fieldValuesMap.get(field.fieldId) || null,
    }));

    return {
      itemId,
      customFields,
    };
  }

  async deleteFieldValue(fieldId: string, itemId: string): Promise<void> {
    const fieldValue = await this.fieldValueRepository.findOne({
      where: { fieldId, itemId },
    });

    if (!fieldValue) {
      throw new NotFoundException(`Field value not found for field ${fieldId} and item ${itemId}`);
    }

    await this.fieldValueRepository.remove(fieldValue);
  }

  async deleteAllFieldValuesForItem(itemId: string): Promise<void> {
    await this.fieldValueRepository.delete({ itemId });
  }

  private validateFieldValue(field: Field, value: string): void {
    if (!value && field.isRequired) {
      throw new BadRequestException(`Field ${field.label} is required`);
    }

    if (!value) return; // Skip validation for empty values

    switch (field.type) {
      case FieldType.NUMERIC:
      case FieldType.CURRENCY:
      case FieldType.PERCENT:
      case FieldType.RATING:
        if (isNaN(Number(value))) {
          throw new BadRequestException(`Field ${field.label} must be a valid number`);
        }
        break;

      case FieldType.DATE:
        if (isNaN(Date.parse(value))) {
          throw new BadRequestException(`Field ${field.label} must be a valid date`);
        }
        break;

      case FieldType.DATETIME:
        if (isNaN(Date.parse(value))) {
          throw new BadRequestException(`Field ${field.label} must be a valid datetime`);
        }
        break;

      case FieldType.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new BadRequestException(`Field ${field.label} must be a valid email address`);
        }
        break;

      case FieldType.URL:
        try {
          new URL(value);
        } catch {
          throw new BadRequestException(`Field ${field.label} must be a valid URL`);
        }
        break;

      case FieldType.DROP_DOWN:
      case FieldType.RADIO:
        if (field.fieldParams?.options) {
          const validOptions = field.fieldParams.options.map((opt: any) => opt.value);
          if (!validOptions.includes(value)) {
            throw new BadRequestException(`Field ${field.label} value must be one of: ${validOptions.join(', ')}`);
          }
        }
        break;

      case FieldType.MULTI_SELECT:
      case FieldType.CHECKBOX:
        if (field.fieldParams?.options) {
          const validOptions = field.fieldParams.options.map((opt: any) => opt.value);
          const selectedValues = JSON.parse(value);
          if (!Array.isArray(selectedValues)) {
            throw new BadRequestException(`Field ${field.label} must be an array of values`);
          }
          const invalidValues = selectedValues.filter(v => !validOptions.includes(v));
          if (invalidValues.length > 0) {
            throw new BadRequestException(`Field ${field.label} contains invalid values: ${invalidValues.join(', ')}`);
          }
        }
        break;

      case FieldType.JSON:
        try {
          JSON.parse(value);
        } catch {
          throw new BadRequestException(`Field ${field.label} must be valid JSON`);
        }
        break;
    }
  }

  async searchByCustomFields(context: FieldContext, filters: any): Promise<string[]> {
    const queryBuilder = this.fieldValueRepository
      .createQueryBuilder('fv')
      .innerJoin('fv.field', 'field')
      .where('field.context = :context', { context })
      .select('fv.itemId');

    for (const [fieldName, fieldValue] of Object.entries(filters)) {
      const field = await this.fieldRepository.findOne({
        where: { name: fieldName, context },
      });

      if (field) {
        queryBuilder.andWhere('fv.fieldId = :fieldId AND fv.value = :value', {
          fieldId: field.fieldId,
          value: fieldValue,
        });
      }
    }

    const results = await queryBuilder.getRawMany();
    return results.map(result => result.fv_itemId);
  }
} 
