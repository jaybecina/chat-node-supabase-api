# Chat Application Backend

A scalable real-time chat application backend built with Node.js, Express, TypeScript, Supabase, and Socket.io.

## Features

- One-to-one messaging
- Group messaging
- Real-time updates using Socket.io
- Message history with pagination
- Unread message indicators
- Typing indicators
- Group chat management (add/remove members)
- Authentication using Supabase Auth
- Scalable architecture

## Architecture

### Database Schema (Supabase)

- **users**: User profiles and authentication
- **conversations**: Chat conversations (one-to-one or group)
- **conversation_members**: Members of each conversation
- **messages**: Chat messages with references to conversations and users
- **user_status**: Online/offline status tracking

### Real-time Features

- Socket.io for real-time message delivery
- Supabase Realtime for database changes synchronization
- Typing indicators
- Online/offline presence

### Scalability Considerations

- Horizontally scalable architecture
- Socket.io with Redis adapter for multi-server setup
- Message pagination to handle large conversation history
- Efficient database indexing
- Rate limiting for API endpoints

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account and project

### Environment Variables

Create a .env file with the following variables:

\`\`\`env
PORT=3000
NODE_ENV=development

# Supabase Configuration

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Configuration

JWT_SECRET=your_jwt_secret

# Rate Limiting

RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
\`\`\`

### Installation

1. Clone the repository
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Set up your Supabase project and update the environment variables
4. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

### Database Setup

Run the following SQL in your Supabase project to create the necessary tables:

\`\`\`sql
-- Users table (extends Supabase auth.users)
create table public.profiles (
id uuid references auth.users on delete cascade,
username text unique,
full_name text,
avatar_url text,
is_mentor boolean default false,
created_at timestamp with time zone default timezone('utc'::text, now()) not null,
updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
primary key (id)
);

-- Conversations table
create table public.conversations (
id uuid default uuid_generate_v4() primary key,
title text,
is_group boolean default false,
type text check (type in ('one_to_one', 'group')),
creator_id uuid references auth.users not null,
member_ids uuid[] not null,
created_at timestamp with time zone default timezone('utc'::text, now()) not null,
updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
last_message_at timestamp with time zone
);

-- Conversation members table
create table public.conversation_members (
conversation_id uuid references public.conversations on delete cascade,
user_id uuid references auth.users on delete cascade,
role text default 'member' check (role in ('admin', 'member')),
joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
last_read_at timestamp with time zone,
primary key (conversation_id, user_id)
);

-- Messages table
create table public.messages (
id uuid default uuid_generate_v4() primary key,
conversation_id uuid references public.conversations on delete cascade not null,
sender_id uuid references auth.users on delete cascade not null,
content text not null,
attachments text[],
created_at timestamp with time zone default timezone('utc'::text, now()) not null,
updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
read_at timestamp with time zone
);

-- Unread messages count function
create or replace function get_unread_count(conversation_id uuid, user_id uuid)
returns integer as $$
select count(\*)::integer
from messages m
where m.conversation_id = $1
and m.sender_id != $2
and (
not exists (
select 1
from conversation_members cm
where cm.conversation_id = $1
and cm.user_id = $2
and cm.last_read_at >= m.created_at
)
);

$$
language sql stable;

-- Row Level Security Policies
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Conversations policies
create policy "Users can view conversations they're members of"
  on public.conversations for select
  using (
    auth.uid() = any(member_ids)
  );

create policy "Users can create conversations"
  on public.conversations for insert
  with check (
    auth.uid() = creator_id
  );

-- Conversation members policies
create policy "Users can view members of their conversations"
  on public.conversation_members for select
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and auth.uid() = any(c.member_ids)
    )
  );

create policy "Users can manage members if they're admin"
  on public.conversation_members for all
  using (
    exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = conversation_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  );

-- Messages policies
create policy "Users can view messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and auth.uid() = any(c.member_ids)
    )
  );

create policy "Users can insert messages in their conversations"
  on public.messages for insert
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and auth.uid() = any(c.member_ids)
    )
    and auth.uid() = sender_id
  );
\`\`\`

## API Endpoints

### Conversations

- `GET /api/conversations` - Get all conversations for the authenticated user
- `POST /api/conversations/direct` - Create a one-to-one conversation
- `POST /api/conversations/group` - Create a group conversation
- `GET /api/conversations/:id/messages` - Get messages for a conversation
- `POST /api/conversations/:id/members` - Add a member to a group conversation

### Socket.io Events

- `authenticate` - Authenticate socket connection
- `join_conversation` - Join a conversation room
- `send_message` - Send a new message
- `new_message` - Receive a new message
- `typing_start` - User started typing
- `typing_stop` - User stopped typing
- `user_typing_start` - Receive typing start notification
- `user_typing_stop` - Receive typing stop notification

## License

This project is licensed under the MIT License.
$$
