import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CustomFieldsService } from './customfields.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { CreateFieldValueDto } from './dto/create-field-value.dto';
import { QueryFieldsDto } from './dto/query-fields.dto';
import { Field, FieldContext } from '@entities/field.entity';
import { FieldValue } from '@entities/field-value.entity';

@ApiTags('customfields')
@Controller('fields')
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new custom field' })
  @ApiResponse({
    status: 201,
    description: 'Custom field created successfully',
    type: Field,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async createField(@Body() createFieldDto: CreateFieldDto): Promise<Field> {
    return this.customFieldsService.createField(createFieldDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all field definitions' })
  @ApiResponse({
    status: 200,
    description: 'List of field definitions retrieved successfully',
    type: [Field],
  })
  async findAllFields(@Query() queryDto: QueryFieldsDto): Promise<Field[]> {
    return this.customFieldsService.findAllFields(queryDto);
  }

  @Get(':fieldId')
  @ApiOperation({ summary: 'Get a specific field by ID' })
  @ApiParam({ name: 'fieldId', description: 'Field ID' })
  @ApiResponse({
    status: 200,
    description: 'Field retrieved successfully',
    type: Field,
  })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async findFieldById(@Param('fieldId') fieldId: string): Promise<Field> {
    return this.customFieldsService.findFieldById(fieldId);
  }

  @Put(':fieldId')
  @ApiOperation({ summary: 'Update a custom field' })
  @ApiParam({ name: 'fieldId', description: 'Field ID' })
  @ApiResponse({
    status: 200,
    description: 'Field updated successfully',
    type: Field,
  })
  @ApiResponse({ status: 404, description: 'Field not found' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async updateField(
    @Param('fieldId') fieldId: string,
    @Body() updateFieldDto: UpdateFieldDto,
  ): Promise<Field> {
    return this.customFieldsService.updateField(fieldId, updateFieldDto);
  }

  @Delete(':fieldId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom field' })
  @ApiParam({ name: 'fieldId', description: 'Field ID' })
  @ApiResponse({ status: 204, description: 'Field deleted successfully' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async deleteField(@Param('fieldId') fieldId: string): Promise<void> {
    return this.customFieldsService.deleteField(fieldId);
  }

  @Put('create-update/field-value')
  @ApiOperation({ summary: 'Create or update field values for an entity' })
  @ApiResponse({
    status: 200,
    description: 'Field values created/updated successfully',
    type: [FieldValue],
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async createOrUpdateFieldValues(
    @Body() createFieldValueDto: CreateFieldValueDto,
  ): Promise<FieldValue[]> {
    return this.customFieldsService.createOrUpdateFieldValues(createFieldValueDto);
  }

  @Get('values/:itemId')
  @ApiOperation({ summary: 'Get all field values for an entity' })
  @ApiParam({ name: 'itemId', description: 'Entity ID (e.g., userId, cohortId)' })
  @ApiResponse({
    status: 200,
    description: 'Field values retrieved successfully',
    type: [FieldValue],
  })
  async getFieldValuesByItemId(@Param('itemId') itemId: string): Promise<FieldValue[]> {
    return this.customFieldsService.getFieldValuesByItemId(itemId);
  }

  @Get('entity/:itemId/:context')
  @ApiOperation({ summary: 'Get entity with all custom fields' })
  @ApiParam({ name: 'itemId', description: 'Entity ID (e.g., userId, cohortId)' })
  @ApiParam({ name: 'context', description: 'Entity context (e.g., USERS, COHORTS)' })
  @ApiResponse({
    status: 200,
    description: 'Entity with custom fields retrieved successfully',
  })
  async getEntityWithCustomFields(
    @Param('itemId') itemId: string,
    @Param('context') context: FieldContext,
  ): Promise<any> {
    return this.customFieldsService.getEntityWithCustomFields(itemId, context);
  }

  @Delete('values/:fieldId/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a specific field value' })
  @ApiParam({ name: 'fieldId', description: 'Field ID' })
  @ApiParam({ name: 'itemId', description: 'Entity ID' })
  @ApiResponse({ status: 204, description: 'Field value deleted successfully' })
  @ApiResponse({ status: 404, description: 'Field value not found' })
  async deleteFieldValue(
    @Param('fieldId') fieldId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    return this.customFieldsService.deleteFieldValue(fieldId, itemId);
  }

  @Delete('values/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all field values for an entity' })
  @ApiParam({ name: 'itemId', description: 'Entity ID' })
  @ApiResponse({ status: 204, description: 'All field values deleted successfully' })
  async deleteAllFieldValuesForItem(@Param('itemId') itemId: string): Promise<void> {
    return this.customFieldsService.deleteAllFieldValuesForItem(itemId);
  }

  @Get('search/:context')
  @ApiOperation({ summary: 'Search entities by custom field values' })
  @ApiParam({ name: 'context', description: 'Entity context (e.g., USERS, COHORTS)' })
  @ApiQuery({ name: 'fieldName', description: 'Field name to filter by' })
  @ApiQuery({ name: 'fieldValue', description: 'Field value to filter by' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: [String],
  })
  async searchByCustomFields(
    @Param('context') context: FieldContext,
    @Query() filters: any,
  ): Promise<string[]> {
    return this.customFieldsService.searchByCustomFields(context, filters);
  }
} 