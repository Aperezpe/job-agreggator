'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { JobRow, UserJobRow } from '@/lib/types';
import JobCard from './JobCard';

export default function AppliedList() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
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
      setJobs([]);
      setUserJobs([]);
      return;
    }

    Promise.all([
      supabaseBrowser.from('user_jobs').select('id, job_id, status'),
      supabaseBrowser
        .from('jobs')
        .select('id, title, location, work_mode, employment_type, level, pay_min, pay_max, pay_currency, description_snippet, posted_at, found_at, apply_url, company:companies (name, company_size, headquarters)')
        .eq('eligible', true)
        .limit(500),
    ]).then(([userJobsRes, jobsRes]) => {
      setUserJobs((userJobsRes.data ?? []) as UserJobRow[]);
      setJobs((jobsRes.data ?? []) as JobRow[]);
    });
  }, [userId]);

  const appliedJobs = useMemo(() => {
    const appliedIds = new Set(userJobs.filter((row) => row.status === 'applied').map((row) => row.job_id));
    return jobs.filter((job) => appliedIds.has(job.id));
  }, [jobs, userJobs]);

  const markStatus = async (jobId: string, status: UserJobRow['status']) => {
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

  if (!userId) {
    return (
      <div className="card p-8 text-center text-[var(--ink-muted)]">
        Sign in to see your applied list.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {appliedJobs.length === 0 ? (
        <div className="card p-8 text-center text-[var(--ink-muted)]">No applied jobs yet.</div>
      ) : (
        appliedJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            userStatus="applied"
            onApply={() => markStatus(job.id, 'applied')}
            onHide={() => markStatus(job.id, 'hidden')}
          />
        ))
      )}
    </div>
  );
}
