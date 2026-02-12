import React from 'react'
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
  return (
    <div
      onClick={onClick}
      className={`
        group relative flex items-center gap-3 p-3 mx-2 rounded-2xl transition-all duration-200 cursor-pointer
        ${isActive 
          ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-white/10 shadow-lg shadow-indigo-500/5' 
          : 'hover:bg-white/5 border border-transparent hover:border-white/5'
        }
      `}
    >
      <div className="relative">
        <Avatar src={avatar} alt={name} size="md" online={!isGroup && online} />
        {/* Active Line Indicator for active chat */}
        {isActive && (
          <div className="absolute -left-[18px] top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-semibold truncate transition-colors ${isActive ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
            {name}
          </h3>
          <span className={`text-[10px] ${unread > 0 ? 'text-indigo-400 font-bold' : 'text-zinc-500'}`}>
            {time}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-2">
            {typing ? (
              <span className="flex items-center gap-1 text-xs text-indigo-400 font-medium">
                <span className="flex gap-0.5 pt-1">
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_0ms]" />
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_200ms]" />
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_400ms]" />
                </span>
                Typing...
              </span>
            ) : (
              <p className={`text-xs truncate ${unread > 0 ? 'text-zinc-100 font-medium' : 'text-zinc-400'}`}>
                {lastMessage}
              </p>
            )}
          </div>
          
          {unread > 0 && (
            <div className="min-w-[18px] h-[18px] px-1.5 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-[10px] font-bold text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}