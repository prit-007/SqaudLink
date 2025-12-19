# 📸 Image Upload Implementation Guide

## ✅ What Was Implemented

### 1. Supabase Storage Utility
**File**: `src/utils/uploadMedia.ts`
- Upload images to Supabase Storage bucket
- Generate unique file names with timestamps
- Get public URLs for uploaded files
- Delete media files when needed
- Proper error handling

### 2. Optimistic Image Messages
**File**: `src/hooks/useChatMessages.ts`
- **Instant Preview**: Images appear immediately using `URL.createObjectURL()`
- **Background Upload**: File uploads to Supabase Storage while user sees preview
- **Auto-Swap**: Once uploaded, optimistic message is replaced with real message from database
- **E2EE Compatible**: Text captions are still encrypted

### 3. UI Integration
**Files**: 
- `src/components/chat/ChatInput.tsx` - File input with attach button
- `src/app/chat/[id]/page.tsx` - File selection handler

## 🚀 Setup Instructions

### Step 1: Create Storage Bucket in Supabase

Run this SQL in your **Supabase SQL Editor**:

```sql
-- Run the entire db/storage_setup.sql file
```

Or manually:
1. Go to your Supabase Dashboard
2. Navigate to **Storage** → **Create a new bucket**
3. Name: `chat-media`
4. Public: ✅ **Yes**
5. File size limit: `50 MB`
6. Allowed MIME types: `image/jpeg, image/png, image/gif, image/webp`

### Step 2: Verify Policies

Check that these policies exist in **Storage** → **Policies**:

1. ✅ **Public Access** (SELECT) - Anyone can view images
2. ✅ **Authenticated Upload** (INSERT) - Logged-in users can upload
3. ✅ **Users can delete own images** (DELETE) - Users can delete their uploads

### Step 3: Test the Feature

1. Start your dev server: `npm run dev`
2. Login to the app
3. Open a chat
4. Click the **paperclip/attach button** in the input
5. Select an image from your device
6. **Watch the magic**:
   - Image appears **instantly** (0ms preview)
   - While you see it, it's uploading in background
   - Status indicator shows upload progress
   - Once uploaded, the real Supabase URL replaces the preview

## 📱 How It Works

### User Flow
```
1. User clicks attach → File picker opens
2. User selects image.jpg
3. App creates blob URL → Shows immediately in chat (OPTIMISTIC)
4. App uploads to Supabase Storage (BACKGROUND)
5. App gets public URL from Supabase
6. App saves message to database with real URL
7. Realtime subscription updates all devices
```

### Technical Flow
```typescript
// INSTANT PREVIEW (0ms)
const blobUrl = URL.createObjectURL(file) // "blob:http://localhost:3000/abc123"
setMessages([...messages, { media_url: blobUrl, is_optimistic: true }])

// BACKGROUND UPLOAD (2-5 seconds)
const publicUrl = await uploadMedia(file) // "https://xxx.supabase.co/storage/v1/..."
await supabase.from('messages').insert({ media_url: publicUrl })

// AUTO-SYNC (realtime)
// Realtime subscription receives new message with real URL
// Replaces optimistic message automatically
```

## 🎯 Features Included

- ✅ **Optimistic UI**: 0ms latency preview
- ✅ **Background Upload**: Non-blocking
- ✅ **Error Handling**: Rollback on failure
- ✅ **Mobile Support**: Native file picker
- ✅ **Desktop Support**: Drag-and-drop ready
- ✅ **File Validation**: Image types only
- ✅ **Size Limits**: 50MB max per file
- ✅ **Lazy Loading**: Images load on scroll
- ✅ **E2EE Compatible**: Text still encrypted

## 🔒 Security

- ✅ Public bucket (read access for all)
- ✅ Authenticated uploads only
- ✅ Users can only delete their own files
- ✅ MIME type validation
- ✅ File size limits enforced
- ✅ Unguessable file names (timestamp + random)

## 🐛 Troubleshooting

### "Upload failed: permission denied"
- Check if you ran the SQL migration
- Verify the `Authenticated Upload` policy exists
- Make sure user is logged in

### "Bucket not found"
- Run `db/storage_setup.sql` in Supabase SQL Editor
- Check Storage → Buckets → Should see `chat-media`

### Images not loading
- Check browser console for errors
- Verify bucket is set to **Public**
- Check if URL is correct in database

### Optimistic image stuck
- This means upload failed
- Check network tab for errors
- Message should auto-rollback after 5 seconds

## 🎨 UI Polish (Already Included)

- Image previews in message bubbles
- Max height: 400px (responsive)
- Lazy loading for performance
- Rounded corners with border
- Expiring image indicator (for 24hr stories)
- Upload progress feedback

## 🚀 Next Steps (Optional)

1. **Drag & Drop**: Add drag-and-drop file upload
2. **Multiple Images**: Send multiple images at once
3. **Image Compression**: Compress before upload (use `sharp` or `browser-image-compression`)
4. **Stories**: Implement 24hr expiring images
5. **Video Support**: Add video upload (change MIME types)
6. **Voice Messages**: Add audio recording

---

**Ready to test?** Just run the SQL migration and try uploading an image! 🎉
