'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { JobRow, UserJobRow } from '@/lib/types';
import JobCard from './JobCard';

const defaultModes = ['remote_us', 'remote_tx', 'onsite_tx', 'hybrid_tx'];

export default function JobList({ initialJobs }: { initialJobs: JobRow[] }) {
  const [jobs, setJobs] = useState<JobRow[]>(initialJobs);
  const [query, setQuery] = useState('');
  const [selectedModes, setSelectedModes] = useState<string[]>(defaultModes);
  const [userJobs, setUserJobs] = useState<UserJobRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });

    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setUserJobs([]);
      return;
    }

    supabaseBrowser
      .from('user_jobs')
      .select('id, job_id, status')
      .then(({ data }) => setUserJobs((data ?? []) as UserJobRow[]));
  }, [userId]);

  const statusByJobId = useMemo(() => {
    const map = new Map<string, UserJobRow['status']>();
    userJobs.forEach((row) => map.set(row.job_id, row.status));
    return map;
  }, [userJobs]);

  const visibleJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs
      .filter((job) => selectedModes.includes(job.work_mode ?? ''))
      .filter((job) => statusByJobId.get(job.id) !== 'hidden')
      .filter((job) => (q ? job.title.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        const ta = new Date(a.posted_at ?? a.found_at ?? 0).getTime();
        const tb = new Date(b.posted_at ?? b.found_at ?? 0).getTime();
        return tb - ta;
      });
  }, [jobs, query, selectedModes, statusByJobId]);

  const toggleMode = (mode: string) => {
    setSelectedModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

  const markStatus = async (jobId: string, status: UserJobRow['status']) => {
    if (!userId) {
      alert('Please sign in to track jobs.');
      return;
    }

    const existing = userJobs.find((row) => row.job_id === jobId);
    if (existing) {
      const { data } = await supabaseBrowser
        .from('user_jobs')
        .update({ status })
        .eq('id', existing.id)
        .select('id, job_id, status')
        .single();

      if (data) {
        setUserJobs((prev) => prev.map((row) => (row.id === data.id ? (data as UserJobRow) : row)));
      }
      return;
    }

    const { data } = await supabaseBrowser
      .from('user_jobs')
      .insert({ job_id: jobId, status })
      .select('id, job_id, status')
      .single();

    if (data) {
      setUserJobs((prev) => [...prev, data as UserJobRow]);
    }
  };

  return (
    <section className="mt-10">
      <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--ink-muted)]">
            Role search
          </label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-72 max-w-full rounded-xl border border-black/10 px-4 py-2"
            placeholder="Search frontend, UI, React..."
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {defaultModes.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => toggleMode(mode)}
              className={`tag ${selectedModes.includes(mode) ? 'bg-[var(--accent-2)] text-white' : ''}`}
            >
              {mode.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-6">
        {visibleJobs.length === 0 ? (
          <div className="card p-8 text-center text-[var(--ink-muted)]">
            No matching jobs yet. The next scan runs soon.
          </div>
        ) : (
          visibleJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              userStatus={statusByJobId.get(job.id)}
              onApply={() => markStatus(job.id, 'applied')}
              onHide={() => markStatus(job.id, 'hidden')}
            />
          ))
        )}
      </div>
    </section>
  );
}
