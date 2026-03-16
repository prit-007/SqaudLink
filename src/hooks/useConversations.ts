import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { CryptoService } from '@/utils/crypto-service'

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
    reactions?: Array<{ emoji: string }>
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
    let channel: RealtimeChannel | null = null
    let heartbeatInterval: NodeJS.Timeout | null = null
    let activeUserId: string | null = null

    const updatePresence = async (status: 'online' | 'offline') => {
      if (!activeUserId) return

      try {
        await supabase
          .from('profiles')
          .update({
            status,
            last_seen: new Date().toISOString()
          })
          .eq('id', activeUserId)
      } catch (presenceError) {
        console.error('Failed to update presence:', presenceError)
      }
    }

    const fetchConversations = async (userIdOverride?: string) => {
      try {
        let resolvedUserId = userIdOverride

        if (!resolvedUserId) {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            setConversations([])
            setIsLoading(false)
            return
          }
          resolvedUserId = user.id
        }

        activeUserId = resolvedUserId
        setUserId(resolvedUserId)

        // 1. Get all conversation IDs the user is part of
        const { data: myConvos, error: myConvosError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', resolvedUserId)

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
              .select('id, content, created_at, message_type')
              .eq('conversation_id', convo.id)
              .order('created_at', { ascending: false })
              .limit(1)
            
            // Decrypt last message if E2EE is enabled
            const decryptedMessages = await Promise.all(
              (messages || []).map(async (msg: any) => {
                let decryptedContent = msg.content
                
                // Try to decrypt if E2EE is enabled
                if (CryptoService.isInitialized() && msg.content) {
                  try {
                    // Handle if content is already an object
                    const parsed = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content
                    if (parsed.content && parsed.deviceKeys) {
                      decryptedContent = await CryptoService.decryptMessage(parsed)
                      // Ensure decrypted content is a string
                      if (typeof decryptedContent !== 'string') {
                        decryptedContent = '🔒 Encrypted message'
                      }
                    }
                  } catch {
                    // Not encrypted or parse error, use as-is
                    // If content is still an object, show placeholder
                    if (typeof msg.content === 'object') {
                      decryptedContent = '🔒 Encrypted message'
                    }
                  }
                }
                
                // Final safety check
                if (typeof decryptedContent !== 'string') {
                  decryptedContent = '🔒 Encrypted message'
                }
                
                // Fetch reactions for last message
                const { data: reactions } = await supabase
                  .from('message_reactions')
                  .select('emoji')
                  .eq('message_id', msg.id)
                
                return {
                  ...msg,
                  content: decryptedContent,
                  reactions: reactions || []
                }
              })
            )
            
            return {
              ...convo,
              messages: decryptedMessages
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
          const participants = (convo.participants || [])
            .filter((p: any) => p.user)
            .map((p: any) => ({
              user_id: p.user.id,
              username: p.user.username,
              avatar_url: p.user.avatar_url,
              status: p.user.status,
              last_seen: p.user.last_seen
            }))

          return {
            id: convo.id,
            type: convo.type,
            name: convo.name,
            group_avatar_url: convo.group_avatar_url,
            updated_at: convo.updated_at,
            last_message: lastMsg,
            participants,
            unread_count: 0 // TODO: Implement unread count logic
          }
        })

        const sortedConversations = [...formattedConversations].sort((a, b) => {
          const aTime = a.last_message?.created_at || a.updated_at
          const bTime = b.last_message?.created_at || b.updated_at
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        })

        setConversations(sortedConversations)
      } catch (err) {
        console.error('Error fetching conversations:', err)
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setConversations([])
        setIsLoading(false)
        return
      }

      activeUserId = user.id
      setUserId(user.id)

      await updatePresence('online')
      await fetchConversations(user.id)

      // Refresh list on message updates, new conversations, participant changes, and profile presence changes.
      channel = supabase
        .channel(`conversations_list:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages'
          },
          () => fetchConversations(user.id)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations'
          },
          () => fetchConversations(user.id)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversation_participants',
            filter: `user_id=eq.${user.id}`
          },
          () => fetchConversations(user.id)
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles'
          },
          () => fetchConversations(user.id)
        )
        .subscribe()

      heartbeatInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          void updatePresence('online')
        }
      }, 30000)

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          void updatePresence('offline')
        } else {
          void updatePresence('online')
          void fetchConversations(user.id)
        }
      }

      const handleBeforeUnload = () => {
        void updatePresence('offline')
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('beforeunload', handleBeforeUnload)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }

    let cleanupVisibilityHandlers: (() => void) | undefined
    void initialize().then((cleanup) => {
      cleanupVisibilityHandlers = cleanup
    })

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      if (cleanupVisibilityHandlers) {
        cleanupVisibilityHandlers()
      }
      void updatePresence('offline')
    }
  }, [])

  return { conversations, isLoading, error, userId }
}
