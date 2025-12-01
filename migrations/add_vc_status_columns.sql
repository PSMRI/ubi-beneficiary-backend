-- Migration: Add VC status tracking columns to user_docs table
-- Date: 2025-12-01
-- Description: Adds columns to track VC lifecycle status (pending, issued, revoked, deleted)
--              Uses existing verified_at column for document verification timestamp

-- Add vc_status column
ALTER TABLE user_docs 
ADD COLUMN IF NOT EXISTS vc_status VARCHAR(50) DEFAULT NULL;

-- Add vc_status_updated_at column
ALTER TABLE user_docs 
ADD COLUMN IF NOT EXISTS vc_status_updated_at TIMESTAMPTZ DEFAULT NULL;

-- Add check constraint to ensure valid status values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_vc_status' 
        AND conrelid = 'user_docs'::regclass
    ) THEN
        ALTER TABLE user_docs
        ADD CONSTRAINT chk_vc_status CHECK (
            vc_status IS NULL OR 
            vc_status IN ('pending', 'issued', 'revoked', 'deleted')
        );
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN user_docs.vc_status IS 'Current status of VC: pending (draft awaiting issuer action), issued (credential issued), revoked (credential revoked), deleted (draft/credential deleted), or null for non-VC documents';
COMMENT ON COLUMN user_docs.vc_status_updated_at IS 'Timestamp when vc_status was last updated by callback';
COMMENT ON COLUMN user_docs.verified_at IS 'Timestamp when document was verified by verification API';

-- Create index for efficient status filtering
CREATE INDEX IF NOT EXISTS idx_user_docs_vc_status ON user_docs(vc_status);

-- Create index for verification timestamp queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_docs_verified_at ON user_docs(verified_at) WHERE verified_at IS NOT NULL;

-- Update existing records with VC public ID to 'pending' if callback is registered
UPDATE user_docs 
SET vc_status = 'pending', 
    vc_status_updated_at = uploaded_at
WHERE vc_public_id IS NOT NULL 
  AND issuance_callback_registered = true
  AND vc_status IS NULL;

-- Update existing verified VC documents to 'issued' and set verification timestamp
UPDATE user_docs 
SET vc_status = 'issued', 
    vc_status_updated_at = uploaded_at,
    verified_at = COALESCE(verified_at, uploaded_at)
WHERE vc_public_id IS NOT NULL 
  AND doc_verified = true
  AND vc_status IS NULL;

-- Set verified_at for already verified documents without VC (if not already set)
UPDATE user_docs 
SET verified_at = uploaded_at
WHERE doc_verified = true
  AND verified_at IS NULL;
