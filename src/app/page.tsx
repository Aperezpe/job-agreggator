import TopNav from '@/components/TopNav';
import JobList from '@/components/JobList';
import { supabaseServer } from '@/lib/supabase/server';
import type { JobRow } from '@/lib/types';

export const revalidate = 0;

async function fetchJobs(): Promise<JobRow[]> {
  const { data } = await supabaseServer
    .from('jobs')
    .select('id, title, location, work_mode, employment_type, level, pay_min, pay_max, pay_currency, description_snippet, posted_at, found_at, apply_url, company:companies (name, company_size, headquarters)')
    .eq('eligible', true)
    .limit(200);

  return (data ?? []) as JobRow[];
}

export default async function Home() {
  const jobs = await fetchJobs();

  return (
    <div className="container">
      <TopNav />
      <section className="mt-10 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-6">
          <h2 className="text-2xl font-semibold">What this scan includes</h2>
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            The scanner checks company job boards every 6 hours. Roles are filtered for Remote (US),
            Remote (Texas), Texas Onsite, or Texas Hybrid. If the posting date is missing, we show
            the discovery time instead.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-2xl font-semibold">Quick filters</h2>
          <ul className="mt-3 text-sm text-[var(--ink-muted)] space-y-2">
            <li>Frontend, UI, React, Web, Design Systems</li>
            <li>Mid, Senior, Staff, Lead</li>
            <li>Full-time, contract, or part-time</li>
          </ul>
        </div>
      </section>
      <JobList initialJobs={jobs} />
    </div>
  );
}
