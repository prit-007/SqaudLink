'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CryptoService } from '@/utils/crypto-service'
import { uploadMedia } from '@/utils/uploadMedia'

export type MessageStatus = 'sending' | 'sent' | 'read';

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url?: string;
  message_type?: 'text' | 'image' | 'voice' | 'video' | 'file';
  media_type?: string; // MIME type
  reply_to_id?: string;
  created_at: string;
  updated_at?: string;
  is_edited?: boolean;
  is_deleted?: boolean;
  status?: MessageStatus;
  delivery_status?: 'sent' | 'delivered' | 'read';
  voice_duration?: number;
  voice_waveform?: number[];
  quoted_text?: string;
  quoted_sender_id?: string;
  quoted_sender_name?: string;
  // UI-only fields
  is_optimistic?: boolean;
  sender_name?: string;
  sender_avatar?: string;
  reactions?: any[];
};

export type SendMessageParams = {
  text: string
  file?: File
  mediaUrl?: string
  mediaType?: string
  replyToId?: string
  quotedText?: string
  quotedSenderId?: string
  voiceDuration?: number
  voiceWaveform?: number[]
}

export function useChatMessages(conversationId: string, myUserId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
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
              // Handle if content is already an object
              const parsed = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content
              if (parsed.content && parsed.deviceKeys) {
                decryptedContent = await CryptoService.decryptMessage(parsed)
                // Ensure decrypted content is a string
                if (typeof decryptedContent !== 'string') {
                  console.warn('Decryption returned non-string:', decryptedContent)
                  decryptedContent = '[Encrypted message]'
                }
              }
            } catch (error) {
              // Not encrypted or parse error, use as-is
              console.warn('E2EE decryption failed:', error)
            }
          }
          
          // Final safety check: ensure content is always a string
          if (typeof decryptedContent !== 'string') {
            console.error('Content is not a string:', decryptedContent)
            decryptedContent = '[Message format error]'
          }

          // Fetch reactions for this message
          const { data: reactionsData } = await supabase
            .from('message_reactions')
            .select('emoji, user_id')
            .eq('message_id', msg.id)

          // Fetch quoted sender's username if reply exists
          let quotedSenderName = null
          if (msg.reply_to_id && msg.quoted_sender_id) {
            const { data: quotedSender } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', msg.quoted_sender_id)
              .single()
            
            quotedSenderName = quotedSender?.username || null
          }

          return {
            id: msg.id,
            conversation_id: msg.conversation_id,
            sender_id: msg.sender_id,
            content: decryptedContent,
            media_url: msg.media_url,
            media_type: msg.media_type,
            message_type: msg.message_type,
            reply_to_id: msg.reply_to_id,
            created_at: msg.created_at,
            updated_at: msg.updated_at,
            is_edited: msg.is_edited,
            is_deleted: msg.is_deleted,
            status: msg.status || 'sent',
            delivery_status: msg.delivery_status,
            voice_duration: msg.voice_duration,
            voice_waveform: msg.voice_waveform,
            quoted_text: msg.quoted_text,
            quoted_sender_id: msg.quoted_sender_id,
            quoted_sender_name: quotedSenderName,
            sender_name: msg.sender?.username || 'Unknown',
            sender_avatar: msg.sender?.avatar_url,
            reactions: reactionsData || []
          }
        }))
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error fetching messages:', JSON.stringify(error, null, 2))
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, supabase])

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!myUserId) return // Don't run if user ID not available yet
    
    try {
      const { error } = await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('conversation_id', conversationId)
        .neq('sender_id', myUserId)
        .neq('status', 'read')

      if (error) throw error
    } catch (error) {
      console.error('Failed to mark messages as read:', error)
    }
  }, [conversationId, myUserId, supabase])

  // Set up real-time subscription
  useEffect(() => {
    fetchMessages()
    markAsRead()

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
              // Handle if content is already an object
              const parsed = typeof newMsg.content === 'string' ? JSON.parse(newMsg.content) : newMsg.content
              if (parsed.content && parsed.deviceKeys) {
                decryptedContent = await CryptoService.decryptMessage(parsed)
                // Ensure decrypted content is a string
                if (typeof decryptedContent !== 'string') {
                  console.warn('Decryption returned non-string:', decryptedContent)
                  decryptedContent = '[Encrypted message]'
                }
              }
            } catch (error) {
              // Not encrypted or parse error, use as-is
              console.warn('E2EE decryption failed:', error)
            }
          }
          
          // Final safety check: ensure content is always a string
          if (typeof decryptedContent !== 'string') {
            console.error('Content is not a string:', decryptedContent)
            decryptedContent = '[Message format error]'
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
            status: newMsg.status || 'sent',
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
            
            // Mark as read since we are in the chat
            markAsRead()

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
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions'
        },
        async (payload: any) => {
          // Update local state directly to avoid scroll jump
          const newReaction = payload.new
          setMessages((prev) =>
            prev.map((m) =>
              m.id === newReaction.message_id
                ? { ...m, reactions: [...(m.reactions || []), newReaction] }
                : m
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions'
        },
        async (payload: any) => {
          // Update local state directly to avoid scroll jump
          const deletedReaction = payload.old
          setMessages((prev) =>
            prev.map((m) =>
              m.id === deletedReaction.message_id
                ? {
                    ...m,
                    reactions: (m.reactions || []).filter(
                      (r: any) => !(r.user_id === deletedReaction.user_id && r.emoji === deletedReaction.emoji)
                    )
                  }
                : m
            )
          )
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

    // Real-time typing indicators subscription
    const fetchTypingUsers = async () => {
      if (!myUserId) return
      
      const { data } = await supabase
        .from('typing_indicators')
        .select('user_id, profiles!typing_indicators_user_id_fkey(username)')
        .eq('conversation_id', conversationId)
        .neq('user_id', myUserId)
        .gt('started_at', new Date(Date.now() - 5000).toISOString()) // Last 5 seconds
      
      const usernames = data?.map((t: any) => t.profiles?.username).filter(Boolean) || []
      setTypingUsers(usernames as string[])
    }

    // Poll for typing users every 1 second
    const typingInterval = setInterval(fetchTypingUsers, 1000)
    fetchTypingUsers()

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
      clearInterval(typingInterval)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [conversationId, myUserId, fetchMessages, supabase])

  // Send message with optimistic update
  const sendMessage = async ({ text, file, mediaUrl, mediaType, replyToId, quotedText, quotedSenderId, voiceDuration, voiceWaveform }: SendMessageParams) => {
    if (!text.trim() && !mediaUrl && !file) return

    // Generate temporary ID
    const tempId = `temp-${Date.now()}-${Math.random()}`
    
    // Create optimistic preview URL for instant display
    const optimisticMediaUrl = file ? URL.createObjectURL(file) : mediaUrl
    const optimisticMediaType = file ? file.type.split('/')[0] : mediaType
    const messageType = file ? (file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'file') : (mediaUrl ? 'image' : 'text')

    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: myUserId,
      content: text,
      media_url: optimisticMediaUrl,
      media_type: file ? file.type : mediaType,
      message_type: messageType as any,
      reply_to_id: replyToId,
      quoted_text: quotedText,
      quoted_sender_id: quotedSenderId,
      voice_duration: voiceDuration,
      voice_waveform: voiceWaveform,
      created_at: new Date().toISOString(),
      is_optimistic: true,
      status: 'sending',
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
            console.log('🔐 Message encrypted with E2EE')
          }
        } catch (encryptError) {
          console.warn('⚠️ E2EE encryption failed, sending plaintext:', encryptError)
          // Fall back to plaintext if encryption fails
        }
      }

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: myUserId,
        content: contentToSend,
        media_url: finalMediaUrl,
        media_type: file ? file.type : mediaType,
        message_type: messageType,
        reply_to_id: replyToId,
        voice_duration: voiceDuration,
        voice_waveform: voiceWaveform,
        quoted_text: quotedText,
        quoted_sender_id: quotedSenderId,
        status: 'sent'
      })

      if (error) throw error

      // Update local state to 'sent'
      setMessages((prev) => 
        prev.map((m) => m.id === tempId ? { ...m, status: 'sent', is_optimistic: false } : m)
      )

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
  const sendTypingIndicator = useCallback(async () => {
    try {
      await supabase.from('typing_indicators').upsert({
        conversation_id: conversationId,
        user_id: myUserId,
        started_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to send typing indicator:', error)
    }
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

  // React to message (toggle behavior with optimistic UI)
  const reactToMessage = async (messageId: string, emoji: string) => {
    try {
      // Optimistic UI update - show reaction immediately
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            const existingReactions = m.reactions || []
            // Check if user already reacted with this emoji
            const hasReacted = existingReactions.some(
              (r: any) => r.user_id === myUserId && r.emoji === emoji
            )
            
            let newReactions
            if (hasReacted) {
              // Remove reaction (toggle off)
              newReactions = existingReactions.filter(
                (r: any) => !(r.user_id === myUserId && r.emoji === emoji)
              )
            } else {
              // Remove any other reaction from this user (max 1 per user)
              const withoutUserReactions = existingReactions.filter(
                (r: any) => r.user_id !== myUserId
              )
              // Add new reaction
              newReactions = [...withoutUserReactions, { emoji, user_id: myUserId }]
            }
            
            return { ...m, reactions: newReactions }
          }
          return m
        })
      )

      // Haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(20)
      }

      // Use RPC to toggle reaction in database
      const { error } = await supabase.rpc('toggle_reaction', {
        p_message_id: messageId,
        p_emoji: emoji
      })

      if (error) {
        // Revert optimistic update on error
        await fetchMessages()
        throw error
      }
    } catch (error) {
      console.error('React failed:', error)
    }
  }

  return {
    messages,
    isLoading,
    isTyping,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    editMessage,
    deleteMessage,
    reactToMessage,
    scrollRef
  }
}
