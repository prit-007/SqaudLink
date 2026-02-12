'use client'

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Reply, Favorite, Edit, Delete, ContentCopy, Forward, Info } from '@mui/icons-material'

interface MessageContextMenuProps {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  isOwnMessage: boolean
  onReply?: () => void
  onReact?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onCopy?: () => void
  onForward?: () => void
  onInfo?: () => void
}

export default function MessageContextMenu({
  anchorEl,
  open,
  onClose,
  isOwnMessage,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onCopy,
  onForward,
  onInfo
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose])

  // Calculate position logic
  const getPosition = () => {
    if (!anchorEl) return { top: 0, left: 0 }
    const rect = anchorEl.getBoundingClientRect()
    // Default to bottom-right of message, flip if close to screen edge
    const top = rect.bottom + 10
    const left = isOwnMessage ? rect.right - 180 : rect.left
    return { top, left }
  }

  const { top, left } = getPosition()

  const MenuItem = ({ icon: Icon, label, onClick, danger = false, separator = false }: any) => {
    if (separator) return <div className="h-[1px] bg-white/10 my-1" />
    
    return (
      <button
        onClick={() => { onClick?.(); onClose(); }}
        className={`
          w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all
          ${danger 
            ? 'text-red-400 hover:bg-red-500/10' 
            : 'text-zinc-200 hover:bg-white/10 hover:text-white'
          }
        `}
      >
        <Icon sx={{ fontSize: 18 }} />
        <span>{label}</span>
      </button>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Invisible Backdrop */}
          <div className="fixed inset-0 z-40" onClick={onClose} />
          
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.2 }}
            className="fixed z-50 w-48 p-1.5 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl origin-top-left"
            style={{ top, left }}
          >
            <MenuItem icon={Reply} label="Reply" onClick={onReply} />
            <MenuItem icon={Favorite} label="React" onClick={onReact} />
            <MenuItem icon={ContentCopy} label="Copy" onClick={onCopy} />
            
            {(isOwnMessage || onForward || onInfo) && <MenuItem separator />}
            
            {isOwnMessage && <MenuItem icon={Edit} label="Edit" onClick={onEdit} />}
            {onForward && <MenuItem icon={Forward} label="Forward" onClick={onForward} />}
            {onInfo && <MenuItem icon={Info} label="Info" onClick={onInfo} />}
            
            {isOwnMessage && <MenuItem separator />}
            {isOwnMessage && <MenuItem icon={Delete} label="Delete" onClick={onDelete} danger />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}