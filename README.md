# Texas + Remote Frontend Radar

A Next.js app that scans company job boards every 6 hours for frontend roles that are US-remote or Texas-based, then lets you track applications.

## Features
- Scans ATS boards (Greenhouse + Lever supported) on a 6-hour cadence
- Filters for Texas onsite, Texas hybrid, Texas remote, or US remote
- Shows posted date first, discovery time fallback
- Tracks applied and hidden roles per account

## Tech stack
- Next.js (app router)
- Supabase (Auth + Postgres)
- GitHub Actions (scheduled ingestion)
- Vercel (deployment)

## Setup
1) Install dependencies:

```bash
npm install
```

2) Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
3) Enable Email/Password auth in Supabase.
4) Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
CRON_SECRET=...
```

5) Seed companies (first ingestion will upsert 250 names) and add ATS slugs for companies you want scanned.
   - Edit `src/data/companies.ts` to add `atsType` + `atsSlug` for known boards.

6) Run the app:

```bash
npm run dev
```

## Cron ingestion
The API route `GET /api/ingest?secret=...` runs ingestion. Use the GitHub Actions workflow in `.github/workflows/ingest.yml` and set secrets in your repo settings.

Required GitHub secrets:
- `VERCEL_INGEST_URL` = `https://your-app.vercel.app/api/ingest`
- `CRON_SECRET` = same value as `.env.local`

## Notes
- Only companies with `atsType` + `atsSlug` will be scanned.
- Pay range and level are inferred from job text where possible.
