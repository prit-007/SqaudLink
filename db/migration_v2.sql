-- =============================================
-- 🚀 SQUAD LINK - DATABASE MIGRATION V2
-- Enhanced Schema with Advanced Features
-- =============================================

-- 1. ADD E2EE SUPPORT TO PROFILES
-- Store public keys for end-to-end encryption
alter table public.profiles add column if not exists public_key text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists phone text unique;

-- 2. MESSAGE READ RECEIPTS (Who seen, when seen)
create table if not exists public.message_reads (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  read_at timestamp with time zone default now(),
  unique(message_id, user_id)
);

-- Enable RLS
alter table public.message_reads enable row level security;

-- Policy: Users can see read receipts in their conversations
create policy "Users can view read receipts in their conversations"
on public.message_reads for select
using (
  exists (
    select 1 from public.messages m
    join public.conversation_participants cp on m.conversation_id = cp.conversation_id
    where m.id = message_id and cp.user_id = auth.uid()
  )
);

-- Policy: Users can mark messages as read
create policy "Users can mark messages as read"
on public.message_reads for insert
with check (auth.uid() = user_id);

-- 3. TYPING INDICATORS
-- Real-time typing status per conversation
create table if not exists public.typing_indicators (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  started_at timestamp with time zone default now(),
  primary key (conversation_id, user_id)
);

-- Enable RLS
alter table public.typing_indicators enable row level security;

-- Policy: Participants can see typing in their conversations
create policy "Users can view typing indicators in their conversations"
on public.typing_indicators for select
using (
  auth.uid() in (
    select user_id from public.conversation_participants 
    where conversation_id = conversation_id
  )
);

-- Policy: Users can update their typing status
create policy "Users can update their typing status"
on public.typing_indicators for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 4. MESSAGE ACTIONS (Forward, Save, Copy)
create type message_action_type as enum ('forward', 'save', 'copy', 'download');

create table if not exists public.message_actions_log (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  action_type message_action_type not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.message_actions_log enable row level security;

-- Policy: Users can log their own actions
create policy "Users can log their message actions"
on public.message_actions_log for insert
with check (auth.uid() = user_id);

-- 5. SAVED MESSAGES (Bookmarks)
create table if not exists public.saved_messages (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  saved_at timestamp with time zone default now(),
  unique(message_id, user_id)
);

-- Enable RLS
alter table public.saved_messages enable row level security;

create policy "Users can manage their saved messages"
on public.saved_messages for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 6. FORWARDED MESSAGES
create table if not exists public.forwarded_messages (
  id uuid default uuid_generate_v4() primary key,
  original_message_id uuid references public.messages(id) on delete set null,
  new_message_id uuid references public.messages(id) on delete cascade,
  forwarded_by uuid references public.profiles(id) on delete cascade,
  forwarded_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.forwarded_messages enable row level security;

create policy "Users can view forwarded messages in their conversations"
on public.forwarded_messages for select
using (
  exists (
    select 1 from public.messages m
    join public.conversation_participants cp on m.conversation_id = cp.conversation_id
    where m.id = new_message_id and cp.user_id = auth.uid()
  )
);

-- 7. MESSAGE REPLIES (Threading)
-- Already supported via reply_to_id, add metadata
alter table public.messages add column if not exists quoted_text text;
alter table public.messages add column if not exists quoted_sender_id uuid references public.profiles(id);

-- 8. VOICE MESSAGES (Future feature)
alter table public.messages add column if not exists voice_duration integer; -- in seconds
alter table public.messages add column if not exists voice_waveform jsonb; -- audio waveform data

-- 9. MESSAGE DELIVERY STATUS
create type delivery_status as enum ('sending', 'sent', 'delivered', 'read', 'failed');

alter table public.messages add column if not exists delivery_status delivery_status default 'sent';

-- 10. CONVERSATION SETTINGS
create table if not exists public.conversation_settings (
  conversation_id uuid references public.conversations(id) on delete cascade primary key,
  encryption_enabled boolean default true,
  disappearing_messages_duration interval, -- e.g., '24 hours'
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.conversation_settings enable row level security;

create policy "Participants can view conversation settings"
on public.conversation_settings for select
using (
  auth.uid() in (
    select user_id from public.conversation_participants 
    where conversation_id = conversation_id
  )
);

create policy "Admins can update conversation settings"
on public.conversation_settings for update
using (
  auth.uid() in (
    select user_id from public.conversation_participants 
    where conversation_id = conversation_id and is_admin = true
  )
);

-- 11. USER PRESENCE (Online/Offline/Last Seen)
create table if not exists public.user_presence (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  status text default 'offline', -- online/offline/away/busy
  last_seen timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.user_presence enable row level security;

create policy "Everyone can view user presence"
on public.user_presence for select
using (true);

create policy "Users can update their own presence"
on public.user_presence for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 12. STORIES (24-hour ephemeral content)
create table if not exists public.stories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null, -- image/video
  caption text,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.stories enable row level security;

create policy "Users can view stories from their contacts"
on public.stories for select
using (
  expires_at > now() and (
    user_id = auth.uid() or
    exists (
      select 1 from public.conversation_participants cp1
      join public.conversation_participants cp2 on cp1.conversation_id = cp2.conversation_id
      where cp1.user_id = auth.uid() and cp2.user_id = stories.user_id
    )
  )
);

create policy "Users can create their own stories"
on public.stories for insert
with check (auth.uid() = user_id);

-- 13. STORY VIEWS
create table if not exists public.story_views (
  id uuid default uuid_generate_v4() primary key,
  story_id uuid references public.stories(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete cascade,
  viewed_at timestamp with time zone default now(),
  unique(story_id, viewer_id)
);

-- Enable RLS
alter table public.story_views enable row level security;

create policy "Story owners can see who viewed their stories"
on public.story_views for select
using (
  exists (
    select 1 from public.stories
    where id = story_id and user_id = auth.uid()
  )
);

create policy "Users can log story views"
on public.story_views for insert
with check (auth.uid() = viewer_id);

-- 14. BLOCKED USERS
create table if not exists public.blocked_users (
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  blocked_at timestamp with time zone default now(),
  primary key (blocker_id, blocked_id)
);

-- Enable RLS
alter table public.blocked_users enable row level security;

create policy "Users can manage their blocked list"
on public.blocked_users for all
using (auth.uid() = blocker_id)
with check (auth.uid() = blocker_id);

-- 15. MEDIA STORAGE TRACKING (For 24h cleanup)
create table if not exists public.ephemeral_media (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references public.messages(id) on delete cascade,
  storage_path text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.ephemeral_media enable row level security;

-- 16. CALL LOGS (Future feature)
create type call_type as enum ('audio', 'video');
create type call_status as enum ('missed', 'completed', 'rejected', 'cancelled');

create table if not exists public.call_logs (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade,
  caller_id uuid references public.profiles(id) on delete cascade,
  call_type call_type not null,
  call_status call_status not null,
  duration integer, -- in seconds
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.call_logs enable row level security;

create policy "Participants can view call logs in their conversations"
on public.call_logs for select
using (
  auth.uid() in (
    select user_id from public.conversation_participants 
    where conversation_id = conversation_id
  )
);

-- =============================================
-- 🔧 HELPER FUNCTIONS
-- =============================================

-- Function: Cleanup expired stories
create or replace function cleanup_expired_stories()
returns void as $$
begin
  delete from public.stories where expires_at < now();
end;
$$ language plpgsql security definer;

-- Function: Cleanup expired media
create or replace function cleanup_expired_media()
returns void as $$
begin
  delete from public.ephemeral_media where expires_at < now();
end;
$$ language plpgsql security definer;

-- Function: Get conversation unread count
create or replace function get_unread_count(conv_id uuid, usr_id uuid)
returns bigint as $$
begin
  return (
    select count(*)
    from public.messages m
    where m.conversation_id = conv_id
      and m.sender_id != usr_id
      and not exists (
        select 1 from public.message_reads mr
        where mr.message_id = m.id and mr.user_id = usr_id
      )
  );
end;
$$ language plpgsql security definer;

-- Function: Mark all messages as read
create or replace function mark_conversation_as_read(conv_id uuid)
returns void as $$
begin
  insert into public.message_reads (message_id, user_id)
  select m.id, auth.uid()
  from public.messages m
  where m.conversation_id = conv_id
    and m.sender_id != auth.uid()
    and not exists (
      select 1 from public.message_reads mr
      where mr.message_id = m.id and mr.user_id = auth.uid()
    );
end;
$$ language plpgsql security definer;

-- =============================================
-- 📊 INDEXES FOR PERFORMANCE
-- =============================================

-- Message queries
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at desc);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_expires on public.messages(expires_at) where expires_at is not null;

-- Read receipts
create index if not exists idx_message_reads_message on public.message_reads(message_id);
create index if not exists idx_message_reads_user on public.message_reads(user_id);

-- Reactions
create index if not exists idx_reactions_message on public.message_reactions(message_id);

-- Conversations
create index if not exists idx_conversations_updated on public.conversations(updated_at desc);

-- Participants
create index if not exists idx_participants_user on public.conversation_participants(user_id);
create index if not exists idx_participants_conv on public.conversation_participants(conversation_id);

-- Stories
create index if not exists idx_stories_user on public.stories(user_id, created_at desc);
create index if not exists idx_stories_expires on public.stories(expires_at);

-- Presence
create index if not exists idx_presence_status on public.user_presence(status, updated_at);

-- =============================================
-- 🔔 REALTIME SUBSCRIPTIONS SETUP
-- =============================================

-- Enable realtime for key tables
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.typing_indicators;
alter publication supabase_realtime add table public.user_presence;
alter publication supabase_realtime add table public.message_reads;
alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.stories;

-- =============================================
-- 🎯 GAME CHANGING FEATURES
-- =============================================

-- 1. MESSAGE PINNING (Pin important messages in groups)
create table if not exists public.pinned_messages (
  conversation_id uuid references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  pinned_by uuid references public.profiles(id) on delete cascade,
  pinned_at timestamp with time zone default now(),
  primary key (conversation_id, message_id)
);

alter table public.pinned_messages enable row level security;

create policy "Participants can view pinned messages"
on public.pinned_messages for select
using (
  auth.uid() in (
    select user_id from public.conversation_participants 
    where conversation_id = conversation_id
  )
);

-- 2. POLL MESSAGES
create table if not exists public.polls (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references public.messages(id) on delete cascade unique,
  question text not null,
  options jsonb not null, -- [{id: 1, text: "Option 1", votes: 0}]
  multiple_choice boolean default false,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.poll_votes (
  poll_id uuid references public.polls(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  option_id integer not null,
  voted_at timestamp with time zone default now(),
  primary key (poll_id, user_id, option_id)
);

alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;

-- 3. MESSAGE MENTIONS
create table if not exists public.message_mentions (
  message_id uuid references public.messages(id) on delete cascade,
  mentioned_user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (message_id, mentioned_user_id)
);

alter table public.message_mentions enable row level security;

-- 4. USER SETTINGS & PREFERENCES
create table if not exists public.user_settings (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  theme text default 'dark', -- dark/light/auto
  notification_sound boolean default true,
  read_receipts_enabled boolean default true,
  last_seen_enabled boolean default true,
  encryption_backup_key text, -- Encrypted private key backup
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.user_settings enable row level security;

create policy "Users can manage their own settings"
on public.user_settings for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 5. CONVERSATION MUTES
create table if not exists public.conversation_mutes (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  muted_until timestamp with time zone, -- null = forever
  created_at timestamp with time zone default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_mutes enable row level security;

-- =============================================
-- 📝 COMMENTS
-- =============================================

comment on table public.message_reads is 'Track who read which messages and when';
comment on table public.typing_indicators is 'Real-time typing status for conversations';
comment on table public.saved_messages is 'User bookmarked messages';
comment on table public.stories is '24-hour ephemeral stories feature';
comment on table public.ephemeral_media is 'Track media that expires after 24 hours';
comment on table public.call_logs is 'Audio/Video call history';
comment on table public.polls is 'Interactive poll messages in groups';
comment on column public.profiles.public_key is 'RSA public key for E2EE encryption';
comment on column public.messages.delivery_status is 'Message delivery tracking';
