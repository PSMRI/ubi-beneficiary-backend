import { UserService } from '@modules/users/users.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorResponse } from 'src/common/responses/error-response';
import { SuccessResponse } from 'src/common/responses/success-response';
import { LoggerService } from 'src/logger/logger.service';
import { WalletService } from 'src/services/wallet/wallet.service';

import { KeycloakService } from 'src/services/keycloak/keycloak.service';
import { LoginDTO } from './dto/login.dto';

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
  ) { }

  public async login(body: LoginDTO) {

    const token = await this.keycloakService.getUserKeycloakToken(body);
    
    if (token) {
      // First try to get Keycloak user details
      const keycloakUser = await this.keycloakService.getUserByUsername(body.username);
      if (keycloakUser?.user?.id) {
        // Try to find user by Keycloak ID (sso_id)
        const user = await this.userService.findBySsoId(keycloakUser.user.id);
        this.loggerService.log(`User found by Keycloak ID: ${JSON.stringify(user)}`);
        
        if (user) {
          return new SuccessResponse({
            statusCode: HttpStatus.OK,
            message: 'LOGGEDIN_SUCCESSFULLY',
            data: {
              ...token,
              username: body.username.toLowerCase(),
              walletToken: user.walletToken || null,
            },
          });
        } else {
          // User exists in Keycloak but not in database
          return new ErrorResponse({
            statusCode: HttpStatus.UNAUTHORIZED,
            errorMessage: 'User account not found in system',
          });
        }
      } else {
        // Could not find user in Keycloak
        return new ErrorResponse({
          statusCode: HttpStatus.UNAUTHORIZED,
          errorMessage: 'INVALID_USERNAME_PASSWORD_MESSAGE',
        });
      }
    } else {
      return new ErrorResponse({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorMessage: 'INVALID_USERNAME_PASSWORD_MESSAGE',
      });
    }
  }

  public async register(body) {
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
      const user = await this.userService.createKeycloakData(userData);

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
      return new SuccessResponse({
        statusCode: HttpStatus.OK,
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      return this.handleRegistrationError(error, body?.keycloak_id);
    }
  }

  public async registerWithUsernamePassword(body) {
    try {
      // Step 1: Prepare user data for Keycloak registration
      const dataToCreateUser = this.prepareUserDataV2(body);
      let { password, ...rest } = dataToCreateUser;
      let userName = dataToCreateUser.username;

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
        username: dataToCreateUser.username,
      };
      const user = await this.userService.createKeycloakData(userData);

      // Step 5: Wallet onboarding integration
      let walletToken = null;
      try {
        if (user?.user_id) {
          const walletData = {
            firstName: body.firstName.trim(),
            lastName: body.lastName.trim(),
            phone: body.phoneNumber.trim(),
            password: password,
            username: userName.toLowerCase(),
          };

          this.loggerService.log('Starting wallet onboarding for user', 'AuthService');
          const walletResponse = await this.walletService.onboardUser(walletData);
          walletToken = walletResponse?.data?.token;

          // Step 6: Update user with wallet token
          if (walletToken) {
            await this.userService.update(user.user_id, {
              walletToken: walletToken,
            });
            this.loggerService.log('User updated with wallet token successfully', 'AuthService');
          }
        }
      } catch (walletError) {
        // Rollback user creation in DB and Keycloak if wallet onboarding fails
        this.loggerService.error(
          'Wallet onboarding failed during user registration',
          walletError.stack,
          'AuthService'
        );
        // Delete user from DB if it exists
        if (user?.user_id) {
          await this.userService.deleteUser(user.user_id);
          this.loggerService.error(`Rolled back user in DB: ${user.user_id}`, 'AuthService');
        }
        // Delete user from Keycloak if it exists
        if (keycloakId) {
          await this.keycloakService.deleteUser(keycloakId);
          this.loggerService.error(`Rolled back user in Keycloak: ${keycloakId}`, 'AuthService');
        }
        throw new ErrorResponse({
          statusCode: HttpStatus.BAD_GATEWAY,
          errorMessage: 'Registration could not be completed. Please try again later.',
        });
      }

      // Step 7: Return success response
      return new SuccessResponse({
        statusCode: HttpStatus.OK,
        message: 'User created successfully',
        data: { 
          user, 
          userName: userName.toLowerCase(),
          // password,
          walletOnboarded: !!walletToken 
        },
      });
    } catch (error) {
      return this.handleRegistrationError(error, body?.keycloak_id);
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
    const trimmedFirstName = body?.firstName?.trim();
    const trimmedLastName = body?.lastName?.trim();
    const trimmedPhoneNumber = body?.phoneNumber?.trim();
    const password =
      body?.password?.trim() ?? process.env.SIGNUP_DEFAULT_PASSWORD;

    return {
      enabled: 'true',
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      username: (
        trimmedFirstName +
        '_' +
        trimmedLastName?.charAt(0) +
        '_' +
        trimmedPhoneNumber?.slice(-4)
      ).toLowerCase(),
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
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
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
}
