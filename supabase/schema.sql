-- Schema for job aggregator
-- Apply in Supabase SQL editor

create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  ats_type text,
  ats_slug text,
  careers_url text,
  company_size text,
  headquarters text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  location text,
  work_mode text,
  employment_type text,
  level text,
  pay_min numeric,
  pay_max numeric,
  pay_currency text,
  description_snippet text,
  posted_at timestamptz,
  found_at timestamptz not null default now(),
  apply_url text not null,
  source text not null,
  source_id text not null,
  eligible boolean not null default true,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);

create table if not exists public.user_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  status text not null check (status in ('applied', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create table if not exists public.ingest_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  companies_processed integer not null default 0,
  jobs_found integer not null default 0,
  error text
);

alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.user_jobs enable row level security;
alter table public.ingest_runs enable row level security;

-- Public read access for companies and jobs
create policy "companies_read" on public.companies
  for select using (true);

create policy "jobs_read" on public.jobs
  for select using (true);

-- user_jobs: only owner can read/write
create policy "user_jobs_select" on public.user_jobs
  for select using (auth.uid() = user_id);

create policy "user_jobs_insert" on public.user_jobs
  for insert with check (auth.uid() = user_id);

create policy "user_jobs_update" on public.user_jobs
  for update using (auth.uid() = user_id);

create policy "user_jobs_delete" on public.user_jobs
  for delete using (auth.uid() = user_id);

-- ingest_runs: restrict to service role only (no policies for anon)
