import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiResponse, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDTO } from './dto/register.dto';
import { LoginDTO } from './dto/login.dto';
import { SuccessResponse } from 'src/common/responses/success-response';
import { ErrorResponse } from 'src/common/responses/error-response';
import { UploadDocumentDto } from '@modules/users/dto/upload-document.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(public authService: AuthService) { }

  // users/register on keycloak and postgres both side.

  // @Post('/register')
  // @UsePipes(new ValidationPipe())
  // @ApiBody({ type: RegisterDTO })
  // @ApiResponse({ status: 200, description: 'User registered successfully.' })
  // @ApiResponse({ status: 409, description: 'Mobile number already exists.' })
  // @ApiResponse({ status: 400, description: 'Bad Request.' })
  // public async register(@Body() body: RegisterDTO) {
  //   return await this.authService.register(body);
  // }

  @Post('/register_with_password')
  @UsePipes(new ValidationPipe())
  @ApiBody({ type: RegisterDTO })
  @ApiResponse({ status: 200, description: 'User registered successfully.' })
  @ApiResponse({ status: 409, description: 'Mobile number already exists.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  public async registerWithUsernamePassword(@Body() body: RegisterDTO) {
    return await this.authService.registerWithUsernamePassword(body);
  }

  @Post('/register_with_document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Register user with OTR Certificate document. All user data (name, phone) is extracted from the certificate via OCR.',
    schema: {
      type: 'object',
      required: ['docType', 'docSubType', 'file'],
      properties: {
        docType: {
          type: 'string',
          description: 'Type of document',
          example: 'certificate',
        },
        docSubType: {
          type: 'string',
          description: 'Must be otrCertificate',
          example: 'otrCertificate',
        },
        docName: {
          type: 'string',
          description: 'Name of the document',
          example: 'OTR Certificate',
        },
        importedFrom: {
          type: 'string',
          description: 'Source of import',
          example: 'registration',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'OTR Certificate document file (PDF/Image). Must contain firstName, lastName, and phoneNumber for extraction.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'OTR processed, user registered, and document uploaded successfully. Username and credentials are auto-generated.',
  })
  @ApiResponse({
    status: 201,
    description: 'Registration successful, but document upload failed. Please upload after login.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Required fields could not be extracted from certificate or invalid data',
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists (phone number duplicate)',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  public async registerWithDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req: any,
  ) {
    return await this.authService.processOtrAndRegisterWithUpload(body, file, req);
  }

  @Post('/login')
  @UsePipes(new ValidationPipe())
  @ApiBody({ type: LoginDTO })
  @ApiResponse({ status: 200, description: 'LOGGEDIN_SUCCESSFULLY' })
  @ApiResponse({ status: 409, description: 'INVALID_CREDENTIALS' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  public async login(@Body() body: LoginDTO) {
    return await this.authService.login(body);
  }


  @Post('/logout')
  @UsePipes(ValidationPipe)
  logout(@Req() req: Request) {
    return this.authService.logout(req);
  }
}
