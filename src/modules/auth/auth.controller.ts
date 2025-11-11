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

  @Post('/login')
  @UsePipes(new ValidationPipe())
  @ApiBody({ type: LoginDTO })
  @ApiResponse({ status: 200, description: 'LOGGEDIN_SUCCESSFULLY' })
  @ApiResponse({ status: 409, description: 'INVALID_CREDENTIALS' })
  @ApiResponse({ status: 400, description: 'BAD_REQUEST' })
  public async login(@Body() body: LoginDTO) {
    return await this.authService.login(body);
  }

  @Post('process-otr-certificate')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        docType: { type: 'string' },
        docSubType: { type: 'string' },
        docName: { type: 'string' },
        importedFrom: { type: 'string' },
      },
    },
  })
  async processOtrCertificate(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDocumentDto: UploadDocumentDto,
  ): Promise<SuccessResponse | ErrorResponse> {
    return this.authService.processOtrCertificate(req, file, uploadDocumentDto);
  }


  @Post('/logout')
  @UsePipes(ValidationPipe)
  logout(@Req() req: Request) {
    return this.authService.logout(req);
  }
}
