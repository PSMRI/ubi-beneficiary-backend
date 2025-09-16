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
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiExcludeEndpoint, ApiBasicAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

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
  @ApiResponse({ status: 200, description: 'Search results returned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or schema validation failed' })
  @ApiBody({ 
    description: 'Search request payload',
    schema: {
      type: 'object',
      properties: {
        context: { type: 'object' },
        message: { type: 'object' }
      }
    }
  })
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
  @ApiResponse({ status: 200, description: 'Selection completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or schema validation failed' })
  @ApiBody({ 
    description: 'Select request payload',
    schema: {
      type: 'object',
      properties: {
        context: { 
          type: 'object',
          required: ['domain', 'action', 'version', 'bap_id', 'bap_uri', 'bpp_id', 'bpp_uri', 'transaction_id', 'message_id'],
          properties: {
            domain: { type: 'string', example: 'ubi:financial-support' },
            action: { type: 'string', example: 'select' },
            version: { type: 'string', example: '1.1.0' },
            bap_id: { type: 'string', example: 'yourbapid' },
            bap_uri: { type: 'string', example: 'https://your-bap-uri.com' },
            bpp_id: { type: 'string', example: 'yourbppid' },
            bpp_uri: { type: 'string', example: 'https://your-bpp-uri.com' },
            transaction_id: { type: 'string', example: 'your-transaction-id-123' },
            message_id: { type: 'string', example: 'your-message-id-456' },
            timestamp: { type: 'string', format: 'date-time', example: '2023-08-02T07:21:58.448Z' },
            ttl: { type: 'string', example: 'PT10M' },
            location: {
              type: 'object',
              properties: {
                country: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'India' },
                    code: { type: 'string', example: 'IND' }
                  }
                },
                city: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Bangalore' },
                    code: { type: 'string', example: 'std:080' }
                  }
                }
              }
            }
          }
        },
        message: {
          type: 'object',
          required: ['order'],
          properties: {
            order: {
              type: 'object',
              required: ['items', 'provider'],
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id'],
                    properties: {
                      id: { type: 'string', example: 'your-item-id-123' }
                    }
                  }
                },
                provider: {
                  type: 'object',
                  required: ['id'],
                  properties: {
                    id: { type: 'string', example: 'your-provider-id' }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
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
  @ApiResponse({ status: 200, description: 'Initialization completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or schema validation failed' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiBody({
    description: 'Init request payload',
    schema: {
      type: 'object',
      properties: {
        context: {
          type: 'object',
          required: ['domain', 'action', 'version', 'bap_id', 'bap_uri', 'bpp_id', 'bpp_uri', 'transaction_id', 'message_id', 'timestamp', 'ttl'],
          properties: {
            domain: { type: 'string', example: 'ubi:financial-support' },
            action: { type: 'string', example: 'init' },
            version: { type: 'string', example: '1.1.0' },
            bpp_id: { type: 'string', example: 'yourbppid' },
            bpp_uri: { type: 'string', example: 'https://your-bpp-uri.com' },
            country: { type: 'string', example: 'IND' },
            city: { type: 'string', example: 'std:080' },
            location: {
              type: 'object',
              properties: {
                country: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'India' },
                    code: { type: 'string', example: 'IND' }
                  }
                },
                city: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Bangalore' },
                    code: { type: 'string', example: 'std:080' }
                  }
                }
              }
            },
            bap_id: { type: 'string', example: 'yourbapid' },
            bap_uri: { type: 'string', example: 'https://your-bap-uri.com' },
            transaction_id: { type: 'string', example: 'your-transaction-id-123' },
            message_id: { type: 'string', example: 'your-message-id-456' },
            ttl: { type: 'string', example: 'PT10M' },
            timestamp: { type: 'string', format: 'date-time', example: '2025-09-12T04:23:23.818Z' }
          }
        },
        message: {
          type: 'object',
          required: ['order'],
          properties: {
            order: {
              type: 'object',
              required: ['items'],
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id'],
                    properties: {
                      id: { type: 'string', example: 'your-item-id-123' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  async initContent(@Request() request, @Body() body) {
    let endPoint = 'init';
    console.log('init method calling...');
    return await this.proxyService.bapCLientApi2(endPoint, body);
  }

  @Post('/confirm')
  @UseGuards(AuthGuard)
  @ApiBasicAuth('access-token')
  @ApiOperation({ summary: 'Confirm benefit application' })
  @ApiResponse({ status: 200, description: 'Confirmation completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or schema validation failed' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiBody({
    description: 'Confirm request payload',
    schema: {
      type: 'object',
      properties: {
        context: {
          type: 'object',
          required: ['domain', 'action', 'version', 'bap_id', 'bap_uri', 'bpp_id', 'bpp_uri', 'transaction_id', 'message_id', 'timestamp', 'ttl'],
          properties: {
            domain: { type: 'string', example: 'ubi:financial-support' },
            location: {
              type: 'object',
              properties: {
                country: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'India' },
                    code: { type: 'string', example: 'IND' }
                  }
                },
                city: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Bangalore' },
                    code: { type: 'string', example: 'std:080' }
                  }
                }
              }
            },
            action: { type: 'string', example: 'confirm' },
            timestamp: { type: 'string', format: 'date-time', example: '2025-09-12T04:23:23.818Z' },
            ttl: { type: 'string', example: 'PT10M' },
            version: { type: 'string', example: '1.1.0' },
            bap_id: { type: 'string', example: 'yourbapid' },
            bap_uri: { type: 'string', example: 'https://your-bap-uri.com' },
            bpp_id: { type: 'string', example: 'yourbppid' },
            bpp_uri: { type: 'string', example: 'https://your-bpp-uri.com' },
            message_id: { type: 'string', example: 'your-message-id-789' },
            transaction_id: { type: 'string', example: 'your-transaction-id-456' }
          }
        },
        message: {
          type: 'object',
          required: ['order'],
          properties: {
            order: {
              type: 'object',
              required: ['items'],
              properties: {
                provider: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'your-provider-id' }
                  }
                },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id'],
                    properties: {
                      id: { type: 'string', example: 'your-item-id-131' }
                    }
                  }
                },
                billing: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Your Name' },
                    organization: { type: 'object' },
                    address: { type: 'string', example: 'Your Address, City, State' },
                    phone: { type: 'string', example: '+91-0000000000' }
                  }
                },
                fulfillments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      customer: { type: 'object' },
                      tags: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            descriptor: { type: 'object' },
                            value: { type: 'string', example: 'YOUR_BANK' }
                          }
                        }
                      }
                    }
                  }
                },
                payment: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      params: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
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
