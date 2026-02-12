'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { uploadMedia } from '@/utils/uploadMedia'
import CloseIcon from '@mui/icons-material/Close'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import SendIcon from '@mui/icons-material/Send'
import CircularProgress from '@mui/material/CircularProgress'

interface StoryUploadProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function StoryUpload({ open, onClose, onSuccess }: StoryUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [caption, setCaption] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const mediaUrl = await uploadMedia(selectedFile, user.id)
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24)

        await supabase.from('stories').insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: selectedFile.type.startsWith('video') ? 'video' : 'image',
          caption: caption.trim() || null,
          expires_at: expiresAt.toISOString(),
        })
        onSuccess?.()
        handleClose()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setPreviewUrl('')
    setSelectedFile(null)
    setCaption('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full h-full md:max-w-[450px] md:max-h-[850px] md:rounded-3xl bg-zinc-900 overflow-hidden flex flex-col shadow-2xl border border-white/10"
          >
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
              <button onClick={handleClose} className="p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors">
                <CloseIcon />
              </button>
              <span className="font-semibold text-white">New Story</span>
              <div className="w-10" />
            </div>

            {/* Main Area */}
            <div className="flex-1 relative bg-zinc-900 flex items-center justify-center">
              {!previewUrl ? (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-4 text-zinc-400 hover:text-white transition-colors group"
                >
                  <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border-2 border-dashed border-zinc-700 group-hover:border-zinc-500 transition-colors">
                    <AddPhotoAlternateIcon sx={{ fontSize: 48 }} />
                  </div>
                  <span className="text-sm font-medium">Select Media</span>
                </button>
              ) : (
                <>
                  {selectedFile?.type.startsWith('video') ? (
                    <video src={previewUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                  ) : (
                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                  )}
                  
                  {/* Caption Input Overlay */}
                  <div className="absolute bottom-32 left-0 right-0 px-6 text-center">
                    <input
                      type="text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Add a caption..."
                      className="w-full bg-black/40 backdrop-blur-md text-white placeholder-white/60 text-center py-3 px-4 rounded-2xl border border-white/10 outline-none focus:bg-black/60 transition-all shadow-lg"
                    />
                  </div>
                </>
              )}
              
              <input ref={fileInputRef} type="file" accept="image/*,video/*" hidden onChange={handleFileSelect} />
            </div>

            {/* Bottom Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent z-20 flex justify-center">
              {previewUrl && (
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-full font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 w-full justify-center"
                >
                  {isUploading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <>
                      Share to Story <SendIcon fontSize="small" />
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}