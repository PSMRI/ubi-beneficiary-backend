import { Test, TestingModule } from '@nestjs/testing';
import { CustomFieldsController } from './customfields.controller';
import { CustomFieldsService } from './customfields.service';

describe('CustomFieldsController', () => {
  let controller: CustomFieldsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomFieldsController],
      providers: [
        {
          provide: CustomFieldsService,
          useValue: {
            createField: jest.fn(),
            findAllFields: jest.fn(),
            findFieldById: jest.fn(),
            updateField: jest.fn(),
            deleteField: jest.fn(),
            createOrUpdateFieldValues: jest.fn(),
            getFieldValuesByItemId: jest.fn(),
            getEntityWithCustomFields: jest.fn(),
            deleteFieldValue: jest.fn(),
            deleteAllFieldValuesForItem: jest.fn(),
            searchByCustomFields: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CustomFieldsController>(CustomFieldsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
}); 