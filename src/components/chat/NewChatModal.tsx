'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import Avatar from './Avatar'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'

interface User {
  id: string
  username: string
  avatar_url: string | null
  status: string
}

interface NewChatModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  onConversationCreated: (conversationId: string) => void
}

export default function NewChatModal({ isOpen, onClose, currentUserId, onConversationCreated }: NewChatModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [creatingChatUserId, setCreatingChatUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) searchUsers()
  }, [isOpen, searchQuery])

  const searchUsers = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('id, username, avatar_url, status')
        .neq('id', currentUserId)
        .limit(10)

      if (searchQuery.trim()) {
        query = query.ilike('username', `%${searchQuery}%`)
      }

      const { data } = await query
      setUsers(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleCreateOrOpenChat = async (targetUserId: string) => {
    if (!currentUserId || currentUserId === targetUserId) return

    setCreatingChatUserId(targetUserId)

    try {
      // Find candidate conversations shared by both users.
      const [{ data: myRows, error: myRowsError }, { data: targetRows, error: targetRowsError }] = await Promise.all([
        supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', currentUserId),
        supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', targetUserId)
      ])

      if (myRowsError) throw myRowsError
      if (targetRowsError) throw targetRowsError

      const myConversationIds = new Set((myRows || []).map((row) => row.conversation_id))
      const sharedConversationIds = (targetRows || [])
        .map((row) => row.conversation_id)
        .filter((conversationId) => myConversationIds.has(conversationId))

      let conversationIdToOpen: string | null = null

      if (sharedConversationIds.length > 0) {
        const { data: dmConversations, error: dmConversationsError } = await supabase
          .from('conversations')
          .select('id')
          .in('id', sharedConversationIds)
          .eq('type', 'dm')

        if (dmConversationsError) throw dmConversationsError

        const dmIds = (dmConversations || []).map((c) => c.id)

        if (dmIds.length > 0) {
          const { data: participantRows, error: participantRowsError } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .in('conversation_id', dmIds)

          if (participantRowsError) throw participantRowsError

          const participantCountByConversation = (participantRows || []).reduce<Record<string, number>>((acc, row) => {
            acc[row.conversation_id] = (acc[row.conversation_id] || 0) + 1
            return acc
          }, {})

          conversationIdToOpen = dmIds.find((id) => participantCountByConversation[id] === 2) || null
        }
      }

      if (!conversationIdToOpen) {
        const { data: newConversation, error: createError } = await supabase.rpc('create_new_chat', {
          is_group: false,
          chat_name: null,
          participant_ids: [targetUserId]
        })

        if (createError) throw createError

        conversationIdToOpen = newConversation?.id || null
      }

      if (!conversationIdToOpen) {
        throw new Error('Unable to resolve conversation ID')
      }

      onConversationCreated(conversationIdToOpen)
      onClose()
    } catch (error) {
      console.error('Failed to create/open chat:', error)
      alert('Could not open chat. Please try again.')
    } finally {
      setCreatingChatUserId(null)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[600px]"
          >
            {/* Header / Search */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <SearchIcon className="text-zinc-500" />
              <input
                type="text"
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-zinc-500 text-lg h-10"
                autoFocus
              />
              <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                <CloseIcon fontSize="small" />
              </button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  No users found matching "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Suggested</div>
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleCreateOrOpenChat(user.id)}
                      disabled={creatingChatUserId === user.id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group"
                    >
                      <Avatar
                        src={user.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${user.username}`}
                        alt={user.username}
                        size="md"
                        online={user.status === 'online'}
                      />
                      <div className="flex-1 text-left">
                        <p className="font-medium text-zinc-200 group-hover:text-white transition-colors">{user.username}</p>
                        <p className="text-xs text-zinc-500">{user.status}</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 text-xs text-zinc-400 bg-white/10 px-2 py-1 rounded transition-opacity">
                        {creatingChatUserId === user.id ? 'Opening...' : 'Enter'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer hint */}
            <div className="px-4 py-2 bg-white/5 border-t border-white/5 text-[10px] text-zinc-500 flex justify-between">
              <span>PRO TIP</span>
              <span>Use arrows to navigate</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}