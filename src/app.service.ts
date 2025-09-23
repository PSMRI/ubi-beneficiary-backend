import { Injectable } from '@nestjs/common';
import { ProxyService } from '@services/proxy/proxy.service';
import { LoggerService } from './logger/logger.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NetworkCache } from './entity/network-cache.entity';

@Injectable()
export class AppService {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly logger: LoggerService,
    @InjectRepository(NetworkCache)
    private readonly networkCacheRepository: Repository<NetworkCache>,
  ) {}
  
  getHello(): string {
    return 'scholarship-backend is running!!!';
  }

  async getSelectContent(endpoint: string, body) {	
    try {
      const benefitId = body?.message?.order?.items[0]?.id;
      // Fetch bpp_id and bpp_uri from ubi_network_cache table using TypeORM
      this.logger.log('Fetching BPP info for benefitId:', benefitId);
      const cacheEntry = await this.networkCacheRepository.findOne({
        where: { item_id: benefitId },
        select: ['bpp_id', 'bpp_uri', 'item_id']
      });
      
      if (cacheEntry && cacheEntry.bpp_id && cacheEntry.bpp_uri) {
        this.logger.log('BPP info retrieved successfully:', { 
          bpp_id: cacheEntry.bpp_id, 
          bpp_uri: cacheEntry.bpp_uri 
        });
        
        // Add bpp_id and bpp_uri to the body
        body.context = body.context || {};
        body.context.bpp_id = cacheEntry.bpp_id;
        body.context.bpp_uri = cacheEntry.bpp_uri;
        
      } else {
        this.logger.warn('No BPP info found for benefitId:', benefitId);
        throw new Error(`BPP information not found for benefitId: ${benefitId}`);
      }
      
      return await this.proxyService.bapCLientApi2(endpoint, body);
      
    } catch (error) {
      this.logger.error(`Error in ${endpoint} processing:`, error);
      throw error;
    }
  }
}
