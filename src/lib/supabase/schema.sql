-- ClearPath Divorce Financial LLC
-- Supabase Schema v1.0

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Tier enum
create type user_tier as enum ('free', 'essentials', 'navigator', 'signature');

-- Subscription status enum
create type subscription_status as enum ('active', 'cancelled', 'expired', 'past_due');

-- Module key enum
create type module_key as enum ('m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7');

-- Module status enum
create type module_status as enum ('locked', 'available', 'in_progress', 'complete');

-- Users table
create table public.users (
  id text primary key,
  email text not null unique,
  tier user_tier not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status subscription_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Module progress table
create table public.module_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null references public.users(id) on delete cascade,
  module_key module_key not null,
  status module_status not null default 'locked',
  unlocked_at timestamptz,
  completed_at timestamptz,
  unique(user_id, module_key)
);

-- Tool data table
create table public.tool_data (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null references public.users(id) on delete cascade,
  module_key module_key not null,
  tool_key text not null,
  data jsonb not null default '{}',
  saved_at timestamptz not null default now(),
  unique(user_id, module_key, tool_key)
);

-- Row Level Security
alter table public.users enable row level security;
alter table public.module_progress enable row level security;
alter table public.tool_data enable row level security;

-- RLS Policies: users can only read/write their own data
create policy "Users can view own record" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own record" on public.users
  for update using (auth.uid() = id);

create policy "Users can view own progress" on public.module_progress
  for select using (auth.uid() = user_id);

create policy "Users can update own progress" on public.module_progress
  for all using (auth.uid() = user_id);

create policy "Users can view own tool data" on public.tool_data
  for select using (auth.uid() = user_id);

create policy "Users can write own tool data" on public.tool_data
  for all using (auth.uid() = user_id);
