'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { useChatMessages } from '@/hooks/useChatMessages'
import Avatar from '@/components/chat/Avatar'
import MessageBubble from '@/components/chat/MessageBubble'
import MessageActions from '@/components/chat/MessageActions'
import ChatInput from '@/components/chat/ChatInput'
import TypingIndicator from '@/components/chat/TypingIndicator'
import ThemeSelector from '@/components/chat/ThemeSelector'

export default function ChatWindow() {
  const params = useParams()
  const conversationId = params.id as string
  const supabase = createClient()
  
  // Get current user
  const [myUserId, setMyUserId] = useState<string>('')
  const [myUsername, setMyUsername] = useState<string>('')
  const [conversation, setConversation] = useState<any>(null)
  
  useEffect(() => {
    const fetchUserAndConversation = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setMyUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single()
        setMyUsername(profile?.username || 'You')

        if (conversationId) {
          const { data: convData } = await supabase
            .from('conversations')
            .select('*, participants:conversation_participants(*, profiles(*))')
            .eq('id', conversationId)
            .single()
          setConversation(convData)
        }
      }
    }
    
    fetchUserAndConversation()
  }, [conversationId, supabase])
  
  // Use real-time hook
  const { 
    messages, 
    isLoading, 
    isTyping, 
    sendMessage, 
    sendTypingIndicator, 
    editMessage,
    deleteMessage, 
    reactToMessage,
    scrollRef 
  } = useChatMessages(conversationId, myUserId)
  
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  
  const [newMessage, setNewMessage] = useState('')
  const [replyingTo, setReplyingTo] = useState<{ id: string; sender: string; text?: string; imageUrl?: string } | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Check if this is a group chat
  const isGroupChat = conversation?.type === 'group' || false
  const [isOnline] = useState(true) // TODO: Implement real presence

  const getConversationName = () => {
    if (!conversation) return 'Loading...'
    if (conversation.type === 'group') return conversation.name
    
    // For DMs, find the other participant's name
    const otherParticipant = conversation.participants?.find((p: any) => p.user_id !== myUserId)
    return otherParticipant?.profiles?.username || 'Chat'
  }
  
  // Helper to assign colors to users
  const getUserColor = (name: string) => {
    const colors = ['text-purple-400', 'text-teal-400', 'text-pink-400', 'text-yellow-400', 'text-blue-400']
    const index = name.length % colors.length
    return colors[index]
  }

  // Auto-scroll on new messages
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 100)
    }
  }, [messages, isLoading, scrollRef])
  
  const handleSendMessage = async (content: string, file?: File) => {
    if (content.trim() === '' && !file) return
    
    await sendMessage({ text: content, file: file, replyToId: replyingTo?.id })
    
    setNewMessage('')
    setReplyingTo(null)
  }
  
  const handleTyping = (value: string) => {
    setNewMessage(value)
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    if (value.trim()) {
      sendTypingIndicator()
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      // Logic to stop typing indicator can be handled within the hook or by sending another event
      typingTimeoutRef.current = null
    }, 3000)
  }
  
  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSendMessage(newMessage, e.target.files[0])
    }
  }

  const handleEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditContent(content)
  }

  const handleSaveEdit = async () => {
    if (editingMessageId && editContent.trim()) {
      await editMessage(editingMessageId, editContent)
      setEditingMessageId(null)
      setEditContent('')
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditContent('')
  }

  const handleDelete = async (messageId: string) => {
    if (confirm('Are you sure you want to delete this message?')) {
      await deleteMessage(messageId)
    }
  }

  const groupMessages = (messages: any[]) => {
    if (!messages) return []
    
    const grouped = []
    let currentGroup = []
    
    for (let i = 0; i < messages.length; i++) {
      const currentMessage = messages[i]
      const prevMessage = messages[i - 1]
      
      if (prevMessage && prevMessage.sender_id === currentMessage.sender_id) {
        currentGroup.push(currentMessage)
      } else {
        if (currentGroup.length > 0) {
          grouped.push(currentGroup)
        }
        currentGroup = [currentMessage]
      }
    }
    
    if (currentGroup.length > 0) {
      grouped.push(currentGroup)
    }
    
    return grouped
  }
  
  const groupedMessages = groupMessages(messages)

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.91 15.91a4.5 4.5 0 01-6.364 0" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Conversation not found</h3>
          <p className="mt-1 text-sm text-gray-500">Select a conversation to start chatting.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-900 h-screen">
      {/* Chat Header */}
      <header className="flex items-center p-3 border-b border-white/10 bg-zinc-900/70 backdrop-blur-md z-20">
        <Link href="/chat" className="md:hidden mr-3 p-2 rounded-full hover:bg-white/10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <Avatar
          src={`https://api.dicebear.com/9.x/initials/svg?seed=${getConversationName()}`}
          alt={getConversationName()}
          online={isOnline}
        />
        <div className="flex-1 ml-3">
          <h2 className="font-bold text-white">{getConversationName()}</h2>
          <p className="text-xs text-zinc-400">{isOnline ? 'Online' : 'Offline'}</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>
          <ThemeSelector />
          <button className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.map((message, index) => {
                const position = group.length === 1 ? 'single' : index === 0 ? 'first' : index === group.length - 1 ? 'last' : 'middle'
                const isLastInGroup = position === 'last' || position === 'single'
                return (
                  <MessageBubble
                    key={message.id}
                    text={message.content}
                    sender={message.sender_id === myUserId ? 'me' : 'them'}
                    time={new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    type={message.media_url ? 'image' : 'text'}
                    imageUrl={message.media_url}
                    reactions={message.reactions}
                    isRead={message.is_read}
                    onReact={(emoji) => reactToMessage(message.id, emoji)}
                    onReply={() => setReplyingTo({ id: message.id, sender: message.sender_name, text: message.content, imageUrl: message.media_url })}
                      replyTo={undefined}
                    position={position}
                    senderName={message.sender_name}
                    isGroup={isGroupChat}
                    avatarColor={getUserColor(message.sender_name)}
                    showAvatar={isLastInGroup && message.sender_id !== myUserId}
                  />
                )
              })}
            </div>
          ))
        )}
        {isTyping && <TypingIndicator />}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-zinc-900/70 backdrop-blur-md border-t border-white/10">
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-zinc-800/50 p-2 rounded-lg mb-2 border-l-4 border-purple-500">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-purple-400">Replying to {replyingTo.sender}</p>
                    <p className="text-xs text-zinc-300 truncate max-w-xs">
                      {replyingTo.text || 'Image'}
                    </p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full hover:bg-white/10">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <ChatInput 
          value={newMessage}
          onChange={handleTyping}
          onSend={() => handleSendMessage(newMessage)}
          onAttach={handleFileSelect}
        />
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
      </div>
    </div>
  )
}
