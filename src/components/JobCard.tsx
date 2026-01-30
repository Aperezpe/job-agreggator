'use client';

import type { JobRow, UserJobRow } from '@/lib/types';

const workModeLabels: Record<string, string> = {
  remote_us: 'Remote (US)',
  remote_tx: 'Remote (Texas)',
  onsite_tx: 'Texas Onsite',
  hybrid_tx: 'Texas Hybrid',
};

const levelLabels: Record<string, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  staff: 'Staff',
  principal: 'Principal',
  lead: 'Lead',
  intern: 'Intern',
};

function formatCompensation(job: JobRow) {
  if (!job.pay_min || !job.pay_max) return null;
  const currency = job.pay_currency ?? 'USD';
  return `${job.pay_min.toLocaleString()}-${job.pay_max.toLocaleString()} ${currency}`;
}

function formatTimestamp(job: JobRow) {
  const posted = job.posted_at ? new Date(job.posted_at) : null;
  const found = job.found_at ? new Date(job.found_at) : null;
  if (posted) return { label: 'Posted', value: posted.toLocaleString() };
  if (found) return { label: 'Found', value: found.toLocaleString() };
  return null;
}

export default function JobCard({
  job,
  userStatus,
  onApply,
  onHide,
}: {
  job: JobRow;
  userStatus?: UserJobRow['status'];
  onApply: () => void;
  onHide: () => void;
}) {
  const company = Array.isArray(job.company) ? job.company[0] : job.company;
  const timestamp = formatTimestamp(job);
  const compensation = formatCompensation(job);

  return (
    <article className="card p-6 flex flex-col gap-4 fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--ink-muted)]">
            {company?.name ?? 'Unknown company'}
          </p>
          <h2 className="text-xl font-semibold">{job.title}</h2>
          <p className="text-sm text-[var(--ink-muted)]">{job.location ?? 'Location not listed'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag">{workModeLabels[job.work_mode ?? ''] ?? 'Other'}</span>
          {job.level && <span className="tag">{levelLabels[job.level] ?? job.level}</span>}
          {job.employment_type && <span className="tag">{job.employment_type}</span>}
        </div>
      </div>

      <div className="grid gap-2 text-sm text-[var(--ink-muted)] md:grid-cols-3">
        <div>
          <span className="block text-xs uppercase tracking-[0.2em]">Company size</span>
          <span>{company?.company_size ?? 'Unknown'}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.2em]">Headquarters</span>
          <span>{company?.headquarters ?? 'Unknown'}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.2em]">Time</span>
          <span>{timestamp ? `${timestamp.label}: ${timestamp.value}` : 'Unknown'}</span>
        </div>
      </div>

      {job.description_snippet && (
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{job.description_snippet}</p>
      )}

      {compensation && (
        <p className="text-sm text-[var(--ink-muted)]">Pay range: {compensation}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <a className="primary-button" href={job.apply_url} target="_blank" rel="noreferrer">
          Apply
        </a>
        <button className="secondary-button" onClick={onApply} type="button">
          {userStatus === 'applied' ? 'Applied' : 'Mark Applied'}
        </button>
        <button className="secondary-button" onClick={onHide} type="button">
          Hide
        </button>
      </div>
    </article>
  );
}
