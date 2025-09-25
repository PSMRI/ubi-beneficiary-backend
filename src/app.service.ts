import { NetworkCache } from '@entities/network-cache.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ProxyService } from '@services/proxy/proxy.service';
import { Repository } from 'typeorm';
import { LoggerService } from './logger/logger.service';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(NetworkCache)
    private readonly networkCacheRepository: Repository<NetworkCache>,
    private readonly proxyService: ProxyService,
    private readonly logger: LoggerService,
  ) {}
  getHello(): string {
    return 'scholarship-backend is running!!!';
  }
  async getSelectContent(endpoint: string, body) {	
    try {
      const benefitId = body?.message?.order?.items[0]?.id;
      if (!benefitId) {
        this.logger.error('Benefit ID not found in the request');
        throw new NotFoundException('Benefit ID not found in the request');
      }
      const bpp_id = body?.context?.bpp_id;
      if (!bpp_id) {
        this.logger.error('BPP ID not found in the request');
        throw new NotFoundException('BPP ID not found in the request');
      }
      // Fetch bpp_id and bpp_uri from ubi_network_cache table using TypeORM
      const cacheEntry = await this.networkCacheRepository.findOne({
        where: { item_id: benefitId, bpp_id: bpp_id },
        select: ['bpp_id', 'bpp_uri', 'item_id']
      });
      
      if (cacheEntry && cacheEntry.bpp_id && cacheEntry.bpp_uri) {
        this.logger.log('BPP info retrieved successfully:', cacheEntry); 
        
        // Add bpp_id and bpp_uri to the body
        body.context = body.context || {};
        body.context.bpp_uri = cacheEntry.bpp_uri;
        
      } else { 
        this.logger.warn(`No BPP info found for item_id=${benefitId}${bpp_id ? `, bpp_id=${bpp_id}` : ''}`);  
        throw new NotFoundException(`BPP information not found for item ${benefitId}`); 
       }
      
      return await this.proxyService.bapCLientApi2(endpoint, body);
      
    } catch (error) { 
      this.logger.error(`Error in ${endpoint} processing:`, error);
      throw error;
    }
  }
}
