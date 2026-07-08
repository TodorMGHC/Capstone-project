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

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'full_name'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'username'
  ) then
    alter table public.profiles rename column full_name to username;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'username'
  ) then
    alter table public.profiles add column username text;
  end if;
end $$;

alter table public.profiles drop constraint if exists profiles_role_check;

do $$
begin
  alter table public.profiles
    alter column role drop default,
    alter column role type public.user_role
      using case role::text
        when 'admin' then 'admin'::public.user_role
        when 'visitor' then 'visitor'::public.user_role
        else 'user'::public.user_role
      end,
    alter column role set default 'user'::public.user_role;
exception
  when undefined_object then
    null;
end $$;

update public.profiles p
set username = coalesce(
  nullif(p.username, ''),
  nullif(u.raw_user_meta_data->>'username', ''),
  nullif(split_part(u.email, '@', 1), '')
)
from auth.users u
where u.id = p.id;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
drop policy if exists "Profiles are updatable by owner" on public.profiles;
drop policy if exists "Profiles are updatable by admins" on public.profiles;
drop policy if exists "Profiles are viewable by owner and admins" on public.profiles;
drop policy if exists "Admins can manage all profiles" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can manage all pins" on public.pins;
drop policy if exists "Pins are publicly readable" on public.pins;
drop policy if exists "Users can delete their own pins" on public.pins;
drop policy if exists "Users can insert their own pins" on public.pins;
drop policy if exists "Users can update their own pins" on public.pins;

alter table public.profiles
  alter column username set not null,
  alter column created_at set default now();

alter table public.profiles enable row level security;

create policy "Profiles are readable by everyone"
on public.profiles
for select
to anon, authenticated
using (true);

create policy "Profiles are updatable by owner"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

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

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'pins'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'lamps'
  ) then
    alter table public.pins rename to lamps;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lamps'
      and column_name = 'owner_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lamps'
      and column_name = 'user_id'
  ) then
    alter table public.lamps rename column owner_id to user_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lamps'
      and column_name = 'comment'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lamps'
      and column_name = 'comments'
  ) then
    alter table public.lamps rename column comment to comments;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lamps'
      and column_name = 'place_name'
  ) then
    alter table public.lamps drop column place_name;
  end if;
end $$;

alter table public.lamps
  alter column title set not null,
  alter column comments drop not null,
  alter column latitude type double precision using latitude::double precision,
  alter column longitude type double precision using longitude::double precision,
  alter column latitude set not null,
  alter column longitude set not null,
  alter column user_id set not null,
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.lamps enable row level security;

drop policy if exists "Lamps are publicly readable" on public.lamps;
drop policy if exists "Authenticated users can insert lamps" on public.lamps;
drop policy if exists "Owners and admins can update lamps" on public.lamps;
drop policy if exists "Owners and admins can delete lamps" on public.lamps;

create policy "Lamps are publicly readable"
on public.lamps
for select
to anon, authenticated
using (true);

create policy "Authenticated users can insert lamps"
on public.lamps
for insert
to authenticated
with check (auth.uid() = user_id);

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

create trigger set_updated_at_profiles
before update on public.profiles
for each row
execute function public.set_updated_at();

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
