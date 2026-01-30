/**
 * VC Processing Configuration
 * Centralized configuration for VC processing cron system
 */

export const VC_PROCESSING_CONFIG = {
	/**
	 * Lookback window in minutes from current time
	 * Events within this window from current time will not be processed
	 * Example: If set to 120, cron processes from last_processed_to to (current_time - 120 minutes)
	 */
	lookbackMinutes:
		Number.parseInt(process.env.VC_PROCESSING_LOOKBACK_MINUTES || '120', 10) || 120,
	cronSchedule: process.env.VC_PROCESSING_CRON_SCHEDULE || '0 */2 * * *',
} as const;

export const DHIWAY_ANALYTICS_CONFIG = {
	baseUrl: process.env.DHIWAY_ANALYTICS_BASE_URL || 'https://analytics.depwd.onest.dhiway.net',
	timeoutMs:
		Number.parseInt(process.env.DHIWAY_ANALYTICS_TIMEOUT_MS || '30000', 10) || 30000,
} as const;


