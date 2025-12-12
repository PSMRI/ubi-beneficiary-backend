import { UserService } from '@modules/users/users.service';
import { BadRequestException, HttpException, HttpStatus, Injectable, InternalServerErrorException, Logger, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorResponse } from 'src/common/responses/error-response';
import { SuccessResponse } from 'src/common/responses/success-response';
import { LoggerService } from 'src/logger/logger.service';
import { WalletService } from 'src/services/wallet/wallet.service';

import { KeycloakService } from 'src/services/keycloak/keycloak.service';
import { LoginDTO } from './dto/login.dto';
import { UpdatePasswordDTO } from './dto/update-password.dto';
import { UploadDocumentDto } from '@modules/users/dto/upload-document.dto';
import { DocumentUploadService } from '@modules/document-upload/document-upload.service';

const crypto = require('crypto');
const axios = require('axios');

const jwt = require('jwt-decode');
@Injectable()
export class AuthService {
  public keycloak_admin_cli_client_secret = this.configService.get<string>(
    'KEYCLOAK_ADMIN_CLI_CLIENT_SECRET',
  );
  private readonly defaultGroupPath = this.configService.get<string>(
    'KEYCLOAK_DEFAULT_GROUP_PATH',
  );
  constructor(
    private readonly configService: ConfigService,
    private readonly keycloakService: KeycloakService,
    private readonly userService: UserService,
    private readonly loggerService: LoggerService,
    private readonly walletService: WalletService,
    private readonly documentUploadService: DocumentUploadService,
  ) { }

  public async login(body: LoginDTO) {
    try {
      const token = await this.keycloakService.getUserKeycloakToken(body);

      if (!token) {
        throw new UnauthorizedException('INVALID_USERNAME_PASSWORD_MESSAGE');
      }

      // 🔹 Fetch user details
      const keycloakUser = await this.keycloakService.getUserByUsername(body.username);

      if (keycloakUser?.user?.id) {
        const requiredActions = keycloakUser.user.requiredActions || [];

        if (requiredActions.includes('UPDATE_PASSWORD')) {
          throw new ForbiddenException('PASSWORD_UPDATE_REQUIRED');
        }

        const user = await this.userService.findBySsoId(keycloakUser.user.id);
        this.loggerService.log(`User found by Keycloak ID: ${JSON.stringify(user)}`);

        if (user) {
          return {
            statusCode: HttpStatus.OK,
            message: 'LOGGEDIN_SUCCESSFULLY',
            data: {
              ...token,
              username: body.username.toLowerCase(),
              walletToken: user.walletToken || null,
            },
          };
        }

        throw new NotFoundException('USER_NOT_FOUND');
      }

      throw new UnauthorizedException('INVALID_USERNAME_PASSWORD_MESSAGE');

    } catch (error) {
      if (error.message === 'ACCOUNT_NOT_FULLY_SETUP') {
        const keycloakUser = await this.keycloakService.getUserByUsername(body.username);
        const requiredActions = keycloakUser?.user?.requiredActions || [];

        if (requiredActions.includes('UPDATE_PASSWORD')) {
          throw new ForbiddenException('PASSWORD_UPDATE_REQUIRED');
        }

        throw new ForbiddenException('ACCOUNT_NOT_FULLY_SETUP');
      }

      if (error.message === 'INVALID_CREDENTIALS') {
        throw new UnauthorizedException('INVALID_USERNAME_PASSWORD_MESSAGE');
      }

      // Re-throw other exceptions (they might already be HTTP exceptions)
      if (error instanceof HttpException) {
        throw error;
      }

      // Catch-all for unexpected errors
      throw new InternalServerErrorException('AUTH_LOGIN_FAILED');
    }
  }



  /*   public async register(body) {
      try {
        // let wallet_api_url = process.env.WALLET_API_URL;
        // Step 1: Check if mobile number exists in the database
        await this.checkMobileExistence(body?.phoneNumber);
  
        // Step 2: Prepare user data for Keycloak registration
        const dataToCreateUser = this.prepareUserData(body);
  
        // Step 3: Get Keycloak admin token
        const token = await this.keycloakService.getAdminKeycloakToken();
        this.validateToken(token);
  
        // Step 4: Register user in Keycloak
        const keycloakId = await this.registerUserInKeycloak(
          dataToCreateUser,
          token.access_token,
        );
  
        // Step 5: Register user in PostgreSQL
        const userData = {
          ...body,
          keycloak_id: keycloakId,
          username: dataToCreateUser.username,
        };
        const user = await this.userService.createKeycloakData(userData); */

  /*
  if (user) {
    //create user payload
    let wallet_user_payload = {
      firstName: user?.firstName,
      lastName: user?.lastName,
      sso_provider: user?.sso_provider,
      sso_id: user?.sso_id,
      phoneNumber: user?.phoneNumber,
    };

    await axios.post(`${wallet_api_url}/users/create`, wallet_user_payload);
  }*/

  // Step 6: Return success response
  /* return new SuccessResponse({
    statusCode: HttpStatus.OK,
    message: 'User created successfully',
    data: user,
  });
} catch (error) {
  return this.handleRegistrationError(error, body?.keycloak_id);
}
} */

  public async registerWithUsernamePassword(body) {
    try {
      // Step 1: Prepare user data for Keycloak registration
      const dataToCreateUser = this.prepareUserDataV2(body);
      let { password, ...rest } = dataToCreateUser;

      // Step 2: Get Keycloak admin token
      const token = await this.keycloakService.getAdminKeycloakToken();
      this.validateToken(token);
      // Step 3: Register user in Keycloak
      const keycloakId = await this.registerUserInKeycloak(
        rest,
        token.access_token,
      );

      // Step 4: Register user in PostgreSQL
      const userData = {
        ...body,
        keycloak_id: keycloakId,
      };
      const user = await this.userService.createKeycloakData(userData);

      // Step 5: Handle wallet onboarding
      const walletToken = await this.handleWalletOnboarding(body, password, user, keycloakId);

      // Step 6: Return success response
      return new SuccessResponse({
        statusCode: HttpStatus.OK,
        message: 'User created successfully',
        data: {
          user,
          userName: body.username.trim(),
          // password,
          walletOnboarded: !!walletToken
        },
      });
    } catch (error) {
      return this.handleRegistrationError(error, body?.keycloak_id);
    }
  }

  private async handleWalletOnboarding(body: any, password: string, user: any, keycloakId: string): Promise<string | null> {
    const isWalletRegistrationEnabled = this.configService.get<string>('WALLET_REGISTRATION_ENABLED') !== 'false';

    if (!isWalletRegistrationEnabled) {
      this.loggerService.log('Wallet registration is disabled, skipping wallet onboarding', 'AuthService');
      return null;
    }

    try {
      if (!user?.user_id) {
        return null;
      }

      const walletData = {
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        phone: body.phoneNumber.trim(),
        password: password,
        username: body.username.trim(),
      };

      this.loggerService.log('Starting wallet onboarding for user', 'AuthService');
      const walletResponse = await this.walletService.onboardUser(walletData);
      const walletToken = walletResponse?.data?.token;

      if (walletToken) {
        await this.userService.update(user.user_id, {
          walletToken: walletToken,
        });
        this.loggerService.log('User updated with wallet token successfully', 'AuthService');
      }

      return walletToken;
    } catch (walletError) {
      await this.rollbackUserRegistration(user, keycloakId, walletError);
      throw new ErrorResponse({
        statusCode: HttpStatus.BAD_GATEWAY,
        errorMessage: 'Registration could not be completed. Please try again later.',
      });
    }
  }

  private async rollbackUserRegistration(user: any, keycloakId: string, walletError: any): Promise<void> {
    this.loggerService.error(
      'Wallet onboarding failed during user registration',
      walletError.stack,
      'AuthService'
    );

    if (user?.user_id) {
      await this.userService.deleteUser(user.user_id);
      this.loggerService.error(`Rolled back user in DB: ${user.user_id}`, 'AuthService');
    }

    if (keycloakId) {
      await this.keycloakService.deleteUser(keycloakId);
      this.loggerService.error(`Rolled back user in Keycloak: ${keycloakId}`, 'AuthService');
    }
  }

  private async checkMobileExistence(phoneNumber: string) {
    if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
      throw new ErrorResponse({
        statusCode: HttpStatus.BAD_REQUEST,
        errorMessage: 'Invalid phone number format',
      });
    }
    const isMobileExist = await this.userService.findByMobile(phoneNumber);
    if (isMobileExist) {
      throw new ErrorResponse({
        statusCode: HttpStatus.CONFLICT,
        errorMessage: 'Mobile Number Already Exists',
      });
    }
  }

  private prepareUserData(body) {
    return {
      enabled: 'true',
      firstName: body?.firstName,
      lastName: body?.lastName,
      username: body?.phoneNumber,
      credentials: [
        // {
        //   type: 'password',
        //   value: body?.password,
        //   temporary: false,
        // },
      ],
      attributes: {
        // Custom user attributes
        phoneNumber: '+91' + body?.phoneNumber,
        firstName: body?.firstName,
        lastName: body?.lastName,
      },
      groups: this.defaultGroupPath ? [this.defaultGroupPath] : [],
    };
  }

  private prepareUserDataV2(body) {
    const trimmedName = body?.name?.trim();
    const trimmedPhoneNumber = body?.phoneNumber?.trim();
    const trimmedUsername = body?.username?.trim();
    const password =
      body?.password?.trim() ?? process.env.SIGNUP_DEFAULT_PASSWORD;

    return {
      enabled: 'true',
      firstName: trimmedName,
      username: trimmedUsername,
      credentials: [
        {
          type: 'password',
          value: password,
          temporary: false,
        },
      ],
      password, // Return the password directly
      attributes: {
        // Custom user attributes
        phoneNumber: '+91' + trimmedPhoneNumber,
        firstName: trimmedName,
      },
      groups: this.defaultGroupPath ? [this.defaultGroupPath] : [],
    };
  }

  private validateToken(token) {
    if (!token?.access_token) {
      throw new ErrorResponse({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorMessage: 'Unable to get Keycloak token',
      });
    }
  }

  /**
   * Format user info by converting all values to strings and handling null/undefined values
   * @param user - User object with any data types
   * @returns Formatted user object with all values as strings
   */
  public formatUserInfo(user: any): Record<string, string> {
    // Convert main user properties to strings
    const userInfo = Object.fromEntries(
      Object.entries(user).map(([key, value]) => [
        key,
        value !== null && value !== undefined ? String(value) : '',
      ]),
    );

    // Handle custom fields if they exist
    if (user.customFields && Array.isArray(user.customFields)) {
      const customFieldsObj = Object.fromEntries(
        user.customFields.map(field => [
          field.name,
          field.value !== null && field.value !== undefined ? String(field.value) : '',
        ])
      );

      return {
        ...userInfo,
        ...customFieldsObj
      };
    }

    return userInfo;
  }

  private async registerUserInKeycloak(userData, accessToken) {
    const registerUserRes = await this.keycloakService.registerUser(
      userData,
      accessToken,
    );

    if (registerUserRes.error) {
      if (registerUserRes?.error?.response?.status === 409) {
        this.loggerService.error(
          'User already exists!',
          registerUserRes?.error,
        );
        throw new ErrorResponse({
          statusCode: HttpStatus.CONFLICT,
          errorMessage: 'User already exists!',
        });
      }
      throw new ErrorResponse({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorMessage: registerUserRes.error.message,
      });
    }

    if (registerUserRes.headers.location) {
      const locationParts = registerUserRes.headers.location.split('/');
      if (locationParts?.length === 0) {
        throw new ErrorResponse({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          errorMessage: 'Invalid location header format',
        });
      }
      const keycloakId = registerUserRes?.headers?.location.split('/').pop();
      if (!keycloakId) {
        throw new ErrorResponse({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          errorMessage: 'Unable to extract Keycloak ID',
        });
      }
      return keycloakId;
    }

    throw new ErrorResponse({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorMessage: 'Unable to create user in Keycloak',
    });
  }

  private async handleRegistrationError(error, keycloakId) {
    this.loggerService.error('Error during user registration:', error);

    if (keycloakId) {
      await this.keycloakService.deleteUser(keycloakId);
      this.loggerService.error(
        'Keycloak user deleted due to failure in PostgreSQL creation',
        error,
      );
    }

    if (error instanceof ErrorResponse) {
      return error;
    }

    return new ErrorResponse({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorMessage:
        'Error during user registration. Keycloak user has been rolled back.',
    });
  }

  public async logout(req) {
    const accessToken = req.body.access_token;
    const refreshToken = req.body.refresh_token; // Optional: if provided

    try {
      // Revoke the access token
      await this.keycloakService.revokeToken(accessToken);

      // Optionally, revoke the refresh token if provided
      if (refreshToken) {
        await this.keycloakService.revokeToken(refreshToken, 'refresh_token');
      }

      // Return successful logout response
      return new SuccessResponse({
        statusCode: HttpStatus.OK,
        message: 'LOGGED OUT SUCCESSFULLY',
      });
    } catch (error) {
      console.error('Error during logout:', error.message);
      return new ErrorResponse({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorMessage: 'LOGOUT_FAILED',
      });
    }
  }

  /**
 * Sets Keycloak required actions for a given user (e.g., UPDATE_PASSWORD)
 */

  private async processOtrCertificate(
    file: Express.Multer.File,
    uploadDocumentDto: UploadDocumentDto,
  ) {
    try {
      if (uploadDocumentDto.docSubType !== 'otrCertificate') {
        throw new BadRequestException('AUTH_ONLY_OTR_CERTIFICATE_ALLOWED');
      }

      // Step 2: Document config (QR requirement)
      const { requiresQRProcessing } = await this.userService.getDocumentConfig(uploadDocumentDto);

      // Step 3: File type validation
      this.userService.validateFileTypeForQr(requiresQRProcessing, file.mimetype);

      // Step 4: OCR extraction
      const ocrStartTime = Date.now();
      const ocrResult = await this.userService.performOcr(
        file,
        uploadDocumentDto,
        requiresQRProcessing,
      );
      this.loggerService.log(`⏱️ OCR Extraction took: ${Date.now() - ocrStartTime}ms`, 'AuthService');

      // Step 5: Fetch vcFields
      const vcFields = await this.userService.getVcFieldsForDocument(
        uploadDocumentDto.docType,
        uploadDocumentDto.docSubType,
      );

      // Step 6: OCR → structured mapping
      let vcMapping = null;
      const mappingStartTime = Date.now();
      if (vcFields) {
        // Pass docName from uploadDocumentDto for document type validation
        const expectedDocumentName = uploadDocumentDto.docName;
        if (!expectedDocumentName || expectedDocumentName.trim() === '') {
          throw new BadRequestException('DOCUMENT_NAME_REQUIRED_FOR_VALIDATION');
        }
        vcMapping = await this.userService.ocrMapping.mapAfterOcr(
          {
            text: ocrResult.extractedText,
            docType: uploadDocumentDto.docType,
            docSubType: uploadDocumentDto.docSubType,
          },
          vcFields,
          expectedDocumentName,
        );
      } else {
        vcMapping = {
          mapped_data: {},
          missing_fields: [],
          confidence: 0,
          processing_method: 'keyword' as const,
          warnings: ['No vcFields configuration found'],
        };
      }
      this.loggerService.log(`⏱️ OCR Mapping took: ${Date.now() - mappingStartTime}ms`, 'AuthService');

      this.loggerService.log('OTR Certificate processed successfully (OCR + mapping done)');

      return { ocrResult, vcMapping };
    } catch (error) {
      this.loggerService.error('processOtrCertificate', error.message, error.stack);
      throw new ErrorResponse({
        statusCode: error.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR,
        errorMessage: error.message ?? 'Failed to process OTR Certificate',
      });
    }
  }

  /**
   * Step 2 + 3 combined:
   * Process OTR → Register user → Upload document
   * All user data is extracted from the OTR Certificate
   */
  async processOtrAndRegisterWithUpload(
    body: any,
    file: Express.Multer.File,
    req: any,
  ) {
    let user = null;
    let ocrResult = null;
    let vcMapping = null;
    let isUserRegistered = false;
    let generatedUsername = null;
    const defaultPassword = process.env.SIGNUP_DEFAULT_PASSWORD;

    try {
      const flowStartTime = Date.now();
      // 🟩 Step 1: Pre-process OTR Certificate
      const uploadDocumentDto: UploadDocumentDto = {
        docType: body.docType,
        docSubType: body.docSubType,
        docName: body.docName,
        importedFrom: body.importedFrom ?? 'registration',
        file,
      };
      const processingStartTime = Date.now();
      const otrResult = await this.processOtrCertificate(file, uploadDocumentDto);
      this.loggerService.log(`⏱️ Total OTR Processing (OCR+Mapping) took: ${Date.now() - processingStartTime}ms`, 'AuthService');

      ocrResult = otrResult.ocrResult;
      vcMapping = otrResult.vcMapping;

      // 🟩 Step 2: Enrich registration payload with OTR extracted data
      const payload = {
        name: vcMapping?.mapped_data?.name || '',
        username: vcMapping?.mapped_data?.otr_number
          ? vcMapping.mapped_data.otr_number.toString()
          : '',

        phoneNumber: vcMapping?.mapped_data?.phoneNumber
          ? vcMapping.mapped_data.phoneNumber.toString()
          : '',

        password: defaultPassword,
      };

      // 🟩 Step 3.1: Validate required fields
      this.validateRegistrationPayload(payload);

      // 🟩 Step 4: Register user
      const regStartTime = Date.now();
      const registrationResponse = await this.registerWithUsernamePassword(
        payload,
      );
      this.loggerService.log(`⏱️ User Registration took: ${Date.now() - regStartTime}ms`, 'AuthService');
      // Check if registration was successful
      if (registrationResponse instanceof ErrorResponse) {
        return registrationResponse;
      }

      user = registrationResponse.data;
      isUserRegistered = true;
      const registeredUser = (registrationResponse.data as any).user;

      // 🟩 Step 5: Upload OTR Certificate file
      // Upload file to storage
      const uploadStartTime = Date.now();
      const uploadResult = await this.documentUploadService.uploadFile(
        file,
        {
          docType: uploadDocumentDto.docType,
          docSubType: uploadDocumentDto.docSubType,
          docName: uploadDocumentDto.docName,
          importedFrom: uploadDocumentDto.importedFrom,
        },
        registeredUser.user_id,
      );

      // Save or update the document record
      const savedDoc = await this.userService.createNewDoc(registeredUser.user_id, uploadResult, uploadDocumentDto, vcMapping);
      this.loggerService.log(`⏱️ Document Upload & Save took: ${Date.now() - uploadStartTime}ms`, 'AuthService');

      // 🟩 Step 5.1: Update user profile based on OTR certificate data (including dob)
      try {
        await this.userService.updateProfile(registeredUser);
        this.loggerService.log(`Profile updated successfully for user: ${registeredUser.user_id} after OTR document upload`);
      } catch (profileError) {
        this.loggerService.error('Profile update failed after OTR document upload:', profileError);
        // Don't fail the entire registration if profile update fails
      }

      this.loggerService.log(`⏱️ Total OTR Registration Flow took: ${Date.now() - flowStartTime}ms`, 'AuthService');
      // 🟩 Step 6: Return success response
      return new SuccessResponse({
        statusCode: HttpStatus.OK,
        message: 'AUTH_REGISTRATION_SUCCESS',
        data: {
          user,
          document: {
            doc_id: savedDoc.savedDoc.doc_id,
            doc_path: savedDoc.savedDoc.doc_path,
            doc_type: savedDoc.savedDoc.doc_type,
            doc_subtype: savedDoc.savedDoc.doc_subtype,
            doc_name: savedDoc.savedDoc.doc_name,
            imported_from: savedDoc.savedDoc.imported_from,
          },
          username: body.username,
          password: defaultPassword,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof ErrorResponse ? error.errorMessage : error.message;
      this.loggerService.error('processOtrAndRegisterWithUpload', errorMessage, error.stack);

      // If user was registered but document upload failed, return partial success
      if (isUserRegistered && (errorMessage?.includes('upload') || errorMessage?.includes('document'))) {
        this.loggerService.warn(`User registered successfully but document upload failed for: ${generatedUsername}`);

        return new SuccessResponse({
          statusCode: HttpStatus.CREATED,
          message: 'AUTH_REGISTRATION_PARTIAL_SUCCESS',
          data: {
            user,
            document: null,
            username: body.username,
            password: defaultPassword,
          },
        });
      }

      // For all other errors (OTR processing or registration failures)
      // If error is already an ErrorResponse, return it directly
      if (error instanceof ErrorResponse) {
        return error;
      }

      // Otherwise, wrap the error in an ErrorResponse
      return new ErrorResponse({
        statusCode: error.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR,
        errorMessage: errorMessage ?? 'Failed OTR registration flow',
      });
    }
  }

  /**
   * Validates registration payload for required fields
   */
  private validateRegistrationPayload(payload: any) {

    const missingFields: string[] = [];

    if (!payload.name || payload.name.trim() === '') {
      missingFields.push('name');
    }
    if (!payload.username || payload.username.trim() === '') {
      missingFields.push('username');
    }
    if (!payload.phoneNumber || payload.phoneNumber.trim() === '') {
      missingFields.push('phoneNumber');
    }

    if (missingFields.length > 0) {
      throw new ErrorResponse({
        statusCode: HttpStatus.BAD_REQUEST,
        errorMessage: `Missing required fields: ${missingFields.join(', ')}. Please re-upload document again.`,
      });
    }

    // Additional validation for phoneNumber format
    if (!/^\d{10}$/.test(payload.phoneNumber.trim())) {
      throw new ErrorResponse({
        statusCode: HttpStatus.BAD_REQUEST,
        errorMessage: 'Invalid phone number format. Phone number must be 10 digits.',
      });
    }
  }




  public async updatePassword(body: UpdatePasswordDTO) {
    const { username, oldPassword, newPassword } = body;

    // 1️⃣ Verify old password via Keycloak token endpoint
    try {
      await this.keycloakService.getUserKeycloakToken({
        username,
        password: oldPassword,
      });
      // If we reach here → old password is valid (either normal or temporary)
    } catch (error) {
      if (error.message === 'INVALID_CREDENTIALS') {
        throw new HttpException('AUTH_INVALID_OLD_PASSWORD', HttpStatus.UNAUTHORIZED);
      }

      // Handle "ACCOUNT_NOT_FULLY_SETUP" (temporary password)
      if (error.message === 'ACCOUNT_NOT_FULLY_SETUP') {
        // Still a valid old password — Keycloak just needs password update.
        // So we continue the flow normally.
      } else {
        console.error('Error verifying old password:', error);
        throw new HttpException('AUTH_PASSWORD_VALIDATION_FAILED', HttpStatus.BAD_REQUEST);
      }
    }

    // 2️⃣ Get admin token
    const adminTokenData = await this.keycloakService.getAdminKeycloakToken();
    const adminToken = adminTokenData?.access_token;

    // 3️⃣ Find user by username
    const user = await this.keycloakService.getUserByUsername(username);
    if (!user?.user || user.isUserExist === false) {
      throw new HttpException('USER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    // 4️⃣ Reset password using admin API
    const success = await this.keycloakService.resetPassword(
      user.user.id,
      adminToken,
      newPassword,
    );

    if (!success) {
      throw new HttpException('AUTH_PASSWORD_UPDATE_FAILED', HttpStatus.BAD_REQUEST);
    }

    // 5️⃣ Optional — clear any pending required actions like UPDATE_PASSWORD
    // await this.keycloakService.clearRequiredAction(user.user.id, adminToken);


    return new SuccessResponse({
      statusCode: HttpStatus.OK,
      message: 'AUTH_PASSWORD_UPDATED_SUCCESSFULLY',
    })
  }


}
