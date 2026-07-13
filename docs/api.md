# API Documentation

## Overview
This project exposes admin-only server operations through Supabase Edge Functions.

Functions:
- `admin-user-create`
- `admin-user-update`
- `admin-user-delete`

All are invoked from the client with `supabase.functions.invoke(...)` and require the caller to be authenticated as an admin user.

## Authentication And Authorization

Each function:
- Accepts `POST` requests only.
- Handles CORS preflight (`OPTIONS`).
- Reads the bearer token from the `Authorization` header.
- Resolves the calling user using Supabase Auth.
- Checks admin access by reading `public.profiles.role` for the caller.

If requester is not authenticated, response is `401`.
If requester is authenticated but not admin, response is `403`.

## Common Response Shape

Success:

```json
{
  "success": true
}
```

Error:

```json
{
  "error": "Human-readable error message"
}
```

## `admin-user-create`

Edge source: `supabase/functions/admin-user-create/index.ts`

### Method
- `POST`

### Request Body

```json
{
  "username": "new_user",
  "email": "new.user@example.com",
  "password": "strong-password",
  "phone": "+359881234567",
  "role": "user"
}
```

Fields:
- `username` required, string
- `email` required, string
- `password` required, string
- `phone` optional, string
- `role` optional, one of `visitor`, `user`, `admin` (defaults to `user`)

### Behavior
- Creates auth user with confirmed email.
- Upserts `public.profiles` row (`id`, `username`, `role`).
- Inserts optional phone row into `public.phones`.
- If phone insert fails, the newly created auth user is deleted (rollback safeguard).

### Success Response

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "new.user@example.com",
    "username": "new_user",
    "phone": "+359881234567",
    "role": "user"
  }
}
```

### Error Statuses
- `400` invalid input or create/update failure
- `401` unauthorized requester
- `403` requester is not admin
- `405` method not allowed
- `500` missing function environment variables

## `admin-user-update`

Edge source: `supabase/functions/admin-user-update/index.ts`

### Method
- `POST`

### Request Body

```json
{
  "userId": "uuid",
  "username": "updated_name",
  "role": "admin",
  "email": "updated.email@example.com",
  "password": "optional-new-password",
  "phone": "+359881112233"
}
```

Fields:
- `userId` required, string
- `username` required, string
- `role` required, one of `visitor`, `user`, `admin`
- `email` optional, string
- `password` optional, string
- `phone` optional, string

### Behavior
- Prevents admin from removing their own admin role.
- Updates auth user metadata (and optional email/password).
- Updates `public.profiles` username/role.
- Replaces phone row in `public.phones` (delete old, insert new if provided).

### Success Response

```json
{
  "success": true
}
```

### Error Statuses
- `400` invalid input or update failure
- `401` unauthorized requester
- `403` requester is not admin
- `405` method not allowed
- `500` missing function environment variables

## `admin-user-delete`

Edge source: `supabase/functions/admin-user-delete/index.ts`

### Method
- `POST`

### Request Body

```json
{
  "userId": "uuid"
}
```

Fields:
- `userId` required, string

### Behavior
- Prevents admins from deleting their own account.
- Deletes all `public.lamps` rows owned by target user.
- Deletes target auth user via admin API (cascades related rows where applicable).

### Success Response

```json
{
  "success": true
}
```

### Error Statuses
- `400` invalid input or delete failure
- `401` unauthorized requester
- `403` requester is not admin
- `405` method not allowed
- `500` missing function environment variables

## Required Edge Function Secrets

Set these for each deployed function:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Client Invocation Pattern

Example call from frontend:

```js
const { data, error } = await supabase.functions.invoke('admin-user-create', {
  body: {
    username: 'new_user',
    email: 'new.user@example.com',
    password: 'secret123',
    role: 'user',
  },
});
```

The active session token is used for authorization; only admin users pass server-side checks.
