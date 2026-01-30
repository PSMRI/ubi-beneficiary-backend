import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KeycloakModule } from 'src/services/keycloak/keycloak.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { KeycloakService } from '@services/keycloak/keycloak.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@entities/user.entity';
import { UserDoc } from '@entities/user_docs.entity';
import { EncryptionService } from 'src/common/helper/encryptionService';
import { Consent } from '@entities/consent.entity';
import { UserApplication } from '@entities/user_applications.entity';
import { LoggerService } from 'src/logger/logger.service';
import ProfilePopulator from 'src/common/helper/profileUpdate/profile-update';
import { WalletService } from 'src/services/wallet/wallet.service';
import { Field } from '@modules/customfields/entities/field.entity';
import { FieldValue } from '@modules/customfields/entities/field-value.entity';
import { CustomFieldsModule } from '@modules/customfields/customfields.module';
import { RoleGuard } from '../../common/guards/role.guard';
import { AdminModule } from '@modules/admin/admin.module';
import { DocumentUploadModule } from '@modules/document-upload/document-upload.module';
import { OcrMappingModule } from '@services/ocr-mapping/ocr-mapping.module';
import { ProxyService } from '@services/proxy/proxy.service';
import { VcFieldsService } from '../../common/helper/vcFieldService';
import { VcAdaptersModule } from '@services/vc-adapters/vc-adapters.module';
import { UserModule } from '@modules/users/users.module';

@Module({
  imports: [
    HttpModule,
    KeycloakModule,
    UserModule,
    TypeOrmModule.forFeature([
      User,
      UserDoc,
      Consent,
      UserApplication,
      Field,
      FieldValue,
    ]),
    CustomFieldsModule,
    AdminModule,
    DocumentUploadModule,
    OcrMappingModule,
    VcAdaptersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ConfigService,
    KeycloakService,
    EncryptionService,
    LoggerService,
    ProfilePopulator,
    WalletService,
    RoleGuard,
    ProxyService,
    VcFieldsService,
  ],
  exports: [AuthService, EncryptionService, WalletService, RoleGuard],
})
export class AuthModule {}
