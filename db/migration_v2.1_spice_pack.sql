-- =============================================
-- 🌶️ SQUAD LINK - SPICE PACK (V2.1)
-- Multi-Device & Notification Support
-- Run this AFTER migration_v2.sql
-- =============================================

-- 1. DEVICE KEYS (For Multi-Device E2EE)
-- Instead of 1 public key per user, we need 1 key per DEVICE.
-- This allows you to read messages on both Laptop and Phone.
create table if not exists public.user_devices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  device_name text not null, -- e.g. "Chrome on Mac", "iPhone 13"
  device_fingerprint text not null, -- Browser fingerprint for identification
  public_key text not null, -- The device specific public key
  last_active_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  unique(user_id, device_fingerprint)
);

alter table public.user_devices enable row level security;

create policy "Users can manage their own devices"
on public.user_devices for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Everyone can view device public keys"
on public.user_devices for select
using (true);

-- Index for device lookups
create index if not exists idx_user_devices_user on public.user_devices(user_id);
create index if not exists idx_user_devices_active on public.user_devices(last_active_at desc);

-- 2. PUSH NOTIFICATION TOKENS
-- Store FCM (Firebase) or APNS (Apple) tokens here
create table if not exists public.push_tokens (
  token text primary key, -- The actual FCM token
  user_id uuid references public.profiles(id) on delete cascade,
  device_id uuid references public.user_devices(id) on delete cascade,
  device_type text, -- 'android', 'ios', 'web'
  enabled boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.push_tokens enable row level security;

create policy "Users can manage their push tokens"
on public.push_tokens for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Index for push notification queries
create index if not exists idx_push_tokens_user on public.push_tokens(user_id);

-- 3. KEY BUNDLES (Signal Protocol Style - Advanced)
-- If I want to message you but you are offline, I need a 'Pre-Key'.
-- This table stores a batch of one-time use keys for async messaging.
create table if not exists public.e2ee_pre_keys (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  device_id uuid references public.user_devices(id) on delete cascade,
  key_id text not null, -- ID assigned by the client library
  public_key text not null,
  is_signed boolean default false,
  signature text, -- Optional signature for verification
  created_at timestamp with time zone default now(),
  unique(user_id, key_id)
);

alter table public.e2ee_pre_keys enable row level security;

-- Only let people claim a key, not list all of them (Privacy!)
create policy "Users can claim a pre-key"
on public.e2ee_pre_keys for select
using (true); 

create policy "Users can create their own pre-keys"
on public.e2ee_pre_keys for insert
with check (auth.uid() = user_id);

-- Index for key claiming
create index if not exists idx_pre_keys_user on public.e2ee_pre_keys(user_id, created_at);

-- 4. MESSAGE ENCRYPTION METADATA
-- Store which devices a message was encrypted for
create table if not exists public.message_device_keys (
  message_id uuid references public.messages(id) on delete cascade,
  device_id uuid references public.user_devices(id) on delete cascade,
  encrypted_key text not null, -- The message key encrypted with device's public key
  created_at timestamp with time zone default now(),
  primary key (message_id, device_id)
);

alter table public.message_device_keys enable row level security;

create policy "Users can view keys for their devices"
on public.message_device_keys for select
using (
  device_id in (
    select id from public.user_devices where user_id = auth.uid()
  )
);

-- 5. NOTIFICATION QUEUE
-- Queue for push notifications to be sent
create table if not exists public.notification_queue (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  notification_type text not null, -- 'message', 'mention', 'reaction', 'call'
  title text not null,
  body text not null,
  data jsonb, -- Additional payload
  sent boolean default false,
  sent_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table public.notification_queue enable row level security;

-- Index for notification processing
create index if not exists idx_notifications_pending on public.notification_queue(sent, created_at) where not sent;

-- 6. FUNCTION: CLAIM A ONE-TIME KEY
-- This atomicity prevents two people from grabbing the same key
create or replace function claim_one_time_key(target_user_id uuid, target_device_id uuid default null)
returns table (
  key_id text, 
  public_key text, 
  device_id uuid,
  is_signed boolean,
  signature text
) as $$
declare
  found_key_id uuid;
begin
  -- Find one key for the specific device or any device
  select id into found_key_id
  from public.e2ee_pre_keys
  where user_id = target_user_id
    and (target_device_id is null or device_id = target_device_id)
  order by created_at asc
  limit 1
  for update skip locked; -- Lock it so no one else grabs it

  -- Return it and delete it (One time use!)
  if found_key_id is not null then
    return query
    delete from public.e2ee_pre_keys
    where id = found_key_id
    returning 
      e2ee_pre_keys.key_id, 
      e2ee_pre_keys.public_key,
      e2ee_pre_keys.device_id,
      e2ee_pre_keys.is_signed,
      e2ee_pre_keys.signature;
  end if;
end;
$$ language plpgsql security definer;

-- 7. FUNCTION: QUEUE NOTIFICATION
-- Trigger when new message arrives
create or replace function queue_message_notification()
returns trigger as $$
declare
  sender_username text;
  conversation_type chat_type;
  recipient_ids uuid[];
begin
  -- Get sender username
  select username into sender_username
  from public.profiles
  where id = new.sender_id;

  -- Get conversation type
  select type into conversation_type
  from public.conversations
  where id = new.conversation_id;

  -- Get all recipients except sender
  select array_agg(user_id) into recipient_ids
  from public.conversation_participants
  where conversation_id = new.conversation_id
    and user_id != new.sender_id;

  -- Queue notifications for each recipient
  insert into public.notification_queue (user_id, message_id, notification_type, title, body, data)
  select 
    unnest(recipient_ids),
    new.id,
    'message',
    case 
      when conversation_type = 'dm' then sender_username
      when conversation_type = 'group' then (select name from public.conversations where id = new.conversation_id)
    end,
    case 
      when new.message_type = 'text' then left(new.content, 100)
      when new.message_type = 'image' then '📷 Photo'
      else 'New message'
    end,
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'sender_id', new.sender_id,
      'message_type', new.message_type
    );

  return new;
end;
$$ language plpgsql security definer;

-- 8. TRIGGER: Auto-queue notifications
create trigger on_new_message_notification
  after insert on public.messages
  for each row execute procedure queue_message_notification();

-- 9. FUNCTION: Update device last active
create or replace function update_device_activity()
returns trigger as $$
begin
  update public.user_devices
  set last_active_at = now()
  where id = new.device_id;
  
  return new;
end;
$$ language plpgsql;

-- 10. FUNCTION: Get active devices for user
create or replace function get_active_devices(target_user_id uuid, since_hours integer default 24)
returns table (
  device_id uuid,
  device_name text,
  public_key text,
  last_active_at timestamp with time zone
) as $$
begin
  return query
  select 
    ud.id,
    ud.device_name,
    ud.public_key,
    ud.last_active_at
  from public.user_devices ud
  where ud.user_id = target_user_id
    and ud.last_active_at > (now() - interval '1 hour' * since_hours)
  order by ud.last_active_at desc;
end;
$$ language plpgsql security definer;

-- 11. FUNCTION: Cleanup old pre-keys
create or replace function cleanup_old_pre_keys()
returns void as $$
begin
  -- Delete keys older than 30 days that haven't been used
  delete from public.e2ee_pre_keys
  where created_at < (now() - interval '30 days');
end;
$$ language plpgsql security definer;

-- 12. FUNCTION: Get unread notification count
create or replace function get_unread_notification_count(target_user_id uuid)
returns bigint as $$
begin
  return (
    select count(*)
    from public.notification_queue
    where user_id = target_user_id
      and not sent
  );
end;
$$ language plpgsql security definer;

-- 13. SESSION MANAGEMENT
-- Track active sessions for security
create table if not exists public.user_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  device_id uuid references public.user_devices(id) on delete cascade,
  session_token text not null unique,
  ip_address inet,
  user_agent text,
  last_activity timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default (now() + interval '30 days')
);

alter table public.user_sessions enable row level security;

create policy "Users can view their own sessions"
on public.user_sessions for select
using (auth.uid() = user_id);

create policy "Users can delete their own sessions"
on public.user_sessions for delete
using (auth.uid() = user_id);

-- Index for session lookups
create index if not exists idx_sessions_token on public.user_sessions(session_token);
create index if not exists idx_sessions_user on public.user_sessions(user_id, last_activity desc);
create index if not exists idx_sessions_expires on public.user_sessions(expires_at);

-- 14. FUNCTION: Cleanup expired sessions
create or replace function cleanup_expired_sessions()
returns void as $$
begin
  delete from public.user_sessions
  where expires_at < now();
end;
$$ language plpgsql security definer;

-- =============================================
-- 📊 ENHANCED INDEXES
-- =============================================

-- Message device key lookups
create index if not exists idx_message_device_keys on public.message_device_keys(device_id, message_id);

-- Notification processing
create index if not exists idx_notifications_user on public.notification_queue(user_id, created_at desc);

-- =============================================
-- 🔔 REALTIME SETUP
-- =============================================

-- Enable realtime for new tables
alter publication supabase_realtime add table public.user_devices;
alter publication supabase_realtime add table public.notification_queue;

-- =============================================
-- 📝 COMMENTS
-- =============================================

comment on table public.user_devices is 'Each device has its own encryption keys for multi-device E2EE';
comment on table public.push_tokens is 'FCM/APNS tokens for push notifications';
comment on table public.e2ee_pre_keys is 'One-time use keys for async E2EE (Signal Protocol style)';
comment on table public.message_device_keys is 'Message keys encrypted for each recipient device';
comment on table public.notification_queue is 'Queue for push notifications to be processed by Edge Functions';
comment on table public.user_sessions is 'Active user sessions for security and multi-device management';

comment on function claim_one_time_key is 'Atomically claim and delete a one-time encryption key';
comment on function get_active_devices is 'Get all devices that have been active within specified hours';
comment on function queue_message_notification is 'Auto-queue push notifications for new messages';
comment on function cleanup_old_pre_keys is 'Remove unused pre-keys older than 30 days';

-- =============================================
-- ✅ VERIFICATION
-- =============================================

-- Verify all tables exist
do $$
declare
  table_count integer;
begin
  select count(*) into table_count
  from information_schema.tables
  where table_schema = 'public'
    and table_name in (
      'user_devices',
      'push_tokens',
      'e2ee_pre_keys',
      'message_device_keys',
      'notification_queue',
      'user_sessions'
    );
  
  if table_count = 6 then
    raise notice '✅ All V2.1 tables created successfully!';
  else
    raise notice '⚠️ Missing tables. Expected 6, found %', table_count;
  end if;
end $$;
