import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { DHIWAY_ANALYTICS_CONFIG } from '../../config/vc-processing.config';

export interface AnalyticsRecord {
	type: string;
	record_public_id: string;
}

export interface AnalyticsResponse {
	success: boolean;
	data: AnalyticsRecord[];
}

@Injectable()
export class DhiwayAnalyticsService {
	private readonly logger = new Logger(DhiwayAnalyticsService.name);
	private readonly baseUrl: string;
	private readonly timeoutMs: number;

	constructor() {
		this.baseUrl = DHIWAY_ANALYTICS_CONFIG.baseUrl;
		this.timeoutMs = DHIWAY_ANALYTICS_CONFIG.timeoutMs;
	}

	/**
	 * Fetch VC summary from Dhiway Analytics API for a given time window
	 * @param from - Start timestamp (ISO 8601 format)
	 * @param to - End timestamp (ISO 8601 format)
	 * @returns AnalyticsResponse with array of records
	 */
	async getSummaryForVC(from: string, to: string): Promise<AnalyticsResponse> {
		try {
			const url = `${this.baseUrl}/api/v1/analytics/summaryForVC/${from}/${to}`;
			this.logger.log(
				`Fetching VC summary from Dhiway Analytics: ${from} to ${to}`,
			);

			const response = await axios.get<any>(url, {
				timeout: this.timeoutMs,
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
			});

			if (!response.data) {
				throw new Error('Empty response from Dhiway Analytics API');
			}

			// response.data is the actual API response object
			const apiResponse = response.data;

			// Log raw response for debugging
			this.logger.debug(
				`Raw API response structure: success=${apiResponse?.success}, data type=${Array.isArray(apiResponse?.data) ? 'array' : typeof apiResponse?.data}, data length=${apiResponse?.data?.length || 0}`,
			);

			// Handle response structure - API returns { success: true, data: [...] }
			if (!apiResponse) {
				throw new Error('Empty response from Dhiway Analytics API');
			}

			// Normalize the response to match our interface
			// Extract only type and record_public_id from each record
			const normalizedResponse: AnalyticsResponse = {
				success: apiResponse.success === true || apiResponse.success === 'true',
				data: Array.isArray(apiResponse.data)
					? apiResponse.data
							.map((item: any) => {
								// Extract required fields, handle missing record_public_id
								if (!item.record_public_id) {
									this.logger.warn(
										`Record missing record_public_id: ${JSON.stringify(item)}`,
									);
									return null;
								}
								return {
									type: item.type || '',
									record_public_id: item.record_public_id,
								};
							})
							.filter((item: any) => item !== null) // Remove null entries
					: [],
			};

			this.logger.log(
				`Successfully fetched ${normalizedResponse.data.length} records from Dhiway Analytics (normalized from ${apiResponse.data?.length || 0} raw records)`,
			);

			return normalizedResponse;
		} catch (error) {
			this.logger.error(
				`Failed to fetch VC summary from Dhiway Analytics: ${error.message}`,
				error.stack,
			);

			if (axios.isAxiosError(error)) {
				const status = error.response?.status;
				const message =
					error.response?.data?.message || error.message;

				if (status === 404) {
					throw new Error(
						`Dhiway Analytics endpoint not found. Check base URL configuration.`,
					);
				}

				if (status && status >= 500) {
					throw new Error(
						`Dhiway Analytics API server error: ${message} (Status: ${status})`,
					);
				}

				throw new Error(
					`Dhiway Analytics API error: ${message} (Status: ${status || 'Unknown'})`,
				);
			}

			throw new Error(
				`Failed to fetch VC summary: ${error.message || 'Unknown error'}`,
			);
		}
	}
}


