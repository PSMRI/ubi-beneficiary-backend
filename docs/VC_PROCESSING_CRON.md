# VC Processing Cron System

## Overview

The VC Processing Cron System automatically processes Verifiable Credential (VC) events from Dhiway Analytics API in time-based windows. It runs on a configurable schedule (default: every 2 hours) and processes events from the last processed timestamp up to the current time minus a lookback window.

## Architecture

### Components

1. **DhiwayVcProcessingCron** (`src/modules/users/crons/dhiway-vc-processing.cron.ts`)
   - Main cron worker that runs on schedule
   - Manages time windows and state
   - Processes records from Analytics API

2. **VcProcessingService** (`src/modules/users/services/vc-processing.service.ts`)
   - Extracted business logic from `UserService.processVcEvent()`
   - Processes VC events without HTTP responses
   - Handles document updates, verification, and profile updates

3. **DhiwayAnalyticsService** (`src/services/dhiway-analytics/dhiway-analytics.service.ts`)
   - Fetches VC summary data from Dhiway Analytics API
   - Handles API errors and timeouts

4. **Entities**
   - `CronState` - Tracks last processed timestamp
   - `VcEventProcessingLog` - Logs processing results for audit and idempotency

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Dhiway Analytics API Configuration
DHIWAY_ANALYTICS_BASE_URL=https://api.dhiway.net
DHIWAY_ANALYTICS_TIMEOUT_MS=30000

# VC Processing Configuration
VC_PROCESSING_LOOKBACK_MINUTES=120  # Lookback window in minutes from current time (120 = 2 hours). Events within this window from current time will not be processed.
VC_PROCESSING_CRON_SCHEDULE=0 */2 * * *  # Cron schedule (default: every 2 hours)
```

### Cron Schedule Format

The cron schedule follows standard cron format: `minute hour day month day-of-week`

Examples:
- `0 */2 * * *` - Every 2 hours at minute 0
- `0 */4 * * *` - Every 4 hours at minute 0
- `0 9,17 * * *` - At 9 AM and 5 PM daily

### Type Mapping

Dhiway Analytics types are mapped to internal VC statuses in `src/config/dhiway-analytics.config.ts`:

- `record_anchored` → `issued`

Add more mappings as needed for future types.

## Database Setup

### Run Migration

Execute the migration script to create required tables:

```bash
psql -U your_user -d your_database -f migrations/create_vc_processing_cron_tables.sql
```

Or manually run the SQL from `migrations/create_vc_processing_cron_tables.sql`.

### Tables Created

1. **cron_state**
   - Stores cron job state
   - Tracks `last_processed_to` timestamp
   - Initialized with default values on first run

2. **vc_event_processing_log**
   - Logs all processing attempts
   - Used for idempotency checks
   - Provides audit trail

## How It Works

### Time Window Processing

1. **First Run**: Initializes `cron_state` with `last_processed_to = NOW() - lookback_minutes`
2. **Subsequent Runs**:
   - Reads `last_processed_to` from `cron_state`
   - Calculates time window: `from = last_processed_to`, `to = NOW() - lookback_minutes`
   - This ensures we don't process events that are too recent (within the lookback window)
   - Processes all records in that window
   - Updates `last_processed_to` to `to` after successful batch

### Processing Flow

```
1. Cron triggers at scheduled time
2. Load/initialize cron state
3. Calculate time window (from, to)
4. Call Dhiway Analytics API: GET /analytics/summaryForVC/{from}/{to}
5. For each record:
   - Map type → status (record_anchored → issued)
   - Check idempotency (already processed in this batch?)
   - Call VcProcessingService.processVcEventInternal()
   - Log result to vc_event_processing_log
6. Update cron_state.last_processed_to
7. Log completion metrics
```

### Idempotency

- Checks `vc_event_processing_log` for records already processed in the same batch
- Prevents duplicate processing if cron runs multiple times
- Safe to process same `vc_public_id` multiple times (document updates are idempotent)

## Error Handling

- **Analytics API Errors**: Logged and batch processing stops (state not updated)
- **Individual Record Failures**: Logged, processing continues for remaining records
- **Missing Documents**: Logged as warning, skipped
- **Processing Errors**: Logged to `vc_event_processing_log` with error message

Failed records will be picked up in the next cron run if they fall within the time window.

## Monitoring

### Logs

All logs include service context: `dhiway-vc-processing`

Key log messages:
- `Starting VC processing cron job` - Cron start
- `Processing time window: {from} to {to}` - Window being processed
- `Found {count} records to process` - Records found
- `Successfully processed record {id}` - Success
- `Failed to process record {id}` - Failure
- `Completed processing. Success: X, Failed: Y` - Summary

### Database Queries

**Check last processed time:**
```sql
SELECT last_processed_to FROM cron_state WHERE cron_name = 'dhiway-vc-processing';
```

**View processing logs:**
```sql
SELECT * FROM vc_event_processing_log 
WHERE processed_at > NOW() - INTERVAL '24 hours'
ORDER BY processed_at DESC;
```

**Success rate:**
```sql
SELECT 
  status_processed,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM vc_event_processing_log
WHERE processed_at > NOW() - INTERVAL '24 hours'
GROUP BY status_processed;
```

## Troubleshooting

### Cron Not Running

1. Check if `ScheduleModule.forRoot()` is imported in `users.module.ts`
2. Verify cron schedule format is correct
3. Check application logs for errors

### No Records Processed

1. Check `cron_state.last_processed_to` - may be ahead of current time
2. Verify Analytics API is returning data for the time window
3. Check Analytics API base URL configuration

### Failed Records

1. Check `vc_event_processing_log` for error messages
2. Verify documents exist with matching `vc_public_id`
3. Check adapter processing logs

### Reset Cron State

To reset and start from a specific time:

```sql
UPDATE cron_state 
SET last_processed_to = '2025-12-04T10:00:00Z'
WHERE cron_name = 'dhiway-vc-processing';
```

## API Endpoint

The existing `/users/vc/process-event` API endpoint remains unchanged and continues to work independently. The cron system uses the same business logic internally without triggering the API.

## Future Enhancements

- Add retry mechanism for failed records (if needed)
- Add metrics/alerting integration
- Support for multiple issuer types
- Batch size limits for large datasets



