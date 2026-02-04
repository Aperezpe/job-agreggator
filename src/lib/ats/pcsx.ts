import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

type PcsxConfig = {
  host: string;
  domain: string;
  maxPages: number;
};

const DEFAULT_HOST = 'careers.appliedmaterials.com';
const DEFAULT_DOMAIN = 'appliedmaterials.com';
const DEFAULT_MAX_PAGES = 20;

function parsePcsxSlug(atsSlug: string): PcsxConfig {
  const parts = atsSlug.split('|').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 1) {
    return { host: parts[0] || DEFAULT_HOST, domain: DEFAULT_DOMAIN, maxPages: DEFAULT_MAX_PAGES };
  }
  if (parts.length === 2) {
    return { host: parts[0] || DEFAULT_HOST, domain: parts[1] || DEFAULT_DOMAIN, maxPages: DEFAULT_MAX_PAGES };
  }
  const maxPages = Number(parts[2]);
  return {
    host: parts[0] || DEFAULT_HOST,
    domain: parts[1] || DEFAULT_DOMAIN,
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : DEFAULT_MAX_PAGES,
  };
}

function normalizeLocation(job: any): string | undefined {
  if (Array.isArray(job?.standardizedLocations) && job.standardizedLocations.length) {
    return job.standardizedLocations[0];
  }
  if (Array.isArray(job?.locations) && job.locations.length) {
    return job.locations[0];
  }
  return undefined;
}

function normalizePostedAt(value: unknown): string | undefined {
  if (typeof value === 'number') {
    const ts = value > 1e12 ? value : value * 1000;
    return new Date(ts).toISOString();
  }
  if (typeof value === 'string') return value;
  return undefined;
}

export async function fetchPcsxJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const { host, domain, maxPages } = parsePcsxSlug(atsSlug);
  const baseUrl = `https://${host}`;

  const jobs: RawJob[] = [];
  const seen = new Set<string>();
  let start = 0;
  let page = 0;
  let pageSize = 10;
  let totalCount: number | undefined;

  while (page < maxPages) {
    const url = new URL(`${baseUrl}/api/pcsx/search`);
    url.searchParams.set('domain', domain);
    url.searchParams.set('query', '');
    url.searchParams.set('location', '');
    url.searchParams.set('start', String(start));

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) break;
    const data = await res.json();
    const positions: any[] = data?.data?.positions ?? [];
    totalCount = data?.data?.count ?? totalCount;

    if (!positions.length) break;
    pageSize = positions.length || pageSize;

    for (const job of positions) {
      const id = String(job?.id ?? job?.atsJobId ?? job?.displayJobId ?? job?.name ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const applyPath = typeof job?.positionUrl === 'string' ? job.positionUrl : '';
      const applyUrl = applyPath.startsWith('http') ? applyPath : `${baseUrl}${applyPath}`;
      jobs.push({
        id,
        title: job?.name ?? job?.title ?? 'Untitled',
        location: normalizeLocation(job),
        description: job?.department ?? undefined,
        applyUrl,
        postedAt: normalizePostedAt(job?.postedTs ?? job?.creationTs),
        department: job?.department ?? undefined,
        employmentType: job?.workLocationOption ?? undefined,
      });
    }

    start += pageSize;
    page += 1;
    if (typeof totalCount === 'number' && start >= totalCount) break;
  }

  return { source: 'pcsx', jobs };
}
