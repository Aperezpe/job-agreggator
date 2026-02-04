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

function formatRelativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSeconds < 60) return 'Just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}

function formatLocation(location: string | null): string {
  if (!location) return 'Location not listed';
  const parts = location
    .split(/\s*\|\s*|\s*;\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 3) return 'Multiple locations';
  return location;
}

function normalizeApplyUrl(url: string): string {
  return url.replace(/%7B0%7D/gi, 'us-en').replace(/\{0\}/g, 'us-en');
}

export default function JobCard({
  job,
  userStatus,
  hideLabel = 'Hide',
  onApply,
  onHide,
}: {
  job: JobRow;
  userStatus?: UserJobRow['status'];
  hideLabel?: string;
  onApply: () => void;
  onHide: () => void;
}) {
  const company = Array.isArray(job.company) ? job.company[0] : job.company;
  const timestamp = formatTimestamp(job);
  const relativeTime =
    formatRelativeTime(job.posted_at) ??
    formatRelativeTime(job.found_at);
  const compensation = formatCompensation(job);
  const applyUrl = normalizeApplyUrl(job.apply_url);

  const isApplied = userStatus === 'applied';

  return (
    <article className={`card job-card p-10 md:p-11 flex flex-col gap-6 fade-in${isApplied ? ' card-applied' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-[var(--ink-muted)]">
            {company?.name ?? 'Unknown company'}
          </p>
          <h2 className="mt-3 text-xl md:text-2xl font-semibold">{job.title}</h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">{formatLocation(job.location)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag">{workModeLabels[job.work_mode ?? ''] ?? 'Other'}</span>
          {job.level && <span className="tag">{levelLabels[job.level] ?? job.level}</span>}
          {job.employment_type && <span className="tag">{job.employment_type}</span>}
          {isApplied && <span className="tag tag-applied">Applied</span>}
        </div>
      </div>

      {(company?.company_size || company?.headquarters || relativeTime) && (
        <div className="grid gap-4 text-sm text-[var(--ink-muted)] md:grid-cols-3">
          {company?.company_size && (
            <div>
              <span className="block text-[11px] uppercase tracking-[0.22em]">Company size</span>
              <span className="mt-2 block">{company.company_size}</span>
            </div>
          )}
          {company?.headquarters && (
            <div>
              <span className="block text-[11px] uppercase tracking-[0.22em]">Headquarters</span>
              <span className="mt-2 block">{company.headquarters}</span>
            </div>
          )}
          {relativeTime && (
            <div>
              <span className="block text-[11px] uppercase tracking-[0.22em]">Updated</span>
              <span className="mt-2 block">{relativeTime}</span>
            </div>
          )}
        </div>
      )}

      {job.description_snippet && (
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{job.description_snippet}</p>
      )}

      {compensation && (
        <p className="text-sm text-[var(--ink-muted)]">Pay range: {compensation}</p>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <a className="primary-button" href={applyUrl} target="_blank" rel="noreferrer">
          Apply
        </a>
        <button className="secondary-button" onClick={onApply} type="button">
          {userStatus === 'applied' ? 'Applied' : 'Mark Applied'}
        </button>
        <button className="secondary-button" onClick={onHide} type="button">
          {hideLabel}
        </button>
      </div>
    </article>
  );
}
