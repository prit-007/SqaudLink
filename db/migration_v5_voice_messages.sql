-- Add 'audio' to message_type enum
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'audio';

-- Add columns for voice messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS voice_duration integer, -- Duration in seconds
ADD COLUMN IF NOT EXISTS voice_waveform jsonb, -- Array of amplitude values for visualization
ADD COLUMN IF NOT EXISTS media_type text; -- MIME type (e.g., 'audio/webm', 'image/jpeg')

-- Update RLS if needed (usually not for new columns if table already has policies)
