/*
# User roles table and is_admin() function

1. Overview
- Introduces a dedicated `app_role` enum and a `user_roles` table that stores
  a single role per user, decoupled from the `profiles` table.
- Adds a database function `is_admin()` that returns true when the calling
  authenticated user has the 'admin' role in `user_roles`.
- Defines RLS policies so that everyone can read `user_roles`, but only admins
  can insert, update, or delete rows.
- Rewrites the `lamps` update and delete policies to use `is_admin()` so that
  only owners and admins can edit app data.

2. New Types
- `public.app_role` enum: ('user', 'admin'). The set of roles assignable to a user.

3. New Tables
- `public.user_roles`
  - `user_id` (uuid, primary key, references auth.users on delete cascade)
  - `user_role` (app_role, not null, default 'user')
  - `created_at` (timestamptz, default now())

4. New Functions
- `public.is_admin()` (boolean, security definer, stable): returns true when the
  current authenticated user (auth.uid()) has a row in `user_roles` with
  `user_role = 'admin'`. Marked SECURITY DEFINER so it can be referenced in RLS
  policies without causing recursion, and so the anon role can resolve admin
  status when needed.

5. Security (RLS)
- `user_roles`:
  - SELECT: everyone (anon, authenticated) can read all role assignments.
  - INSERT / UPDATE / DELETE: only admins (is_admin()) can write.
- `lamps` (updated):
  - UPDATE: owner (auth.uid() = user_id) or admin (is_admin()).
  - DELETE: owner (auth.uid() = user_id) or admin (is_admin()).

6. Important Notes
1. The `is_admin()` function is declared SECURITY DEFINER and STABLE so it can
   be used inside RLS policies without infinite recursion on `user_roles`.
2. Existing `lamps` update/delete policies are dropped and recreated to use
   `is_admin()` instead of the inline subquery against `profiles`.
3. The `user_roles` table is kept separate from `profiles.role` to provide a
   dedicated, policy-controlled source of truth for admin status.
*/

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'app_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.app_role as enum ('user', 'admin');
  end if;
end $$;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.user_role = 'admin'
  );
$$;

drop policy if exists "user_roles are readable by everyone" on public.user_roles;
create policy "user_roles are readable by everyone"
on public.user_roles
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert user_roles" on public.user_roles;
create policy "Admins can insert user_roles"
on public.user_roles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update user_roles" on public.user_roles;
create policy "Admins can update user_roles"
on public.user_roles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete user_roles" on public.user_roles;
create policy "Admins can delete user_roles"
on public.user_roles
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Owners and admins can update lamps" on public.lamps;
create policy "Owners and admins can update lamps"
on public.lamps
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Owners and admins can delete lamps" on public.lamps;
create policy "Owners and admins can delete lamps"
on public.lamps
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin());
