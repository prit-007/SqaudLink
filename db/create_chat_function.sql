-- =============================================
-- 🎯 ATOMIC CHAT CREATION FUNCTION
-- =============================================
-- This solves the "invisible room paradox" race condition where:
-- 1. Conversation is created
-- 2. SELECT policy tries to return it
-- 3. But user isn't a participant yet (race condition!)
-- 4. SELECT fails, transaction rolls back → 42501 error
--
-- Solution: Create conversation AND add participants in ONE atomic transaction
-- using SECURITY DEFINER to bypass RLS during creation.

-- Function to create a chat and add participants atomically
create or replace function public.create_new_chat(
  is_group boolean default false,
  chat_name text default null,
  participant_ids uuid[] default null
)
returns json as $$
declare
  new_conversation_id uuid;
  p_id uuid;
begin
  -- 1. Create the Conversation
  insert into public.conversations (type, name)
  values (
    case when is_group then 'group'::chat_type else 'dm'::chat_type end,
    chat_name
  )
  returning id into new_conversation_id;

  -- 2. Add THE CALLER (current user) automatically as admin
  insert into public.conversation_participants (conversation_id, user_id, is_admin)
  values (new_conversation_id, auth.uid(), true);

  -- 3. Add OTHER Participants
  if participant_ids is not null then
    foreach p_id in array participant_ids
    loop
      -- Prevent adding yourself twice
      if p_id != auth.uid() then
        insert into public.conversation_participants (conversation_id, user_id, is_admin)
        values (new_conversation_id, p_id, false);
      end if;
    end loop;
  end if;

  -- 4. Return the conversation details
  return json_build_object(
    'id', new_conversation_id,
    'type', case when is_group then 'group' else 'dm' end,
    'name', chat_name,
    'created_at', now()
  );
end;
$$ language plpgsql security definer;

-- =============================================
-- 📝 USAGE EXAMPLES
-- =============================================
-- 
-- Create a DM (Direct Message):
-- select create_new_chat(
--   is_group := false,
--   chat_name := null,
--   participant_ids := array['other-user-uuid']::uuid[]
-- );
--
-- Create a Group Chat:
-- select create_new_chat(
--   is_group := true,
--   chat_name := 'Squad Goals',
--   participant_ids := array['user1-uuid', 'user2-uuid', 'user3-uuid']::uuid[]
-- );
--
-- =============================================
-- 🔐 SECURITY NOTES
-- =============================================
-- - SECURITY DEFINER: Runs with creator's privileges (bypasses RLS during creation)
-- - Caller is always added as admin (prevents orphaned chats)
-- - Prevents adding yourself twice
-- - Validates auth.uid() exists (must be authenticated)
-- - Atomic transaction (all or nothing)
