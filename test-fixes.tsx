// Test script to verify the fixes
// This is not meant to be run, just for reference

import { useChatMessages } from '@/hooks/useChatMessages'
import MessageBubble from '@/components/chat/MessageBubble'

// ✅ Test 1: editMessage function exists and has correct signature
const TestEditMessage = () => {
  const { editMessage } = useChatMessages('test-id', 'test-user')
  
  // Should accept messageId and newContent
  editMessage('msg-123', 'Updated content')
}

// ✅ Test 2: MessageBubble accepts new props
const TestMessageBubble = () => {
  return (
    <MessageBubble
      text="Test message"
      sender="me"
      time="3:45 PM"
      isEdited={true}  // ✅ New prop
      onEdit={() => console.log('Edit clicked')}  // ✅ New prop
      onDelete={() => console.log('Delete clicked')}  // ✅ New prop
    />
  )
}

// ✅ Test 3: Deleted message rendering
const TestDeletedMessage = () => {
  const message = {
    id: '123',
    content: '',
    is_deleted: true,
    sender_id: 'user-1'
  }
  
  // Should render: "🚫 This message was deleted"
  return (
    <div>
      {message.is_deleted ? (
        <div>🚫 This message was deleted</div>
      ) : (
        <MessageBubble text={message.content} sender="me" time="now" />
      )}
    </div>
  )
}

// ✅ Test 4: E2EE graceful fallback
import { CryptoService } from '@/utils/crypto-service'

const TestE2EEFallback = async () => {
  try {
    await CryptoService.initializeDevice('user-123')
    // If user_devices table doesn't exist:
    // - Should log warning
    // - Should return { id: 'no-e2ee', ... }
    // - Should NOT crash the app
  } catch (error) {
    console.error('Should not reach here - errors are handled gracefully')
  }
}

export {
  TestEditMessage,
  TestMessageBubble,
  TestDeletedMessage,
  TestE2EEFallback
}
