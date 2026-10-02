# Our Little World ❤️

Private couple application for Nasywa, built with React, TypeScript, Vite, Tailwind CSS, Supabase, and Google Maps.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env`.
3. Create a Supabase project and fill:
   - `VITE_SUPABASE_URL`: Project Settings → API → Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Project Settings → API → publishable/anon key
4. Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor. It creates tables, indexes, triggers, RLS policies, the private `couple-photos` bucket, and storage ownership policies.
5. In Supabase Authentication, create the one private account you and Nasywa will share for this app, then disable **Allow new users to sign up**. The app intentionally has no public registration screen.
6. For maps, enable Maps JavaScript API and Places API in Google Cloud, restrict the key to your deployed domains, and fill `VITE_GOOGLE_MAPS_API_KEY`.
7. Start with `npm run dev`. Production validation: `npm run lint && npm run typecheck && npm run build`.

Never place a Supabase service-role key in this frontend. `.env` is gitignored.

## Persistence and security

All domain data is stored in Supabase PostgreSQL. Photos are compressed in-browser, uploaded to private Supabase Storage paths shaped as `{user_id}/{year}/{month}/{uuid}.webp`, and recorded in `photos`. The gallery resolves short-lived signed URLs; files are never made public. Deletion removes the Storage object first, then metadata. RLS covers SELECT, INSERT, UPDATE, and DELETE for each user-owned table; activity ownership is inherited through its parent date.

## Required photo acceptance test

After connecting a real Supabase project, verify with a real image:

1. Login, upload, and confirm it appears.
2. Refresh and confirm it remains.
3. Close/reopen the browser and confirm it remains.
4. Logout/login and confirm it remains.
5. Login on another browser/device and confirm it remains.
6. Delete it, then verify both the `photos` row and Storage object are gone.

These device/session tests require real Supabase credentials and cannot be replaced by local mock data.
