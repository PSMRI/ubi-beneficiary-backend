import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserController } from '@modules/users/users.controller';
import { UserService } from '@modules/users/users.service';
import { User } from '@entities/user.entity';
import { UserDoc } from '@entities/user_docs.entity';
import { EncryptionService } from 'src/common/helper/encryptionService';
import { Consent } from '@entities/consent.entity';
import { UserApplication } from '@entities/user_applications.entity';
import { KeycloakService } from '@services/keycloak/keycloak.service';
import ProfilePopulatorCron from './crons/profile-populator.cron';
import ProfilePopulator from 'src/common/helper/profileUpdate/profile-update';
import { ApplicationStatusUpdate } from './crons/application-status-update.cron';
import { ProxyService } from '@services/proxy/proxy.service';
import { Field } from '@modules/customfields/entities/field.entity';
import { FieldValue } from '@modules/customfields/entities/field-value.entity';
import { CustomFieldsModule } from '@modules/customfields/customfields.module';
import { AdminModule } from '@modules/admin/admin.module';
import { DocumentUploadModule } from '@modules/document-upload/document-upload.module';
import { OcrMappingModule } from '@services/ocr-mapping/ocr-mapping.module';
import { ConfigModule } from '@nestjs/config';
import { FILE_UPLOAD_LIMITS } from '../../common/constants/upload.constants';
import { VcFieldsService } from '../../common/helper/vcFieldService';
import { VcAdaptersModule } from '@services/vc-adapters/vc-adapters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserDoc,
      Consent,
      UserApplication,
      Field,
      FieldValue,
    ]),
    MulterModule.register({
      // Memory storage is secure here because:
      // 1. Files are immediately processed and uploaded to S3
      // 2. 5MB limit per file (below 8MB security threshold)
      // 3. Single file uploads only (files: 1)
      // 4. Additional limits prevent DoS attacks
      // 5. Content-based validation prevents file type spoofing
      storage: memoryStorage(), // NOSONAR - Memory storage is secure with implemented limits and immediate S3 upload
      fileFilter: (req, file, callback) => {
        // Accept all files initially - content validation will be done after upload
        // This allows us to perform async content-based validation using file.buffer
        // Size and other limits are still enforced by multer
        callback(null, true);
      },
      limits: {
        fileSize: FILE_UPLOAD_LIMITS.MAX_FILE_SIZE,
        files: FILE_UPLOAD_LIMITS.MAX_FILES,
        fieldSize: FILE_UPLOAD_LIMITS.MAX_FIELD_SIZE,
        fieldNameSize: FILE_UPLOAD_LIMITS.MAX_FIELD_NAME_SIZE,
        fields: FILE_UPLOAD_LIMITS.MAX_FIELDS,
        headerPairs: FILE_UPLOAD_LIMITS.MAX_HEADER_PAIRS,
        parts: FILE_UPLOAD_LIMITS.MAX_PARTS,
      },
    }),
    CustomFieldsModule,
    AdminModule,
    DocumentUploadModule,
    OcrMappingModule,
    VcAdaptersModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    EncryptionService,
    KeycloakService,
    ProfilePopulatorCron,
    ProfilePopulator,
    ApplicationStatusUpdate,
    ProxyService,
    ConfigModule,
    VcFieldsService,
  ],
   exports: [UserService],
})
export class UserModule {}
