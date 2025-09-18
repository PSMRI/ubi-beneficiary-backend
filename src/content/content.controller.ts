import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards
} from '@nestjs/common';
import { LoggerService } from 'src/logger/logger.service';
import { ContentService } from './content.service';
import { ApiResponse, ApiTags, ApiExcludeEndpoint, ApiBody, ApiOperation } from '@nestjs/swagger';
//NO SONAR
/* import { promises as fs } from 'fs';
import * as path from 'path'; */ 
import { AuthGuard } from '@modules/auth/auth.guard';

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly logger: LoggerService,
  ) {}

  @Post('/search')
  @ApiOperation({ summary: 'Search for benefits/services with filters' })
  @ApiResponse({ status: 200, description: 'Search results returned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiBody({
    description: 'Search request payload with filters and pagination',
    schema: {
      type: 'object',
      properties: {
        filters: {
          type: 'object',
          properties: {
            annualIncome: { 
              type: 'string', 
              example: '0-100000',
              description: 'Annual income range filter'
            },
            gender: { 
              type: 'string', 
              example: '',
              description: 'Gender filter (optional)'
            },
            caste: { 
              type: 'string', 
              example: '',
              description: 'Caste filter (optional)'
            }
          }
        },
        search: { 
          type: 'string', 
          example: '',
          description: 'Search term for text-based filtering'
        },
        page: { 
          type: 'number', 
          example: 1,
          description: 'Page number for pagination'
        },
        limit: { 
          type: 'number', 
          example: 5,
          description: 'Number of results per page'
        },
        strictCheck: { 
          type: 'boolean', 
          example: true,
          description: 'Whether to apply strict eligibility checking'
        }
      }
     
    }
  })
  async getContent(@Request() request, @Body() body) {
    this.logger.log('POST /search');
    return this.contentService.getJobs(body, request);
  }

/*   @ApiExcludeEndpoint()
  @Post('/responseSearch')
  async searchResponse(@Request() request, @Body() body) {
    this.logger.log('POST /responseSearch');
    return this.contentService.searchResponse(body);
  } */


  /* @Get('/getState')
  async getState() {
    this.logger.log('GET /getState');
    return this.contentService.getState();
  }


  @Get('/getCity')
  async getCity(@Query('state') state: string) {
    this.logger.log('GET /getCity');
    return this.contentService.getCity(state);
  }


  @Get('/getTitle')
  async getTitle() {
    this.logger.log('GET /getTitle');
    return this.contentService.getTitle();
  } */

  // create jobs manually

  @Post('/create')
  async contentapi() {
    this.logger.log('POST /create');
    return this.contentService.jobsApiCall();
    // return this.contentService.testApiCall()
  }


/*   @Post('/createOrder')
  createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.contentService.createOrder(createOrderDto);
  }
 */

/*   @Get('/searchOrder/:OredrId')
  searchOrderByOrderId(@Param('OredrId') OredrId) {
    return this.contentService.searchOrderByOrderId(OredrId);
  } */

  // create jobs by cronjob
  // @Cron(CronExpression.EVERY_8_HOURS)
  // async jobsApiCall() {
  //   this.logger.log('Cronjob create service executed at');
  //   return this.contentService.jobsApiCall();
  // }

  // // delete jobs by cronjob
  // @Cron(CronExpression.EVERY_DAY_AT_1AM)
  // async deleteJobs() {
  //   this.logger.log('Cronjob delete Jobs service executed at');
  //   let deletedResponse = await this.contentService.deleteJobs();
  //   if (deletedResponse) {
  //     console.log('response deleted successfully at ' + Date.now());
  //     return this.contentService.jobsApiCall();
  //   }
  // }

  // delete response cache by cronjob
  // @Cron(CronExpression.EVERY_DAY_AT_1AM)
  // async deleteResponse() {
  //     this.logger.log('Cronjob delete Response executed at')
  //     return this.contentService.deleteResponse()
  // }

  
 /*  @Post('/telemetry')
  async telemetry(@Request() request, @Body() body) {
    this.logger.log('POST /telemetry', JSON.stringify(body));
    return this.contentService.addTelemetry(body);
  }


  @Post('/analytics')
  async analytics(@Request() request, @Body() body) {
    this.logger.log('POST /analytics');
    console.log('body', body);
    return this.contentService.analytics(body);
  }

  @ApiExcludeEndpoint()  @Post('/telemetryAnalytics')
  async telemetryAnalytics(@Request() request, @Body() body) {
    this.logger.log('GET /telemetryAnalytics');
    return this.contentService.telemetryAnalytics1(body);
  }

 
  @Get('/documents_list')
  @ApiResponse({
    status: 200,
    description: 'List of documents',
  })
  async getCertificates() {
    const filePath = path.join(
      __dirname,
      '../../src/common/documentMasterList.json',
    );

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const certificates = JSON.parse(data);

      return {
        success: true,
        message: 'Documents fetched successfully',
        data: certificates,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error fetching documents',
        error: error.message,
      };
    }
  }
 
  @Post('/encrypt')
  async encrption(@Request() request, @Body() body) {
    return this.contentService.encryption(body);
  }


  @Post('/decrypt')
  async decryption(
    @Request() request,
    @Body() body: { encryptedData: string },
  ) {
    return this.contentService.decryption(body.encryptedData);
  } */

@ApiExcludeEndpoint()
@UseGuards(AuthGuard)
@Get('/eligibility-check/:benefitId')
@ApiResponse({ status: 200, description: 'Eligibility result' })
@ApiResponse({ status: 400, description: 'Invalid request' })
async getEligibilityCheck(@Param('benefitId') benefitId: string, @Request() request) {
    this.logger.log(`GET /eligibility-check/${benefitId}`);
    return this.contentService.getUserBenefitEligibility( benefitId, request);
  }
}
