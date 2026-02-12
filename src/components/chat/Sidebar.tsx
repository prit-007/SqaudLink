'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Avatar from './Avatar'
import ChatItem from './ChatItem'
import StoryRing from './StoryRing'
import NewChatModal from './NewChatModal'
import StoryUpload from './StoryUpload'
import StoryViewer from './StoryViewer'
import { useConversations } from '@/hooks/useConversations'
import { useStories } from '@/hooks/useStories'
import SquiggleLoader from './SquiggleLoader'

// Icons
import SettingsIcon from '@mui/icons-material/Settings'
import SearchIcon from '@mui/icons-material/Search'
import AddCommentIcon from '@mui/icons-material/AddComment'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import LogoutIcon from '@mui/icons-material/Logout'
import PersonIcon from '@mui/icons-material/Person'

function formatTime(dateString?: string) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000 
  if (diff < 60) return 'Now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [isStoryUploadOpen, setIsStoryUploadOpen] = useState(false)
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false)
  const [selectedStoryUserId, setSelectedStoryUserId] = useState<string>('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const { conversations, isLoading, userId } = useConversations()
  const { storyGroups, myStories, isLoading: storiesLoading, refreshStories } = useStories()

  const handleLogout = async () => {
    const { createClient } = await import('@/utils/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredConversations = conversations.filter(chat => {
    const otherParticipant = chat.participants.find(p => p.user_id !== userId)
    const name = chat.type === 'group' ? chat.name : otherParticipant?.username
    return name?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="w-full h-full flex flex-col border-r border-white/5 bg-zinc-950 text-white relative">
      
      {/* 1. Header Area */}
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
              S
            </div>
            <h1 className="text-xl font-bold tracking-tight">Squad</h1>
          </div>

          <div className="flex gap-1">
            <button 
              onClick={() => setIsNewChatOpen(true)}
              className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <AddCommentIcon fontSize="small" />
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2 rounded-full transition-colors ${isMenuOpen ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <MoreVertIcon fontSize="small" />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
                    >
                      <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/10">
                        <PersonIcon fontSize="small" sx={{ fontSize: 18 }} /> Profile
                      </Link>
                      <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/10">
                        <SettingsIcon fontSize="small" sx={{ fontSize: 18 }} /> Settings
                      </Link>
                      <div className="h-[1px] bg-white/10 my-1" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 text-left">
                        <LogoutIcon fontSize="small" sx={{ fontSize: 18 }} /> Logout
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative group mb-4">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:bg-black transition-all"
          />
          <SearchIcon 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors"
            sx={{ fontSize: 20 }}
          />
        </div>
      </div>

      {/* 2. Stories Section (Top) */}
      <div className="pb-4 border-b border-white/5">
        <div className="overflow-x-auto no-scrollbar px-4">
          <div className="flex gap-4">
            <StoryRing
              src={`https://api.dicebear.com/9.x/initials/svg?seed=${userId}`}
              alt="My Story"
              username="You"
              isOwn={true}
              hasStory={myStories.length > 0}
              onClick={() => {
                if (myStories.length > 0) {
                  setSelectedStoryUserId(userId!)
                  setIsStoryViewerOpen(true)
                } else {
                  setIsStoryUploadOpen(true)
                }
              }}
            />

            {storiesLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1 min-w-[64px] animate-pulse opacity-50">
                  <div className="w-16 h-16 rounded-full bg-zinc-800" />
                  <div className="w-12 h-2 rounded bg-zinc-800" />
                </div>
              ))
            ) : (
              storyGroups.map((group) => (
                <StoryRing
                  key={group.user_id}
                  src={group.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${group.username}`}
                  alt={group.username}
                  username={group.username}
                  isOwn={false}
                  hasStory={true}
                  hasUnviewed={group.unviewed_count > 0}
                  onClick={() => {
                    setSelectedStoryUserId(group.user_id)
                    setIsStoryViewerOpen(true)
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. Chat List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-50">
            <SquiggleLoader />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center opacity-50">
            <p className="text-sm font-medium">No chats found</p>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {filteredConversations.map((chat) => {
              const isActive = pathname === `/chat/${chat.id}`
              const other = chat.participants.find(p => p.user_id !== userId)
              const name = chat.type === 'group' ? chat.name || 'Group' : other?.username || 'Unknown'
              const avatar = chat.type === 'group' ? chat.group_avatar_url : other?.avatar_url
              const online = chat.type === 'dm' && other?.status === 'online'

              return (
                <ChatItem
                  key={chat.id}
                  id={chat.id}
                  name={name}
                  lastMessage={chat.last_message?.content || 'Sent an attachment'}
                  time={formatTime(chat.last_message?.created_at || chat.updated_at)}
                  unread={chat.unread_count}
                  avatar={avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${name}`}
                  isGroup={chat.type === 'group'}
                  online={online}
                  isActive={isActive}
                  onClick={() => router.push(`/chat/${chat.id}`)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <StoryUpload
        open={isStoryUploadOpen}
        onClose={() => setIsStoryUploadOpen(false)}
        onSuccess={() => { refreshStories(); setIsStoryUploadOpen(false); }}
      />

      {selectedStoryUserId && (
        <StoryViewer
          open={isStoryViewerOpen}
          onClose={() => { setIsStoryViewerOpen(false); refreshStories(); }}
          userId={selectedStoryUserId}
        />
      )}

      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        currentUserId={userId || ''}
        onConversationCreated={(id) => router.push(`/chat/${id}`)}
      />
    </div>
  )
}