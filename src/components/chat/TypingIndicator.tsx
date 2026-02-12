'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface TypingIndicatorProps {
  users?: string[]
  isVisible?: boolean
}

export default function TypingIndicator({ users = [], isVisible = true }: TypingIndicatorProps) {
  // Logic to determine what text to show
  const getTypingText = () => {
    if (!users || users.length === 0) return 'Someone is typing...'
    
    if (users.length === 1) {
      return <><span className="font-bold text-white">{users[0]}</span> is typing...</>
    }
    if (users.length === 2) {
      return <><span className="font-bold text-white">{users[0]}</span> and <span className="font-bold text-white">{users[1]}</span> are typing...</>
    }
    if (users.length === 3) {
      return <><span className="font-bold text-white">{users[0]}</span>, <span className="font-bold text-white">{users[1]}</span>, and <span className="font-bold text-white">{users[2]}</span> are typing...</>
    }
    return <><span className="font-bold text-white">{users[0]}</span>, <span className="font-bold text-white">{users[1]}</span> and {users.length - 2} others are typing...</>
  }

  // Dot animation variants for the "Wave" effect
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -3 },
  }

  const dotTransition = {
    duration: 0.5,
    repeat: Infinity,
    repeatType: "reverse" as const,
    ease: "easeInOut" as const,
  }

  return (
    <AnimatePresence>
      {isVisible && users.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 px-4 py-2 ml-4 w-fit"
        >
          {/* Animated Dots Container */}
          <div className="flex items-center gap-1 bg-zinc-800/80 backdrop-blur-md border border-white/10 px-2.5 py-2 rounded-2xl shadow-sm h-8">
            <motion.div
              variants={dotVariants}
              initial="initial"
              animate="animate"
              transition={{ ...dotTransition, delay: 0 }}
              className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
            />
            <motion.div
              variants={dotVariants}
              initial="initial"
              animate="animate"
              transition={{ ...dotTransition, delay: 0.15 }}
              className="w-1.5 h-1.5 bg-purple-400 rounded-full"
            />
            <motion.div
              variants={dotVariants}
              initial="initial"
              animate="animate"
              transition={{ ...dotTransition, delay: 0.3 }}
              className="w-1.5 h-1.5 bg-pink-400 rounded-full"
            />
          </div>

          {/* Typing Text */}
          <motion.p 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs text-zinc-400 truncate max-w-[200px] select-none"
          >
            {getTypingText()}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}