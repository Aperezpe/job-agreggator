'use client';

import { useMemo, useState } from 'react';
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

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRelativeTime(date: Date | null): string | null {
  if (!date) return null;
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
  const [expanded, setExpanded] = useState(false);
  const company = Array.isArray(job.company) ? job.company[0] : job.company;
  const referenceDate = useMemo(() => parseDate(job.posted_at) ?? parseDate(job.found_at), [job.posted_at, job.found_at]);
  const relativeTime = formatRelativeTime(referenceDate);
  const isNew = referenceDate ? Date.now() - referenceDate.getTime() < 1000 * 60 * 60 * 24 : false;
  const compensation = formatCompensation(job);
  const applyUrl = normalizeApplyUrl(job.apply_url);

  const isApplied = userStatus === 'applied';
  const canToggleDescription = Boolean(job.description_snippet && job.description_snippet.length > 160);

  return (
    <article className={`card job-card fade-in${isApplied ? ' applied' : ''}`}>
      {isNew && <span className="status-badge new">New</span>}
      <div className="card-header">
        <div>
          <div className="company-name">{company?.name ?? 'Unknown company'}</div>
          <h2 className="job-title">{job.title}</h2>
        </div>
        <div className="tags-container">
          <span className="tag tag-location">{workModeLabels[job.work_mode ?? ''] ?? 'Other'}</span>
          {job.level && <span className="tag tag-level">{levelLabels[job.level] ?? job.level}</span>}
          {job.employment_type && <span className="tag tag-level">{job.employment_type}</span>}
          {isApplied && <span className="tag tag-applied">✓ Applied</span>}
        </div>
      </div>

      <div className="locations-list">{formatLocation(job.location)}</div>

      {relativeTime && (
        <div className="meta-info">
          <span className="meta-label">Updated</span>
          <span className="meta-value">{relativeTime}</span>
        </div>
      )}

      {job.description_snippet && (
        <>
          <p className={`job-description${canToggleDescription && !expanded ? ' collapsed' : ''}`}>
            {job.description_snippet}
          </p>
          {canToggleDescription && (
            <button
              type="button"
              className="expand-toggle"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? 'Read less' : 'Read more'}
            </button>
          )}
        </>
      )}

      {compensation && (
        <p className="job-description">Pay range: {compensation}</p>
      )}

      <div className="action-buttons">
        <a className="btn btn-apply" href={applyUrl} target="_blank" rel="noreferrer">
          Apply
        </a>
        <button
          className={`btn ${userStatus === 'applied' ? 'btn-applied' : 'btn-secondary'}`}
          onClick={onApply}
          type="button"
        >
          {userStatus === 'applied' ? 'Applied' : 'Mark Applied'}
        </button>
        <button className="btn btn-hide" onClick={onHide} type="button">
          {hideLabel}
        </button>
      </div>
    </article>
  );
}
