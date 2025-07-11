import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomFieldsService } from './customfields.service';
import { Field } from '@entities/field.entity';
import { FieldValue } from '@entities/field-value.entity';

describe('CustomFieldsService', () => {
  let service: CustomFieldsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomFieldsService,
        {
          provide: getRepositoryToken(Field),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(FieldValue),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CustomFieldsService>(CustomFieldsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
}); 