import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HasuraService } from './services/hasura/hasura.service';
import { ProxyService } from './services/proxy/proxy.service';
import { LoggerService } from './logger/logger.service';
import { ContentModule } from './content/content.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentService } from './content/content.service';
import { ResponseCache } from './entity/response.entity';


@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: '',
      host: '',
      port: "",
      username: '',
      password: '=',
      database: '',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: true
    }),
    TypeOrmModule.forFeature([ResponseCache]),
    ConfigModule.forRoot({ isGlobal: true }),
    {
      ...HttpModule.register({}),
      global: true,
    },
    ContentModule
  ],
  controllers: [AppController],
  providers: [AppService, HasuraService, ProxyService, LoggerService, ContentService],
})
export class AppModule {}
