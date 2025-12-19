'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface TypingIndicatorProps {
  users?: string[] // Array of usernames who are typing
  isVisible?: boolean
}

export default function TypingIndicator({ users = [], isVisible = true }: TypingIndicatorProps) {
  if (!isVisible || users.length === 0) return null

  const displayText = () => {
    if (users.length === 1) {
      return `${users[0]} is typing...`
    } else if (users.length === 2) {
      return `${users[0]} and ${users[1]} are typing...`
    } else {
      return `${users[0]} and ${users.length - 1} others are typing...`
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex items-center gap-2 px-4 py-2"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-1 bg-zinc-800/70 backdrop-blur-sm border border-white/5 rounded-full px-3 py-1.5"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 bg-purple-400 rounded-full"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.4, 1, 0.4],
                y: [0, -3, 0]
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.12,
                ease: 'easeInOut'
              }}
            />
          ))}
        </motion.div>
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xs text-purple-400 font-medium"
        >
          {displayText()}
        </motion.span>
      </motion.div>
    </AnimatePresence>
  )
}
