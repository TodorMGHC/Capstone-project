# Architecture

## Overview
Burnt out Lamps Map is a Vite-based single-page application for reporting and managing burnt out street lamps in Bulgaria.

User access model:

- Visitor: browse public reports in read-only mode.
- Registered user: create reports and manage own reports.
- Admin: manage all reports and users through the admin panel.

## System Components

### Frontend
- Runtime: browser SPA powered by Vite.
- UI: Bootstrap 5 + custom CSS.
- Mapping: Leaflet for interactive map and markers.
- State: centralized store in `src/lib/app-store.js`.

### Backend Services (Supabase)
- Auth: user registration, login, session handling.
- Postgres: relational data (`profiles`, `lamps`, `user_roles`, `phones`).
- Storage: image files in bucket `lamp-report-images`.
- Realtime: subscriptions for automatic lamp list/map refresh.
- Edge Functions:
  - `admin-user-create`
  - `admin-user-update`
  - `admin-user-delete`

## Frontend Structure

Main entry points:

- `index.html` -> user app (`src/main.js`)
- `admin.html` -> admin app (`admin.js`)

Core frontend flow:

1. `src/main.js` boots styles and starts app rendering.
2. `src/App.js` resolves route-like page state and renders page shell.
3. `src/lib/app-store.js` loads auth/session/profile/lamps and exposes actions.
4. Components/pages consume store state and rerender on subscriptions.

## Security Architecture

- Row Level Security (RLS) is enabled for app tables.
- Public read access is allowed where needed (profiles/lamps).
- Insert/update/delete is gated by ownership and admin checks.
- Admin-only operations that require elevated privileges are isolated in Edge Functions using the service role key.

## Route Surface

- `/` home
- `/login` auth page
- `/dashboard` dashboard map/table page
- `/app/:id` deep-link to selected lamp report
- `/admin.html` admin panel

## Technologies

- JavaScript (ES modules)
- Vite 5
- Bootstrap 5
- Leaflet
- Supabase (Auth, Postgres, Storage, Realtime, Edge Functions)
