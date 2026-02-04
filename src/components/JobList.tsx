'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { JobRow, UserJobRow } from '@/lib/types';
import JobCard from './JobCard';

const defaultModes = ['remote_us', 'remote_tx', 'onsite_tx', 'hybrid_tx'];
const PAGE_SIZE = 15;

export default function JobList({ initialJobs }: { initialJobs: JobRow[] }) {
  const [jobs, setJobs] = useState<JobRow[]>(initialJobs);
  const [query, setQuery] = useState('');
  const [selectedModes, setSelectedModes] = useState<string[]>(defaultModes);
  const [userJobs, setUserJobs] = useState<UserJobRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [query, selectedModes, statusByJobId, jobs]);

  const totalPages = Math.max(1, Math.ceil(visibleJobs.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageJobs = visibleJobs.slice(pageStart, pageStart + PAGE_SIZE);

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
    if (existing && existing.status === status && status === 'applied') {
      const { error } = await supabaseBrowser
        .from('user_jobs')
        .delete()
        .eq('id', existing.id)
        .eq('user_id', userId);

      if (!error) {
        setUserJobs((prev) => prev.filter((row) => row.id !== existing.id));
      }
      return;
    }

    if (existing) {
      const { data } = await supabaseBrowser
        .from('user_jobs')
        .update({ status })
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select('id, job_id, status')
        .single();

      if (data) {
        setUserJobs((prev) => prev.map((row) => (row.id === data.id ? (data as UserJobRow) : row)));
      }
      return;
    }

    const { data } = await supabaseBrowser
      .from('user_jobs')
      .insert({ job_id: jobId, status, user_id: userId })
      .select('id, job_id, status')
      .single();

    if (data) {
      setUserJobs((prev) => [...prev, data as UserJobRow]);
    }
  };

  return (
    <section className="mt-10">
      <div className="content-card">
        <div className="search-section">
          <div className="search-wrapper">
            <label className="search-label">Role Search</label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="search-input"
              placeholder="Search frontend, UI, React..."
            />
          </div>
          <div className="location-filters">
            {defaultModes.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => toggleMode(mode)}
                className={`location-btn${selectedModes.includes(mode) ? ' active' : ''}`}
              >
                {mode.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-8">
        {pageJobs.length === 0 ? (
          <div className="card p-8 text-center text-[var(--ink-muted)]">
            No matching jobs yet. The next scan runs soon.
          </div>
        ) : (
          pageJobs.map((job) => (
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

      {visibleJobs.length > PAGE_SIZE && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[var(--ink-muted)]">
            Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, visibleJobs.length)} of {visibleJobs.length}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="text-sm text-[var(--ink-muted)]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
