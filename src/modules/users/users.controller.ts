import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Query,
	UseGuards,
	Req,
	Delete,
	InternalServerErrorException,
	UnauthorizedException,
	Logger,
	UseInterceptors,
	UploadedFile,
	BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from '../users/users.service';
import {
  ApiBasicAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { CreateUserDocDTO } from './dto/user_docs.dto';
import { CreateConsentDto } from './dto/create-consent.dto';
import { UserApplication } from '@entities/user_applications.entity';
import { CreateUserApplicationDto } from './dto/create-user-application-dto';
import { AuthGuard } from '@modules/auth/auth.guard';
import { Request } from 'express';
import { FetchVcUrlDto } from './dto/fetch-vc-url.dto';
import { WalletCallbackDto } from './dto/wallet-callback.dto';
import { UploadDocDTO } from './dto/upload-doc.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  
  /* @Post('/create')
  @ApiBasicAuth('access-token')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
 */
 /*  @UseGuards(AuthGuard)
  @Put('/update/:userId')
  @ApiBasicAuth('access-token')
  @ApiOperation({ summary: 'Update an existing user' })
  @ApiResponse({ status: 200, description: 'User successfully updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() updateUserDto: any,
  ) {
    return this.userService.update(userId, updateUserDto);
  } */

  @UseGuards(AuthGuard)
  @Get('/get_one')
  @ApiBasicAuth('access-token')
  @ApiResponse({ status: 200, description: 'User retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiQuery({
    name: 'decryptData',
    required: false,
    description: 'Whether to decrypt user data (optional)',
    type: Boolean,
  })
  async findOne(
    @Req() req: Request,
    @Query('decryptData') decryptData?: boolean,
  ) {
    return await this.userService.findOne(req, decryptData);
  }

  @UseGuards(AuthGuard)
  @Get('/get_my_consents')
  @ApiBasicAuth('access-token')
  @ApiResponse({ status: 200, description: 'Consent data' })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  @ApiQuery({
    name: 'decryptData',
    required: false,
    description: 'Whether to decrypt user data (optional)',
    type: Boolean,
  })
  async findConsentByUser(@Req() req: Request) {
    return await this.userService.findConsentByUser(req);
  }

  /* @UseGuards(AuthGuard)
  @Post('/user_docs')
  @ApiBasicAuth('access-token')
  @ApiOperation({ summary: 'Save user docs' })
  @ApiResponse({ status: 200, description: 'User docs saved successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async createUserDoc(@Body() createUserDocDto: CreateUserDocDTO) {
    return this.userService.createUserDoc(createUserDocDto);
  } */

  @UseGuards(AuthGuard)
  @Post('/wallet/user_docs')
  @ApiBasicAuth('access-token')
    @ApiBody({ type: [UploadDocDTO] 
    })
  @ApiOperation({ summary: 'Save user docs' })
  @ApiResponse({ status: 200, description: 'User docs saved successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  
  async createUserDocs(
    @Req() req: Request,
    @Body() createUserDocDto: CreateUserDocDTO[],
  ) {
    return this.userService.createUserDocsNew(req, createUserDocDto);
  }

  // @UseGuards(AuthGuard)
  // @Post('/user_info')
  // @ApiBasicAuth('access-token')
  // async createUSerInfo(@Body() createUserInfoDto: CreateUserInfoDto) {
  //   return await this.userService.createUserInfo(createUserInfoDto);
  // }

  // @UseGuards(AuthGuard)
  // @Put('/user_info/:user_id')
  // @ApiBasicAuth('access-token')
  // async updateUserInfo(
  //   @Param('user_id') user_id: string,
  //   @Body() updateUserInfoDto: CreateUserInfoDto,
  // ) {
  //    return await this.userService.updateUserInfo(user_id, updateUserInfoDto);
  // }

  @UseGuards(AuthGuard)
  @Post('/consent')
  @ApiBasicAuth('access-token')
  async createUserConsent(@Body() createConsentDto: CreateConsentDto) {
    return this.userService.createUserConsent(createConsentDto);
  }

  @UseGuards(AuthGuard)
  @Post('/user_application')
  @ApiBasicAuth('access-token')
  @ApiOperation({ summary: 'Create a new user application' })
  @ApiResponse({
    status: 201,
    description: 'User application created successfully',
    type: UserApplication,
  })
  async createUserApplication(
    @Body() createUserApplicationDto: CreateUserApplicationDto,
  ) {
    return this.userService.createUserApplication(createUserApplicationDto);
  }

  @UseGuards(AuthGuard)
  @Get('/user_application/:internal_application_id')
  @ApiBasicAuth('access-token')
  @ApiOperation({ summary: 'Get user application by ID' })
  @ApiResponse({
    status: 200,
    description: 'User application data',
    type: UserApplication,
  }) 
  @ApiResponse({ status: 404, description: 'User application not found' })
  async findOneUserApplication(
    @Param('internal_application_id') internal_application_id: string,
  ) {
    return this.userService.findOneUserApplication(internal_application_id);
  }

  @UseGuards(AuthGuard)
  @Post('/user_applications_list')
  @ApiBasicAuth('access-token')
  @ApiBody({
    description: 'User filter request',
    schema: {
      example: {
        "filters": {
          "user_id": "0deef2a1-90dd-49c7-90a5-fc293d89326a"
        }
      }
    }
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    description: 'Filters for the user applications',
    type: Object,
  })
  @ApiOperation({ summary: 'Get all applications for a specific user' })
  @ApiResponse({
    status: 200,
    description: 'List of user applications',
  })
  async findAllApplicationsByUserId(
    @Body() requestBody: { filters: any; search: string },
  ) {
    return this.userService.findAllApplicationsByUserId(requestBody);
  }

  @Delete('/delete-doc/:doc_id')
  @UseGuards(AuthGuard)
  @ApiOperation({ 
    summary: 'Delete a document',
    description: 'Deletes a document from the database and removes the associated file from the uploads folder'
  })
  @ApiBasicAuth('access-token')
  @ApiResponse({ status: 200, description: 'Document deleted successfully (both database record and physical file)' })
  @ApiResponse({ status: 400, description: 'Document not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteDoc(@Req() req: Request, @Param('doc_id') doc_id: string) {
    try {
      return await this.userService.delete(req, doc_id);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      Logger.error('Failed to delete document:', error);
      throw new InternalServerErrorException(
        'An error occurred while processing your request',
      );
    }
  }

  @Post('/fetch-vc-json')
  @UseGuards(AuthGuard)
  @ApiBasicAuth('access-token')
  @ApiOperation({ summary: 'Fetch Verifiable Credential JSON from a QR code URL' })
  @ApiResponse({ status: 200, description: 'VC JSON fetched successfully' })
  @ApiResponse({ status: 400, description: 'Invalid URL or unable to fetch VC JSON' })
  async fetchVcJson(@Body() fetchVcUrlDto: FetchVcUrlDto) {
    return await this.userService.fetchVcJsonFromUrl(fetchVcUrlDto.url);
  }

  @Post('/wallet-callback')
  @ApiOperation({ summary: 'Handle wallet callback and update document data' })
  @ApiResponse({ status: 200, description: 'Document updated successfully from wallet callback' })
  @ApiResponse({ status: 404, description: 'Document not found for the given identifier' })
  @ApiResponse({ status: 400, description: 'Failed to fetch updated data from wallet' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async handleWalletCallback(@Body() walletCallbackDto: WalletCallbackDto) {
    return await this.userService.handleWalletCallback(walletCallbackDto);
  }

  @Post('/upload-document')
  @UseGuards(AuthGuard)
  @ApiBasicAuth('access-token')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload a document file with metadata',
    description: 'Uploads a new document or updates an existing one if a document with the same type, subtype, and name already exists for the user. Old file will be replaced with the new one.'
  })
  @ApiBody({
    description: 'Document upload with metadata',
    type: UploadDocumentDto,
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Document uploaded successfully (new document created)',
    schema: {
      example: {
        success: true,
        statusCode: 201,
        message: 'Document uploaded successfully',
        data: {
          doc_id: 'a3d8fa45-bdfa-49d1-8b3f-54bafcf3aabb',
          doc_path: 'uploads/file-1635789456123-123456789.pdf',
          user_id: 'b4e9gb56-cefb-5ae2-9c4g-65cbgdg4bbcc',
          doc_type: 'associationProof',
          doc_subtype: 'enrollmentCertificate',
          doc_name: 'Enrollment Certificate',
          imported_from: 'Manual Upload',
          doc_datatype: 'PDF',
          uploaded_at: '2025-10-29T10:30:00.000Z',
          is_update: false,
          download_url: 'https://your-bucket.s3.amazonaws.com/prod/user-id/file-123.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&...',
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Document updated successfully (existing document replaced)',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Document updated successfully',
        data: {
          doc_id: 'a3d8fa45-bdfa-49d1-8b3f-54bafcf3aabb',
          doc_path: 'uploads/file-1635789456123-987654321.pdf',
          user_id: 'b4e9gb56-cefb-5ae2-9c4g-65cbgdg4bbcc',
          doc_type: 'associationProof',
          doc_subtype: 'enrollmentCertificate',
          doc_name: 'Enrollment Certificate',
          imported_from: 'Manual Upload',
          doc_datatype: 'PDF',
          uploaded_at: '2025-10-29T11:45:00.000Z',
          is_update: true,
          download_url: 'https://your-bucket.s3.amazonaws.com/prod/user-id/file-456.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&...',
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid file or metadata' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async uploadDocument(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDocumentDto: UploadDocumentDto,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      return await this.userService.uploadDocument(req, file, uploadDocumentDto);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      Logger.error('Failed to upload document:', error);
      throw new InternalServerErrorException(
        'An error occurred while uploading the document',
      );
    }
  }
}
