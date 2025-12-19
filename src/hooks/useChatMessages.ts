'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CryptoService } from '@/utils/crypto-service'
import { uploadMedia } from '@/utils/uploadMedia'

export type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  media_url?: string
  media_type?: string
  reply_to_id?: string
  created_at: string
  updated_at?: string
  is_edited?: boolean
  is_deleted?: boolean
  // UI-only fields
  is_optimistic?: boolean
  sender_name?: string
  sender_avatar?: string
  reactions?: any[]
}

export type SendMessageParams = {
  text: string
  file?: File
  mediaUrl?: string
  mediaType?: string
  replyToId?: string
}

export function useChatMessages(conversationId: string, myUserId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const supabase = createClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch message history
  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (error) throw error

      if (data) {
        const formattedMessages = await Promise.all(data.map(async (msg: any) => {
          let decryptedContent = msg.content
          
          // Try to decrypt if E2EE is enabled
          if (CryptoService.isInitialized() && msg.content) {
            try {
              const parsed = JSON.parse(msg.content)
              if (parsed.content && parsed.deviceKeys) {
                decryptedContent = await CryptoService.decryptMessage(parsed)
              }
            } catch {
              // Not encrypted or parse error, use as-is
            }
          }

          return {
            id: msg.id,
            conversation_id: msg.conversation_id,
            sender_id: msg.sender_id,
            content: decryptedContent,
            media_url: msg.media_url,
            media_type: msg.media_type,
            reply_to_id: msg.reply_to_id,
            created_at: msg.created_at,
            updated_at: msg.updated_at,
            is_edited: msg.is_edited,
            is_deleted: msg.is_deleted,
            sender_name: msg.sender?.username || 'Unknown',
            sender_avatar: msg.sender?.avatar_url,
            reactions: []
          }
        }))
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, supabase])

  // Set up real-time subscription
  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const newMsg = payload.new as any

          // Fetch sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', newMsg.sender_id)
            .single()

          let decryptedContent = newMsg.content
          
          // Try to decrypt if E2EE is enabled
          if (CryptoService.isInitialized() && newMsg.content) {
            try {
              const parsed = JSON.parse(newMsg.content)
              if (parsed.content && parsed.deviceKeys) {
                decryptedContent = await CryptoService.decryptMessage(parsed)
              }
            } catch {
              // Not encrypted or parse error, use as-is
            }
          }

          const formattedMsg: Message = {
            id: newMsg.id,
            conversation_id: newMsg.conversation_id,
            sender_id: newMsg.sender_id,
            content: decryptedContent,
            media_url: newMsg.media_url,
            media_type: newMsg.media_type,
            reply_to_id: newMsg.reply_to_id,
            created_at: newMsg.created_at,
            updated_at: newMsg.updated_at,
            is_edited: newMsg.is_edited,
            is_deleted: newMsg.is_deleted,
            sender_name: sender?.username || 'Unknown',
            sender_avatar: sender?.avatar_url,
            reactions: []
          }

          // Only add if it's from someone else (we already have our own optimistically)
          if (newMsg.sender_id !== myUserId) {
            setMessages((prev) => {
              // Check if message already exists
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, formattedMsg]
            })
            
            // Play notification sound (optional)
            if (typeof Audio !== 'undefined') {
              const audio = new Audio('/sounds/notification.mp3')
              audio.volume = 0.3
              audio.play().catch(() => {})
            }
          } else {
            // Replace optimistic message with real one
            setMessages((prev) => 
              prev.map(m => 
                m.is_optimistic && m.content === newMsg.content 
                  ? formattedMsg 
                  : m
              )
            )
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const updatedMsg = payload.new as any
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const deletedId = payload.old.id
          setMessages((prev) => prev.filter((m) => m.id !== deletedId))
        }
      )
      .subscribe()

    // Typing indicator subscription
    const typingChannel = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== myUserId) {
          setIsTyping(true)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(typingChannel)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [conversationId, myUserId, fetchMessages, supabase])

  // Send message with optimistic update
  const sendMessage = async ({ text, file, mediaUrl, mediaType, replyToId }: SendMessageParams) => {
    if (!text.trim() && !mediaUrl && !file) return

    // Generate temporary ID
    const tempId = `temp-${Date.now()}-${Math.random()}`
    
    // Create optimistic preview URL for instant display
    const optimisticMediaUrl = file ? URL.createObjectURL(file) : mediaUrl
    const optimisticMediaType = file ? file.type.split('/')[0] : mediaType

    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: myUserId,
      content: text,
      media_url: optimisticMediaUrl,
      media_type: optimisticMediaType,
      reply_to_id: replyToId,
      created_at: new Date().toISOString(),
      is_optimistic: true,
      sender_name: 'You',
      reactions: []
    }

    // Add optimistic message
    setMessages((prev) => [...prev, optimisticMsg])

    // Scroll to bottom
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)

    try {
      let finalMediaUrl = mediaUrl

      // Upload file if provided (background upload)
      if (file) {
        try {
          finalMediaUrl = await uploadMedia(file, myUserId)
          console.log('✅ Image uploaded:', finalMediaUrl)
        } catch (uploadError) {
          console.error('❌ Upload failed:', uploadError)
          throw new Error('Failed to upload image')
        }
      }

      // Encrypt message if E2EE is enabled
      let contentToSend = text
      
      if (CryptoService.isInitialized() && text.trim()) {
        try {
          // Get recipient user ID from conversation
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .neq('user_id', myUserId)
            .single()

          if (participants) {
            const encryptedPayload = await CryptoService.encryptForDevices(text, participants.user_id)
            contentToSend = JSON.stringify(encryptedPayload)
          }
        } catch (encryptError) {
          console.warn('E2EE encryption failed, sending plaintext:', encryptError)
          // Fall back to plaintext if encryption fails
        }
      }

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: myUserId,
        content: contentToSend,
        media_url: finalMediaUrl,
        media_type: file ? file.type : mediaType,
        reply_to_id: replyToId
      })

      if (error) throw error

      // Clean up blob URL after successful upload
      if (file && optimisticMediaUrl) {
        URL.revokeObjectURL(optimisticMediaUrl)
      }

      // Haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(20)
      }
    } catch (error) {
      console.error('Send failed:', error)
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      // Show error toast (you can integrate a toast library here)
      alert('Failed to send message. Please try again.')
    }
  }

  // Send typing indicator
  const sendTypingIndicator = useCallback(() => {
    supabase
      .channel(`typing:${conversationId}`)
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: myUserId }
      })
  }, [conversationId, myUserId, supabase])

  // Edit message
  const editMessage = async (messageId: string, newContent: string) => {
    try {
      let contentToSend = newContent

      // Encrypt if E2EE is enabled
      if (CryptoService.isInitialized() && newContent.trim()) {
        try {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .neq('user_id', myUserId)
            .single()

          if (participants) {
            const encryptedPayload = await CryptoService.encryptForDevices(newContent, participants.user_id)
            contentToSend = JSON.stringify(encryptedPayload)
          }
        } catch (encryptError) {
          console.warn('E2EE encryption failed for edit, sending plaintext:', encryptError)
        }
      }

      const { error } = await supabase
        .from('messages')
        .update({ 
          content: contentToSend,
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', myUserId) // Only allow editing own messages

      if (error) throw error

      // Update local state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: newContent, is_edited: true }
            : m
        )
      )
    } catch (error) {
      console.error('Edit failed:', error)
      alert('Failed to edit message')
    }
  }

  // Delete message
  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId)
        .eq('sender_id', myUserId) // Only allow deleting own messages

      if (error) throw error

      // Update local state to show "This message was deleted"
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, is_deleted: true, content: '' }
            : m
        )
      )
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete message')
    }
  }

  // React to message (toggle behavior)
  const reactToMessage = async (messageId: string, emoji: string) => {
    try {
      // First check if this reaction already exists
      let existingReaction: any = null
      try {
        const res = await supabase
          .from('message_reactions')
          .select('id')
          .eq('message_id', messageId)
          .eq('user_id', myUserId)
          .eq('emoji', emoji)
          .single()
        existingReaction = res.data
      } catch (err) {
        // Some emojis can cause REST query parsing issues on the server (406).
        // Fallback: fetch all reactions for this user+message and find locally.
        console.warn('Exact emoji lookup failed, falling back to client filter', err)
        const { data: reactionsFallback } = await supabase
          .from('message_reactions')
          .select('id, emoji')
          .eq('message_id', messageId)
          .eq('user_id', myUserId)
        existingReaction = reactionsFallback?.find((r: any) => r.emoji === emoji)
      }

      if (existingReaction) {
        // Reaction exists, remove it (toggle off)
        if (existingReaction.id) {
          const { error } = await supabase
            .from('message_reactions')
            .delete()
            .eq('id', existingReaction.id)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('message_reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('user_id', myUserId)
            .eq('emoji', emoji)

          if (error) throw error
        }
      } else {
        // Reaction doesn't exist, add it
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: myUserId,
            emoji
          })

        if (error) throw error
      }

      // Haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(20)
      }
    } catch (error) {
      console.error('React failed:', error)
    }
  }

  return {
    messages,
    isLoading,
    isTyping,
    sendMessage,
    sendTypingIndicator,
    editMessage,
    deleteMessage,
    reactToMessage,
    scrollRef
  }
}
