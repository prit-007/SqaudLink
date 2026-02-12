'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme, themes, Theme } from '@/contexts/ThemeContext'
import ColorLensIcon from '@mui/icons-material/ColorLens'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  // Gradient configurations for the previews
  const themeGradients: Record<Theme, string> = {
    purple: 'from-violet-600 to-purple-600',
    blue: 'from-blue-600 to-cyan-500',
    green: 'from-emerald-500 to-teal-500',
    pink: 'from-pink-500 to-rose-500',
    orange: 'from-orange-500 to-amber-500'
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
          ${isOpen ? 'bg-white text-zinc-900 rotate-180' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}
        `}
        title="Change Theme"
      >
        <ColorLensIcon sx={{ fontSize: 20 }} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Invisible Backdrop to close on click outside */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* Glass Palette Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, y: 10, filter: 'blur(10px)' }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
              className="absolute right-0 top-14 z-50 w-[280px] p-4 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 origin-top-right"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-sm font-bold text-white tracking-wide">Appearance</span>
                <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {theme}
                </span>
              </div>

              {/* Theme Grid */}
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(themes) as Theme[]).map((themeKey) => {
                  const isActive = theme === themeKey
                  
                  return (
                    <motion.button
                      key={themeKey}
                      onClick={() => setTheme(themeKey)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        relative w-full flex items-center gap-3 p-3 rounded-xl transition-all border
                        ${isActive 
                          ? 'bg-white/10 border-white/20' 
                          : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                        }
                      `}
                    >
                      {/* Color Orb */}
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${themeGradients[themeKey]} shadow-lg ring-1 ring-white/10`} />
                      
                      {/* Label */}
                      <span className={`text-sm font-medium capitalize flex-1 text-left ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                        {themeKey}
                      </span>

                      {/* Active Indicator */}
                      {isActive && (
                        <motion.div 
                          layoutId="activeThemeCheck"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-white"
                        >
                          <CheckCircleIcon sx={{ fontSize: 18 }} />
                        </motion.div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}