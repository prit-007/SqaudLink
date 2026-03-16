'use client'

import React, { useState, useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useTransform, AnimatePresence } from 'framer-motion'
import { Avatar as MuiAvatar } from '@mui/material'
import ReplyIcon from '@mui/icons-material/Reply'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined'
import EastRoundedIcon from '@mui/icons-material/EastRounded'
import MessageStatus from './MessageStatus'
import EmojiPicker from './EmojiPicker'
import MessageContextMenu from './MessageContextMenu'

type MessageReaction = {
  emoji: string
  user_id: string
}

interface MessageBubbleProps {
  text?: string
  sender: 'me' | 'them'
  time: string
  type?: 'text' | 'image' | 'voice' | 'video' | 'file'
  imageUrl?: string
  reactions?: MessageReaction[]
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
  const prefersReducedMotion = useReducedMotion()

  // Dynamic border radius for "Chat Cluster" effect
  const borderRadiusClass = () => {
    const base = 'rounded-[22px]'
    
    if (isMe) {
      if (position === 'first') return `${base} rounded-tr-md`
      if (position === 'middle') return `${base} rounded-tr-md rounded-br-md`
      if (position === 'last') return `${base} rounded-br-md`
    } else {
      if (position === 'first') return `${base} rounded-tl-md`
      if (position === 'middle') return `${base} rounded-tl-md rounded-bl-md`
      if (position === 'last') return `${base} rounded-bl-md`
    }
    return base
  }

  // Swipe physics
  const x = useMotionValue(0)
  const iconOpacity = useTransform(x, isMe ? [-60, 0] : [0, 60], [1, 0])
  const iconScale = useTransform(x, isMe ? [-60, 0] : [0, 60], [1.2, 0.8])

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number } }) => {
    if (Math.abs(info.offset.x) > 60) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20)
      onReply?.()
    }
    x.set(0)
  }

  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      void audioRef.current.play()
    }

    setIsPlaying(!isPlaying)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const waveformBars = voiceWaveform && voiceWaveform.length > 0
    ? voiceWaveform
    : Array.from({ length: 24 }, (_unused, index) => 28 + ((index * 17) % 52))

  // Group reactions
  const groupedReactions = reactions?.reduce<Array<{ emoji: string; count: number }>>((acc, reaction) => {
    const existing = acc.find((item) => item.emoji === reaction.emoji)
    if (existing) {
      existing.count += 1
    } else {
      acc.push({ emoji: reaction.emoji, count: 1 })
    }
    return acc
  }, [])

  const bubbleMotion = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        whileHover: { y: -1 },
        whileTap: { scale: 0.992 },
        transition: { duration: 0.2, ease: 'easeOut' },
      }

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
          {...bubbleMotion}
        >
          <div 
            className={`
              relative overflow-hidden shadow-sm transition-all duration-200
              ${borderRadiusClass()}
              ${isMe 
                ? 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-indigo-500/20 ring-1 ring-white/10' 
                : 'bg-zinc-800/85 backdrop-blur-md border border-white/8 text-zinc-100 shadow-black/20'
              }
            `}
          >
            <div className={`pointer-events-none absolute inset-0 opacity-80 ${isMe ? 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_45%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_40%)]'}`} />

            {/* Reply Context */}
            {replyTo && (
              <div 
                onClick={onReplyClick}
                className={`
                  relative m-1 mb-1 p-2.5 rounded-2xl flex gap-3 cursor-pointer transition-all duration-200
                  ${isMe ? 'bg-black/20 hover:bg-black/30' : 'bg-white/5 hover:bg-white/10'}
                  border border-white/10
                `}
              >
                <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${isMe ? 'bg-white/50' : 'bg-indigo-400'}`} />
                {replyTo.imageUrl && (
                  <img src={replyTo.imageUrl} alt="" className="w-11 h-11 rounded-xl object-cover ml-2 shadow-sm" />
                )}
                <div className="flex-1 min-w-0 overflow-hidden ml-2">
                  <p className="text-[11px] font-bold opacity-90 truncate flex items-center gap-1">
                    <ReplyIcon sx={{ fontSize: 12 }} /> {replyTo.sender}
                  </p>
                  <p className="text-[11px] opacity-75 truncate">{replyTo.text || 'Photo'}</p>
                </div>
                <EastRoundedIcon sx={{ fontSize: 16 }} className="self-center opacity-50" />
              </div>
            )}

            {/* Media Content */}
            {imageUrl && type === 'image' && (
              <div className="relative">
                <img src={imageUrl} alt="Attachment" className="w-full h-auto max-h-[400px] object-cover transition-transform duration-300 group-hover:scale-[1.01]" />
                {/* Gradient Overlay for text on image */}
                {text && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />}
              </div>
            )}

            {/* Text Content */}
            {(text || type === 'voice') && (
              <div className={`
                px-3.5 py-2.5
                ${type === 'image' && text ? 'pt-2 pb-6 absolute bottom-0 left-0 right-0' : ''}
              `}>
                
                {/* Voice Player */}
                {type === 'voice' && (
                  <div className="flex items-center gap-3 py-1">
                    <button 
                      onClick={togglePlay}
                      className={`p-2.5 rounded-full transition-colors ${isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400'}`}
                    >
                      {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                    </button>
                    <div className="flex-1 flex items-center gap-0.5 h-6">
                      {waveformBars.map((value, index) => (
                        <div 
                          key={index} 
                          className={`w-1 rounded-full ${isMe ? 'bg-white/70' : 'bg-indigo-400/50'}`}
                          style={{ height: `${Math.max(20, value)}%` }} 
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono opacity-80">{formatDuration(voiceDuration || 0)}</span>
                    <audio ref={audioRef} src={imageUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                  </div>
                )}

                {/* Actual Text */}
                {type !== 'voice' && (
                  <p className="whitespace-pre-wrap text-[15px] sm:text-[15.5px] leading-[1.45] break-words tracking-[0.01em]">
                    {text}
                  </p>
                )}
              </div>
            )}

            {/* Metadata Footer */}
            <div className={`
              relative z-10 flex items-center justify-between gap-2 px-3.5 pb-2.5 pt-0
              ${type === 'image' && !text ? 'absolute bottom-0 right-0 p-2 bg-black/40 rounded-tl-xl backdrop-blur-sm' : ''}
            `}>
              <div className="flex items-center gap-1.5 text-[10px] opacity-70">
                {onReply && (
                  <button
                    onClick={onReply}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors ${isMe ? 'bg-white/10 hover:bg-white/15' : 'bg-white/5 hover:bg-white/10'} md:opacity-0 md:group-hover:opacity-100`}
                  >
                    <ReplyIcon sx={{ fontSize: 12 }} />
                    <span className="font-medium">Reply</span>
                  </button>
                )}
                {isEdited && <span className="text-[9px] italic">edited</span>}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] opacity-60 min-w-[30px] text-right">{time}</span>
                {isMe && <MessageStatus status={status} />}
              </div>
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
          {groupedReactions && groupedReactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {groupedReactions.map((reaction, index) => (
                <motion.button
                  key={`${reaction.emoji}-${index}`}
                  initial={prefersReducedMotion ? false : { scale: 0.92, opacity: 0 }}
                  animate={prefersReducedMotion ? {} : { scale: 1, opacity: 1 }}
                  transition={{ duration: 0.16, delay: index * 0.02 }}
                  onClick={() => onReact?.(reaction.emoji)}
                  className="
                    flex items-center gap-1 px-2.5 py-1 rounded-full 
                    bg-zinc-800/85 border border-white/10 shadow-sm 
                    text-xs hover:bg-zinc-700 transition-colors backdrop-blur-sm
                  "
                >
                  <span>{reaction.emoji}</span>
                  {reaction.count > 1 && <span className="font-bold text-indigo-400">{reaction.count}</span>}
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