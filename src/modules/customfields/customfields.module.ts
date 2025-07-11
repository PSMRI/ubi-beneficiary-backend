import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomFieldsController } from './customfields.controller';
import { CustomFieldsService } from './customfields.service';
import { Field } from '@entities/field.entity';
import { FieldValue } from '@entities/field-value.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Field, FieldValue]),
  ],
  controllers: [CustomFieldsController],
  providers: [CustomFieldsService],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {} 