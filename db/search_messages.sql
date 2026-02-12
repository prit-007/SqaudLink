create or replace function search_messages(
  search_query text,
  p_user_id uuid
)
returns table (
  id uuid,
  content text,
  created_at timestamptz,
  sender_id uuid,
  conversation_id uuid,
  sender_username text,
  sender_avatar_url text
)
language plpgsql
security definer
as $$
begin
  return query
  select
    m.id,
    m.content::text,
    m.created_at,
    m.sender_id,
    m.conversation_id,
    p.username as sender_username,
    p.avatar_url as sender_avatar_url
  from messages m
  join conversation_participants cp on m.conversation_id = cp.conversation_id
  join profiles p on m.sender_id = p.id
  where
    cp.user_id = p_user_id
    and m.content::text ilike '%' || search_query || '%'
  order by m.created_at desc
  limit 50;
end;
$$;
