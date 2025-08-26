import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { ProxyService } from 'src/services/proxy/proxy.service';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { ConfigService } from '@nestjs/config';
import { ContentService } from './content.service';

@Injectable()
export class NetworkCacheRefreshCron {
  private readonly logger = new Logger(NetworkCacheRefreshCron.name);
  private readonly domain = process.env.DOMAIN;
  private readonly bap_id = process.env.BAP_ID;
  private readonly bap_uri = process.env.BAP_URI;
  private readonly bpp_id = process.env.BPP_ID;
  private readonly bpp_uri = process.env.BPP_URI;

  constructor(
    private readonly proxyService: ProxyService,
    private readonly hasuraService: HasuraService,
    private readonly configService: ConfigService,
    private readonly contentService: ContentService,
  ) {
    this.validateEnvironmentVariables();
  }

  private validateEnvironmentVariables(): void {
    const requiredEnvVars = ['DOMAIN', 'BAP_ID', 'BAP_URI', 'BPP_ID', 'BPP_URI'];
    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        this.logger.warn(`${envVar} is not defined in environment variables`);
      }
    });
  }

  private createSearchApiPayload(): any {
    return {
      context: {
        domain: this.domain,
        action: 'search',
        version: '1.1.0',
        bap_id: this.bap_id,
        bap_uri: this.bap_uri,
        bpp_id: this.bpp_id,
        bpp_uri: this.bpp_uri,
        transaction_id: uuidv4(),
        message_id: uuidv4(),
        timestamp: new Date().toISOString(),
      },
      message: {
        intent: {
          item: {
            descriptor: { name: '' },
          },
        },
      },
    };
  }

  @Cron(process.env.NETWORK_CACHE_REFRESH_CRON_TIME || '*/10 * * * *')
  async refreshNetworkCache() {
    try {
      this.logger.log('Network Cache Refresh CRON started at ' + new Date().toISOString());

      // Use ContentService to process and insert jobs
      await this.contentService.jobsApiCall();
      
      this.logger.log(`Network Cache Refresh CRON completed successfully at ` + new Date().toISOString());
    } catch (error) {
      this.logger.error('Error in Network Cache Refresh CRON:', error);
    }
  }
} 
