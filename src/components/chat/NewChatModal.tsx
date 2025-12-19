'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Avatar from './Avatar'

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
  const [isCreating, setIsCreating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      searchUsers()
    }
  }, [isOpen, searchQuery])

  const searchUsers = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('id, username, avatar_url, status')
        .neq('id', currentUserId)
        .limit(20)

      if (searchQuery.trim()) {
        query = query.ilike('username', `%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createConversation = async (recipientId: string) => {
    setIsCreating(true)
    try {
      // Check if conversation already exists
      const { data: existingParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)

      if (existingParticipants) {
        const conversationIds = existingParticipants.map(p => p.conversation_id)
        
        const { data: otherUserConvos } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', recipientId)
          .in('conversation_id', conversationIds)

        if (otherUserConvos && otherUserConvos.length > 0) {
          // Conversation exists
          onConversationCreated(otherUserConvos[0].conversation_id)
          onClose()
          return
        }
      }

      // Create new conversation using RPC function (atomic operation)
      // This fixes the race condition where SELECT policy fails before participants are added
      const { data: newConvo, error: convoError } = await supabase.rpc('create_new_chat', {
        is_group: false,
        chat_name: null,
        participant_ids: [recipientId]
      })

      if (convoError) throw convoError

      onConversationCreated(newConvo.id)
      onClose()
    } catch (error) {
      console.error('Error creating conversation:', error)
      alert('Failed to create conversation')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">New Chat</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No users found
            </div>
          ) : (
            <div className="space-y-1">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => createConversation(user.id)}
                  disabled={isCreating}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <Avatar
                    src={user.avatar_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${user.username}`}
                    alt={user.username}
                    size="md"
                    online={user.status === 'online'}
                  />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-white">{user.username}</p>
                    <p className="text-xs text-zinc-500 capitalize">{user.status}</p>
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-zinc-500"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
