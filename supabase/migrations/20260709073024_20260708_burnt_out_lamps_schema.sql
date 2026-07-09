/*
# Burnt out Lamps base schema

1. Overview
- Sets up the core data model for the Burnt out Lamps Map application.
- Creates a `user_role` enum, `profiles` and `lamps` tables, and supporting triggers/functions.

2. New Types
- `public.user_role` enum: ('visitor', 'user', 'admin'). Used for per-user access levels.

3. New Tables
- `public.profiles`
  - `id` (uuid, primary key, references auth.users)
  - `username` (text, not null)
  - `role` (user_role, default 'user')
  - `created_at` (timestamptz, default now())
- `public.lamps`
  - `id` (uuid, primary key)
  - `title` (text, not null)
  - `comments` (text, nullable)
  - `latitude` (double precision, not null)
  - `longitude` (double precision, not null)
  - `user_id` (uuid, not null, references auth.users)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

4. Functions / Triggers
- `set_updated_at()` trigger function to maintain `updated_at` on update.
- `handle_new_user()` trigger function to auto-create a profile row on signup.
- Triggers on `profiles` and `lamps` for `updated_at`, and on `auth.users` for new-user profile creation.

5. Security (RLS)
- `profiles`: publicly readable; updatable by owner or admin.
- `lamps`: publicly readable; insert by authenticated owner; update/delete by owner or admin.
*/

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'user_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.user_role as enum ('visitor', 'user', 'admin');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
on public.profiles
for select
to anon, authenticated
using (true);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by admins" on public.profiles;
create policy "Profiles are updatable by admins"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create table if not exists public.lamps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  comments text,
  latitude double precision not null,
  longitude double precision not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lamps enable row level security;

drop policy if exists "Lamps are publicly readable" on public.lamps;
create policy "Lamps are publicly readable"
on public.lamps
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can insert lamps" on public.lamps;
create policy "Authenticated users can insert lamps"
on public.lamps
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Owners and admins can update lamps" on public.lamps;
create policy "Owners and admins can update lamps"
on public.lamps
for update
to authenticated
using (
  auth.uid() = user_id or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  auth.uid() = user_id or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "Owners and admins can delete lamps" on public.lamps;
create policy "Owners and admins can delete lamps"
on public.lamps
for delete
to authenticated
using (
  auth.uid() = user_id or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_lamps on public.lamps;
create trigger set_updated_at_lamps
before update on public.lamps
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'username', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'user'
    ),
    'user'::public.user_role
  )
  on conflict (id) do update
    set username = excluded.username;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();