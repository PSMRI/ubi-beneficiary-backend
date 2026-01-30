-- ============================================================================
-- Migration: Create VC Processing Cron System Tables
-- Date: 2025-12-05
-- Description: Creates tables for VC processing cron system
--              - cron_state: Tracks cron job state and last processed timestamp
--              - vc_event_processing_log: Logs VC event processing results for audit and idempotency
--              Tables are created with final structure (includes type column)
-- ============================================================================

-- Create cron_state table
CREATE TABLE IF NOT EXISTS cron_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cron_name VARCHAR(100) UNIQUE NOT NULL,
    last_processed_to TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for cron_name
CREATE INDEX IF NOT EXISTS idx_cron_state_name ON cron_state(cron_name);

-- Add comment
COMMENT ON TABLE cron_state IS 'Stores state for cron jobs including last processed timestamp';

-- Create vc_event_processing_log table
CREATE TABLE IF NOT EXISTS vc_event_processing_log (
    id SERIAL PRIMARY KEY,
    vc_public_id VARCHAR(255) NOT NULL,
    status_processed VARCHAR(20) NOT NULL CHECK (status_processed IN ('success', 'failed')),
    error_message TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    batch_from TIMESTAMPTZ NOT NULL,
    batch_to TIMESTAMPTZ NOT NULL,
    type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for vc_event_processing_log
CREATE INDEX IF NOT EXISTS idx_vc_log_vc_public_id ON vc_event_processing_log(vc_public_id);
CREATE INDEX IF NOT EXISTS idx_vc_log_status ON vc_event_processing_log(status_processed);
CREATE INDEX IF NOT EXISTS idx_vc_log_batch ON vc_event_processing_log(batch_from, batch_to);
CREATE INDEX IF NOT EXISTS idx_vc_log_processed_at ON vc_event_processing_log(processed_at);
CREATE INDEX IF NOT EXISTS idx_vc_log_type ON vc_event_processing_log(type);

-- Add comments
COMMENT ON TABLE vc_event_processing_log IS 'Logs VC event processing results for audit trail and idempotency checks';
COMMENT ON COLUMN vc_event_processing_log.vc_public_id IS 'Public ID (UUID) of the VC record being processed';
COMMENT ON COLUMN vc_event_processing_log.status_processed IS 'Processing status: success or failed';
COMMENT ON COLUMN vc_event_processing_log.batch_from IS 'Start timestamp of the processing batch window';
COMMENT ON COLUMN vc_event_processing_log.batch_to IS 'End timestamp of the processing batch window';
COMMENT ON COLUMN vc_event_processing_log.type IS 'Dhiway Analytics type (record_anchored, record_revoked, record_deleted) stored when first processed';

-- Create initial cron state for dhiway-vc-processing
INSERT INTO cron_state (cron_name, last_processed_to)
VALUES ('dhiway-vc-processing', NOW() - INTERVAL '2 hours')
ON CONFLICT (cron_name) DO NOTHING;

-- ============================================================================
-- Migration Complete
-- ============================================================================

