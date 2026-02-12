'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Extended Emoji Data for a richer experience
const EMOJI_DATA = {
  'Smileys': [
    { char: '😀', name: 'grinning face' }, { char: '😃', name: 'grinning face with big eyes' },
    { char: '😄', name: 'grinning face with smiling eyes' }, { char: '😁', name: 'beaming face with smiling eyes' },
    { char: '😅', name: 'grinning face with sweat' }, { char: '😂', name: 'face with tears of joy' },
    { char: '🤣', name: 'rolling on the floor laughing' }, { char: '😊', name: 'smiling face with smiling eyes' },
    { char: '😇', name: 'smiling face with halo' }, { char: '🙂', name: 'slightly smiling face' },
    { char: '🙃', name: 'upside-down face' }, { char: '😉', name: 'winking face' },
    { char: '😌', name: 'relieved face' }, { char: '😍', name: 'smiling face with heart-eyes' },
    { char: '🥰', name: 'smiling face with hearts' }, { char: '😘', name: 'face blowing a kiss' },
    { char: '😗', name: 'kissing face' }, { char: '😙', name: 'kissing face with smiling eyes' },
    { char: '😚', name: 'kissing face with closed eyes' }, { char: '😋', name: 'face savoring food' },
    { char: '😛', name: 'face with tongue' }, { char: '😝', name: 'squinting face with tongue' },
    { char: '😜', name: 'winking face with tongue' }, { char: '🤪', name: 'zany face' },
    { char: '🤨', name: 'face with raised eyebrow' }, { char: '🧐', name: 'face with monocle' },
    { char: '🤓', name: 'nerd face' }, { char: '😎', name: 'smiling face with sunglasses' },
    { char: '🤩', name: 'star-struck' }, { char: '🥳', name: 'partying face' }
  ],
  'Gestures': [
    { char: '👍', name: 'thumbs up' }, { char: '👎', name: 'thumbs down' },
    { char: '👌', name: 'ok hand' }, { char: '✌️', name: 'victory hand' },
    { char: '🤞', name: 'crossed fingers' }, { char: '🤟', name: 'love-you gesture' },
    { char: '🤘', name: 'sign of the horns' }, { char: '🤙', name: 'call me hand' },
    { char: '👈', name: 'backhand index pointing left' }, { char: '👉', name: 'backhand index pointing right' },
    { char: '👆', name: 'backhand index pointing up' }, { char: '👇', name: 'backhand index pointing down' },
    { char: '☝️', name: 'index pointing up' }, { char: '✋', name: 'raised hand' },
    { char: '🤚', name: 'raised back of hand' }, { char: '🖐️', name: 'hand with fingers splayed' },
    { char: '🖖', name: 'vulcan salute' }, { char: '👋', name: 'waving hand' },
    { char: '🤝', name: 'handshake' }, { char: '🙏', name: 'folded hands' },
    { char: '💪', name: 'flexed biceps' }, { char: '🦾', name: 'mechanical arm' },
    { char: '🤲', name: 'palms up together' }, { char: '👐', name: 'open hands' },
    { char: '🙌', name: 'raising hands' }, { char: '👏', name: 'clapping hands' },
    { char: '🤜', name: 'right-facing fist' }, { char: '🤛', name: 'left-facing fist' },
    { char: '✊', name: 'raised fist' }, { char: '👊', name: 'oncoming fist' }
  ],
  'Hearts': [
    { char: '❤️', name: 'red heart' }, { char: '🧡', name: 'orange heart' },
    { char: '💛', name: 'yellow heart' }, { char: '💚', name: 'green heart' },
    { char: '💙', name: 'blue heart' }, { char: '💜', name: 'purple heart' },
    { char: '🖤', name: 'black heart' }, { char: '🤍', name: 'white heart' },
    { char: '🤎', name: 'brown heart' }, { char: '💔', name: 'broken heart' },
    { char: '❤️‍🔥', name: 'heart on fire' }, { char: '❤️‍🩹', name: 'mending heart' },
    { char: '💕', name: 'two hearts' }, { char: '💞', name: 'revolving hearts' },
    { char: '💓', name: 'beating heart' }, { char: '💗', name: 'growing heart' },
    { char: '💖', name: 'sparkling heart' }, { char: '💘', name: 'heart with arrow' },
    { char: '💝', name: 'heart with ribbon' }, { char: '💟', name: 'heart decoration' },
    { char: '♥️', name: 'heart suit' }, { char: '💌', name: 'love letter' }
  ],
  'Symbols': [
    { char: '🔥', name: 'fire' }, { char: '⭐', name: 'star' },
    { char: '✨', name: 'sparkles' }, { char: '💫', name: 'dizzy' },
    { char: '🎉', name: 'party popper' }, { char: '🎊', name: 'confetti ball' },
    { char: '🎁', name: 'wrapped gift' }, { char: '🏆', name: 'trophy' },
    { char: '🥇', name: '1st place medal' }, { char: '🥈', name: '2nd place medal' },
    { char: '🥉', name: '3rd place medal' }, { char: '🎯', name: 'bullseye' },
    { char: '💯', name: 'hundred points' }, { char: '✅', name: 'check mark button' },
    { char: '❌', name: 'cross mark' }, { char: '⚠️', name: 'warning' },
    { char: '🚫', name: 'prohibited' }, { char: '💢', name: 'anger symbol' },
    { char: '💬', name: 'speech balloon' }, { char: '💭', name: 'thought balloon' },
    { char: '🗨️', name: 'left speech bubble' }, { char: '👁️', name: 'eye' },
    { char: '🧿', name: 'nazar amulet' }
  ]
}

interface EmojiPickerProps {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  onSelect: (emoji: string) => void
}

export default function EmojiPicker({ anchorEl, open, onClose, onSelect }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Smileys')
  const [searchQuery, setSearchQuery] = useState('')
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  // Calculate Position
  useEffect(() => {
    if (anchorEl && open) {
      const rect = anchorEl.getBoundingClientRect()
      // Position above and centered on the button, with safety margins for mobile
      const left = Math.min(Math.max(10, rect.left - 150), window.innerWidth - 340)
      const top = Math.max(10, rect.top - 420)
      
      setCoords({ top, left })
    }
  }, [anchorEl, open])

  // Filter Emojis
  const filteredEmojis = useMemo(() => {
    if (!searchQuery) return EMOJI_DATA[activeCategory as keyof typeof EMOJI_DATA]
    
    // Flatten all categories for search
    const allEmojis = Object.values(EMOJI_DATA).flat()
    return allEmojis.filter(e => e.name.includes(searchQuery.toLowerCase()))
  }, [searchQuery, activeCategory])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (open && anchorEl && !anchorEl.contains(e.target as Node)) {
        // Check if click is inside picker
        const picker = document.getElementById('emoji-picker-container')
        if (picker && !picker.contains(e.target as Node)) {
          onClose()
        }
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, anchorEl, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 pointer-events-none">
           {/* Mobile Backdrop */}
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             exit={{ opacity: 0 }}
             className="md:hidden absolute inset-0 bg-black/50 pointer-events-auto"
             onClick={onClose}
           />

           <motion.div
            id="emoji-picker-container"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.2 }}
            className="
              absolute pointer-events-auto
              w-[320px] h-[400px] flex flex-col
              bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden
              md:w-[340px] md:h-[420px]
            "
            style={{ 
              top: window.innerWidth < 768 ? '50%' : coords.top, 
              left: window.innerWidth < 768 ? '50%' : coords.left,
              transform: window.innerWidth < 768 ? 'translate(-50%, -50%)' : 'none',
              marginTop: window.innerWidth < 768 ? 0 : -10 // slight offset from anchor
            }}
          >
            {/* Header: Search */}
            <div className="p-3 border-b border-white/5 bg-white/5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search emojis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-zinc-800 text-sm text-white px-4 py-2 pl-9 rounded-xl border border-transparent focus:border-indigo-500/50 focus:bg-zinc-800 transition-all outline-none placeholder-zinc-500"
                />
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Categories (Only show if not searching) */}
            {!searchQuery && (
              <div className="flex px-2 py-2 gap-1 overflow-x-auto scrollbar-hide border-b border-white/5">
                {Object.keys(EMOJI_DATA).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`
                      px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all
                      ${activeCategory === cat 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                      }
                    `}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Emoji Grid */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              <div className="grid grid-cols-8 gap-1">
                {filteredEmojis.map((emoji, idx) => (
                  <button
                    key={`${emoji.char}-${idx}`}
                    onClick={() => {
                      onSelect(emoji.char)
                      onClose()
                    }}
                    className="
                      aspect-square flex items-center justify-center text-2xl rounded-lg
                      hover:bg-white/10 hover:scale-110 active:scale-95 transition-all
                      cursor-pointer select-none
                    "
                    title={emoji.name}
                  >
                    {emoji.char}
                  </button>
                ))}
              </div>
              
              {filteredEmojis.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                  <span className="text-4xl">😕</span>
                  <span className="text-sm">No emojis found</span>
                </div>
              )}
            </div>

            {/* Quick Footer */}
            {!searchQuery && (
               <div className="p-2 border-t border-white/5 bg-zinc-900/50 flex justify-between items-center text-[10px] text-zinc-500 px-4">
                 <span>Frequently Used</span>
                 <div className="flex gap-2 text-lg">
                   {['❤️', '😂', '👍', '🔥'].map(char => (
                     <button 
                        key={char} 
                        onClick={() => { onSelect(char); onClose(); }}
                        className="hover:scale-125 transition-transform"
                      >
                       {char}
                     </button>
                   ))}
                 </div>
               </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}