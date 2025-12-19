'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTheme, themes, Theme } from '@/contexts/ThemeContext'
import { useState } from 'react'

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const themeColors = {
    purple: 'bg-gradient-to-br from-violet-600 to-purple-600',
    blue: 'bg-gradient-to-br from-blue-600 to-cyan-600',
    green: 'bg-gradient-to-br from-emerald-600 to-teal-600',
    pink: 'bg-gradient-to-br from-pink-600 to-rose-600',
    orange: 'bg-gradient-to-br from-orange-600 to-amber-600'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-all"
        title="Change theme"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            {/* Theme Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute top-12 right-0 z-50 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl min-w-[200px]"
            >
              <p className="text-xs text-zinc-400 font-semibold mb-3 px-2">Choose Theme</p>
              <div className="space-y-1">
                {(Object.keys(themes) as Theme[]).map((themeKey) => (
                  <button
                    key={themeKey}
                    onClick={() => {
                      setTheme(themeKey)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-white/5 ${
                      theme === themeKey ? 'bg-white/10' : ''
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full ${themeColors[themeKey]} ring-2 ring-white/20`} />
                    <span className="text-sm text-white capitalize">{themeKey}</span>
                    {theme === themeKey && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="ml-auto text-green-400">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
