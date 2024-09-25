import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerService } from 'src/logger/logger.service';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { ProxyService } from 'src/services/proxy/proxy.service';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponseCache } from 'src/entity/response.entity';


@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([ResponseCache])],
  controllers: [ContentController],
  providers: [ContentService, HasuraService, ProxyService, LoggerService]
})
export class ContentModule {}
