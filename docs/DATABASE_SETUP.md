# 🗄️ Database Setup Guide

## Overview

This guide walks you through setting up the Supabase database for Squad Link, including fixing the common RLS policy violation error.

## 🔴 Common Issue: "new row violates row-level security policy"

If you encounter this error when creating conversations:

```
Error: new row violates row-level security policy for table "conversations"
```

**Root Cause:** The `conversations` table has Row Level Security (RLS) enabled but is missing INSERT policies.

**Solution:** Run the `db/rls_fix_conversations.sql` migration file.

---

## 📋 Setup Steps

### Step 1: Initial Database Schema

Run **`db/database.sql`** in your Supabase SQL Editor. This creates:

- `profiles` table - User profiles
- `conversations` table - Chat conversations
- `conversation_participants` table - Who's in each conversation
- `messages` table - Chat messages
- `devices` table - End-to-end encryption device keys
- Basic RLS policies for SELECT operations
- Triggers for auto-updating timestamps

### Step 2: Atomic Chat Creation Function ⚠️ **CRITICAL**

Run **`db/create_chat_function.sql`** in your Supabase SQL Editor. This creates:

- **`create_new_chat()` RPC function** - Atomically creates conversation + adds participants
- **SECURITY DEFINER** - Bypasses RLS during creation to avoid race condition
- **Automatic validation** - Prevents duplicate participants, orphaned chats

This solves the "invisible room paradox" where:
1. Conversation is created
2. SELECT policy tries to return it
3. But user isn't a participant yet (race condition!)
4. Transaction fails with error 42501

Without this function, users will get errors like:
- `new row violates row-level security policy`
- `infinite recursion detected in policy`
- Error code 42501 (insufficient privileges)

### Step 3: Storage Setup (for Images)

Run **`db/storage_setup.sql`** in your Supabase SQL Editor. This creates:

- Storage bucket `chat-media` for image uploads
- Public access policy for reading images
- Upload policy for authenticated users
- Update/delete policies for file owners

---

## 🧪 Testing the Setup

After running all three SQL files, test these features:

### 1. Create a DM Conversation

```typescript
// ✅ Use RPC function (atomic operation)
const { data, error } = await supabase.rpc('create_new_chat', {
  is_group: false,
  chat_name: null,
  participant_ids: [otherUserId]
});

// Returns: { id: 'uuid', type: 'dm', name: null, created_at: timestamp }
```

### 2. Create a Group Conversation

```typescript
// ✅ Create group chat with multiple participants
const { data, error } = await supabase.rpc('create_new_chat', {
  is_group: true,
  chat_name: 'Squad Goals',
  participant_ids: [user1Id, user2Id, user3Id]
});

// Current user is automatically added as admin
```

### 3. Upload Image

```typescript
// Should upload to chat-media bucket
const { data, error } = await supabase.storage
  .from('chat-media')
  .upload(`${userId}/${Date.now()}.jpg`, file);
```

---

## 🔐 Security Notes

### Row Level Security (RLS)

All tables have RLS enabled with these principles:

- **Users can only see conversations they're participants in**
- **Users can only send messages to conversations they're in**
- **Users can create new conversations** (anyone authenticated)
- **Users can add themselves as participants** (but need to be participant to add others)
- **Users can leave conversations** (delete their participant record)

### End-to-End Encryption (E2EE)

- All messages are encrypted client-side before being sent to Supabase
- Encryption keys are stored in the `devices` table
- Each device has its own RSA-OAEP-2048 key pair
- Messages are encrypted with AES-GCM-256
- Server (Supabase) never sees plaintext messages

### Storage Security

- Images are stored in public-readable bucket (for convenience)
- Upload is restricted to authenticated users
- File names are randomized with timestamps to prevent collisions
- Users can only delete their own uploaded files

---

## 🐛 Troubleshooting

### Issue: "No database configured"

**Solution:** Check your `.env.local` file has correct Supabase credentials.

### Issue: "Failed to fetch conversations"

**Solution:** Ensure `database.sql` was run successfully and RLS policies are in place.

### Issue: "Cannot create conversation" (403 error)

**Solution:** Run `rls_fix_conversations.sql` - you're missing INSERT policies.

### Issue: "Image upload failed"

**Solution:** Run `storage_setup.sql` - the chat-media bucket doesn't exist.

### Issue: "Messages not encrypting"

**Solution:** Check that E2EE was initialized on login in [login/page.tsx](../src/app/login/page.tsx#L45)

---

## 📊 Database Schema Overview

```
profiles (public.profiles)
├── id (uuid, primary key)
├── username (text)
├── full_name (text)
├── avatar_url (text)
├── bio (text)
├── status (text)
└── last_seen (timestamptz)

conversations (public.conversations)
├── id (uuid, primary key)
├── type (text: 'direct' | 'group')
├── name (text, nullable)
├── last_message_at (timestamptz)
└── updated_at (timestamptz)

conversation_participants (public.conversation_participants)
├── id (uuid, primary key)
├── conversation_id (uuid, foreign key)
├── user_id (uuid, foreign key)
└── last_read_at (timestamptz)

messages (public.messages)
├── id (uuid, primary key)
├── conversation_id (uuid, foreign key)
├── sender_id (uuid, foreign key)
├── content (text) ← ENCRYPTED
├── encrypted_keys (jsonb) ← Per-device keys
├── media_url (text, nullable)
├── media_type (text, nullable)
├── created_at (timestamptz)
└── is_edited (boolean)

devices (public.devices)
├── id (uuid, primary key)
├── user_id (uuid, foreign key)
├── device_name (text)
├── public_key (text) ← RSA public key
└── created_at (timestamptz)
```

---

## 🔄 Migration Order

Always run migrations in this order:

1. `database.sql` - Base schema with tables and RLS
2. `create_chat_function.sql` - Atomic chat creation RPC function ⚠️ **REQUIRED**
3. `storage_setup.sql` - Storage bucket for images

### If You Have Old RLS Policies

If you previously ran `rls_fix_conversations.sql` or similar, you can optionally clean them up:

```sql
-- Optional: Remove old policies (new approach doesn't need them)
drop policy if exists "Users can create conversations" on public.conversations;
drop policy if exists "Users can add participants to conversations" on public.conversation_participants;
```

The RPC function approach bypasses these policies during creation, so they won't cause conflicts.

### If You Need to Reset:

```sql
-- Drop all tables (⚠️ DESTRUCTIVE)
drop table if exists public.messages cascade;
drop table if exists public.conversation_participants cascade;
drop table if exists public.conversations cascade;
drop table if exists public.devices cascade;
drop table if exists public.profiles cascade;
```

Then re-run all three SQL files.

---

## 📚 Related Documentation

- [Image Upload Guide](./IMAGE_UPLOAD_GUIDE.md) - How image uploads work
- [Security Features](../SECURITY_AND_FEATURES.md) - E2EE implementation details
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security) - Official RLS documentation
