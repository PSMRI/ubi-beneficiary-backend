-- Migration to add VC callback tracking columns to user_docs table
-- Run this migration to add support for VC issuance callback processing
-- This migration is idempotent and safe to run multiple times

-- Add issuance_callback_registered column
ALTER TABLE user_docs 
ADD COLUMN IF NOT EXISTS issuance_callback_registered BOOLEAN DEFAULT FALSE NOT NULL;

-- Add vc_public_id column to store the public ID (UUID) for VC callbacks
ALTER TABLE user_docs 
ADD COLUMN IF NOT EXISTS vc_public_id VARCHAR(255) NULL;

-- Add comments for documentation
COMMENT ON COLUMN user_docs.issuance_callback_registered IS 'Indicates if document needs issuance callback processing (true for VC creation, false for direct upload)';
COMMENT ON COLUMN user_docs.vc_public_id IS 'Public ID (UUID) from VC issuance platform for callback processing';

-- Create index for vc_public_id for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_docs_vc_public_id ON user_docs(vc_public_id);
