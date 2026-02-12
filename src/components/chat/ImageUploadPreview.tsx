'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import CropIcon from '@mui/icons-material/Crop' // Aesthetic placeholder
import { IconButton } from '@mui/material'

interface ImageUploadPreviewProps {
  onImageSelected: (file: File, preview: string) => void
  onCancel: () => void
}

export default function ImageUploadPreview({ onImageSelected, onCancel }: ImageUploadPreviewProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-trigger file picker on mount if no preview
  useEffect(() => {
    if (!preview && fileInputRef.current) {
        fileInputRef.current.click()
    }
  }, [preview])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
        // If user cancels file picker on initial load, trigger cancel
        if (!preview) onCancel()
    }
  }

  const handleSend = () => {
    if (selectedFile && preview) {
      onImageSelected(selectedFile, preview)
      setPreview(null)
      setSelectedFile(null)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md"
          >
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
              <IconButton onClick={onCancel} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
                <CloseIcon />
              </IconButton>
              <span className="text-white/70 text-sm font-medium">Preview</span>
              <IconButton disabled sx={{ opacity: 0 }}>
                <CropIcon />
              </IconButton>
            </div>

            {/* Main Image Area */}
            <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden">
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={preview}
                alt="Upload Preview"
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl shadow-black/50"
              />
            </div>

            {/* Bottom Floating Control Bar */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center gap-4 bg-zinc-900/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full shadow-2xl"
              >
                <button 
                  onClick={onCancel}
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors px-2"
                >
                  Discard
                </button>
                
                <div className="w-[1px] h-6 bg-white/10" />

                <button
                  onClick={handleSend}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                  <span>Send</span>
                  <SendIcon sx={{ fontSize: 18 }} />
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}