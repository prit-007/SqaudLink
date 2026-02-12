'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconButton, Fab } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import AddIcon from '@mui/icons-material/Add'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions'
import MicIcon from '@mui/icons-material/Mic'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import ReplyPreview from './ReplyPreview'
import EmojiPicker from './EmojiPicker'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onAttach?: () => void
  onImageUpload?: (file: File) => void
  onVoiceUpload?: (blob: Blob, duration: number) => void
  placeholder?: string
  replyingTo?: any
  onCancelReply?: () => void
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  onAttach,
  onImageUpload,
  onVoiceUpload,
  placeholder = 'Type a message...',
  replyingTo,
  onCancelReply
}: ChatInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null) // Fixed: Initialized with null

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []
      
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data)
      }

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' })
        if (onVoiceUpload) onVoiceUpload(blob, duration)
        
        // Cleanup tracks
        stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorder.current.start()
      setIsRecording(true)
      setDuration(0)
      
      // Clear existing timer if any
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => setDuration(p => p + 1), 1000)
      
    } catch (e) {
      console.error('Mic access denied', e)
    }
  }

  const stopRecording = (cancel = false) => {
    if (mediaRecorder.current && isRecording) {
      if (cancel) {
        // Prevent onstop from triggering upload
        mediaRecorder.current.onstop = null
        // Manually stop tracks since we removed the handler
        mediaRecorder.current.stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.current.stop()
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = () => setImgPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const sendImage = () => {
    if (selectedFile && onImageUpload) onImageUpload(selectedFile)
    cancelImage()
  }

  const cancelImage = () => {
    setImgPreview(null)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <div className="w-full mx-auto max-w-4xl">
      {/* Image Preview Overlay */}
      <AnimatePresence>
        {imgPreview && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-full left-0 right-0 p-4 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl z-50 flex flex-col items-center gap-4"
          >
             <div className="relative w-full max-h-[60vh] rounded-2xl overflow-hidden border border-white/10">
               <img src={imgPreview} className="w-full h-full object-contain bg-black/50" alt="Preview" />
               <button onClick={cancelImage} className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors">
                 <CloseIcon />
               </button>
             </div>
             <button onClick={sendImage} className="w-full py-3 bg-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-colors">
               Send Photo
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-2 md:p-3 rounded-[2rem] shadow-2xl flex items-end gap-2 transition-all">
        
        {/* Actions / Attachments */}
        <div className="flex items-center pb-1">
          <IconButton 
             onClick={() => fileInputRef.current?.click()}
             sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'transparent' } }}
          >
            <AddIcon className={`transition-transform ${value ? 'rotate-45' : ''}`} />
          </IconButton>
        </div>

        {/* Input Area */}
        <div className="flex-1 bg-white/5 rounded-[1.5rem] px-4 py-2 min-h-[48px] flex flex-col justify-center relative overflow-hidden transition-colors hover:bg-white/10 focus-within:bg-white/10 border border-transparent focus-within:border-white/10">
          
          {/* Reply Context */}
          <AnimatePresence>
            {replyingTo && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <div className="mb-2 pt-1">
                  <ReplyPreview {...replyingTo} onDismiss={onCancelReply} color="bg-indigo-500" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isRecording ? (
            <div className="flex items-center justify-between text-red-500 h-6 w-full">
              <div className="flex items-center gap-2 animate-pulse">
                <MicIcon fontSize="small" />
                <span className="font-mono font-bold">
                  {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Recording...</span>
            </div>
          ) : (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
              }}
              placeholder={placeholder}
              rows={1}
              className="w-full bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-500 resize-none max-h-32 py-1 scrollbar-hide focus:ring-0"
              style={{ minHeight: '24px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
              }}
            />
          )}
        </div>

        {/* Dynamic Action Button */}
        <div className="pb-1">
           {isRecording ? (
             <div className="flex gap-2">
                <IconButton onClick={() => stopRecording(true)} size="small" sx={{ bgcolor: 'error.dark', color: 'white', '&:hover': { bgcolor: 'error.main' } }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
                <Fab 
                  color="primary" 
                  size="small" 
                  onClick={() => stopRecording(false)}
                  sx={{ width: 40, height: 40, boxShadow: 'none' }}
                >
                  <SendIcon fontSize="small" />
                </Fab>
             </div>
           ) : value.trim() ? (
              <Fab 
                color="primary" 
                size="small" 
                onClick={onSend}
                sx={{ width: 40, height: 40, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)' }}
              >
                <SendIcon fontSize="small" className="ml-0.5" />
              </Fab>
           ) : (
             <div className="flex">
               <IconButton onClick={(e) => setEmojiAnchor(e.currentTarget)} sx={{ color: 'text.secondary' }}>
                 <EmojiEmotionsIcon />
               </IconButton>
               <IconButton onClick={startRecording} sx={{ color: 'text.secondary' }}>
                 <MicIcon />
               </IconButton>
             </div>
           )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      
      <EmojiPicker 
        anchorEl={emojiAnchor} 
        open={Boolean(emojiAnchor)} 
        onClose={() => setEmojiAnchor(null)}
        onSelect={(emoji) => onChange(value + emoji)}
      />
    </div>
  )
}