import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { ProxyService } from 'src/services/proxy/proxy.service';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { ConfigService } from '@nestjs/config';

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
  ) {
    // Validate required environment variables
    const requiredEnvVars = ['DOMAIN', 'BAP_ID', 'BAP_URI', 'BPP_ID', 'BPP_URI'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        this.logger.warn(`${envVar} is not defined in environment variables`);
      }
    }
  }

  private generateFixedId(...strings: string[]): string {
    const crypto = require('crypto');
    const combinedString = strings.join('-');
    const hash = crypto
      .createHash('sha256')
      .update(combinedString)
      .digest('hex');
    return hash;
  }

  private async callSearchApi() {
    this.logger.log('Calling search API to fetch latest data');
    
    const data = {
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
            descriptor: {
              name: '',
            },
          },
        },
      },
    };

    try {
      const response = await this.proxyService.bapCLientApi2('search', data);
      this.logger.log('Search API response received');
      return response;
    } catch (error) {
        console.log('error', error);
      this.logger.error('Error calling search API:', error);
      throw error;
    }
  }

  private async processSearchResponse(response: any): Promise<any[]> {
    if (!response || !response.responses) {
      this.logger.warn('No valid response data received from search API');
      return [];
    }

    const arrayOfObjects = [];

    for (const responses of response.responses) {
      if (responses.message?.catalog?.providers) {
        for (const provider of responses.message.catalog.providers) {
          if (provider.items) {
            for (const [index, item] of provider.items.entries()) {
              const obj = {
                unique_id: this.generateFixedId(
                  item.id,
                  item.descriptor?.name || '',
                  responses.context.bpp_id,
                ),
                item_id: item.id,
                title: item?.descriptor?.name ? item.descriptor.name : '',
                description: item?.descriptor?.long_desc
                  ? item.descriptor.long_desc
                  : '',
                provider_id: provider.id ? provider.id : '',
                provider_name: provider.descriptor?.name
                  ? provider.descriptor.name
                  : '',
                bpp_id: responses.context.bpp_id
                  ? responses.context.bpp_id
                  : '',
                bpp_uri: responses.context.bpp_uri
                  ? responses.context.bpp_uri
                  : '',
                item: item,
                descriptor: provider.descriptor,
                categories: provider.categories,
                fulfillments: provider.fulfillments,
              };
              arrayOfObjects.push(obj);
            }
          }
        }
      }
    }

    // Remove duplicates based on unique_id
    const uniqueObjects = Array.from(
      new Set(arrayOfObjects.map((obj) => obj.unique_id)),
    ).map((id) => {
      return arrayOfObjects.find((obj) => obj.unique_id === id);
    });

    this.logger.log(`Processed ${uniqueObjects.length} unique items from search response`);
    return uniqueObjects;
  }

  private async processItemsOneByOne(newData: any[]): Promise<void> {
    if (!newData || newData.length === 0) {
      this.logger.warn('No data to process');
      return;
    }

    this.logger.log(`Processing ${newData.length} items one by one...`);
    
    let processedCount = 0;
    let deletedCount = 0;
    let insertedCount = 0;

    for (const item of newData) {
      try {
        // Step 1: Check if item_id already exists and delete it
        try {
          const deleteResult = await this.hasuraService.deleteItemByItemId(item.item_id);
          console.log('deleteResult', deleteResult);
          if (deleteResult?.data?.delete_ubi_network_cache?.affected_rows > 0) {
            deletedCount++;
            this.logger.log(`Deleted existing item with item_id: ${item.item_id}`);
          }
        } catch (deleteError) {
          // Item might not exist, which is fine
          this.logger.debug(`No existing item found for item_id: ${item.item_id}`);
        }

        // Step 2: Insert the new item
        const insertResult = await this.hasuraService.insertCacheData([item]);
        if (insertResult && insertResult.length > 0 && insertResult[0]?.data?.insert_ubi_network_cache?.returning?.length > 0) {
          insertedCount++;
          this.logger.log(`Inserted new item with item_id: ${item.item_id}`);
        }

        processedCount++;
        
        // Add a small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        this.logger.error(`Error processing item ${item.item_id}:`, error);
        // Continue with next item instead of stopping the entire process
      }
    }

    this.logger.log(`One-by-one processing completed: ${processedCount} items processed, ${deletedCount} deleted, ${insertedCount} inserted`);
  }

  @Cron(process.env.NETWORK_CACHE_REFRESH_CRON_TIME ?? '*/5 * * * *')
  async refreshNetworkCache() {
    try {
      this.logger.log('Network Cache Refresh CRON started at ' + new Date().toISOString());
      
      // Step 1: Call search API with error handling
      let searchResponse;
      try {
        searchResponse = await this.callSearchApi();
        console.log('searchResponse', JSON.stringify(searchResponse?.responses));
        this.logger.log('Search API response received successfully');
      } catch (apiError) {
        this.logger.error('Search API is unavailable (502 Bad Gateway), skipping cache refresh:', apiError.message);
        this.logger.log('Will retry in next cron cycle (5 minutes)');
        return; // Exit gracefully without clearing cache
      }
      
      // Step 2: Process the response
      const processedData = await this.processSearchResponse(searchResponse);
      
      // Only proceed with cache update if we have valid data
      if (processedData && processedData.length > 0) {
        // Step 3: Process items one by one (delete existing, insert new)
        await this.processItemsOneByOne(processedData);
        
        this.logger.log(`Network Cache Refresh CRON completed successfully. Processed ${processedData.length} records at ` + new Date().toISOString());
      } else {
        this.logger.warn('No valid data received from search API, keeping existing cache data');
      }
    } catch (error) {
      this.logger.error('Error in Network Cache Refresh CRON:', error);
      // Don't throw error to prevent cron from stopping
    }
  }
} 