import { Injectable } from '@nestjs/common';
import { ProxyService } from '@services/proxy/proxy.service';
import { LoggerService } from './logger/logger.service';

@Injectable()
export class AppService {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly logger: LoggerService,
  ) {}
  
  getHello(): string {
    return 'scholarship-backend is running!!!';
  }

}
