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