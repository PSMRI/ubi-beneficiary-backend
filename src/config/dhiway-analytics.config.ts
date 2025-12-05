/**
 * Dhiway Analytics Type to Status Mapping Configuration
 * Maps Dhiway Analytics API response types to internal VC status values
 */

export const DHIWAY_TYPE_STATUS_MAP = {
	record_anchored: 'issued',
	record_updated: 'issued', // record_updated is treated as issued (update to existing VC)
	record_revoked: 'revoked',
	record_deleted: 'deleted',
} as const;

export type DhiwayAnalyticsType = keyof typeof DHIWAY_TYPE_STATUS_MAP;
export type InternalVcStatus = 'issued' | 'revoked' | 'deleted';

/**
 * Maps Dhiway Analytics type to internal VC status
 * @param type - The type from Dhiway Analytics API
 * @returns Internal VC status or null if mapping not found
 */
export function mapDhiwayTypeToStatus(
	type: string,
): InternalVcStatus | null {
	return (
		(DHIWAY_TYPE_STATUS_MAP[type as DhiwayAnalyticsType] as
			| InternalVcStatus
			| undefined) || null
	);
}


