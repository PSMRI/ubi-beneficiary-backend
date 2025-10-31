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
import { ConfigModule } from '@nestjs/config';
import { FILE_UPLOAD_LIMITS, ALLOWED_FILE_TYPES, FILE_UPLOAD_ERRORS } from '../../common/constants/upload.constants';

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
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (ALLOWED_FILE_TYPES.MIME_TYPES.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error(FILE_UPLOAD_ERRORS.INVALID_FILE_TYPE), false);
        }
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
  ],
   exports: [UserService],
})
export class UserModule {}
