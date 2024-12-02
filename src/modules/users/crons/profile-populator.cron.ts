import { User } from '@entities/user.entity';
import { UserDoc } from '@entities/user_docs.entity';
import { UserInfo } from '@entities/user_info.entity';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { readFile } from 'fs/promises';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EncryptionService } from 'src/common/helper/encryptionService';
import { parse, format, isValid } from 'date-fns';

@Injectable()
export default class ProfilePopulatorCron {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserDoc)
    private readonly userDocRepository: Repository<UserDoc>,
    @InjectRepository(UserInfo)
    private readonly userInfoRepository: Repository<UserInfo>,
    private readonly encryptionService: EncryptionService,
  ) {}

  private formatDateToISO(inputDate: string): string | null {
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

    return null; // Return null if no format matches
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
        // Subtractive case (e.g., IV -> 4)
        total -= current;
      } else {
        // Additive case
        total += current;
      }
    }

    return total;
  }

  // Build Vcs in required format based on user documents
  private async buildVCs(userDocs: any) {
    const vcs = [];

    // Build VC array
    for (const doc of userDocs) {
      const docType = doc.doc_subtype;
      const decryptedData = await this.encryptionService.decrypt(doc.doc_data);
      const content = JSON.parse(decryptedData);

      vcs.push({ docType, content });
    }

    return vcs;
  }

  // Get users from database based on conditions
  private async getUsers() {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .orderBy(
        `CASE
                  WHEN user.fieldsVerified IS NULL THEN 0
                  WHEN user.fieldsVerified = false AND user.fieldsVerifiedAt IS NOT NULL THEN 1
                  ELSE 2
              END`,
        'ASC',
      )
      .addOrderBy(
        `CASE
                  WHEN user.fieldsVerifiedAt IS NULL THEN "user"."updated_at"
                  ELSE "user"."fieldsVerifiedAt"
              END`,
        'ASC',
      )
      .take(10)
      .getMany();

    return users;
  }

  // Get user documents from database
  private async getUserDocs(user: any) {
    const userDocs = await this.userDocRepository.find({
      where: {
        user_id: user.user_id,
      },
    });

    return userDocs;
  }

  // Get value from VC following a path (pathValue)
  private getValue(vc: any, pathValue: any) {
    if (!pathValue) return null;
    return pathValue.split('.').reduce((acc, part) => acc?.[part], vc.content);
  }

  // Handle name fields which are not directcly present in aadhaar vc
  private handleNameFields(vc: any, vcPaths: any, field: any) {
    const fullname = this.getValue(vc, vcPaths['name']);
    if (!fullname) return null;
    const nameParts = fullname.split(' ');
    const firstName = nameParts[0] || null;
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
    // console.log('VC: ', vc);
    if (!intValue) return value;
    return intValue;
  }

  private handleAadhaarValue(vc: any, pathValue: any) {
    let value = this.getValue(vc, pathValue);
    if (!value) return null;
    value = this.encryptionService.encrypt(value);
    return value;
  }

  private handleDobValue(vc: any, pathValue: any) {
    const value = this.getValue(vc, pathValue);
    if (!value) return null;
    return this.formatDateToISO(value);
  }

  // For a field, get its value from given vc
  private async getFieldValueFromVC(vc: any, field: any) {
    const filePath = path.join(
      __dirname,
      `../../../../src/modules/users/crons/vcPaths/${vc.docType}.json`,
    );
    const vcPaths = JSON.parse(await readFile(filePath, 'utf-8'));

    if (!vcPaths) return null;

    // If field is aadhaar, it will need to be encrypted
    if (field === 'aadhaar') return this.handleAadhaarValue(vc, vcPaths[field]);

    // If it is one of the name fields, then get values accordingly
    if (['firstName', 'lastName', 'middleName', 'fatherName'].includes(field))
      return this.handleNameFields(vc, vcPaths, field);

    // If it is gender, value will be 'M' or 'F' from aadhaar, so adjust the value accordingly
    if (field === 'gender') return this.handleGenderField(vc, vcPaths[field]);

    // console.log('before class' + field + (field === 'class'));
    // If it is class, value will be roman number, so convert value accordingly
    if (field === 'class') return this.handleClassField(vc, vcPaths[field]);

    // If it is dob, then adjust format as per database
    if (field === 'dob') return this.handleDobValue(vc, vcPaths[field]);

    return this.getValue(vc, vcPaths[field]);
  }

  // Build user profile data based on array of fields and available vcs
  private async buildProfile(vcs: any, profileFields: any) {
    const userProfile = {};
    const validationData = {};

    for (const field in profileFields) {
      const docsUsed = [];
      const vcArray = profileFields[field];

      // ==========  TO BE RUN IN LOOP IN FUTURE =====================
      const vc = vcs.find((vc: any) => vc.docType === vcArray[0]);
      let value: any;
      if (vc) {
        value = await this.getFieldValueFromVC(vc, field);
      } else {
        value = null;
      }
      if (value) docsUsed.push(vc.docType);
      userProfile[field] = value;
      // ==========  TO BE RUN IN LOOP IN FUTURE =====================

      validationData[field] = docsUsed;
    }

    return { userProfile, validationData };
  }

  // Build user data and info based on built profile
  private buildUserDataAndInfo(profile: any) {
    const userData = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      middleName: profile.middleName,
      dob: profile.dob,
    };

    const userInfo = {
      fatherName: profile.fatherName,
      gender: profile.gender,
      caste: profile.caste,
      aadhaar: profile.aadhaar,
      annualIncome: profile.annualIncome ? Number(profile.annualIncome) : null,
      class: profile.class ? Number(profile.class) : null,
      studentType: profile.studentType,
      previousYearMarks: profile.previousYearMarks,
      dob: profile.dob,
    };

    return { userData, userInfo };
  }

  // Handle rows from 'user_info' table in database
  private async handleUserInfo(user: any, userInfo: any) {
    const queryRunner =
      this.userInfoRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const userRows = await queryRunner.manager.find(UserInfo, {
        where: {
          user_id: user.user_id,
        },
      });

      let row: UserInfo;

      if (userRows.length === 0) {
        row = this.userInfoRepository.create({
          user_id: user.user_id,
          fatherName: userInfo.fatherName,
          gender: userInfo.gender,
          caste: userInfo.caste,
          annualIncome: userInfo.annualIncome,
          class: userInfo.class,
          aadhaar: userInfo.aadhaar,
          studentType: userInfo.studentType,
          previousYearMarks: userInfo.previousYearMarks,
          dob: userInfo.dob,
        });
      } else {
        row = userRows[0];
        row.fatherName = userInfo.fatherName;
        row.gender = userInfo.gender;
        row.caste = userInfo.caste;
        row.annualIncome = userInfo.annualIncome;
        row.class = userInfo.class;
        row.aadhaar = userInfo.aadhaar;
        row.studentType = userInfo.studentType;
        row.previousYearMarks = userInfo.previousYearMarks;
        row.dob = userInfo.dob;
      }

      await queryRunner.manager.save(row);
      await queryRunner.commitTransaction();
      return row;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Update values in database based on built profile
  private async updateDatabase(profile: any, validationData: any, user: any) {
    const { userData, userInfo } = this.buildUserDataAndInfo(profile);

    let cnt = 0;
    for (const field in profile) {
      if (!profile[field]) cnt++;
    }
    const profFilled = cnt === 0;

    user.firstName = userData.firstName ? userData.firstName : user.firstName;
    user.lastName = userData.lastName ? userData.lastName : user.lastName;
    user.middleName = userData.middleName;
    user.dob = userData.dob;
    user.fieldsVerified = profFilled;
    user.fieldsVerifiedAt = new Date();
    user.fieldsVerificationData = validationData;

    await this.handleUserInfo(user, userInfo);
    await this.userRepository.save(user);
  }

  @Cron('*/5 * * * *')
  async populateProfile() {
    try {
      // const userInfos = await this.getUserInfo();

      const users = await this.getUsers();

      for (const user of users) {
        // Get documents from database
        const userDocs = await this.getUserDocs(user);

        // Build VCs in required format
        const vcs = await this.buildVCs(userDocs);
        // console.log('VCs: ', vcs);

        // Get profile fields & corresponding arrays of VC names
        const profileFieldsFilePath = path.join(
          __dirname,
          '../../../../src/modules/users/crons/configFiles/vcArray.json',
        );
        const profileFields = JSON.parse(
          await readFile(profileFieldsFilePath, 'utf-8'),
        );
        // console.log('Profile Fields: ', profileFields);

        // Build user-profile data
        const { userProfile, validationData } = await this.buildProfile(
          vcs,
          profileFields,
        );
        // console.log(userProfile);
        // console.log(validationData);

        // update entries in database
        await this.updateDatabase(userProfile, validationData, user);
      }
    } catch (error) {
      Logger.error("Error in 'Profile Populator CRON': ", error);
    }
  }
}
