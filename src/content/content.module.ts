import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerService } from 'src/logger/logger.service';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { ProxyService } from 'src/services/proxy/proxy.service';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponseCache } from 'src/entity/response.entity';
import { NetworkCache } from 'src/entity/network-cache.entity';
import { EncryptionService } from 'src/common/helper/encryptionService';
import { UserModule } from '../modules/users/users.module';
import { NetworkCacheRefreshCron } from './network-cache-refresh.cron';
import { AuthModule } from '../modules/auth/auth.module';
@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([ResponseCache, NetworkCache]), forwardRef(() => UserModule), AuthModule],
  controllers: [ContentController],
  providers: [ContentService, HasuraService, ProxyService, LoggerService, EncryptionService, NetworkCacheRefreshCron],
  exports: [ContentService]
})
export class ContentModule {}
