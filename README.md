# notesnerd

DSA approaches and random notes — write in Markdown, tag, search, read from anywhere.
Anyone with the link can read; only you can write.

**Stack:** Next.js (App Router) · Supabase (Postgres + Auth + full-text search) · Vercel.

## Features

- Notes with title, tags, Markdown body (syntax-highlighted code)
- Search across titles, bodies and tags (full-text + partial matches), filter by tag
- Images: paste (Ctrl+V), drag-drop or "Add image" — stored in Supabase Storage
- "Use DSA template" button, Write/Preview tabs, Markdown help, Ctrl/⌘+Enter to save
- `/random` to resurface an old note

## One-time setup

### 1. Supabase (free)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste [`supabase/schema.sql`](supabase/schema.sql) → Run. Then do the same with
   [`supabase/images.sql`](supabase/images.sql) (image uploads).
3. **Authentication → Sign In / Providers** → turn **off** "Allow new users to sign up".
4. **Authentication → Users → Add user** → create yourself with email + password (tick auto-confirm).
5. Make yourself the admin — in the SQL Editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
6. **Project Settings → API Keys** → copy the Project URL and the publishable (or legacy anon) key.

### 2. Run locally

```bash
cp .env.example .env.local   # then paste the URL + key
npm install
npm run dev
```

Open http://localhost:3000, click **Log in**, then **+ New**.

### 3. Deploy to Vercel (free)

1. Push this repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. Add the two env vars from `.env.example` → Deploy.

Every push to `main` redeploys automatically.

## How writes are protected

The Supabase key in the browser is public by design. Security comes from Postgres row-level
security in `schema.sql`: anyone may `select`, but `insert/update/delete` require the logged-in
user to be in `public.admins`. With sign-ups disabled, that's only you.
