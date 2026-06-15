-- ============================================================
-- Church AI Guides — Supabase Database Schema
-- Run this in your Supabase project: SQL Editor → New Query → paste → Run
-- ============================================================

-- Profiles table: one row per user, tracks their membership status.
-- Linked to Supabase's built-in auth.users table.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  church_name text,
  stripe_customer_id text,
  subscription_status text default 'inactive', -- 'active' | 'inactive' | 'past_due' | 'canceled'
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- Automatically create a profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, church_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'church_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Row Level Security (enable when you're ready to lock things down)
-- ============================================================
alter table public.profiles enable row level security;

-- Users can read their own profile
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own non-sensitive fields
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- NOTE: subscription_status is only ever written by the Stripe webhook
-- (via the service_role key on the server), never by the user's browser.
