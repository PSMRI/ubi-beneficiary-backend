import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { SuccessResponse } from 'src/common/responses/success-response';
import { ErrorResponse } from 'src/common/responses/error-response';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface ConfigMapping {
	key: string;
	value: any;
}

@Injectable()
export class AdminService {
	private readonly issuerSdkUrl: string;

	constructor(
		@InjectRepository(Setting)
		private settingRepository: Repository<Setting>,
		private readonly httpService: HttpService,
		private readonly configService: ConfigService,
	) {
		this.issuerSdkUrl = this.configService.get<string>(
			'VC_VERIFICATION_SERVICE_URL',
		);
	}

	async createOrUpdateConfig(
		mapping: ConfigMapping,
		userId: string,
	): Promise<SuccessResponse | ErrorResponse> {
		try {
			// Check if setting with this key exists
			const existingSetting = await this.settingRepository.findOne({
				where: { key: mapping.key },
			});

			let savedMapping;
			if (existingSetting) {
				// Update existing setting
				existingSetting.value = mapping.value;
				existingSetting.updatedBy = userId;
				savedMapping = await this.settingRepository.save(existingSetting);
				Logger.debug('Updated existing mapping:', savedMapping);
			} else {
				// Create new setting
				const newMapping = this.settingRepository.create({
					key: mapping.key,
					value: mapping.value,
					createdBy: userId,
					updatedBy: userId,
				});
				savedMapping = await this.settingRepository.save(newMapping);
			}

			return new SuccessResponse({
				statusCode: HttpStatus.OK,
				message: 'Config saved successfully.',
				data: savedMapping,
			});
		} catch (error) {
			Logger.error('Error saving mapping:', error);
			return new ErrorResponse({
				statusCode: HttpStatus.NOT_FOUND,
				errorMessage: error.message,
			});
		}
	}

	async getConfig(key: string): Promise<SuccessResponse | ErrorResponse> {
		try {
			const setting = await this.getConfigByKey(key);

			if (!setting) {
				return new ErrorResponse({
					statusCode: HttpStatus.NOT_FOUND,
					errorMessage: `No setting found with key: ${key}`,
				});
			}
			return new SuccessResponse({
				statusCode: HttpStatus.OK,
				message: 'Config retrieved successfully',
				data: setting,
			});
		} catch (error) {
			Logger.error('Error in getConfig:', error);
			return new ErrorResponse({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				errorMessage:
					'An unexpected error occurred while retrieving the configuration',
			});
		}
	}

	async getConfigByKey(key: string): Promise<Setting> {
		return await this.settingRepository.findOne({
			where: { key },
			order: { created: 'DESC' },
		});
	}

	/**
	 * Get available issuers from the SDK
	 * @param type Optional filter by issuer type (online/offline)
	 * @returns List of available issuers
	 */
	async getIssuers(type?: string): Promise<any> {
		try {
			// Build URL with optional type filter
			let url = `${this.issuerSdkUrl}/issuers`;
			if (type) {
				url += `?type=${type}`;
			}

			Logger.log(`Fetching issuers from: ${url}`, 'AdminService');

			// Make HTTP request to the issuer SDK
			const response = await firstValueFrom(
				this.httpService.get(url, {
					timeout: 10000, // 10 seconds timeout
				}),
			);

			return new SuccessResponse({
				statusCode: HttpStatus.OK,
				message: 'Issuers retrieved successfully',
				data: response.data,
			});
		} catch (error) {
			Logger.error('Error fetching issuers:', error.message, 'AdminService');

			// Handle different error types
			if (error.code === 'ECONNREFUSED') {
				return new ErrorResponse({
					statusCode: HttpStatus.SERVICE_UNAVAILABLE,
					errorMessage:
						'Issuer SDK service is unavailable. Please check if the service is running.',
				});
			}

			if (error.response) {
				return new ErrorResponse({
					statusCode: error.response.status || HttpStatus.BAD_REQUEST,
					errorMessage:
						error.response.data?.message || 'Failed to fetch issuers from SDK',
				});
			}

			return new ErrorResponse({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				errorMessage: 'An unexpected error occurred while fetching issuers',
			});
		}
	}
}
