import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

type BofaConfig = {
  baseUrl: string;
  pageSize: number;
  maxPages: number;
};

const DEFAULT_BASE_URL = 'https://careers.bankofamerica.com';
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_MAX_PAGES = 30;

function parseBofaSlug(atsSlug: string): BofaConfig {
  const parts = atsSlug.split('|').map((part) => part.trim()).filter(Boolean);
  const baseUrl = parts[0] ?? DEFAULT_BASE_URL;
  const pageSize = Number(parts[1]);
  const maxPages = Number(parts[2]);
  return {
    baseUrl: baseUrl || DEFAULT_BASE_URL,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE,
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : DEFAULT_MAX_PAGES,
  };
}

function normalizeLocation(job: any): string | undefined {
  if (job?.location) return job.location;
  if (job?.primaryLocation) return job.primaryLocation;
  if (job?.city && job?.state) return `${job.city}, ${job.state}`;
  if (job?.city && job?.country) return `${job.city}, ${job.country}`;
  return job?.locationString ?? undefined;
}

export async function fetchBofaJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const { baseUrl, pageSize, maxPages } = parseBofaSlug(atsSlug);
  const jobs: RawJob[] = [];
  const seen = new Set<string>();

  let total: number | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const start = page * pageSize;
    const end = start + pageSize;
    const url = `${baseUrl}/services/jobssearchservlet?start=${start}&rows=${end}&search=getAllJobs`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) break;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) break;
    let data: any;
    try {
      data = await res.json();
    } catch {
      break;
    }

    const list: any[] = data?.jobsList ?? data?.joblist ?? [];
    if (!Array.isArray(list) || !list.length) break;
    total = Number(data?.totalMatches) || total;

    for (const job of list) {
      const id = String(job?.jobRequisitionId ?? job?.jcrURL ?? job?.postingTitle ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const applyUrl = job?.externalUrl
        ? String(job.externalUrl)
        : job?.jcrURL
          ? `${baseUrl}${job.jcrURL}`
          : '';
      jobs.push({
        id,
        title: job?.postingTitle ?? 'Untitled',
        location: normalizeLocation(job),
        description: job?.jobDescriptionExternal ?? job?.jobDescriptionInternal ?? job?.additionalJobDescription ?? undefined,
        applyUrl,
        postedAt: job?.postedDate ?? job?.indexedDate ?? undefined,
        employmentType: job?.job_type_text ?? job?.job_type ?? undefined,
        department: job?.lob ?? job?.area ?? job?.family ?? undefined,
      });
    }

    if (typeof total === 'number' && start + pageSize >= total) break;
  }

  return { source: 'bofa', jobs };
}
