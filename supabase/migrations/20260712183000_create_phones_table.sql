create table if not exists public.phones (
  "userID" uuid not null references auth.users(id) on delete cascade,
  phone text not null
);
