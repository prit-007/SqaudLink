'use client'

import Link from 'next/link'

interface ConversationItemProps {
  id: string
  name: string
  avatarUrl: string | null
  lastMessage: string
  time: string
  unreadCount: number
}

export default function ConversationItem({
  id,
  name,
  avatarUrl,
  lastMessage,
  time,
  unreadCount
}: ConversationItemProps) {
  return (
    <Link href={`/chat/${id}`}>
      <div className="flex items-center p-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5">
        <div className="relative">
          <img
            src={avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${name}`}
            alt={name}
            className="w-12 h-12 rounded-full object-cover"
          />
          {/* Online indicator can be added here */}
        </div>
        <div className="flex-1 ml-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-sm">{name}</h3>
            <span className="text-xs text-zinc-400">{time}</span>
          </div>
          <div className="flex justify-between items-start mt-1">
            <p className="text-sm text-zinc-400 truncate w-48">
              {lastMessage}
            </p>
            {unreadCount > 0 && (
              <span className="bg-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
