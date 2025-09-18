import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProxyService } from '@services/proxy/proxy.service';
import { NetworkCache } from './entity/network-cache.entity';

@Injectable()
export class AppService {
  constructor(
    private readonly proxyService: ProxyService,
    @InjectRepository(NetworkCache)
    private readonly networkCacheRepository: Repository<NetworkCache>,
  ) {}
  getHello(): string {
    return 'scholarship-backend is running!!!';
  }

  async getselectContent(body) {
    let endPoint = 'select';
    console.log('select method calling...', body);
    
    try {
      const benefitId = body.message.order.items[0].id;
     
      
      // Fetch bpp_id and bpp_uri from ubi_network_cache table using benefitId
     
      const cacheEntry = await this.networkCacheRepository.findOne({
        where: { item_id: benefitId },
        select: ['bpp_id', 'bpp_uri', 'item_id']
      });
      
      if (cacheEntry && cacheEntry.bpp_id && cacheEntry.bpp_uri) {
        console.log('BPP info retrieved successfully:', { 
          bpp_id: cacheEntry.bpp_id, 
          bpp_uri: cacheEntry.bpp_uri 
        });
        
        // Add bpp_id and bpp_uri to the body
        body.context = body.context || {};
        body.context.bpp_id = cacheEntry.bpp_id;
        body.context.bpp_uri = cacheEntry.bpp_uri;
        
        console.log('Updated body with BPP info:',body);
      } else {
        console.warn('No BPP info found for benefitId:', benefitId);
        // Continue with original body even if BPP info is not found
      }
      
      return await this.proxyService.bapCLientApi2(endPoint, body);
      
    } catch (error) {
      console.error('Error in getselectContent:', error);
      // If there's an error fetching BPP info, log it but continue with original functionality
      console.log('Continuing with original body due to error in BPP lookup');
      return await this.proxyService.bapCLientApi2(endPoint, body);
    }
  }
}
