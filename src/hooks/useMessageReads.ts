'use client'

import { useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

export function useMessageReads(conversationId: string, userId: string, messages: any[]) {
  const supabase = createClient()

  // Mark a specific message as read
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      // Check if already read first to avoid 409 errors
      const { data: existing } = await supabase
        .from('message_reads')
        .select('message_id')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .single()
      
      if (existing) return // Already marked as read
      
      // Insert new read receipt
      await supabase.from('message_reads').insert({
        message_id: messageId,
        user_id: userId,
        read_at: new Date().toISOString()
      })
    } catch (error: any) {
      // Silently ignore errors (likely already read)
    }
  }, [supabase, userId])

  // Mark all unread messages in conversation as read
  const markAllAsRead = useCallback(async () => {
    if (!messages.length) return

    try {
      // Get all message IDs from other users
      const messageIds = messages
        .filter(m => m.sender_id !== userId)
        .map(m => m.id)

      if (messageIds.length === 0) return

      // Get already read message IDs
      const { data: alreadyRead } = await supabase
        .from('message_reads')
        .select('message_id')
        .in('message_id', messageIds)
        .eq('user_id', userId)
      
      const alreadyReadIds = new Set(alreadyRead?.map(r => r.message_id) || [])
      
      // Filter out already read messages
      const unreadIds = messageIds.filter(id => !alreadyReadIds.has(id))
      
      if (unreadIds.length === 0) return
      
      // Insert read receipts for unread messages only
      const readReceipts = unreadIds.map(id => ({
        message_id: id,
        user_id: userId,
        read_at: new Date().toISOString()
      }))

      await supabase.from('message_reads').insert(readReceipts)
    } catch (error: any) {
      // Silently ignore errors
    }
  }, [supabase, userId, messages])

  // Auto-mark messages as read when conversation is viewed
  useEffect(() => {
    if (messages.length > 0) {
      // Debounce to avoid rapid updates
      const timer = setTimeout(() => {
        markAllAsRead()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [messages, markAllAsRead])

  // Set up Intersection Observer for individual message read tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id')
            const senderId = entry.target.getAttribute('data-sender-id')
            
            // Only mark if it's not our own message
            if (messageId && senderId !== userId) {
              markAsRead(messageId)
            }
          }
        })
      },
      { threshold: 0.5 } // Message is 50% visible
    )

    // Observe all message elements
    const messageElements = document.querySelectorAll('[data-message-id]')
    messageElements.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [messages, userId, markAsRead])

  return { markAsRead, markAllAsRead }
}
