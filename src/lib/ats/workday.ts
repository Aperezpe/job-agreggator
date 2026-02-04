import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

type WorkdayConfig = {
  host: string;
  tenant: string;
  site: string;
  limit: number;
  maxPages: number;
};

const DEFAULT_LIMIT = 20;
const DEFAULT_MAX_PAGES = 10;

function parseWorkdaySlug(atsSlug: string): WorkdayConfig {
  const parts = atsSlug.split('|').map((part) => part.trim()).filter(Boolean);
  const host = parts[0] ?? '';
  const tenant = parts[1] ?? '';
  const site = parts[2] ?? '';
  const limit = Number(parts[3]);
  const maxPages = Number(parts[4]);
  return {
    host,
    tenant,
    site,
    limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : DEFAULT_MAX_PAGES,
  };
}

function buildApplyUrl(host: string, site: string, externalPath?: string): string {
  if (!externalPath) return `https://${host}/${site}`;
  if (externalPath.startsWith('http')) return externalPath;
  return `https://${host}/${site}${externalPath}`;
}

export async function fetchWorkdayJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const { host, tenant, site, limit, maxPages } = parseWorkdaySlug(atsSlug);
  if (!host || !tenant || !site) return { source: 'workday', jobs: [] };

  const jobs: RawJob[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let page = 0;
  let total: number | undefined;

  while (page < maxPages) {
    const url = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ limit, offset }),
      next: { revalidate: 0 },
    });
    if (!res.ok) break;
    const data = await res.json();
    const postings: any[] = data?.jobPostings ?? [];
    const nextTotal = data?.total;
    if (typeof nextTotal === 'number' && nextTotal > 0) {
      total = nextTotal;
    }
    if (!postings.length) break;

    for (const job of postings) {
      const id = String(job?.bulletFields?.[0] ?? job?.externalPath ?? job?.title ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      jobs.push({
        id,
        title: job?.title ?? 'Untitled',
        location: job?.locationsText ?? undefined,
        description: undefined,
        applyUrl: buildApplyUrl(host, site, job?.externalPath),
        postedAt: job?.postedOn ?? undefined,
      });
    }

    offset += limit;
    page += 1;
    if (typeof total === 'number' && total > 0 && offset >= total) break;
  }

  return { source: 'workday', jobs };
}
