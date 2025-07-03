import { Injectable, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from 'src/logger/logger.service';
import { firstValueFrom } from 'rxjs';
import { ErrorResponse } from 'src/common/responses/error-response';

export interface WalletOnboardRequest {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  username: string;
}

export interface WalletOnboardResponse {
  data: {
    token: string;
  };
}

@Injectable()
export class WalletService {
  private readonly walletBaseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {
    this.walletBaseUrl = this.configService.get<string>('WALLET_BASE_URL');
  }

  async onboardUser(walletData: WalletOnboardRequest): Promise<WalletOnboardResponse> {
    try {
      if (!this.walletBaseUrl) {
        throw new Error('WALLET_BASE_URL is not configured');
      }

      const url = `${this.walletBaseUrl}/api/wallet/onboard`;
      
      this.loggerService.log(`Calling wallet onboard API: ${url}`, 'WalletService');
      
      const response = await firstValueFrom(
        this.httpService.post<WalletOnboardResponse>(url, walletData, {
          timeout: 20000, // 20 seconds timeout
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      this.loggerService.log('Wallet onboard API call successful', 'WalletService');
      
      return response.data;
    } catch (error) {
      this.loggerService.error(
        `Wallet onboard API call failed: ${error.message}`,
        error.stack,
        'WalletService'
      );
      
      if (error.response) {
        // API responded with error status
        throw new ErrorResponse({
          statusCode: HttpStatus.BAD_GATEWAY,
          errorMessage: `Wallet service error: ${error.response.data?.message || error.message}`,
        });
      } else if (error.request) {
        // Network error
        throw new ErrorResponse({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          errorMessage: 'Wallet service is unavailable',
        });
      } else {
        // Other error
        throw new ErrorResponse({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          errorMessage: `Wallet integration error: ${error.message}`,
        });
      }
    }
  }
}
