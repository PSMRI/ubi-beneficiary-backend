import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3StorageAdapter } from './adapters/s3.storage.adapter';
import { LocalStorageAdapter } from './adapters/local-storage.adapter';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'FileStorageService',
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('StorageProviderModule');
        const provider = configService.get<string>('FILE_STORAGE_PROVIDER', 'local');
        
        logger.log(`Initializing file storage provider: ${provider}`);
        
        if (provider === 's3') {
          // Validate S3 configuration
          const requiredS3Config = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET_NAME'];
          const missingConfig = requiredS3Config.filter(key => !configService.get(key));
          if (missingConfig.length > 0) {
            logger.error(`Missing S3 configuration: ${missingConfig.join(', ')}`);
            throw new Error(`Missing S3 configuration: ${missingConfig.join(', ')}`);
          }
          logger.log('Using S3 storage adapter');
          return new S3StorageAdapter();
        } else if (provider === 'local' || !provider) {
          logger.log('Using local storage adapter');
          return new LocalStorageAdapter();
        } else {
          throw new Error(`Invalid FILE_STORAGE_PROVIDER: ${provider}. Must be 's3' or 'local'`);
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: ['FileStorageService'],
})
export class StorageProviderModule { }
