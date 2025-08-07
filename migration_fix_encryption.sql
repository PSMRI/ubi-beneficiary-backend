-- Migration: Fix encryption key change issue
-- This script handles the encryption key change by clearing encrypted data
-- that can no longer be decrypted with the new key

-- Clear encrypted data in user_docs table that might be causing decryption errors
UPDATE user_docs 
SET doc_data = NULL 
WHERE doc_data IS NOT NULL 
AND doc_data != '';

-- Clear any encrypted data in user_info table
UPDATE user_info 
SET info_data = NULL 
WHERE info_data IS NOT NULL 
AND info_data != '';

-- Clear any encrypted data in user_applications table
UPDATE user_applications 
SET application_data = '{}'::jsonb 
WHERE application_data IS NOT NULL;

-- Add a comment to track this migration
COMMENT ON TABLE user_docs IS 'Encryption key changed - old encrypted data cleared on 2025-08-04'; 