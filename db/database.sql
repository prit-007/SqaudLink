-- 1. ENABLE UUID EXTENSION (For secure, unique IDs)
create extension if not exists "uuid-ossp";

-- 2. ENUMS (Strict typing for "Pro" reliability)
create type message_type as enum ('text', 'image', 'system');
create type chat_type as enum ('dm', 'group');

-- 3. PROFILES (Linked to Supabase Auth)
-- This separates public user data (name, avatar) from secure auth data.
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique not null,
  avatar_url text,
  status text default 'offline', -- online/offline/busy
  last_seen timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- 4. CONVERSATIONS (The Chat Rooms)
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  type chat_type not null default 'dm',
  name text, -- NULL for DMs, required for Groups
  group_avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now() -- Used for sorting chats list
);

-- 5. PARTICIPANTS (Who is in which chat?)
create table public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamp with time zone default now(),
  is_admin boolean default false, -- For group management
  primary key (conversation_id, user_id)
);

-- 6. MESSAGES (The core content)
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) not null,
  
  -- Content
  content text, -- Text message or Caption for image
  media_url text, -- The S3/Supabase Storage URL
  message_type message_type default 'text',
  
  -- Pro Features Support
  reply_to_id uuid references public.messages(id), -- For threading/replies
  is_edited boolean default false,
  is_deleted boolean default false, -- "Soft delete" (WhatsApp style "This message was deleted")
  
  -- The 24-Hour Logic
  expires_at timestamp with time zone, -- NULL for text, set for images
  
  created_at timestamp with time zone default now()
);

-- 7. REACTIONS (The "Fun" part)
-- Storing reactions separately allows for analytics and cleaner updates
create table public.message_reactions (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamp with time zone default now(),
  unique(message_id, user_id, emoji) -- User can't react with same emoji twice
);

-- =============================================
-- 🔒 SECURITY (ROW LEVEL SECURITY - RLS)
-- =============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- POLICY: Profiles are viewable by everyone (to search for friends)
create policy "Public profiles are viewable by everyone" 
on public.profiles for select using (true);

-- POLICY: Users can insert their own profile
create policy "Users can insert their own profile" 
on public.profiles for insert with check (auth.uid() = id);

-- POLICY: Participants can view their conversations
create policy "Users can view conversations they are part of"
on public.conversations for select
using (
  auth.uid() in (
    select user_id from public.conversation_participants 
    where conversation_id = id
  )
);

-- POLICY: Participants can view messages in their chats
create policy "Users can view messages in their conversations"
on public.messages for select
using (
  auth.uid() in (
    select user_id from public.conversation_participants 
    where conversation_id = conversation_id
  )
);

-- POLICY: Users can insert messages if they are participants
create policy "Users can send messages to their conversations"
on public.messages for insert
with check (
  auth.uid() in (
    select user_id from public.conversation_participants 
    where conversation_id = conversation_id
  )
);

-- =============================================
-- ⚡ AUTOMATION (TRIGGERS & FUNCTIONS)
-- =============================================

-- FUNCTION: Automatically create a profile when a user signs up via Supabase Auth
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- TRIGGER: Run the above function on sign up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- FUNCTION: Update "updated_at" on conversation when a new message is sent
-- This moves the chat to the top of the list!
create or replace function public.update_conversation_timestamp()
returns trigger as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

-- TRIGGER: Run the above function on new message
create trigger on_new_message_sent
  after insert on public.messages
  for each row execute procedure public.update_conversation_timestamp();