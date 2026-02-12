'use client'

import { useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export function useTypingIndicator(conversationId: string, userId: string) {
  const supabase = createClient()
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const cleanupTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Send typing status with debounce
  const sendTypingStatus = useCallback(async (isTyping: boolean) => {
    try {
      if (isTyping) {
        // Insert/update typing indicator
        await supabase.from('typing_indicators').upsert({
          conversation_id: conversationId,
          user_id: userId,
          started_at: new Date().toISOString()
        })

        // Auto-cleanup after 3 seconds of inactivity
        if (cleanupTimerRef.current) {
          clearTimeout(cleanupTimerRef.current)
        }
        cleanupTimerRef.current = setTimeout(() => {
          sendTypingStatus(false)
        }, 3000)
      } else {
        // Remove typing indicator
        await supabase
          .from('typing_indicators')
          .delete()
          .match({ conversation_id: conversationId, user_id: userId })
      }
    } catch (error) {
      console.error('Error updating typing status:', error)
    }
  }, [conversationId, userId, supabase])

  // Debounced typing handler (300ms delay)
  const handleTyping = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Send "typing" immediately on first keystroke
    sendTypingStatus(true)

    // Debounce subsequent updates
    debounceTimerRef.current = setTimeout(() => {
      // User stopped typing
      sendTypingStatus(false)
    }, 1000)
  }, [sendTypingStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current)
      sendTypingStatus(false)
    }
  }, [sendTypingStatus])

  return { handleTyping, stopTyping: () => sendTypingStatus(false) }
}
