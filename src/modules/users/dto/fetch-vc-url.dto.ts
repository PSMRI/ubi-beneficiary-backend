import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';

export class FetchVcUrlDto {
  @ApiProperty({ example: 'https://xyz.com/a6b4fb30-a2f4-4805-8ac3-db11ecbef974', description: 'URL to fetch the VC JSON from' })
  @IsString()
  @IsUrl()
  url: string;
} 