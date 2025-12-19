import { createClient } from '@/utils/supabase/client'

/**
 * Generate unique filename using crypto API
 */
function generateUniqueFileName(originalName: string): string {
  const fileExt = originalName.split('.').pop()
  const timestamp = Date.now()
  const randomString = crypto.randomUUID().split('-')[0]
  return `${timestamp}_${randomString}.${fileExt}`
}

/**
 * Upload media file to Supabase Storage
 * @param file - The file to upload
 * @param userId - Optional user ID for organizing files
 * @returns Public URL of the uploaded file
 */
export async function uploadMedia(file: File, userId?: string): Promise<string> {
  const supabase = createClient()
  
  // 1. Generate unique file path
  const fileName = generateUniqueFileName(file.name)
  
  // Organize by user ID if provided
  const filePath = userId ? `${userId}/${fileName}` : fileName

  // 2. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('chat-media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  // 3. Get Public URL
  const { data } = supabase.storage
    .from('chat-media')
    .getPublicUrl(filePath)

  return data.publicUrl
}

/**
 * Delete media from Supabase Storage
 * @param url - The public URL of the file to delete
 */
export async function deleteMedia(url: string): Promise<void> {
  const supabase = createClient()
  
  // Extract file path from URL
  const urlParts = url.split('/chat-media/')
  if (urlParts.length < 2) {
    throw new Error('Invalid media URL')
  }
  
  const filePath = urlParts[1]
  
  const { error } = await supabase.storage
    .from('chat-media')
    .remove([filePath])

  if (error) {
    console.error('Delete error:', error)
    throw new Error(`Delete failed: ${error.message}`)
  }
}
