import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

// ===== COMMON SHARED DTOs =====

export class CountryDto {
  @ApiProperty({ example: 'India' })
  name: string;

  @ApiProperty({ example: 'IND' })
  code: string;
}

export class CityDto {
  @ApiProperty({ example: 'Bangalore' })
  name: string;

  @ApiProperty({ example: 'std:080' })
  code: string;
}

export class LocationDto {
  @ApiProperty({ type: CountryDto })
  @ValidateNested()
  @Type(() => CountryDto)
  country: CountryDto;

  @ApiProperty({ type: CityDto })
  @ValidateNested()
  @Type(() => CityDto)
  city: CityDto;
}

export class ItemDto {
  @ApiProperty({ example: 'your-item-id-123' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class ProviderDto {
  @ApiProperty({ example: 'your-provider-id' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

// ===== BASE CONTEXT DTO =====

export class BaseContextDto {
  @ApiProperty({ example: 'ubi:financial-support' })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiProperty({ example: '1.1.0' })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty({ example: 'yourbapid' })
  @IsString()
  @IsNotEmpty()
  bap_id: string;

  @ApiProperty({ example: 'https://your-bap-uri.com' })
  @IsString()
  @IsNotEmpty()
  bap_uri: string;

  @ApiProperty({ example: 'your-transaction-id-123' })
  @IsString()
  @IsNotEmpty()
  transaction_id: string;

  @ApiProperty({ example: 'your-message-id-456' })
  @IsString()
  @IsNotEmpty()
  message_id: string;

  @ApiProperty({ example: '2023-08-02T07:21:58.448Z' })
  @IsString()
  @IsOptional()
  timestamp?: string;

  @ApiProperty({ example: 'PT10M' })
  @IsString()
  @IsOptional()
  ttl?: string;

  @ApiProperty({ type: LocationDto, required: false })
  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;
}

// ===== SELECT ENDPOINT DTOs =====

export class SelectContextDto extends BaseContextDto {
  @ApiProperty({ example: 'select' })
  @IsString()
  @IsNotEmpty()
  action: 'select';
}

export class SelectOrderDto {
  @ApiProperty({ type: [ItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];

  @ApiProperty({ type: ProviderDto })
  @ValidateNested()
  @Type(() => ProviderDto)
  provider: ProviderDto;
}

export class SelectMessageDto {
  @ApiProperty({ type: SelectOrderDto })
  @ValidateNested()
  @Type(() => SelectOrderDto)
  order: SelectOrderDto;
}

export class SelectRequestDto {
  @ApiProperty({ type: SelectContextDto })
  @ValidateNested()
  @Type(() => SelectContextDto)
  context: SelectContextDto;

  @ApiProperty({ type: SelectMessageDto })
  @ValidateNested()
  @Type(() => SelectMessageDto)
  message: SelectMessageDto;
}

// ===== INIT ENDPOINT DTOs =====

export class InitContextDto extends BaseContextDto {
  @ApiProperty({ example: 'init' })
  @IsString()
  @IsNotEmpty()
  action: 'init';

  @ApiProperty({ example: 'IND' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: 'std:080' })
  @IsString()
  @IsOptional()
  city?: string;
}

export class InitOrderDto {
  @ApiProperty({ type: [ItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];
}

export class InitMessageDto {
  @ApiProperty({ type: InitOrderDto })
  @ValidateNested()
  @Type(() => InitOrderDto)
  order: InitOrderDto;
}

export class InitRequestDto {
  @ApiProperty({ type: InitContextDto })
  @ValidateNested()
  @Type(() => InitContextDto)
  context: InitContextDto;

  @ApiProperty({ type: InitMessageDto })
  @ValidateNested()
  @Type(() => InitMessageDto)
  message: InitMessageDto;
}

// ===== CONFIRM ENDPOINT DTOs =====

export class ConfirmContextDto extends BaseContextDto {
  @ApiProperty({ example: 'confirm' })
  @IsString()
  @IsNotEmpty()
  action: 'confirm';
}

export class BillingDto {
  @ApiProperty({ example: 'Your Name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: {}, required: false })
  @IsObject()
  @IsOptional()
  organization?: any;

  @ApiProperty({ example: 'Your Address, City, State' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: '+91-0000000000' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class TagDto {
  @ApiProperty({ example: {}, required: false })
  @IsObject()
  @IsOptional()
  descriptor?: any;

  @ApiProperty({ example: 'YOUR_BANK' })
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class FulfillmentDto {
  @ApiProperty({ example: {}, required: false })
  @IsObject()
  @IsOptional()
  customer?: any;

  @ApiProperty({ type: [TagDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagDto)
  @IsOptional()
  tags?: TagDto[];
}

export class PaymentDto {
  @ApiProperty({ example: {}, required: false })
  @IsObject()
  @IsOptional()
  params?: any;
}

export class ConfirmOrderDto {
  @ApiProperty({ type: ProviderDto, required: false })
  @ValidateNested()
  @Type(() => ProviderDto)
  @IsOptional()
  provider?: ProviderDto;

  @ApiProperty({ type: [ItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];

  @ApiProperty({ type: BillingDto, required: false })
  @ValidateNested()
  @Type(() => BillingDto)
  @IsOptional()
  billing?: BillingDto;

  @ApiProperty({ type: [FulfillmentDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FulfillmentDto)
  @IsOptional()
  fulfillments?: FulfillmentDto[];

  @ApiProperty({ type: [PaymentDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  @IsOptional()
  payment?: PaymentDto[];
}

export class ConfirmMessageDto {
  @ApiProperty({ type: ConfirmOrderDto })
  @ValidateNested()
  @Type(() => ConfirmOrderDto)
  order: ConfirmOrderDto;
}

export class ConfirmRequestDto {
  @ApiProperty({ type: ConfirmContextDto })
  @ValidateNested()
  @Type(() => ConfirmContextDto)
  context: ConfirmContextDto;

  @ApiProperty({ type: ConfirmMessageDto })
  @ValidateNested()
  @Type(() => ConfirmMessageDto)
  message: ConfirmMessageDto;
}

// ===== SEARCH ENDPOINT DTOs =====

export class SearchRequestDto {
  @ApiProperty({ 
    description: 'Search context object',
    example: { domain: 'ubi:financial-support', action: 'search' }
  })
  @IsObject()
  context: any;

  @ApiProperty({ 
    description: 'Search message object',
    example: { intent: { category: { descriptor: { name: 'Financial Support' } } } }
  })
  @IsObject()
  message: any;
}
