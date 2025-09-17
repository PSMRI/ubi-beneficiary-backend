import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { LoggerService } from './logger/logger.service';
import { ProxyService } from './services/proxy/proxy.service';
import { ContentService } from './content/content.service';
import { AuthGuard } from '@modules/auth/auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint, ApiBasicAuth, ApiBody } from '@nestjs/swagger';
import { 
  SelectRequestDto, 
  InitRequestDto, 
  ConfirmRequestDto, 
  SearchRequestDto 
} from './dto/network-api.dto';

// Common response constants
const COMMON_RESPONSES = {
  SUCCESS: { status: 200, description: 'Operation completed successfully' },
  BAD_REQUEST: { status: 400, description: 'Invalid request or schema validation failed' },
  UNAUTHORIZED: { status: 401, description: 'Authentication required' },
};

@ApiTags('Network API')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly proxyService: ProxyService,
    private readonly logger: LoggerService,
    private readonly contentService: ContentService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiExcludeEndpoint()
  @Post('/search')
  @ApiOperation({ summary: 'Search for benefits/services' })
  @ApiBody({ type: SearchRequestDto })
  @ApiResponse(COMMON_RESPONSES.SUCCESS)
  @ApiResponse(COMMON_RESPONSES.BAD_REQUEST)
  async searchContent(@Request() request, @Body() body) {
    try {
      this.logger.log('Search request received', { body });
      const result = await this.proxyService.bapCLientApi2('search', body);
      this.logger.log('Search request completed successfully');
      return result;
    } catch (error) {
      this.logger.error('Search request failed', error);
      throw error;
    }
  }

  @Post('/select')
  @ApiOperation({ summary: 'Select specific benefit/service items' })
  @ApiBody({ type: SelectRequestDto })
  @ApiResponse(COMMON_RESPONSES.SUCCESS)
  @ApiResponse(COMMON_RESPONSES.BAD_REQUEST)
  async selectContent(@Request() request, @Body() body) {
    try {
      const result = await this.proxyService.bapCLientApi2('select', body);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('/init')
  @UseGuards(AuthGuard)
  @ApiBasicAuth('access-token')
  @ApiOperation({ summary: 'Initialize benefit application process' })
  @ApiBody({ type: InitRequestDto })
  @ApiResponse(COMMON_RESPONSES.SUCCESS)
  @ApiResponse(COMMON_RESPONSES.BAD_REQUEST)
  @ApiResponse(COMMON_RESPONSES.UNAUTHORIZED)
  async initContent(@Request() request, @Body() body) {
    let endPoint = 'init';
    console.log('init method calling...');
    return await this.proxyService.bapCLientApi2(endPoint, body);
  }

  @Post('/confirm')
  @UseGuards(AuthGuard)
  @ApiBasicAuth('access-token')
  @ApiOperation({ summary: 'Confirm benefit application' })
  @ApiBody({ type: ConfirmRequestDto })
  @ApiResponse(COMMON_RESPONSES.SUCCESS)
  @ApiResponse(COMMON_RESPONSES.BAD_REQUEST)
  @ApiResponse(COMMON_RESPONSES.UNAUTHORIZED)
  async confirmContent(@Request() request, @Body() body) {
    let endPoint = 'confirm';
    console.log('confirm method calling...');
    return await this.proxyService.bapCLientApi2(endPoint, body);
  }

  @ApiExcludeEndpoint()
  @Post('/status')
  @UseGuards(AuthGuard)
  async statusContent(@Request() request, @Body() body) {
    let endPoint = 'status';
    console.log('status method calling...');
    return await this.proxyService.bapCLientApi2(endPoint, body);
  }

  @ApiExcludeEndpoint()
  @Post('/update')
  @UseGuards(AuthGuard)
  async updateContent(@Request() request, @Body() body) {
    let endPoint = 'update';
    console.log('update method calling...');
    return await this.proxyService.bapCLientApi2(endPoint, body);
  }
}
