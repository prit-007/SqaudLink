'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Reply, 
  ContentCopy, 
  Delete, 
  Edit, 
  Forward, 
  SaveAlt, 
  Share, 
  Favorite,
  InfoOutlined,
  MoreHoriz
} from '@mui/icons-material'

interface MessageActionsProps {
  messageId: number | string
  text?: string
  imageUrl?: string
  sender: 'me' | 'them'
  onReply?: () => void
  onForward?: () => void
  onCopy?: () => void
  onSave?: () => void
  onDelete?: () => void
  onEdit?: () => void
  onReact?: (emoji: string) => void
  onInfo?: () => void
  children: React.ReactNode
}

export default function MessageActions({
  messageId,
  text,
  imageUrl,
  sender,
  onReply,
  onForward,
  onCopy,
  onSave,
  onDelete,
  onEdit,
  onReact,
  onInfo,
  children
}: MessageActionsProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Gesture State
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const touchStart = useRef<{ x: number, y: number } | null>(null)
  const lastTap = useRef<number>(0)

  // --- Handlers ---

  // 1. Right Click (Desktop)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    triggerMenu(e.clientX, e.clientY)
  }

  // 2. Touch Handlers (Mobile Long Press)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    
    longPressTimer.current = setTimeout(() => {
      triggerMenu(e.touches[0].clientX, e.touches[0].clientY)
    }, 500) // 500ms long press
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const moveX = Math.abs(e.touches[0].clientX - touchStart.current.x)
    const moveY = Math.abs(e.touches[0].clientY - touchStart.current.y)
    
    // Cancel if moved more than 10px
    if (moveX > 10 || moveY > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // 3. Double Tap (Quick React)
  const handleDoubleClick = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      // Double tap detected
      e.preventDefault()
      e.stopPropagation()
      if (onReact) {
        triggerHaptic('light')
        onReact('❤️')
      }
    }
    lastTap.current = now
  }

  // --- Helpers ---

  const triggerMenu = (x: number, y: number) => {
    triggerHaptic('medium')
    setCoords({ x, y })
    setShowMenu(true)
  }

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      switch (type) {
        case 'light': navigator.vibrate(20); break;
        case 'medium': navigator.vibrate(50); break;
        case 'heavy': navigator.vibrate([30, 50, 30]); break;
      }
    }
  }

  // --- Sub-components ---

  const ActionItem = ({ icon: Icon, label, onClick, danger = false, separator = false }: any) => {
    if (separator) return <div className="h-[1px] bg-white/10 my-1 mx-2" />
    
    if (!onClick) return null

    return (
      <button
        onClick={(e) => { 
          e.stopPropagation(); 
          onClick(); 
          setShowMenu(false); 
        }}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all text-left rounded-lg
          ${danger 
            ? 'text-red-400 hover:bg-red-500/10 active:bg-red-500/20' 
            : 'text-zinc-200 hover:bg-white/10 active:bg-white/20 hover:text-white'
          }
        `}
      >
        <Icon sx={{ fontSize: 18, opacity: 0.8 }} />
        <span className="font-medium">{label}</span>
      </button>
    )
  }

  return (
    <div 
      ref={containerRef}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleDoubleClick}
      className="relative touch-manipulation select-none"
    >
      {children}

      <AnimatePresence>
        {showMenu && (
          <>
            {/* 1. Backdrop (Blur & Click to Close) */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]" 
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} 
            />
            
            {/* 2. Glass Popover Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed z-50 min-w-[220px] bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1.5 origin-top-left"
              style={{ 
                // Smart positioning: flip if too close to right/bottom edges
                left: Math.min(coords.x, typeof window !== 'undefined' ? window.innerWidth - 230 : 0), 
                top: Math.min(coords.y, typeof window !== 'undefined' ? window.innerHeight - 350 : 0) 
              }}
            >
              {/* Quick Reactions Bar */}
              <div className="flex justify-between px-2 py-2 mb-1 border-b border-white/5 mx-1">
                {['❤️', '😂', '👍', '🔥', '😮', '😢'].map((emoji) => (
                  <button 
                    key={emoji}
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      triggerHaptic('light'); 
                      onReact?.(emoji); 
                      setShowMenu(false); 
                    }}
                    className="text-xl hover:scale-125 active:scale-95 transition-transform p-1 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Action List */}
              <div className="px-1">
                <ActionItem icon={Reply} label="Reply" onClick={onReply} />
                
                {text && <ActionItem icon={ContentCopy} label="Copy Text" onClick={onCopy} />}
                {imageUrl && <ActionItem icon={SaveAlt} label="Save Image" onClick={onSave} />}
                {onForward && <ActionItem icon={Forward} label="Forward" onClick={onForward} />}
                
                {(onCopy || onSave || onForward) && <ActionItem separator />}
                
                {sender === 'me' && onEdit && <ActionItem icon={Edit} label="Edit" onClick={onEdit} />}
                {onInfo && <ActionItem icon={InfoOutlined} label="Info" onClick={onInfo} />}
                
                <ActionItem separator />
                {sender === 'me' && onDelete && <ActionItem icon={Delete} label="Delete" onClick={onDelete} danger />}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}