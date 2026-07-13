# Burnt out Lamps Map (Capstone Project)

## Project Description
Burnt out Lamps Map is a web application for reporting and managing street lamp issues on a map of Bulgaria.

- Visitors can browse all public lamp reports in read-only mode.
- Registered users can create reports and manage only their own reports.
- Admin users can manage all reports and users from a dedicated admin panel.

Main user-facing pages:

- `/` home page with project overview
- `/login` authentication page (sign in/register)
- `/dashboard` interactive map + table + report form
- `/app/:id` deep-link route that focuses a specific report
- `/admin.html` admin panel for report/user administration

## Documentation Index

- [Architecture](docs/architecture.md)
- [Database Schema Design](docs/database.md)
- [Local Development Setup Guide](docs/setup.md)
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)

## Architecture

### Frontend
- Vite 5 application with ES modules and vanilla JavaScript components.
- UI styling uses Bootstrap 5 plus custom CSS modules.
- Leaflet is used for interactive map rendering and marker interactions.
- App state is centralized in a lightweight store pattern (single source of truth in the browser).

### Backend (BaaS)
- Supabase Auth for authentication and session management.
- Supabase Postgres for relational data (profiles, lamps, roles, phones).
- Supabase Storage bucket for optional report cover images.
- Supabase Realtime subscription to keep lamp data fresh in the dashboard.
- Supabase Edge Functions for privileged admin user operations:
  - `admin-user-create`
  - `admin-user-update`
  - `admin-user-delete`

### Security Model
- Row Level Security (RLS) is enabled on core public tables.
- Public reads are allowed for reports and profiles.
- Write operations are protected so users can only modify their own data, while admins can manage all data.

## Key Folders And Files

### Application root
- `index.html`: main SPA entry page.
- `admin.html`: entry point for admin panel.
- `admin.js` and `admin.css`: admin panel logic and styles.
- `vite.config.js`: Vite dev/build configuration.

### Frontend source (`src`)
- `src/main.js`: bootstraps app and global styles.
- `src/App.js`: app shell, page rendering, navigation, and route syncing.
- `src/lib/app-store.js`: centralized app state, auth flows, lamp CRUD, realtime sync, and file upload helpers.
- `src/lib/supabase.js`: Supabase client initialization from environment variables.
- `src/components/`: reusable UI pieces (layout, auth UI, map, forms, tables).
- `src/pages/`: page-level views (home, login, dashboard, app).
- `src/router/`: routing utilities used by router-based page modules.
- `src/utils/escape-html.js`: output sanitization helper.

### Supabase
- `supabase/migrations/`: SQL schema evolution (tables, policies, triggers, roles, storage setup).
- `supabase/functions/admin-user-create/index.ts`: admin-only user creation.
- `supabase/functions/admin-user-update/index.ts`: admin-only user updates.
- `supabase/functions/admin-user-delete/index.ts`: admin-only user deletion.

## Technologies Used
- JavaScript (ES modules)
- Vite
- Bootstrap 5
- Leaflet
- Supabase (Auth, Postgres, Storage, Realtime, Edge Functions)
