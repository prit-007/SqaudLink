-- ========================================
-- Supabase Storage Setup for Image Uploads
-- ========================================
-- Run this in your Supabase SQL Editor
-- This will create a public bucket for chat media with proper access policies

-- 1. Create a public bucket named 'chat-media'
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
values (
  'chat-media', 
  'chat-media', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

-- 2. Allow anyone to VIEW images (Public Access)
-- This is safe because the bucket is public and URLs are unguessable
create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'chat-media' );

-- 3. Allow authenticated users to UPLOAD images
create policy "Authenticated Upload" 
on storage.objects for insert 
with check ( 
  bucket_id = 'chat-media' 
  and auth.role() = 'authenticated' 
);

-- 4. Allow users to DELETE their own uploads
create policy "Users can delete own images" 
on storage.objects for delete 
using ( 
  bucket_id = 'chat-media' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Verify the bucket was created
select * from storage.buckets where id = 'chat-media';

-- ✅ Expected output:
-- id: chat-media
-- name: chat-media
-- public: true
-- file_size_limit: 52428800
-- allowed_mime_types: {image/jpeg, image/jpg, image/png, image/gif, image/webp}
