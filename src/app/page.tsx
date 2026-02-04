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
      <section className="content-card">
        <h2 className="section-title">What this scan includes</h2>
        <p className="description">
          The scanner checks company job boards every 6 hours. Roles are filtered for Remote (US),
          Remote (Texas), Texas Onsite, or Texas Hybrid. If the posting date is missing, we show
          the discovery time instead.
        </p>
        <div className="filters-section">
          <h3 className="filters-title">Quick filters</h3>
          <div className="filter-chips">
            <span className="filter-chip">Frontend, UI, React, Web, Design Systems</span>
            <span className="filter-chip">Mid, Senior, Staff, Lead</span>
            <span className="filter-chip">Full-time, contract, or part-time</span>
          </div>
        </div>
      </section>
      <JobList initialJobs={jobs} />
    </div>
  );
}
