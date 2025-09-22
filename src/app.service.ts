import { Injectable } from '@nestjs/common';
import { ProxyService } from '@services/proxy/proxy.service';


@Injectable()
export class AppService {
  constructor(
    private readonly proxyService: ProxyService,
    
  ) {}
  getHello(): string {
    return 'scholarship-backend is running!!!';
  }

}
