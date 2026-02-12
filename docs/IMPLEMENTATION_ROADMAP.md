# 🗺️ Squad Link - Feature Implementation Roadmap

## Overview
This document provides a comprehensive roadmap for implementing all existing database features that are currently unused in the application.

---

## 📊 Feature Priority Matrix

### 🔴 **CRITICAL - Must Implement First**
1. **E2EE (End-to-End Encryption)** - Security critical
2. **Message Read Receipts** - Core messaging feature
3. **Typing Indicators** - Real-time UX enhancement

### 🟡 **HIGH PRIORITY - Core Features**
4. **Stories** - Social engagement (24-hour content)
5. **Voice/Audio Calls** - Communication expansion
6. **Polls** - Group interaction
7. **Message Mentions** - Group chat essential

### 🟢 **MEDIUM PRIORITY - Enhanced Features**
8. **Pinned Messages** - Organization
9. **Saved Messages** - User convenience
10. **Call History** - Communication tracking

### 🔵 **LOW PRIORITY - Nice to Have**
11. **Message Action Logs** - Analytics
12. **Forwarded Messages Tracking** - Metadata
13. **Conversation Mutes** - Notification control

---

## 🔒 1. E2EE Implementation (End-to-End Encryption)

### Current State
- ✅ Database schema exists (`e2ee_pre_keys`, `message_device_keys`)
- ✅ Client-side crypto utilities present ([crypto-service.ts](../src/utils/crypto-service.ts))
- ❌ Key exchange not implemented
- ❌ Message encryption/decryption incomplete

### Implementation Steps

#### Phase 1: Key Generation & Storage
```typescript
// File: src/utils/e2ee-manager.ts
export class E2EEManager {
  // Generate user's key pair on first login
  async initializeKeys(userId: string) {
    const { publicKey, privateKey } = await generateRSAKeyPair()
    
    // Store private key in IndexedDB (never leaves device)
    await indexedDB.put('e2ee_keys', { userId, privateKey })
    
    // Upload public key to Supabase
    await supabase.from('profiles').update({ 
      public_key: publicKey 
    }).eq('id', userId)
  }
  
  // Generate pre-keys for new conversations
  async generatePreKeys(count = 100) {
    const preKeys = []
    for (let i = 0; i < count; i++) {
      const key = await generatePreKey()
      preKeys.push(key)
    }
    return supabase.from('e2ee_pre_keys').insert(preKeys)
  }
}
```

#### Phase 2: Message Encryption
```typescript
// Update: src/hooks/useChatMessages.ts
const sendMessage = async (content: string) => {
  // 1. Fetch recipient's public key
  const { data: recipient } = await supabase
    .from('profiles')
    .select('public_key')
    .eq('id', recipientId)
    .single()
  
  // 2. Encrypt message
  const encrypted = await encryptMessage(content, recipient.public_key)
  
  // 3. Store encrypted payload
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: currentUser.id,
    content: { // JSONB encrypted payload
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      ephemeralPublicKey: encrypted.ephemeralPublicKey
    },
    message_type: 'text'
  })
}
```

#### Phase 3: Message Decryption
```typescript
// Update: src/components/chat/MessageBubble.tsx
const decryptedContent = useMemo(() => {
  if (!message.content || typeof message.content === 'string') {
    return message.content
  }
  
  // Decrypt JSONB payload
  const privateKey = await getPrivateKey() // from IndexedDB
  return await decryptMessage(message.content, privateKey)
}, [message])
```

#### Testing Checklist
- [ ] Key generation on signup
- [ ] Public key upload to database
- [ ] Message encryption before send
- [ ] Message decryption on receive
- [ ] Key rotation after 100 uses
- [ ] Fallback for unencrypted legacy messages

---

## ✅ 2. Message Read Receipts

### Database Schema (Already Exists)
```sql
-- Table: message_reads
id, message_id, user_id, read_at
```

### Implementation

#### Backend: Track Reads
```typescript
// File: src/hooks/useMessageReads.ts
export function useMessageReads(conversationId: string) {
  const markAsRead = useCallback(async (messageId: string) => {
    await supabase.from('message_reads').insert({
      message_id: messageId,
      user_id: currentUser.id,
      read_at: new Date().toISOString()
    })
  }, [currentUser])
  
  // Auto-mark visible messages as read
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const messageId = entry.target.getAttribute('data-message-id')
          markAsRead(messageId)
        }
      })
    }, { threshold: 0.5 })
    
    return () => observer.disconnect()
  }, [])
}
```

#### Frontend: Display Read Status
```typescript
// Update: src/components/chat/MessageStatus.tsx
const { data: reads } = await supabase
  .from('message_reads')
  .select('user_id, read_at, profiles(username, avatar_url)')
  .eq('message_id', messageId)

return (
  <Box>
    {status === 'sent' && <CheckIcon />}
    {status === 'read' && (
      <Tooltip title={reads.map(r => r.profiles.username).join(', ')}>
        <DoneAllIcon color="primary" />
      </Tooltip>
    )}
  </Box>
)
```

#### Real-time Updates
```typescript
// Subscribe to read receipt changes
supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'message_reads'
  }, (payload) => {
    // Update message status in UI
    updateMessageStatus(payload.new.message_id, 'read')
  })
  .subscribe()
```

---

## ⌨️ 3. Typing Indicators

### Implementation

#### Send Typing Status
```typescript
// File: src/hooks/useTypingIndicator.ts
export function useTypingIndicator(conversationId: string) {
  const [isTyping, setIsTyping] = useState(false)
  
  const sendTypingStatus = useCallback(
    debounce(async (typing: boolean) => {
      if (typing) {
        await supabase.from('typing_indicators').upsert({
          conversation_id: conversationId,
          user_id: currentUser.id,
          started_at: new Date().toISOString()
        })
      } else {
        await supabase.from('typing_indicators').delete()
          .match({ conversation_id: conversationId, user_id: currentUser.id })
      }
    }, 300),
    [conversationId]
  )
  
  return { isTyping, setIsTyping: sendTypingStatus }
}
```

#### Display Typing Users
```typescript
// Update: src/app/chat/[id]/page.tsx
const { data: typingUsers } = await supabase
  .from('typing_indicators')
  .select('user_id, profiles(username)')
  .eq('conversation_id', conversationId)
  .neq('user_id', currentUser.id)
  .gt('started_at', new Date(Date.now() - 5000).toISOString()) // Last 5 seconds

return (
  <Box>
    {typingUsers.length > 0 && (
      <TypingIndicator users={typingUsers.map(u => u.profiles.username)} />
    )}
  </Box>
)
```

---

## 📸 4. Stories Implementation

### UI Components

#### Story Ring (Avatar with Border)
```typescript
// File: src/components/chat/StoryRing.tsx (Already exists!)
// Usage: Display story rings on home page

const { data: stories } = await supabase
  .from('stories')
  .select('*, profiles(username, avatar_url)')
  .gt('expires_at', new Date().toISOString())
  .order('created_at', { ascending: false })

// Group by user
const storyGroups = groupBy(stories, 'user_id')
```

#### Story Viewer
```typescript
// File: src/components/chat/StoryViewer.tsx
export function StoryViewer({ stories }: { stories: Story[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  
  // Auto-progress every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => p + 1)
      if (progress >= 100) {
        setCurrentIndex(i => (i + 1) % stories.length)
        setProgress(0)
      }
    }, 50)
    return () => clearInterval(timer)
  }, [currentIndex])
  
  // Mark as viewed
  useEffect(() => {
    supabase.from('story_views').insert({
      story_id: stories[currentIndex].id,
      viewer_id: currentUser.id
    })
  }, [currentIndex])
  
  return (
    <Box sx={{ position: 'relative', height: '100vh' }}>
      {/* Progress bars */}
      <Box sx={{ display: 'flex', gap: 0.5, p: 1 }}>
        {stories.map((_, i) => (
          <LinearProgress 
            key={i} 
            value={i === currentIndex ? progress : i < currentIndex ? 100 : 0} 
          />
        ))}
      </Box>
      
      {/* Story content */}
      <img src={stories[currentIndex].media_url} />
      
      {/* Tap zones */}
      <Box onClick={() => setCurrentIndex(i => i - 1)} sx={{ position: 'absolute', left: 0, height: '100%', width: '30%' }} />
      <Box onClick={() => setCurrentIndex(i => i + 1)} sx={{ position: 'absolute', right: 0, height: '100%', width: '30%' }} />
    </Box>
  )
}
```

#### Create Story Page
```typescript
// File: src/app/story/create/page.tsx
export default function CreateStoryPage() {
  const uploadStory = async (file: File) => {
    // 1. Upload to storage
    const { data } = await uploadMedia(file, 'stories')
    
    // 2. Create story record (expires in 24 hours)
    await supabase.from('stories').insert({
      user_id: currentUser.id,
      media_url: data.url,
      media_type: file.type.startsWith('video') ? 'video' : 'image',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
  }
  
  return <ImageUploadPreview onUpload={uploadStory} />
}
```

---

## 📞 5. Voice/Audio Calls

### Technology Stack
- **WebRTC** for peer-to-peer communication
- **Supabase Realtime** for signaling
- **STUN/TURN servers** for NAT traversal

### Implementation

#### Call Signaling Service
```typescript
// File: src/utils/call-service.ts
export class CallService {
  private peerConnection: RTCPeerConnection
  private localStream: MediaStream
  
  async initiateCall(conversationId: string, type: 'audio' | 'video') {
    // 1. Get local media
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video'
    })
    
    // 2. Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    
    // 3. Add local stream
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream)
    })
    
    // 4. Create offer
    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)
    
    // 5. Send offer via Supabase Realtime
    await supabase.channel(`call:${conversationId}`).send({
      type: 'broadcast',
      event: 'call_offer',
      payload: { offer, callerId: currentUser.id }
    })
    
    // 6. Log call
    await supabase.from('call_logs').insert({
      conversation_id: conversationId,
      caller_id: currentUser.id,
      call_type: type,
      call_status: 'completed',
      started_at: new Date().toISOString()
    })
  }
  
  async answerCall(offer: RTCSessionDescriptionInit) {
    await this.peerConnection.setRemoteDescription(offer)
    const answer = await this.peerConnection.createAnswer()
    await this.peerConnection.setLocalDescription(answer)
    return answer
  }
}
```

#### Call UI Component
```typescript
// File: src/components/chat/CallWindow.tsx
export function CallWindow({ conversationId, type }: CallProps) {
  const [callService] = useState(() => new CallService())
  const [isConnected, setIsConnected] = useState(false)
  const [duration, setDuration] = useState(0)
  
  useEffect(() => {
    // Subscribe to call events
    const channel = supabase.channel(`call:${conversationId}`)
      .on('broadcast', { event: 'call_offer' }, async ({ payload }) => {
        const answer = await callService.answerCall(payload.offer)
        channel.send({ type: 'broadcast', event: 'call_answer', payload: answer })
      })
      .on('broadcast', { event: 'call_end' }, () => {
        callService.hangup()
      })
      .subscribe()
    
    return () => channel.unsubscribe()
  }, [])
  
  return (
    <Dialog open fullScreen>
      <Box sx={{ position: 'relative', height: '100vh', bgcolor: 'black' }}>
        {/* Remote video */}
        <video ref={remoteVideoRef} autoPlay playsInline />
        
        {/* Local video (PiP) */}
        <Box sx={{ position: 'absolute', top: 20, right: 20, width: 120, height: 180 }}>
          <video ref={localVideoRef} autoPlay playsInline muted />
        </Box>
        
        {/* Controls */}
        <Box sx={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)' }}>
          <Fab color="secondary" onClick={callService.hangup}>
            <CallEndIcon />
          </Fab>
        </Box>
      </Box>
    </Dialog>
  )
}
```

---

## 📊 6. Polls Implementation

### Create Poll
```typescript
// File: src/components/chat/PollCreator.tsx
export function PollCreator({ conversationId }: { conversationId: string }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  
  const createPoll = async () => {
    // 1. Create message
    const { data: message } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      message_type: 'text',
      content: `📊 Poll: ${question}`
    }).select().single()
    
    // 2. Create poll
    await supabase.from('polls').insert({
      message_id: message.id,
      question,
      options: options.map((text, id) => ({ id, text, votes: 0 })),
      multiple_choice: false,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    })
  }
  
  return (
    <Box>
      <TextField label="Question" value={question} onChange={e => setQuestion(e.target.value)} />
      {options.map((opt, i) => (
        <TextField key={i} label={`Option ${i + 1}`} value={opt} 
          onChange={e => setOptions(opts => opts.map((o, idx) => idx === i ? e.target.value : o))} 
        />
      ))}
      <Button onClick={createPoll}>Create Poll</Button>
    </Box>
  )
}
```

### Display Poll
```typescript
// File: src/components/chat/PollMessage.tsx
export function PollMessage({ messageId }: { messageId: string }) {
  const { data: poll } = await supabase
    .from('polls')
    .select('*, poll_votes(user_id, option_id)')
    .eq('message_id', messageId)
    .single()
  
  const totalVotes = poll.poll_votes.length
  const optionVotes = poll.options.map(opt => ({
    ...opt,
    votes: poll.poll_votes.filter(v => v.option_id === opt.id).length
  }))
  
  const handleVote = async (optionId: number) => {
    await supabase.from('poll_votes').insert({
      poll_id: poll.id,
      user_id: currentUser.id,
      option_id: optionId
    })
  }
  
  return (
    <Card>
      <Typography variant="h6">{poll.question}</Typography>
      {optionVotes.map(opt => (
        <Box key={opt.id} onClick={() => handleVote(opt.id)}>
          <Typography>{opt.text}</Typography>
          <LinearProgress value={(opt.votes / totalVotes) * 100} />
          <Typography variant="caption">{opt.votes} votes ({Math.round(opt.votes / totalVotes * 100)}%)</Typography>
        </Box>
      ))}
      <Typography variant="caption">{totalVotes} total votes</Typography>
    </Card>
  )
}
```

---

## 💾 7. Saved Messages (Bookmarks)

### Save Message
```typescript
// Update: src/components/chat/MessageContextMenu.tsx
const handleSaveMessage = async () => {
  await supabase.from('saved_messages').insert({
    message_id: messageId,
    user_id: currentUser.id
  })
  
  // Show toast notification
  toast.success('Message saved!')
}
```

### Saved Messages Page
```typescript
// File: src/app/saved/page.tsx
export default function SavedMessagesPage() {
  const { data: savedMessages } = await supabase
    .from('saved_messages')
    .select('*, messages(*, profiles(username))')
    .eq('user_id', currentUser.id)
    .order('saved_at', { ascending: false })
  
  return (
    <Box>
      <Typography variant="h5">Saved Messages</Typography>
      {savedMessages.map(saved => (
        <MessageBubble key={saved.id} {...saved.messages} />
      ))}
    </Box>
  )
}
```

---

## 📌 8. Pinned Messages

### Implementation
```typescript
// Add to: src/components/chat/MessageContextMenu.tsx
const handlePinMessage = async () => {
  await supabase.from('pinned_messages').insert({
    conversation_id: conversationId,
    message_id: messageId,
    pinned_by: currentUser.id
  })
}

// Display pinned messages at top of chat
const { data: pinnedMessages } = await supabase
  .from('pinned_messages')
  .select('*, messages(*)')
  .eq('conversation_id', conversationId)
  .order('pinned_at', { ascending: false })
  .limit(3)
```

---

## 🎯 Implementation Timeline

### Week 1-2: Critical Features
- [ ] E2EE Phase 1: Key generation
- [ ] Message Read Receipts
- [ ] Typing Indicators

### Week 3-4: Core Features
- [ ] E2EE Phase 2: Message encryption
- [ ] Stories UI & Upload
- [ ] Polls Create & Vote

### Week 5-6: Enhanced Features
- [ ] Voice Calls (Audio only)
- [ ] Message Mentions
- [ ] Saved Messages

### Week 7-8: Refinement
- [ ] Video Calls
- [ ] Pinned Messages
- [ ] E2EE Phase 3: Key rotation

---

## 📝 Notes

### Database Already Configured ✅
All tables, policies, and triggers already exist in migration files:
- `migration_v2.sql` - Core features
- `migration_v2.1_spice_pack.sql` - E2EE keys
- `migration_v3_e2ee_and_status.sql` - E2EE enhancements

### What's Missing
- Frontend components for each feature
- Real-time subscriptions
- WebRTC integration for calls
- E2EE key exchange logic

### Testing Priority
1. E2EE must be tested thoroughly (security critical)
2. Read receipts affect user trust
3. Stories drive engagement
4. Calls require infrastructure testing

---

## 🔗 Related Documentation
- [E2EE Implementation Details](./E2EE_IMPLEMENTATION.md)
- [Crypto Service API](./CRYPTO_IMPLEMENTATION.md)
- [Database Schema](../db/migration_v2.sql)
- [Security Best Practices](./SECURITY_AND_FEATURES.md)
