import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

type SmartRecruitersConfig = {
  companyId: string;
  limit: number;
  maxPages: number;
};

const DEFAULT_LIMIT = 100;
const DEFAULT_MAX_PAGES = 20;

function parseSmartRecruitersSlug(atsSlug: string): SmartRecruitersConfig {
  const parts = atsSlug.split('|').map((part) => part.trim()).filter(Boolean);
  const companyId = parts[0] ?? '';
  const limit = Number(parts[1]);
  const maxPages = Number(parts[2]);
  return {
    companyId,
    limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : DEFAULT_MAX_PAGES,
  };
}

function formatLocation(location: any): string | undefined {
  if (typeof location?.fullLocation === 'string') return location.fullLocation;
  const parts = [location?.city, location?.region, location?.country].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

export async function fetchSmartRecruitersJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const { companyId, limit, maxPages } = parseSmartRecruitersSlug(atsSlug);
  if (!companyId) return { source: 'smartrecruiters', jobs: [] };

  const jobs: RawJob[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let page = 0;
  let totalFound: number | undefined;

  while (page < maxPages) {
    const url = new URL(`https://api.smartrecruiters.com/v1/companies/${companyId}/postings`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) break;
    const data = await res.json();
    const postings: any[] = data?.content ?? [];
    totalFound = data?.totalFound ?? totalFound;
    if (!postings.length) break;

    for (const job of postings) {
      const id = String(job?.id ?? job?.uuid ?? job?.refNumber ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const applyUrl = `https://jobs.smartrecruiters.com/${companyId}/${job?.id ?? ''}`;
      jobs.push({
        id,
        title: job?.name ?? 'Untitled',
        location: formatLocation(job?.location),
        description: job?.department?.label ?? undefined,
        applyUrl,
        postedAt: job?.releasedDate ?? undefined,
        employmentType: job?.typeOfEmployment?.label ?? undefined,
        department: job?.department?.label ?? undefined,
      });
    }

    offset += limit;
    page += 1;
    if (typeof totalFound === 'number' && offset >= totalFound) break;
  }

  return { source: 'smartrecruiters', jobs };
}
