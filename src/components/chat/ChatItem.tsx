import React from 'react'
import Link from 'next/link'
import Avatar from './Avatar'

interface ChatItemProps {
  id: string
  name: string
  lastMessage: string
  time: string
  unread?: number
  avatar: string
  isGroup?: boolean
  online?: boolean
  typing?: boolean
  isActive?: boolean
  onClick?: () => void
}

export default function ChatItem({
  id,
  name,
  lastMessage,
  time,
  unread = 0,
  avatar,
  isGroup = false,
  online = false,
  typing = false,
  isActive = false,
  onClick
}: ChatItemProps) {
  const content = (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer
        ${isActive
          ? 'bg-white/10 border border-white/5 shadow-lg shadow-purple-500/10'
          : 'hover:bg-white/5 border border-transparent hover:border-white/5'}
      `}
      onClick={onClick}
    >
      <Avatar
        src={avatar}
        alt={name}
        size="md"
        online={!isGroup && online}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className={`font-semibold truncate text-sm ${isActive ? 'text-white' : 'text-zinc-200'}`}>
            {name}
          </h3>
          <span className={`text-[10px] ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
            {time}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <p className={`text-xs truncate ${typing ? 'text-purple-400 italic' : 'text-zinc-400'}`}>
            {typing ? (
              <span className="flex items-center gap-1">
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
                Typing...
              </span>
            ) : (
              lastMessage
            )}
          </p>
          
          {unread > 0 && (
            <div className="min-w-[18px] h-[18px] px-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50">
              <span className="text-[10px] font-bold text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return content
}
