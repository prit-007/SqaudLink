'use client'

import React, { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { IconButton, Avatar as MuiAvatar } from '@mui/material'
import ReplyIcon from '@mui/icons-material/Reply'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined'
import MessageStatus from './MessageStatus'
import EmojiPicker from './EmojiPicker'
import MessageContextMenu from './MessageContextMenu'

interface MessageBubbleProps {
  text?: string
  sender: 'me' | 'them'
  time: string
  type?: 'text' | 'image' | 'voice' | 'video' | 'file'
  imageUrl?: string
  reactions?: any[]
  status?: 'sending' | 'sent' | 'read'
  isEdited?: boolean
  onReact?: (emoji: string) => void
  onReply?: () => void
  onEdit?: () => void
  onDelete?: () => void
  replyTo?: { id?: string; sender: string; text?: string; imageUrl?: string }
  onReplyClick?: () => void
  position?: 'single' | 'first' | 'middle' | 'last'
  senderName?: string
  showAvatar?: boolean
  voiceDuration?: number
  voiceWaveform?: number[]
}

export default function MessageBubble({
  text,
  sender,
  time,
  type = 'text',
  imageUrl,
  reactions,
  status = 'read',
  isEdited = false,
  onReact,
  onReply,
  onEdit,
  onDelete,
  replyTo,
  onReplyClick,
  position = 'single',
  senderName,
  showAvatar = false,
  voiceDuration,
  voiceWaveform
}: MessageBubbleProps) {
  const isMe = sender === 'me'
  const messageRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [contextMenuAnchor, setContextMenuAnchor] = useState<HTMLElement | null>(null)
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState<HTMLElement | null>(null)

  // Dynamic border radius for "Chat Cluster" effect
  const borderRadiusClass = () => {
    const base = "rounded-2xl" // 16px
    const sharp = "rounded-sm" // 4px
    
    if (isMe) {
      if (position === 'first') return `${base} rounded-tr-${sharp}`
      if (position === 'middle') return `${base} rounded-tr-${sharp} rounded-br-${sharp}`
      if (position === 'last') return `${base} rounded-br-${sharp}`
    } else {
      if (position === 'first') return `${base} rounded-tl-${sharp}`
      if (position === 'middle') return `${base} rounded-tl-${sharp} rounded-bl-${sharp}`
      if (position === 'last') return `${base} rounded-bl-${sharp}`
    }
    return base
  }

  // Swipe physics
  const x = useMotionValue(0)
  const iconOpacity = useTransform(x, isMe ? [-60, 0] : [0, 60], [1, 0])
  const iconScale = useTransform(x, isMe ? [-60, 0] : [0, 60], [1.2, 0.8])

  const handleDragEnd = (_: any, info: any) => {
    if (Math.abs(info.offset.x) > 60) {
      if (navigator.vibrate) navigator.vibrate(20)
      onReply?.()
    }
    x.set(0)
  }

  const togglePlay = () => {
    if (audioRef.current) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play()
      setIsPlaying(!isPlaying)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Group reactions
  const groupedReactions = reactions?.reduce((acc: any, r: any) => {
    const existing = acc.find((item: any) => item.emoji === r.emoji)
    existing ? existing.count++ : acc.push({ emoji: r.emoji, count: 1 })
    return acc
  }, [])

  return (
    <div className={`relative w-full group flex ${isMe ? 'justify-end' : 'justify-start'} ${position === 'last' || position === 'single' ? 'mb-4' : 'mb-1'}`}>
      
      {/* Avatar Gutter */}
      {!isMe && (
        <div className="w-8 mr-2 flex-shrink-0 flex items-end">
          {showAvatar && (
            <MuiAvatar 
              src={`https://api.dicebear.com/9.x/initials/svg?seed=${senderName || 'User'}`}
              sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}
            >
              {senderName?.[0]}
            </MuiAvatar>
          )}
        </div>
      )}

      <div className="relative max-w-[85%] sm:max-w-[70%] md:max-w-[600px]">
        {/* Swipe Reply Indicator */}
        <div className={`absolute top-1/2 -translate-y-1/2 z-0 flex items-center ${isMe ? '-left-12' : '-right-12'}`}>
          <motion.div style={{ opacity: iconOpacity, scale: iconScale }}>
            <div className="bg-white/10 p-1.5 rounded-full shadow-sm backdrop-blur-sm">
              <ReplyIcon className="text-white text-opacity-80" sx={{ fontSize: 16 }} />
            </div>
          </motion.div>
        </div>

        {/* Sender Name (First message in group only) */}
        {!isMe && (position === 'first' || position === 'single') && (
          <span className="text-[11px] font-semibold text-zinc-400 ml-1 mb-1 block">
            {senderName}
          </span>
        )}

        {/* Draggable Container */}
        <motion.div
          ref={messageRef}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          style={{ x }}
          onDoubleClick={() => onReact?.('❤️')}
          onContextMenu={(e) => { e.preventDefault(); setContextMenuAnchor(messageRef.current); }}
          className="relative z-10"
        >
          <div 
            className={`
              relative overflow-hidden shadow-sm transition-all
              ${borderRadiusClass()}
              ${isMe 
                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-indigo-500/20' 
                : 'bg-zinc-800/80 backdrop-blur-md border border-white/5 text-zinc-100'
              }
            `}
          >
            {/* Reply Context */}
            {replyTo && (
              <div 
                onClick={onReplyClick}
                className={`
                  m-1 mb-1 p-2 rounded-xl flex gap-3 cursor-pointer transition-colors
                  ${isMe ? 'bg-black/20 hover:bg-black/30' : 'bg-white/5 hover:bg-white/10'}
                  border-l-[3px] ${isMe ? 'border-white/50' : 'border-indigo-500'}
                `}
              >
                {replyTo.imageUrl && (
                  <img src={replyTo.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-[11px] font-bold opacity-90 truncate">{replyTo.sender}</p>
                  <p className="text-[11px] opacity-75 truncate">{replyTo.text || 'Photo'}</p>
                </div>
              </div>
            )}

            {/* Media Content */}
            {imageUrl && type === 'image' && (
              <div className="relative">
                <img src={imageUrl} alt="Attachment" className="w-full h-auto max-h-[400px] object-cover" />
                {/* Gradient Overlay for text on image */}
                {text && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />}
              </div>
            )}

            {/* Text Content */}
            {(text || type === 'voice') && (
              <div className={`
                px-3 py-2
                ${type === 'image' && text ? 'pt-2 pb-6 absolute bottom-0 left-0 right-0' : ''}
              `}>
                
                {/* Voice Player */}
                {type === 'voice' && (
                  <div className="flex items-center gap-3 py-1">
                    <button 
                      onClick={togglePlay}
                      className={`p-2 rounded-full transition-colors ${isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400'}`}
                    >
                      {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                    </button>
                    <div className="flex-1 flex items-center gap-0.5 h-6">
                      {(voiceWaveform || Array.from({length: 24})).map((val: any, i) => (
                        <div 
                          key={i} 
                          className={`w-1 rounded-full ${isMe ? 'bg-white/70' : 'bg-indigo-400/50'}`}
                          style={{ height: `${Math.max(20, typeof val === 'number' ? val : Math.random() * 100)}%` }} 
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono opacity-80">{formatDuration(voiceDuration || 0)}</span>
                    <audio ref={audioRef} src={imageUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                  </div>
                )}

                {/* Actual Text */}
                {type !== 'voice' && (
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed break-words">
                    {text}
                  </p>
                )}
              </div>
            )}

            {/* Metadata Footer */}
            <div className={`
              flex items-center justify-end gap-1 px-3 pb-2 pt-0
              ${type === 'image' && !text ? 'absolute bottom-0 right-0 p-2 bg-black/40 rounded-tl-xl backdrop-blur-sm' : ''}
            `}>
              {isEdited && <span className="text-[9px] opacity-60 italic">edited</span>}
              <span className="text-[10px] opacity-60 min-w-[30px] text-right">{time}</span>
              {isMe && <MessageStatus status={status} />}
            </div>
          </div>
        </motion.div>

        {/* Hover Actions (Desktop) */}
        <div className={`
          absolute top-0 hidden md:group-hover:flex items-center gap-1 p-1
          bg-zinc-800/90 backdrop-blur border border-white/10 rounded-full shadow-xl
          transition-all duration-200 z-20
          ${isMe ? '-left-24' : '-right-24'}
        `}>
          {['❤️', '😂', '👍'].map((emoji) => (
            <button key={emoji} onClick={() => onReact?.(emoji)} className="p-1 hover:scale-125 transition-transform">
              {emoji}
            </button>
          ))}
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          <button onClick={() => setEmojiPickerAnchor(messageRef.current)} className="p-1 text-zinc-400 hover:text-white">
            <AddReactionOutlinedIcon sx={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Reactions Pills */}
        <AnimatePresence>
          {groupedReactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {groupedReactions.map((r: any, i: number) => (
                <motion.button
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={() => onReact?.(r.emoji)}
                  className="
                    flex items-center gap-1 px-2 py-0.5 rounded-full 
                    bg-zinc-800/80 border border-white/5 shadow-sm 
                    text-xs hover:bg-zinc-700 transition-colors
                  "
                >
                  <span>{r.emoji}</span>
                  {r.count > 1 && <span className="font-bold text-indigo-400">{r.count}</span>}
                </motion.button>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      <MessageContextMenu
        anchorEl={contextMenuAnchor}
        open={Boolean(contextMenuAnchor)}
        onClose={() => setContextMenuAnchor(null)}
        isOwnMessage={isMe}
        onReply={onReply}
        onReact={() => setEmojiPickerAnchor(messageRef.current)}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <EmojiPicker
        anchorEl={emojiPickerAnchor}
        open={Boolean(emojiPickerAnchor)}
        onClose={() => setEmojiPickerAnchor(null)}
        onSelect={(emoji) => onReact?.(emoji)}
      />
    </div>
  )
}