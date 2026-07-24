# Deployment Guide

## Overview
This guide covers production deployment for:
- Frontend (Vite static build)
- Supabase database migrations
- Supabase Edge Functions
- Required environment variables and validation checklist

## 1) Prepare Production Supabase Project

1. Create or select your production Supabase project.
2. Ensure required schemas and base Supabase services are enabled.
3. Keep project URL, anon/publishable key, and service role key available.

## 2) Apply Database Migrations

Project migrations are in `supabase/migrations`.

Recommended with Supabase CLI:

```bash
supabase db push
```

Alternative:
- Run SQL migration files in order through Supabase SQL editor.

Post-migration checks:
- Tables exist: `profiles`, `lamps`, `user_roles`, `phones`
- RLS policies are present and enabled
- Trigger/function setup is present (`set_updated_at`, `handle_new_user`, `is_admin`)
- Storage bucket `lamp-report-images` exists

## 3) Deploy Edge Functions

Functions to deploy:
- `admin-user-create`
- `admin-user-update`
- `admin-user-delete`

Example CLI flow:

```bash
supabase functions deploy admin-user-create
supabase functions deploy admin-user-update
supabase functions deploy admin-user-delete
```

Set per-function secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Example:

```bash
supabase secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
```

## 4) Configure Frontend Environment

For your hosting provider, configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These must point to your production Supabase project.

Also configure Supabase Authentication redirect allowlist so email confirmation opens in your app:

- Add `https://your-production-domain/login` under Authentication -> URL Configuration -> Redirect URLs.
- Keep your local development URL (for example `http://localhost:5173/login`) while testing locally.

## 5) Build Frontend

```bash
npm install
npm run build
```

Build output is generated in `dist/`.

## 6) Deploy Static Assets

Deploy `dist/` to your static host (for example Netlify, Vercel static output, Cloudflare Pages, or other CDN/static host).

Important SPA rule:
- Configure fallback/rewrites so all app routes resolve to `index.html`.

Required route behavior:
- `/`
- `/login`
- `/dashboard`
- `/app/:id`

Admin page:
- Ensure `admin.html` and its assets are accessible.

## 7) Post-Deployment Validation Checklist

Functional checks:
- Visitor can open dashboard and read reports.
- User can register/sign in and create a report.
- User cannot edit/delete reports from other users.
- Admin can create/update/delete users from admin panel.
- Admin can edit/delete any report.
- Report image upload and rendering works.

Security checks:
- RLS blocks unauthorized writes.
- Non-admin user cannot execute privileged admin operations.
- Service role key is never exposed in frontend runtime.

Operational checks:
- Browser console has no startup errors.
- Supabase logs show no recurring auth or edge-function failures.

## 8) Rollback Strategy

If deployment fails:
1. Roll back static frontend to previous stable build.
2. Revert edge function versions to last known-good versions.
3. For database issues, apply forward-fix migration (preferred) or controlled rollback plan.

## 9) Recommended CI/CD Flow

1. Run lint/tests/build on every commit.
2. Deploy to staging first.
3. Apply migrations in staging, then production.
4. Deploy edge functions.
5. Deploy static frontend.
6. Run smoke tests.

## Windows PowerShell Note

If local PowerShell blocks `npm.ps1`, use:

```powershell
cmd /c npm install
cmd /c npm run build
```
