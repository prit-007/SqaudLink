# 🔐 End-to-End Encryption Implementation Guide

## Overview
Squad Link implements true end-to-end encryption (E2EE) where messages are encrypted on the sender's device and can only be decrypted by the recipient. The server (Supabase) only stores encrypted blobs.

## How It Works

### 1. Key Generation (First Login)
```typescript
import e2eeService from '@/utils/e2ee'

// Generate keys on first login
await e2eeService.generateKeyPair()

// Get public key to store in database
const publicKey = await e2eeService.getPublicKeyString()

// Update user profile with public key
await supabase
  .from('profiles')
  .update({ public_key: publicKey })
  .eq('id', userId)
```

### 2. Sending Encrypted Message (DM)
```typescript
// 1. Fetch recipient's public key from database
const { data: recipient } = await supabase
  .from('profiles')
  .select('public_key')
  .eq('id', recipientId)
  .single()

// 2. Encrypt your message
const plainText = "Hey! This is a secret message 🔒"
const encrypted = await e2eeService.encryptMessage(
  plainText,
  recipient.public_key
)

// 3. Send encrypted blob to database
await supabase
  .from('messages')
  .insert({
    conversation_id: chatId,
    sender_id: myId,
    content: encrypted, // Server only sees this gibberish: "U2FsdGVkX1..."
    message_type: 'text'
  })
```

### 3. Receiving & Decrypting Message
```typescript
// 1. Listen for new messages
supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${chatId}`
  }, async (payload) => {
    const encryptedMessage = payload.new.content
    
    // 2. Decrypt with your private key (stored locally)
    const decrypted = await e2eeService.decryptMessage(encryptedMessage)
    
    // 3. Display the message
    console.log(decrypted) // "Hey! This is a secret message 🔒"
  })
  .subscribe()
```

### 4. Group Chats (Shared Key)
For performance, groups use a shared AES key:

```typescript
// Admin creates shared key for group
const sharedKey = await e2eeService.generateSharedKey()

// Encrypt message with shared key
const { encrypted, iv } = await e2eeService.encryptWithSharedKey(
  "Group message",
  sharedKey
)

// Send both encrypted content and IV
await supabase.from('messages').insert({
  conversation_id: groupId,
  content: encrypted,
  metadata: { iv } // Store IV for decryption
})

// Members decrypt with shared key
const decrypted = await e2eeService.decryptWithSharedKey(
  encrypted,
  iv,
  sharedKey
)
```

## Key Management

### Backup Private Key (Password Protected)
```typescript
// User provides backup password
const password = "MyStrongPassword123!"
const encryptedBackup = await e2eeService.backupPrivateKey(password)

// Store in database
await supabase
  .from('user_settings')
  .update({ encryption_backup_key: encryptedBackup })
  .eq('user_id', myId)
```

### Restore from Backup
```typescript
// Fetch backup
const { data } = await supabase
  .from('user_settings')
  .select('encryption_backup_key')
  .eq('user_id', myId)
  .single()

// Restore with password
await e2eeService.restorePrivateKey(
  data.encryption_backup_key,
  userPassword
)
```

## Implementation Steps

### Step 1: User Signup/Login
```typescript
// After authentication
const e2ee = await import('@/utils/e2ee').then(m => m.default)

if (!e2ee.hasKeys()) {
  // First time - generate keys
  await e2ee.generateKeyPair()
  const publicKey = await e2ee.getPublicKeyString()
  
  // Store public key in profile
  await supabase
    .from('profiles')
    .update({ public_key: publicKey })
    .eq('id', user.id)
} else {
  // Load existing keys
  await e2ee.loadKeysFromStorage()
}
```

### Step 2: Update Message Send Logic
```typescript
const sendMessage = async (text: string, recipientId: string) => {
  // Get recipient's public key
  const { data: recipient } = await supabase
    .from('profiles')
    .select('public_key')
    .eq('id', recipientId)
    .single()

  // Encrypt
  const encrypted = await e2eeService.encryptMessage(text, recipient.public_key)

  // Send
  await supabase.from('messages').insert({
    conversation_id: chatId,
    sender_id: myId,
    content: encrypted,
    message_type: 'text',
    delivery_status: 'sent'
  })
}
```

### Step 3: Update Message Display Logic
```typescript
const displayMessage = async (encryptedMessage: string) => {
  try {
    const decrypted = await e2eeService.decryptMessage(encryptedMessage)
    return decrypted
  } catch (error) {
    // Decryption failed - maybe wrong key or corrupted
    return "🔒 Could not decrypt message"
  }
}
```

## Security Best Practices

### ✅ DO:
- Generate new keys on first login
- Store private keys in IndexedDB (not localStorage in production)
- Offer password-protected backup
- Use HTTPS for all connections
- Validate public keys before encryption
- Clear keys on logout

### ❌ DON'T:
- Never send private keys to server
- Don't store unencrypted messages
- Don't decrypt messages in service workers
- Don't share private keys between devices without encryption

## Migration Checklist

- [x] Add `public_key` column to profiles table
- [x] Create E2EE service class
- [ ] Update message send function to encrypt
- [ ] Update message receive function to decrypt
- [ ] Add key generation on signup
- [ ] Add key loading on login
- [ ] Implement backup/restore UI
- [ ] Add "Enable Encryption" toggle in settings
- [ ] Handle encryption errors gracefully
- [ ] Add loading states during encryption/decryption

## Testing E2EE

```typescript
// Test encryption roundtrip
const original = "Test message 🚀"
const encrypted = await e2eeService.encryptMessage(original, publicKey)
console.log('Encrypted:', encrypted) // Gibberish

const decrypted = await e2eeService.decryptMessage(encrypted)
console.log('Decrypted:', decrypted) // "Test message 🚀"
console.assert(original === decrypted, 'Encryption failed!')
```

## Performance Considerations

- RSA encryption is slower (use for DMs)
- AES-GCM is faster (use for groups)
- Encrypt/decrypt on Web Workers for large messages
- Cache decrypted messages in memory
- Pre-fetch public keys for active chats

## Future Enhancements

- [ ] Perfect Forward Secrecy (PFS)
- [ ] Key rotation every 30 days
- [ ] Multi-device sync via encrypted backup
- [ ] Safety numbers verification (Signal-style)
- [ ] Disappearing messages with local deletion
- [ ] Screenshot detection warning

## Resources

- [Web Crypto API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Signal Protocol](https://signal.org/docs/)
