-- =============================================
-- 🚀 RPC: GET USER CONVERSATIONS
-- =============================================
-- This function is the primary way to fetch a user's chat list.
-- It's highly optimized to get all necessary data in a single query.

create or replace function public.get_user_conversations(p_user_id uuid)
returns table (
  id uuid,
  type chat_type,
  name text,
  avatar_url text,
  last_message json,
  unread_count bigint
) as $$
begin
  return query
  with user_convos as (
    select conversation_id from public.conversation_participants where user_id = p_user_id
  ),
  ranked_messages as (
    select
      m.conversation_id,
      m.content,
      m.created_at,
      row_number() over(partition by m.conversation_id order by m.created_at desc) as rn
    from public.messages m
    where m.conversation_id in (select conversation_id from user_convos)
  ),
  last_messages as (
    select
      conversation_id,
      json_build_object('content', content, 'created_at', created_at) as message_data
    from ranked_messages
    where rn = 1
  )
  select
    c.id,
    c.type,
    -- For DMs, get the other user's name. For groups, use the group name.
    case
      when c.type = 'dm' then (
        select p.username
        from public.conversation_participants cp
        join public.profiles p on cp.user_id = p.id
        where cp.conversation_id = c.id and cp.user_id != p_user_id
        limit 1
      )
      else c.name
    end as name,
    -- For DMs, get the other user's avatar. For groups, use the group avatar.
    case
      when c.type = 'dm' then (
        select p.avatar_url
        from public.conversation_participants cp
        join public.profiles p on cp.user_id = p.id
        where cp.conversation_id = c.id and cp.user_id != p_user_id
        limit 1
      )
      else c.group_avatar_url
    end as avatar_url,
    lm.message_data as last_message,
    -- In a real app, you'd calculate unread count based on `last_read_at`
    0 as unread_count
  from public.conversations c
  left join last_messages lm on c.id = lm.conversation_id
  where c.id in (select conversation_id from user_convos)
  order by c.updated_at desc;
end;
$$ language plpgsql security definer;
