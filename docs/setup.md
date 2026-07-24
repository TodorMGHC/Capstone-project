# Local Development Setup Guide

## Prerequisites

- Node.js 18+
- npm
- Supabase project credentials (URL + key)
- Optional: Supabase CLI for migrations and local workflows

## 1) Install Dependencies

```bash
npm install
```

## 2) Configure Environment Variables

Create `.env` in project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

These are required by `src/lib/supabase.js`.

Supabase email confirmation links are configured to return users to the app login route (`/login`) on the current app origin. In Supabase Dashboard -> Authentication -> URL Configuration, add allowed redirect URLs for your environments, for example:

- `http://localhost:5173/login`
- `https://your-production-domain/login`

## 3) Start Development Server

```bash
npm run dev
```

Default Vite server configuration:

- dev server: `http://localhost:5173`
- preview server: `http://localhost:4173`

## 4) Production Build

```bash
npm run build
npm run preview
```

## 5) Database Migrations (Supabase)

Migrations are under `supabase/migrations`.

If Supabase CLI is configured:

```bash
supabase db push
```

Alternative: execute migration SQL files in order via Supabase SQL editor.

## 6) Edge Functions (Admin Flows)

Functions directory:

- `supabase/functions/admin-user-create`
- `supabase/functions/admin-user-update`
- `supabase/functions/admin-user-delete`

Deploy functions and configure these secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Without these functions and secrets, admin user management in `admin.html` will fail.

## 7) Run Surface

- Main app: `index.html` (`/` route)
- Admin panel: `admin.html`

## Windows PowerShell Note

If execution policy blocks `npm.ps1`, use Command Prompt or run:

```powershell
cmd /c npm install
cmd /c npm run dev
```

## Troubleshooting

- Missing env vars error:
  - Ensure `.env` exists and has valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Auth or data loading fails:
  - Verify Supabase URL/key target the correct project.
  - Confirm migrations have been applied.
- Admin actions fail:
  - Verify edge functions are deployed.
  - Verify service role secret is configured for functions.
  - Ensure current user has admin role in profile/roles tables.
