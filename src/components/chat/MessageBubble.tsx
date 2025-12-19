'use client'

import React, { useState } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import ReplyPreview from './ReplyPreview'
import Avatar from './Avatar'
import { useTheme, themes } from '@/contexts/ThemeContext'

interface MessageBubbleProps {
  text?: string
  sender: 'me' | 'them'
  time: string
  type?: 'text' | 'image'
  imageUrl?: string
  reactions?: string[]
  isExpiring?: boolean
  expiresIn?: string
  isRead?: boolean
  isEdited?: boolean
  onReact?: (emoji: string) => void
  onReply?: () => void
  onEdit?: () => void
  onDelete?: () => void
  replyTo?: { sender: string; text?: string; imageUrl?: string }
  position?: 'single' | 'first' | 'middle' | 'last'
  senderName?: string
  isGroup?: boolean
  avatarColor?: string
  showAvatar?: boolean
}

export default function MessageBubble({
  text,
  sender,
  time,
  type = 'text',
  imageUrl,
  reactions,
  isExpiring,
  expiresIn,
  isRead = true,
  isEdited = false,
  onReact,
  onReply,
  onEdit,
  onDelete,
  replyTo,
  position = 'single',
  senderName,
  isGroup = false,
  avatarColor = 'text-purple-400',
  showAvatar = false
}: MessageBubbleProps) {
  const isMe = sender === 'me'
  const [isLongPress, setIsLongPress] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const { theme } = useTheme()
  const currentTheme = themes[theme]

  // 🎨 DYNAMIC BORDER RADIUS - Finetuned for "Organic" feel
  const getBorderRadius = () => {
    const rLg = 'rounded-[20px]' // Slightly tighter than 3xl for cleaner stacking
    const rSm = 'rounded-[4px]'

    if (isMe) {
      switch (position) {
        case 'first': return `${rLg} rounded-br-${rSm}`
        case 'middle': return `${rLg} rounded-tr-${rSm} rounded-br-${rSm}`
        case 'last': return `${rLg} rounded-tr-${rSm}`
        default: return `${rLg} rounded-br-sm`
      }
    } else {
      switch (position) {
        case 'first': return `${rLg} rounded-bl-${rSm}`
        case 'middle': return `${rLg} rounded-tl-${rSm} rounded-bl-${rSm}`
        case 'last': return `${rLg} rounded-tl-${rSm}`
        default: return `${rLg} rounded-bl-sm`
      }
    }
  }

  // 🏎️ SWIPE PHYSICS
  const x = useMotionValue(0)
  const iconOpacity = useTransform(x, [0, 60], [0, 1])
  const iconScale = useTransform(x, [0, 80], [0.5, 1.1])
  const iconX = useTransform(x, [0, 80], [0, 10]) // Parallax effect on icon

  const handleDragEnd = (_: any, info: any) => {
    if (Math.abs(info.offset.x) > 80) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(30)
      onReply?.()
    }
  }

  return (
    <div className={`relative w-full ${position === 'last' || position === 'single' ? 'mb-4' : 'mb-[2px]'}`}>
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2 group relative`}>
        
        {/* Avatar on the left for 'them' messages */}
        {!isMe && (
          <div className="w-8 h-8 flex-shrink-0 mt-auto">
            {showAvatar ? (
              <Avatar 
                src={`https://api.dicebear.com/9.x/initials/svg?seed=${senderName || 'User'}`}
                alt={senderName || 'User'}
                size="sm"
              />
            ) : (
              <div className="w-8 h-8" />
            )}
          </div>
        )}

      <div className="flex flex-col relative">
        
        {/* SWIPE REPLY ICONS (Background Layer) */}
        {onReply && (
          <div className={`absolute top-1/2 -translate-y-1/2 z-0 flex items-center pointer-events-none ${isMe ? 'right-0 pr-4' : 'left-0 pl-4'}`}>
             <motion.div 
               style={{ opacity: iconOpacity, scale: iconScale, x: iconX }}
               className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center border border-white/10 shadow-xl"
             >
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={isMe ? "text-purple-400" : "text-teal-400"}>
                  <path d={isMe ? "M15 11l6 6v-6h-6zm0 0l-6-6" : "M9 11l-6 6v-6h6zm0 0l6-6"} />
               </svg>
             </motion.div>
          </div>
        )}

        {/* Sender Name (Groups) - Show above first message */}
        {!isMe && (position === 'first' || position === 'single') && (
          <span className={`block text-[11px] font-bold mb-1 opacity-90 ${currentTheme.text}`}>
            {senderName}
          </span>
        )}

        {/* DRAGGABLE CONTENT LAYER */}
        <motion.div
          drag="x"
          dragConstraints={{ left: isMe ? -100 : 0, right: isMe ? 0 : 100 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          style={{ x }}
          onDoubleClick={() => {
             if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(20)
             onReact?.('❤️')
          }}
          className={`relative z-10 flex ${isMe ? 'justify-end' : 'justify-start'} max-w-full`}
        >
          <div className={`
             relative flex flex-col ${isMe ? 'items-end' : 'items-start'}
             max-w-[85%] sm:max-w-[75%] md:max-w-[65%]
          `}>
            
            {/* THE BUBBLE */}
            <div 
              className={`
                relative overflow-hidden transition-all duration-200
                ${getBorderRadius()}
                ${type === 'image' ? 'p-1' : 'px-4 py-2.5'}
                ${isMe 
                  ? `bg-gradient-to-tr ${currentTheme.primary} shadow-[0_4px_15px_-3px_${currentTheme.glow}]` 
                  : 'bg-zinc-800/80 backdrop-blur-md shadow-sm border border-white/5'}
                
                /* Subtle glass ring highlight */
                ring-1 ring-white/10
              `}
            >
              {/* Reply Context (Inside Bubble) */}
              {replyTo && (
                <div 
                  className={`
                    mb-2 rounded-lg p-2 text-xs flex gap-2 items-center overflow-hidden
                    ${isMe ? 'bg-black/20 text-purple-100' : 'bg-black/20 text-zinc-300'}
                    border-l-2 ${isMe ? 'border-purple-300' : 'border-teal-400'}
                  `}
                >
                   {replyTo.imageUrl && <img src={replyTo.imageUrl} className="w-8 h-8 rounded bg-black/20 object-cover" />}
                   <div className="flex-1 min-w-0">
                      <p className="font-bold opacity-90 truncate">{replyTo.sender}</p>
                      <p className="opacity-70 truncate">{replyTo.text || 'Photo'}</p>
                   </div>
                </div>
              )}

              {/* Text Content */}
              {type === 'text' && (
                <p className={`
                  text-[15px] leading-relaxed break-words whitespace-pre-wrap
                  ${isMe ? 'text-white font-normal tracking-wide' : 'text-zinc-100 font-light'}
                `}>
                  {text}
                </p>
              )}
              
              {/* Image Content */}
              {type === 'image' && imageUrl && (
                <div className="relative">
                  <img 
                    src={imageUrl} 
                    alt="Media" 
                    className={`w-full max-h-[400px] object-cover ${getBorderRadius()}`} 
                    loading="lazy"
                  />
                  {/* Glass Gradient Overlay for Image Text */}
                  {text && (
                     <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 rounded-b-[20px]">
                        <p className="text-white text-sm">{text}</p>
                     </div>
                  )}
                </div>
              )}

              {/* Meta Data (Time + Ticks + Edited Indicator) */}
              {(position === 'last' || position === 'single') && (
                <div className={`
                  flex items-center gap-1 mt-1 text-[10px] font-medium
                  ${isMe ? 'justify-end text-purple-100/70' : 'text-zinc-500'}
                  ${type === 'image' && !text ? 'absolute bottom-3 right-3 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full text-white/90' : ''}
                `}>
                  {isEdited && <span className="opacity-60 italic mr-1">edited</span>}
                  <span>{time}</span>
                  {isMe && isRead && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-300">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
              )}
            </div>

            {/* FLOATING REACTIONS PILL */}
            <AnimatePresence>
              {reactions && reactions.length > 0 && (
                <motion.div 
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  className={`
                    absolute -bottom-3 ${isMe ? 'left-0' : 'right-0'} z-20
                    flex items-center gap-0.5 px-1.5 py-0.5
                    bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-full shadow-lg
                  `}
                >
                  {reactions.map((r, i) => (
                    <span key={i} className="text-xs hover:scale-125 transition-transform cursor-default">{r}</span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* DESKTOP HOVER ACTIONS */}
            <div className={`
              hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity duration-200
              absolute top-0 ${isMe ? '-left-12' : '-right-12'} h-full items-center
            `}>
              <div className="flex gap-1 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-full px-2 py-1 shadow-xl transform scale-90 hover:scale-100 transition-transform">
                {['❤️', '😂', '👍'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onReact?.(emoji)}
                    className="hover:scale-125 transition-transform px-1"
                  >
                    {emoji}
                  </button>
                ))}
                <button className="px-1 text-zinc-400 hover:text-white" onClick={() => onReply?.()}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                </button>
                {onEdit && isMe && (
                  <button className="px-1 text-zinc-400 hover:text-blue-400" onClick={() => onEdit()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                )}
                {onDelete && isMe && (
                  <button className="px-1 text-zinc-400 hover:text-red-400" onClick={() => onDelete()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                )}
              </div>
            </div>

          </div>
        </motion.div>
      </div>
      </div>
    </div>
  )
}