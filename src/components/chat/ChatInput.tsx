'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { IconButton, Fab } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import AddIcon from '@mui/icons-material/Add'
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
  onImageUpload?: (file: File) => void
  onVoiceUpload?: (blob: Blob, duration: number) => void
  placeholder?: string
  replyingTo?: { sender: { name: string; avatar: string }; text: string; imageUrl?: string }
  onCancelReply?: () => void
}

export default function ChatInput({
  value,
  onChange,
  onSend,
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
  const [isFocused, setIsFocused] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  
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
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }}
            transition={prefersReducedMotion ? {} : { duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-full left-0 right-0 p-4 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl z-50 flex flex-col items-center gap-4"
          >
             <div className="relative w-full max-h-[60vh] rounded-2xl overflow-hidden border border-white/10">
               <img src={imgPreview} className="w-full h-full object-contain bg-black/50" alt="Preview" />
               <motion.button 
                 whileHover={{ scale: 1.1 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={cancelImage} 
                 className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
               >
                 <CloseIcon />
               </motion.button>
             </div>
             <motion.button 
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               onClick={sendImage} 
               className="w-full py-3 bg-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-colors"
             >
               Send Photo
             </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10, scale: 0.98 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
        transition={prefersReducedMotion ? {} : { duration: 0.3, ease: 'easeOut' }}
        className={`relative bg-zinc-900/80 backdrop-blur-xl border transition-all p-2 md:p-3 rounded-[2rem] shadow-2xl flex items-end gap-2 ${
          isFocused 
            ? 'border-indigo-500/50 shadow-indigo-500/20' 
            : 'border-white/10 shadow-zinc-900/50'
        }`}
      >
        {/* Focus Glow Overlay */}
        {isFocused && (
          <motion.div 
            layoutId="chat-input-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? {} : { duration: 0.2 }}
            className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_60%)] pointer-events-none"
          />
        )}
        
        {/* Actions / Attachments */}
        <motion.div 
          className="flex items-center pb-1"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <IconButton 
             onClick={() => fileInputRef.current?.click()}
             sx={{ 
               color: value ? 'primary.main' : 'text.secondary',
               transition: 'color 0.2s ease',
               '&:hover': { 
                 color: 'primary.main',
                 backgroundColor: 'rgba(99, 102, 241, 0.08)'
               }
             }}
          >
            <motion.div
              animate={{ rotate: value ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <AddIcon />
            </motion.div>
          </IconButton>
        </motion.div>

        {/* Input Area */}
        <motion.div 
          className="flex-1 bg-white/5 rounded-[1.5rem] px-4 py-2 min-h-[48px] flex flex-col justify-center relative overflow-hidden border border-transparent transition-colors"
          animate={isFocused ? { backgroundColor: 'rgba(255, 255, 255, 0.08)' } : { backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          transition={prefersReducedMotion ? {} : { duration: 0.2 }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          {/* Input Glow Border */}
          {isFocused && (
            <motion.div 
              layoutId="input-border-glow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-[1.5rem] border border-indigo-500/30 pointer-events-none"
            />
          )}
          
          {/* Reply Context */}
          <AnimatePresence>
            {replyingTo && (
              <motion.div 
                initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }} 
                animate={prefersReducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }} 
                exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={prefersReducedMotion ? {} : { duration: 0.2 }}
              >
                <div className="mb-2 pt-1">
                  <ReplyPreview {...replyingTo} onDismiss={onCancelReply} color="bg-indigo-500" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isRecording ? (
            <motion.div 
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
              className="flex items-center justify-between text-red-500 h-6 w-full"
            >
              <div className="flex items-center gap-2 animate-pulse">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  <MicIcon fontSize="small" />
                </motion.div>
                <span className="font-mono font-bold">
                  {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Recording...</span>
            </motion.div>
          ) : (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              rows={1}
              className="w-full bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-500 resize-none max-h-32 py-1 scrollbar-hide focus:ring-0 relative z-10"
              style={{ minHeight: '24px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
              }}
            />
          )}
        </motion.div>

        {/* Dynamic Action Button */}
        <div className="pb-1">
           <AnimatePresence mode="wait">
             {isRecording ? (
               <motion.div 
                 key="recording-actions"
                 initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
                 animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
                 exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
                 transition={prefersReducedMotion ? {} : { duration: 0.15 }}
                 className="flex gap-2"
               >
                 <motion.div
                   whileHover={{ scale: 1.1 }}
                   whileTap={{ scale: 0.9 }}
                 >
                   <IconButton 
                     onClick={() => stopRecording(true)} 
                     size="small" 
                     sx={{ 
                       bgcolor: 'error.dark', 
                       color: 'white',
                       boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                       '&:hover': { 
                         bgcolor: 'error.main',
                         boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                       }
                     }}
                   >
                     <DeleteIcon fontSize="small" />
                   </IconButton>
                 </motion.div>
                 <motion.div
                   whileHover={{ scale: 1.08 }}
                   whileTap={{ scale: 0.92 }}
                 >
                   <Fab 
                     color="primary" 
                     size="small" 
                     onClick={() => stopRecording(false)}
                     sx={{ 
                       width: 40, 
                       height: 40, 
                       boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
                       '&:hover': {
                         boxShadow: '0 6px 20px rgba(99, 102, 241, 0.5)'
                       }
                     }}
                   >
                     <SendIcon fontSize="small" />
                   </Fab>
                 </motion.div>
               </motion.div>
             ) : value.trim() ? (
               <motion.div
                 key="send-button"
                 initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                 animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
                 exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                 transition={prefersReducedMotion ? {} : { duration: 0.15 }}
               >
                 <motion.div
                   whileHover={prefersReducedMotion ? {} : { scale: 1.08 }}
                   whileTap={prefersReducedMotion ? {} : { scale: 0.92 }}
                 >
                   <Fab 
                     color="primary" 
                     size="small" 
                     onClick={onSend}
                     sx={{ 
                       width: 40, 
                       height: 40,
                       boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                       transition: 'all 0.2s ease',
                       '&:hover': {
                         boxShadow: '0 6px 20px rgba(99, 102, 241, 0.5)'
                       }
                     }}
                   >
                     <motion.div
                       animate={{ x: 1 }}
                       transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse' }}
                     >
                       <SendIcon fontSize="small" />
                     </motion.div>
                   </Fab>
                 </motion.div>
               </motion.div>
             ) : (
               <motion.div 
                 key="action-buttons"
                 initial={prefersReducedMotion ? {} : { opacity: 0 }}
                 animate={prefersReducedMotion ? {} : { opacity: 1 }}
                 exit={prefersReducedMotion ? {} : { opacity: 0 }}
                 transition={prefersReducedMotion ? {} : { duration: 0.15 }}
                 className="flex"
               >
                 <motion.div
                   whileHover={{ scale: 1.1 }}
                   whileTap={{ scale: 0.9 }}
                 >
                   <IconButton 
                     onClick={(e) => setEmojiAnchor(e.currentTarget)} 
                     sx={{ 
                       color: 'text.secondary',
                       '&:hover': { 
                         color: 'primary.main',
                         backgroundColor: 'rgba(99, 102, 241, 0.08)'
                       }
                     }}
                   >
                     <EmojiEmotionsIcon />
                   </IconButton>
                 </motion.div>
                 <motion.div
                   whileHover={{ scale: 1.1 }}
                   whileTap={{ scale: 0.9 }}
                 >
                   <IconButton 
                     onClick={startRecording} 
                     sx={{ 
                       color: 'text.secondary',
                       '&:hover': { 
                         color: 'error.main',
                         backgroundColor: 'rgba(239, 68, 68, 0.08)'
                       }
                     }}
                   >
                     <MicIcon />
                   </IconButton>
                 </motion.div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </motion.div>

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