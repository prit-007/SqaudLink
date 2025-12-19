'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Avatar from './Avatar'
import ChatItem from './ChatItem'
import StoryRing from './StoryRing'
import NewChatModal from './NewChatModal'
import { useConversations } from '@/hooks/useConversations'

function formatTime(dateString?: string) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000 // seconds
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return date.toLocaleDateString()
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const { conversations, isLoading, userId } = useConversations()

  const filteredConversations = conversations.filter(chat => {
    const otherParticipant = chat.participants.find(p => p.user_id !== userId)
    const name = chat.type === 'group' ? chat.name : otherParticipant?.username
    return name?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="w-full h-full flex flex-col border-r border-white/5 bg-zinc-900/30 backdrop-blur-xl pb-20 md:pb-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
            Chats
          </h1>
          <div className="flex gap-1 md:gap-2">
            <button 
              onClick={() => setIsNewChatOpen(true)}
              className="p-2.5 md:p-2 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-95 transition-all text-zinc-400 hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50 focus:bg-black/40 transition-all"
          />
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-400 transition-colors"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
            <p className="text-xs text-zinc-500">Loading chats...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-zinc-400 text-sm mb-2">No conversations yet</p>
            <p className="text-zinc-600 text-xs">Start a new chat to connect with your squad</p>
          </div>
        ) : (
          <div className="px-2 space-y-1">
            {filteredConversations.map((chat) => {
              const isActive = pathname === `/chat/${chat.id}`
              const otherParticipant = chat.participants.find(p => p.user_id !== userId)
              
              // Determine display name and avatar
              const displayName = chat.type === 'group' 
                ? chat.name || 'Group Chat'
                : otherParticipant?.username || 'Unknown User'
              
              const displayAvatar = chat.type === 'group'
                ? chat.group_avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${chat.id}`
                : otherParticipant?.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${otherParticipant?.username || 'User'}`

              const isOnline = chat.type === 'dm' && otherParticipant?.status === 'online'

              return (
                <Link href={`/chat/${chat.id}`} key={chat.id}>
                  <ChatItem
                    id={chat.id}
                    name={displayName}
                    lastMessage={chat.last_message?.content || (chat.last_message?.message_type === 'image' ? 'Sent an image' : 'No messages yet')}
                    time={formatTime(chat.last_message?.created_at || chat.updated_at)}
                    unread={chat.unread_count}
                    avatar={displayAvatar}
                    isGroup={chat.type === 'group'}
                    online={isOnline}
                    typing={false} // TODO: Implement typing status in list
                    isActive={isActive}
                  />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Stories Section - Improved */}
      <div className="py-3 border-t border-white/5">
        <div className="px-4 mb-2">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Stories</h3>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-4 px-4 pb-2">
            <StoryRing
              src={`https://api.dicebear.com/9.x/notionists/svg?seed=${userId}`}
              alt="Your story"
              username="Your Story"
              isOwn={true}
              onClick={() => {/* TODO: Open story creator */}}
            />
            {/* TODO: Fetch and display friends' stories */}
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        currentUserId={userId || ''}
        onConversationCreated={(conversationId) => {
          router.push(`/chat/${conversationId}`)
        }}
      />
    </div>
  )
}

