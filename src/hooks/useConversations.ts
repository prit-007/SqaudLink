import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface Conversation {
  id: string
  type: 'dm' | 'group'
  name: string | null
  group_avatar_url: string | null
  updated_at: string
  last_message?: {
    content: string | null
    created_at: string
    message_type: 'text' | 'image' | 'system'
  }
  participants: {
    user_id: string
    username: string
    avatar_url: string | null
    status: string
    last_seen: string
  }[]
  unread_count?: number
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    let channel: RealtimeChannel

    const fetchConversations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        // 1. Get all conversation IDs the user is part of
        const { data: myConvos, error: myConvosError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id)

        if (myConvosError) throw myConvosError

        if (!myConvos || myConvos.length === 0) {
          setConversations([])
          setIsLoading(false)
          return
        }

        const conversationIds = myConvos.map(c => c.conversation_id)

        // 2. Fetch conversation details, participants, and messages
        // Note: We're fetching all participants for these conversations to show names/avatars
        const { data: convosData, error: convosError } = await supabase
          .from('conversations')
          .select(`
            *,
            participants:conversation_participants(
              user:profiles(*)
            )
          `)
          .in('id', conversationIds)
          .order('updated_at', { ascending: false })

        if (convosError) throw convosError

        // Fetch the last message for each conversation separately
        const conversationsWithMessages = await Promise.all(
          (convosData || []).map(async (convo: any) => {
            const { data: messages } = await supabase
              .from('messages')
              .select('content, created_at, message_type')
              .eq('conversation_id', convo.id)
              .order('created_at', { ascending: false })
              .limit(1)
            
            return {
              ...convo,
              messages: messages || []
            }
          })
        )

        // 3. Process the data to format it nicely
        const formattedConversations: Conversation[] = conversationsWithMessages.map((convo: any) => {
          // Sort messages to get the last one
          // Since we can't easily limit nested queries per parent row in Supabase yet without RPC,
          // we fetch them (hopefully not too many per chat for now) and pick the last one.
          // Optimization: In a real app, use a 'last_message' column on conversations table updated via trigger.
          const sortedMessages = convo.messages?.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ) || []
          
          const lastMsg = sortedMessages[0]

          return {
            id: convo.id,
            type: convo.type,
            name: convo.name,
            group_avatar_url: convo.group_avatar_url,
            updated_at: convo.updated_at,
            last_message: lastMsg,
            participants: convo.participants.map((p: any) => ({
              user_id: p.user.id,
              username: p.user.username,
              avatar_url: p.user.avatar_url,
              status: p.user.status,
              last_seen: p.user.last_seen
            })),
            unread_count: 0 // TODO: Implement unread count logic
          }
        })

        setConversations(formattedConversations)
      } catch (err) {
        console.error('Error fetching conversations:', err)
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()

    // Subscribe to changes
    // We want to know if:
    // 1. A new message is sent in any of our conversations (to update last_message and reorder)
    // 2. A conversation is updated (e.g. name change)
    channel = supabase
      .channel('conversations_list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          // Simplest strategy for now: refetch all. 
          // Optimistic updates for the list are harder than for a single chat.
          fetchConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { conversations, isLoading, error, userId }
}
