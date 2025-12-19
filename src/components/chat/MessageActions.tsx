'use client'

import { useState, useRef, useEffect } from 'react'

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
  children
}: MessageActionsProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const [lastTap, setLastTap] = useState(0)

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStartPos({ x: touch.clientX, y: touch.clientY })
    
    const timer = setTimeout(() => {
      setMenuPosition({ x: touch.clientX, y: touch.clientY })
      setShowMenu(true)
      // Haptic feedback on supported devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
    }, 400) // Long press = 400ms

    setLongPressTimer(timer)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    // Cancel long press if finger moves too much
    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartPos.x)
    const deltaY = Math.abs(touch.clientY - touchStartPos.y)
    
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        setLongPressTimer(null)
      }
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // Mouse handlers for desktop
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenuPosition({ x: e.clientX, y: e.clientY })
    setShowMenu(true)
  }

  // Double tap for quick reaction
  const handleTap = (e: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now()
    const timeDiff = now - lastTap
    
    if (timeDiff < 300 && timeDiff > 0) {
      // Double tap detected - quick heart reaction
      e.preventDefault()
      if ('vibrate' in navigator) {
        navigator.vibrate([30, 50, 30])
      }
      onReact?.('❤️')
    }
    setLastTap(now)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMenu && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const actions = [
    { icon: '↩️', label: 'Reply', onClick: onReply, show: true },
    { icon: '➡️', label: 'Forward', onClick: onForward, show: true },
    { icon: '📋', label: 'Copy', onClick: () => handleCopy(), show: !!text },
    { icon: '💾', label: 'Save', onClick: onSave, show: true },
    { icon: '🔗', label: 'Share', onClick: () => handleShare(), show: true },
    { icon: imageUrl ? '⬇️' : null, label: 'Download', onClick: () => handleDownload(), show: !!imageUrl },
    { icon: sender === 'me' ? '🗑️' : null, label: 'Delete', onClick: onDelete, show: sender === 'me' },
  ].filter(action => action.show && action.icon)

  const handleCopy = async () => {
    if (text) {
      try {
        await navigator.clipboard.writeText(text)
        // Show toast notification
        setShowMenu(false)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: text,
          url: imageUrl,
        })
      } catch (err) {
        console.error('Share failed:', err)
      }
    }
    setShowMenu(false)
  }

  const handleDownload = async () => {
    if (imageUrl) {
      try {
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `squad-link-${messageId}.jpg`
        a.click()
        window.URL.revokeObjectURL(url)
      } catch (err) {
        console.error('Download failed:', err)
      }
    }
    setShowMenu(false)
  }

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={(e) => handleTap(e)}
      className="relative select-none"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
    >
      {children}

      {/* Action Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setShowMenu(false)}
            onTouchStart={() => setShowMenu(false)}
          />
          
          {/* Menu */}
          <div
            className="fixed z-[101] bg-zinc-900/98 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
            style={{
              left: Math.max(16, Math.min(menuPosition.x - 140, window.innerWidth - 296)),
              top: Math.max(80, Math.min(menuPosition.y - 80, window.innerHeight - 180)),
            }}
          >
            {/* Quick Reactions - Mobile friendly */}
            <div className="flex items-center justify-center gap-2 px-4 py-3 border-b border-white/5">
              {['❤️', '👍', '😂', '😮', '😢', '🔥'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact?.(emoji)
                    setShowMenu(false)
                  }}
                  className="text-2xl p-2 hover:scale-125 active:scale-110 transition-transform touch-manipulation"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-1 p-2 min-w-[280px]">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick?.()
                    setShowMenu(false)
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all touch-manipulation"
                >
                  <span className="text-2xl leading-none">{action.icon}</span>
                  <span className="text-[10px] text-zinc-400 leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
