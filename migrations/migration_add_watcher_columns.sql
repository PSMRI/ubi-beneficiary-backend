-- Migration: Add watcher columns to user_docs table
-- Run this SQL script to add the new columns for watcher functionality

-- Add watcher_registered column
ALTER TABLE user_docs 
ADD COLUMN watcher_registered BOOLEAN DEFAULT FALSE;

-- Add watcher_email column
ALTER TABLE user_docs 
ADD COLUMN watcher_email VARCHAR(255);

-- Add watcher_callback_url column
ALTER TABLE user_docs 
ADD COLUMN watcher_callback_url VARCHAR(500);

-- Add comments for documentation
COMMENT ON COLUMN user_docs.watcher_registered IS 'Indicates if a watcher is registered for this document';
COMMENT ON COLUMN user_docs.watcher_email IS 'Email address used for watcher registration';
COMMENT ON COLUMN user_docs.watcher_callback_url IS 'Callback URL for watcher notifications';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_docs_watcher_registered ON user_docs(watcher_registered);
CREATE INDEX IF NOT EXISTS idx_user_docs_imported_from ON user_docs(imported_from);