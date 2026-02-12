-- Migration: Add message status and change content to JSONB for E2EE
-- Date: 2025-12-22

-- 1. Create message_status enum
DO $$ BEGIN
    CREATE TYPE message_status AS ENUM ('sending', 'sent', 'read');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Update messages table
-- Use to_jsonb to safely convert existing plaintext to JSON strings
ALTER TABLE public.messages 
  ALTER COLUMN content TYPE jsonb USING to_jsonb(content),
  ADD COLUMN IF NOT EXISTS status message_status DEFAULT 'sending';
