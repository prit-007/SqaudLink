-- ========================================
-- Update Existing Storage Bucket Configuration
-- ========================================
-- Run this in Supabase SQL Editor to add size limits and MIME type restrictions

-- Update the chat-media bucket with proper constraints
UPDATE storage.buckets
SET 
  file_size_limit = 52428800, -- 50MB limit
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'video/webm', 'video/mp4']
WHERE id = 'chat-media';

-- Verify the update
SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'chat-media';

-- ✅ Expected output:
-- id: chat-media
-- name: chat-media
-- public: true
-- file_size_limit: 52428800
-- allowed_mime_types: {image/jpeg, image/jpg, image/png, image/gif, image/webp, audio/webm, audio/ogg, audio/mpeg, video/webm, video/mp4}
