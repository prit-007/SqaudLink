'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import Avatar from './Avatar'

interface ConversationItemProps {
  id: string
  name: string
  avatarUrl: string | null
  lastMessage: string
  time: string
  unreadCount: number
  isActive?: boolean // Added for explicit active state handling
  isTyping?: boolean
}

export default function ConversationItem({
  id,
  name,
  avatarUrl,
  lastMessage,
  time,
  unreadCount,
  isActive = false,
  isTyping = false
}: ConversationItemProps) {
  return (
    <Link href={`/chat/${id}`} className="block w-full">
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
        className={`
          group relative flex items-center gap-4 p-3 mx-2 rounded-2xl transition-all duration-200
          ${isActive 
            ? 'bg-white/10 shadow-lg shadow-black/20 border border-white/5' 
            : 'border border-transparent hover:border-white/5'
          }
        `}
      >
        {/* Active Indicator Bar */}
        {isActive && (
          <motion.div 
            layoutId="active-chat-indicator"
            className="absolute left-0 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.6)]"
          />
        )}

        <Avatar 
          src={avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${name}`}
          alt={name}
          size="md"
          online={isActive} // Just as an example, normally comes from props
        />

        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex justify-between items-center">
            <h3 className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-zinc-200 group-hover:text-white transition-colors'}`}>
              {name}
            </h3>
            <span className={`text-[10px] font-medium ${unreadCount > 0 ? 'text-indigo-400' : 'text-zinc-500'}`}>
              {time}
            </span>
          </div>

          <div className="flex justify-between items-center">
            {isTyping ? (
              <span className="text-xs text-indigo-400 font-medium italic animate-pulse">Typing...</span>
            ) : (
              <p className={`text-xs truncate max-w-[140px] ${unreadCount > 0 ? 'text-zinc-100 font-medium' : 'text-zinc-400'}`}>
                {lastMessage || 'Start a conversation'}
              </p>
            )}

            {unreadCount > 0 && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="min-w-[18px] h-[18px] px-1 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/40"
              >
                <span className="text-[10px] font-bold text-white leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  )
}