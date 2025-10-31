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
      storage: memoryStorage(), // Use memory storage for flexibility with S3 and local storage
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed.'),
            false,
          );
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit - reduced for better security
        files: 1, // Only allow 1 file per upload
        fieldSize: 1024 * 1024, // 1MB limit for field values
        fieldNameSize: 100, // Limit field name size
        fields: 10, // Limit number of non-file fields
        headerPairs: 2000, // Limit header pairs to prevent header pollution attacks
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
