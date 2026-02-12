'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Box, Paper, IconButton, Typography, Divider } from '@mui/material'
import PhoneIcon from '@mui/icons-material/Phone'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { createClient } from '@/utils/supabase/client'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useMessageReads } from '@/hooks/useMessageReads'
import Avatar from '@/components/chat/Avatar'
import MessageBubble from '@/components/chat/MessageBubble'
import MessageActions from '@/components/chat/MessageActions'
import ChatInput from '@/components/chat/ChatInput'
import TypingIndicator from '@/components/chat/TypingIndicator'
import ThemeSelector from '@/components/chat/ThemeSelector'
import SquiggleLoader from '@/components/chat/SquiggleLoader'

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
    typingUsers,
    sendMessage, 
    sendTypingIndicator, 
    editMessage,
    deleteMessage, 
    reactToMessage,
    scrollRef 
  } = useChatMessages(conversationId, myUserId)
  
  // Use message reads hook
  useMessageReads(conversationId, myUserId, messages)
  
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  
  const [newMessage, setNewMessage] = useState('')
  const [replyingTo, setReplyingTo] = useState<{ id: string; sender: string; senderId?: string; text?: string; imageUrl?: string } | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  
  // Scroll to a specific message
  const scrollToMessage = (messageId: string) => {
    const messageElement = messageRefs.current[messageId]
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Highlight effect
      messageElement.style.transition = 'all 0.3s ease'
      messageElement.style.transform = 'scale(1.02)'
      setTimeout(() => {
        messageElement.style.transform = 'scale(1)'
      }, 300)
    }
  }
  
  // Check if this is a group chat
  const isGroupChat = conversation?.type === 'group' || false
  
  // Get online status from participant
  const getOnlineStatus = () => {
    if (isGroupChat) return false
    const otherParticipant = conversation?.participants?.find((p: any) => p.user_id !== myUserId)
    return otherParticipant?.status === 'online' || false
  }
  
  const [isOnline] = useState(getOnlineStatus())

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

  // Auto-scroll on new messages (but not on reactions)
  const prevMessagesLength = useRef(messages.length)
  useEffect(() => {
    if (!isLoading && messages.length > prevMessagesLength.current) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 100)
    }
    prevMessagesLength.current = messages.length
  }, [messages, isLoading, scrollRef])
  
  const handleSendMessage = async (content: string, file?: File) => {
    if (content.trim() === '' && !file) return
    
    // Clear immediately for better UX (WhatsApp-like)
    setNewMessage('')
    setReplyingTo(null)
    
    await sendMessage({ 
      text: content, 
      file: file, 
      replyToId: replyingTo?.id,
      quotedText: replyingTo?.text,
      quotedSenderId: replyingTo?.senderId
    })
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
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        width: '100%',
        bgcolor: 'background.default',
        overflow: 'hidden'
      }}
    >
      {/* Chat Header - Material Design 3 */}
      <Paper 
        elevation={2}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          p: 2,
          borderRadius: 0,
          bgcolor: 'surfaceContainer.main',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Link href="/chat" style={{ textDecoration: 'none' }}>
          <IconButton 
            sx={{ 
              mr: 1,
              color: 'onSurface.main'
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Link>
        
        <Avatar
          src={`https://api.dicebear.com/9.x/initials/svg?seed=${getConversationName()}`}
          alt={getConversationName()}
          online={isOnline}
        />
        
        <Box sx={{ flex: 1, ml: 2 }}>
          <Typography variant="titleMedium" sx={{ fontWeight: 600, color: 'onSurface.main' }}>
            {getConversationName()}
          </Typography>
          <Typography variant="bodySmall" sx={{ color: 'onSurfaceVariant.main' }}>
            {isOnline ? 'Online' : 'Offline'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton sx={{ color: 'onSurfaceVariant.main' }}>
            <PhoneIcon />
          </IconButton>
          <IconButton sx={{ color: 'onSurfaceVariant.main' }}>
            <MoreVertIcon />
          </IconButton>
        </Box>
      </Paper>

      {/* Messages Container - Material Design 3 */}
      <Box 
        sx={{ 
          flex: 1, 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          width: '100%',
          '&::-webkit-scrollbar': {
            width: '8px'
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'transparent'
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'action.hover',
            borderRadius: '4px'
          }
        }}
      >
        <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: '100%', md: '900px', lg: '1000px', xl: '1200px' }, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: 3 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <SquiggleLoader />
          </Box>
        ) : (
          groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.map((message, index) => {
                const position = group.length === 1 ? 'single' : index === 0 ? 'first' : index === group.length - 1 ? 'last' : 'middle'
                const isLastInGroup = position === 'last' || position === 'single'
                return (
                  <div 
                    key={message.id} 
                    ref={(el) => { messageRefs.current[message.id] = el }}
                    data-message-id={message.id}
                    data-sender-id={message.sender_id}
                  >
                    <MessageBubble
                      text={message.content}
                      sender={message.sender_id === myUserId ? 'me' : 'them'}
                      time={new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      type={message.message_type || (message.media_url ? 'image' : 'text')}
                      imageUrl={message.media_url}
                      reactions={message.reactions}
                      status={message.status}
                      onReact={(emoji) => reactToMessage(message.id, emoji)}
                      onReply={() => setReplyingTo({ id: message.id, sender: message.sender_name, senderId: message.sender_id, text: message.content, imageUrl: message.media_url })}
                      replyTo={message.reply_to_id ? {
                        id: message.reply_to_id,
                        sender: message.quoted_sender_id === myUserId ? 'me' : (message.quoted_sender_name || 'User'),
                        text: message.quoted_text || 'Message',
                        imageUrl: message.media_url
                      } : undefined}
                      onReplyClick={message.reply_to_id ? () => scrollToMessage(message.reply_to_id) : undefined}
                      position={position}
                      senderName={message.sender_name}
                      // isGroup={isGroupChat}
                      // avatarColor={getUserColor(message.sender_name)}
                      showAvatar={isLastInGroup && message.sender_id !== myUserId}
                    />
                  </div>
                )
              })}
            </div>
          ))
        )}
        
        {/* Typing Indicator */}
        {typingUsers && typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}
        
        <div ref={scrollRef} />
        </Box>
      </Box>

      {/* Input Container - Material Design 3 */}
      <Paper 
        elevation={8}
        sx={{ 
          p: 2,
          borderRadius: 0,
          bgcolor: 'surfaceContainer.main',
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
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
          onVoiceUpload={(blob, duration) => {
            const file = new File([blob], 'voice_message.webm', { type: 'audio/webm' })
            sendMessage({
              text: '',
              file: file,
              voiceDuration: duration,
              voiceWaveform: Array.from({ length: 30 }, () => Math.floor(Math.random() * 100))
            })
          }}
        />
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
      </Paper>
    </Box>
  )
}
