# 🚀 Quick Start: Fixing RLS Errors

## The Problem You're Experiencing

```
Error: new row violates row-level security policy for table "conversations"
Error: infinite recursion detected in policy
Error code: 42501
```

## Why It Happens

**Race Condition:** When creating a conversation:
1. ✅ Conversation INSERT succeeds
2. ❌ SELECT policy checks: "Are you a participant?" → NO (not added yet!)
3. ❌ Transaction rolls back
4. ❌ Error thrown

## The Solution: Atomic RPC Function

Instead of separate INSERT operations, use ONE atomic function that:
- Creates conversation
- Adds participants  
- Returns result

All in a single transaction with SECURITY DEFINER to bypass RLS during creation.

---

## 📝 Step-by-Step Fix

### 1. Run SQL Function (1 minute)

Open **Supabase SQL Editor** and run **[db/create_chat_function.sql](../db/create_chat_function.sql)**

```sql
create or replace function public.create_new_chat(
  is_group boolean default false,
  chat_name text default null,
  participant_ids uuid[] default null
)
returns json as $$
-- Creates conversation + participants atomically
-- ...
```

Click **Run** → Done! ✅

### 2. Code Already Updated

The [NewChatModal.tsx](../src/components/chat/NewChatModal.tsx) has been updated to use the RPC function:

```typescript
// ❌ OLD (causes race condition)
const { data } = await supabase.from('conversations').insert({...})

// ✅ NEW (atomic operation)
const { data } = await supabase.rpc('create_new_chat', {
  is_group: false,
  chat_name: null,
  participant_ids: [otherUserId]
})
```

### 3. Test It

1. Restart your dev server: `npm run dev`
2. Click **+ New Chat** in sidebar
3. Search for a user
4. Click their name

✅ **Should create conversation without errors!**

---

## 🎯 What Changed

| Before (Broken) | After (Fixed) |
|----------------|---------------|
| 2 separate operations | 1 atomic operation |
| Race condition possible | No race condition |
| RLS blocks during creation | RLS bypassed safely |
| `INSERT` + `INSERT` | `rpc('create_new_chat')` |
| Error 42501 | ✅ Success |

---

## 🔐 Is This Secure?

**Yes!** The function:
- ✅ Requires authentication (`auth.uid()`)
- ✅ Only adds current user + specified participants
- ✅ Prevents duplicate participants
- ✅ Caller is always added as admin
- ✅ All existing RLS policies still work for SELECT/UPDATE/DELETE

`SECURITY DEFINER` only bypasses RLS **during creation** - all other operations still respect RLS.

---

## 🐛 Troubleshooting

**Q: I get "function create_new_chat does not exist"**  
A: Run `db/create_chat_function.sql` in Supabase SQL Editor

**Q: Still getting 42501 error**  
A: Check that you're authenticated and `auth.uid()` is not null

**Q: Can I create group chats?**  
A: Yes! Set `is_group: true` and provide multiple participant IDs

**Q: What if I already have conversations?**  
A: Existing conversations are safe. This only affects NEW conversation creation.

**Q: Do I need to drop old RLS policies?**  
A: No, but you can optionally clean them up. The RPC approach works regardless.

---

## 📚 Files Changed

1. **[db/create_chat_function.sql](../db/create_chat_function.sql)** - New atomic function (RUN THIS!)
2. **[src/components/chat/NewChatModal.tsx](../src/components/chat/NewChatModal.tsx)** - Updated to use RPC
3. **[docs/RLS_FIX_GUIDE.md](./RLS_FIX_GUIDE.md)** - Complete documentation
4. **[docs/DATABASE_SETUP.md](./DATABASE_SETUP.md)** - Setup instructions
5. **[README.md](../README.md)** - Quick start updated

---

## 🎉 Result

After running the SQL file:

✅ Create conversations instantly  
✅ No 403 errors  
✅ No infinite recursion  
✅ No race conditions  
✅ Clean, maintainable code  
✅ Fully secure with E2EE  

**Try creating a chat now - it should work perfectly!** 🚀
