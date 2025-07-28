import { User } from '@entities/user.entity';
import { UserDoc } from '@entities/user_docs.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parse, format, isValid } from 'date-fns';
import { KeycloakService } from '@services/keycloak/keycloak.service';
import { CustomFieldsService } from '@modules/customfields/customfields.service';
import { FieldContext } from '@modules/customfields/entities/field.entity';
import { FieldValue } from '@modules/customfields/entities/field-value.entity';
import { AdminService } from '@modules/admin/admin.service';
import { Setting } from '@modules/admin/entities/setting.entity';

@Injectable()
export default class ProfilePopulator {
  private readonly logger = new Logger(ProfilePopulator.name);
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserDoc)
    private readonly userDocRepository: Repository<UserDoc>,
    private readonly keycloakService: KeycloakService,
    private readonly customFieldsService: CustomFieldsService,
    private readonly adminService: AdminService
  ) { }

  private formatDateToISO(inputDate: string): string | null {
    // Try native Date parsing (handles formats like "Thu, 08 May 2003 00:00:00 GMT")
    const nativeParsedDate = new Date(inputDate);
    if (isValid(nativeParsedDate)) {
      return format(nativeParsedDate, 'yyyy-MM-dd');
    }

    // Fallback to manual format parsing
    const possibleFormats = [
      'yyyy-MM-dd',
      'dd-MM-yyyy',
      'MM-dd-yyyy',
      'yyyy/MM/dd',
      'dd/MM/yyyy',
      'MM/dd/yyyy',
    ];

    for (const dateFormat of possibleFormats) {
      const parsedDate = parse(inputDate, dateFormat, new Date());
      if (isValid(parsedDate)) {
        return format(parsedDate, 'yyyy-MM-dd');
      }
    }

    return null;
  }
  private romanToInt(roman: string): number {
    const romanMap: { [key: string]: number } = {
      I: 1,
      V: 5,
      X: 10,
      L: 50,
      C: 100,
      D: 500,
      M: 1000,
    };

    let total = 0;

    for (let i = 0; i < roman.length; i++) {
      const current = romanMap[roman[i]];
      const next = romanMap[roman[i + 1]] || 0;

      if (current < next) {
        total -= current;
      } else {
        total += current;
      }
    }

    return total;
  }

  // Build Vcs in required format based on user documents
  async buildVCs(userDocs: UserDoc[]) {
    const vcs = [];

    // Build VC array
    for (const doc of userDocs) {
      const docType = doc.doc_subtype;
      let docData: any;
      try {
        docData = typeof doc.doc_data === 'string' ? JSON.parse(doc.doc_data) : doc.doc_data;
        vcs.push({ docType, content: docData });
      } catch (error) {
        const errorMessage = `Invalid JSON format in doc ${doc.doc_id}`;
        Logger.error(`${errorMessage}:`, error);
        continue;
      }
    }

    return vcs;
  }

  // Get user documents from database
  private async getUserDocs(user: any): Promise<UserDoc[]> {
    const userDocs: UserDoc[] = await this.userDocRepository.find({
      where: {
        user_id: user.user_id,
      },
    });

    return userDocs;
  }

  // Get value from VC following a path (pathValue)
  private getValue(vc: any, pathValue: any) {
    if (!pathValue) return null;

    return pathValue.split('.').reduce((acc, part) => {
      return acc && acc[part] !== undefined ? acc[part] : null;
    }, vc.content);
  }

  // Handle name fields which are not directcly present in aadhaar vc
  private handleNameFields(vc: any, vcPaths: any, field: any) {
    const fullname = this.getValue(vc, vcPaths['name']);
    if (!fullname) return null;
    const nameParts = fullname.split(' ');
    const firstName = nameParts[0] ?? null;
    const middleName = nameParts.length === 3 ? nameParts[1] : null;
    const lastName =
      nameParts.length >= 2 ? nameParts[nameParts.length - 1] : null;

    switch (field) {
      case 'firstName':
        return firstName;
      case 'middleName':
        return middleName;
      case 'lastName':
        return lastName;
      case 'fatherName':
        return middleName;
      default:
        return null;
    }
  }

  // Handle value of gender field from aadhaar vc
  private handleGenderField(vc: any, pathValue: any) {
    const value = this.getValue(vc, pathValue);

    switch (value) {
      case 'M':
      case 'Male':
        return 'male';
      case 'F':
      case 'Female':
        return 'female';
      default:
        return null;
    }
  }

  private handleClassField(vc: any, pathValue: any) {
    const value = this.getValue(vc, pathValue);
    if (!value) return null;
    const intValue = this.romanToInt(value);
    if (!intValue) return value;
    return intValue;
  }
  private handleDisabilityTypeField(vc: any, pathValue: any) {
    const value = this.getValue(vc, pathValue);
    if (!value) return null;
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_'); // Replace all other non-alphanumerics (including '-') with '_'
  }

  private handleDisabilityTypeField(vc: any, pathValue: any) {
    const value = this.getValue(vc, pathValue);
    if (!value) return null;
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_'); // Replace all other non-alphanumerics (including '-') with '_'
  }

  private handleDobValue(vc: any, pathValue: any) {
    const value = this.getValue(vc, pathValue);
    if (!value) return null;
    return this.formatDateToISO(value);
  }

  private handleIncomeValue(vc: any, pathValue: any): number | null {
    const value = this.getValue(vc, pathValue);

    if (value === null) return null;
    if (typeof value === 'number') {
      if (isNaN(value) || value < 0) {
        Logger.warn('Invalid income value');
        return null;
      }
      return value;
    }

    // Remove commas and spaces, then validate the format
    const sanitizedValue = value.replace(/[, ']/g, '');

    // Validate the format. If format fails it will return null
    // if (!/^\d+$/.test(sanitizedValue)) {
    //   Logger.warn(`Invalid income format: ${value}`);
    //   return null;
    // }

    // Convert to number and return
    return Number(sanitizedValue);
  }

  // For a field, get its value from given vc
  private async getFieldValueFromVC(vc: any, field: any, fieldConfig: any) {
    // Find the document mapping for this field and document type

    const documentMapping = fieldConfig.documentMappings?.find(
      (mapping: any) => mapping.document === vc.docType
    );

    if (!documentMapping) return null;

    // Prepend 'credentialSubject.' to the document field path
    const pathValue = `credentialSubject.${documentMapping.documentField}`;
    let value = this.getValue(vc, pathValue);

    // Apply field value normalization if present
    if (fieldConfig.fieldValueNormalizationMapping && Array.isArray(fieldConfig.fieldValueNormalizationMapping) && value) {
      const normalizedMapping = fieldConfig.fieldValueNormalizationMapping.find(
        (mapping: any) => mapping.rawValue.includes(value.toString())
      );
      if (normalizedMapping) {
        value = normalizedMapping.transformedValue;
      }
    }
    return value;
  }

  // Build user profile data based on array of fields and available vcs
  async buildProfile(vcs: any[]) {
    const userProfile = {};
    const validationData = {};

    // Get profile fields configuration from settings table
    const configResponse: Setting = await this.adminService.getConfigByKey('profileFieldToDocumentFieldMapping');
    if (!configResponse) {
      this.logger.error('Failed to get profile field configuration from settings');
      return { userProfile, validationData };
    }
    const profileFields = configResponse.value;
    for (const fieldConfig of profileFields) {
      const fieldName = fieldConfig.fieldName;
      const docsUsed = [];
      const documentMappings = fieldConfig.documentMappings || [];

      let value = null;
      for (const mapping of documentMappings) {
        const vc = vcs.find((vc: any) =>
          vc.docType === mapping.document
        );
        if (vc) {
          value = await this.getFieldValueFromVC(vc, fieldName, fieldConfig);
          if (value) {
            docsUsed.push(vc.docType);
            break;
          }
        }
      }

      userProfile[fieldName] = value;
      validationData[fieldName] = docsUsed;
    }

    return { userProfile, validationData };
  }

  // Build user data and info based on built profile
  private async buildUserDataAndInfo(profile: any) {
    const userData = {
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      middleName: profile?.middleName,
      phoneNumber: profile?.phoneNumber,
      email: profile?.email,
      dob: profile?.dob,
    };
    // update added fields
    const fieldList = await this.customFieldsService.findFields({
      context: FieldContext.USERS
    });

    const userInfo = [];
    for (const field of fieldList) {
      // only add fields that are not already present in userData as custom fields
      if (profile[field.name] && !['firstName', 'lastName', 'middleName', 'dob', 'phoneNumber', 'email'].includes(field.name)) {

        userInfo.push(
          {
            name: field.name,
            fieldId: field.fieldId,
            value: profile[field.name]
          }
        )
      }
    }
    return { userData, userInfo };
  }

  // Handle rows from 'user_info' table in database
  private async handleUserInfo(user: any, userInfo: any): Promise<FieldValue[]> {
    try {
      return await this.customFieldsService.saveCustomFields(user.user_id, FieldContext.USERS, userInfo);
    } catch (error) {
      Logger.error(`Error while saving user info: ${error}`);
      return [];
    }
  }

  // Update values in database based on built profile
  async updateDatabase(profile: any, validationData: any, user: any, adminResultData: any) {
    // ===Reset user verification status===
    user.fieldsVerified = false;
    user.fieldsVerifiedAt = new Date();
    user.fieldsVerificationData = null;

    const queryRunner1 =
      this.userRepository.manager.connection.createQueryRunner();
    await queryRunner1.connect();
    await queryRunner1.startTransaction();
    try {
      await queryRunner1.manager.save(user);
      await queryRunner1.commitTransaction();
    } catch (error) {
      await queryRunner1.rollbackTransaction();
      Logger.error(`Error while reseting user profile: ${error}`);
    } finally {
      await queryRunner1.release();
    }

    const { userData, userInfo } = await this.buildUserDataAndInfo(profile);

    let cnt = 0;
    for (const field in profile) {
      if (!profile[field]) cnt++;
    }
    const profFilled = cnt === 0;

    user.firstName = userData.firstName ?? user.firstName;
    user.lastName = userData.lastName ?? user.lastName;
    user.middleName = userData.middleName;
    user.dob = userData.dob;
    user.fieldsVerified = profFilled;
    user.fieldsVerifiedAt = new Date();
    user.fieldsVerificationData = validationData;

    await this.handleUserInfo(user, userInfo);

    const queryRunner =
      this.userRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.save(user);
      await queryRunner.commitTransaction();

      // Update firstName & lastName in keycloak as well
      try {
        await this.keycloakService.updateUser(user.sso_id, {
          firstName: profile.firstName,
          lastName: profile.lastName,
        }, adminResultData);
        this.logger.log("user updated in keycloak")
      } catch (keycloakError) {
        Logger.error('Failed to update user in Keycloak: ', keycloakError?.response);
      }
      return user;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async populateProfile(users: User[]) {
    try {
      const adminResultData = await this.keycloakService.getAdminKeycloakToken();

      for (const user of users) {
        try {
          // Get documents from database
          const userDocs: UserDoc[] = await this.getUserDocs(user);
          // Build VCs in required format
          const vcs = await this.buildVCs(userDocs);

          // Build user-profile data
          const { userProfile, validationData } = await this.buildProfile(vcs);

          // update entries in database
          await this.updateDatabase(userProfile, validationData, user, adminResultData);
        } catch (error) {
          Logger.error(`Failed to process user ${user.user_id}:`, error);
          continue;
        }
      }
    } catch (error) {
      Logger.error("Error in 'Profile Populator CRON': ", error);
      return error;
    }
  }
}
