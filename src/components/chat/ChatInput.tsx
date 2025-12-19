'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReplyPreview from './ReplyPreview'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onAttach?: () => void
  onEmoji?: () => void
  onImageUpload?: (file: File) => void
  placeholder?: string
  replyingTo?: { sender: string; text?: string; imageUrl?: string }
  onCancelReply?: () => void
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  onAttach,
  onEmoji,
  onImageUpload,
  placeholder = 'Message...',
  replyingTo,
  onCancelReply
}: ChatInputProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/') && onImageUpload) {
      onImageUpload(file)
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault()
      if (value.trim()) {
        onSend()
      }
    }
  }

  const handleSend = () => {
    if (value.trim()) {
      // Haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(20)
      }
      onSend()
    }
  }

  const toggleActions = () => {
    // Haptic
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20)
    }
    setShowActions(!showActions)
  }

  // Mobile: Floating Island Design
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe-bottom">
        {/* Reply Preview */}
        <AnimatePresence>
          {replyingTo && (
            <ReplyPreview 
              sender={replyingTo.sender}
              text={replyingTo.text}
              imageUrl={replyingTo.imageUrl}
              color="bg-purple-500"
              onDismiss={onCancelReply}
            />
          )}
        </AnimatePresence>

        {/* Action Sheet Drawer */}
        <AnimatePresence>
          {showActions && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowActions(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl border-t border-white/10 shadow-2xl pb-safe-bottom"
              >
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-4" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="grid grid-cols-4 gap-6 px-6 pb-6">
                  {[
                    { icon: '📷', label: 'Camera', color: 'bg-blue-600', action: () => fileInputRef.current?.click() },
                    { icon: '🖼️', label: 'Gallery', color: 'bg-purple-600', action: () => fileInputRef.current?.click() },
                    { icon: '📍', label: 'Location', color: 'bg-red-600', action: onAttach },
                    { icon: '🎤', label: 'Audio', color: 'bg-green-600', action: onAttach }
                  ].map((action) => (
                    <button 
                      key={action.label}
                      onClick={() => { action.action?.(); setShowActions(false); }}
                      className="flex flex-col items-center gap-2 touch-manipulation active:scale-95 transition-transform"
                    >
                      <div className={`w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center text-2xl shadow-lg`}>
                        {action.icon}
                      </div>
                      <span className="text-xs text-zinc-400">{action.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Floating Island Input */}
        <div className="px-3 pb-3 pt-2 bg-gradient-to-t from-black via-black/95 to-transparent">
          <div className="flex items-end gap-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-[24px] shadow-2xl p-2">
            {/* Plus/Close Button */}
            <motion.button
              type="button"
              onClick={toggleActions}
              animate={{ rotate: showActions ? 45 : 0 }}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-full shadow-lg touch-manipulation active:scale-95 transition-all"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </motion.button>

            {/* Input */}
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              rows={1}
              className="flex-1 min-w-0 bg-transparent border-none px-2 py-2 text-white placeholder:text-zinc-500 focus:outline-none text-[15px] leading-5 resize-none max-h-32 overflow-y-auto touch-manipulation"
            />

            {/* Emoji or Send */}
            {value.trim() ? (
              <button
                type="button"
                onClick={handleSend}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-full shadow-lg touch-manipulation active:scale-95 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={onEmoji}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-yellow-400 rounded-full hover:bg-white/5 touch-manipulation active:scale-95 transition-all"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Desktop: Full-Width Docked Bar
  return (
    <div className="px-3 py-3 md:px-4 md:py-3 bg-zinc-900/95 backdrop-blur-xl border-t border-white/5">
      <div className="flex flex-col gap-2 max-w-4xl mx-auto">
        {/* Reply Preview */}
        <AnimatePresence>
          {replyingTo && (
            <ReplyPreview 
              sender={replyingTo.sender}
              text={replyingTo.text}
              imageUrl={replyingTo.imageUrl}
              color="bg-purple-500"
              onDismiss={onCancelReply}
            />
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          {/* Attachment Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 p-2.5 rounded-xl text-zinc-400 hover:text-purple-400 hover:bg-white/5 transition-all active:scale-95 touch-manipulation"
            aria-label="Attach file"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          {/* Input Container */}
          <div className="flex-1 min-w-0 bg-zinc-800/80 border border-white/10 rounded-2xl flex items-center gap-2 px-3 py-2 focus-within:border-purple-500/50 focus-within:bg-zinc-800 focus-within:shadow-lg focus-within:shadow-purple-500/10 transition-all">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              rows={1}
              className="flex-1 min-w-0 bg-transparent border-none px-0 py-1.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-0 text-[15px] leading-5 resize-none max-h-32 overflow-y-auto"
              style={{ 
                minHeight: '22px',
                maxHeight: '120px'
              }}
            />
            
            {/* Emoji Button */}
            <button
              type="button"
              onClick={onEmoji}
              className="flex-shrink-0 p-1.5 text-zinc-400 hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/5 active:scale-95 touch-manipulation"
              aria-label="Add emoji"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim()}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-purple-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation"
            aria-label="Send message"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
