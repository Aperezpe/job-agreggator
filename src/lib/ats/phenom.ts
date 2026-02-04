import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

type PhenomConfig = {
  baseUrl: string;
  csrfToken?: string;
  pageId: string;
  pageName: string;
  country: string;
  lang: string;
  refNum: string;
  siteType: string;
};

const DEFAULT_BASE_URL = 'https://careers.adobe.com';
const DEFAULT_PAGE_ID = 'page15-ds';
const DEFAULT_PAGE_NAME = 'search-results';
const DEFAULT_COUNTRY = 'us';
const DEFAULT_LANG = 'en_us';
const DEFAULT_SITE_TYPE = 'external';

function parseAtsSlug(atsSlug: string): { baseUrl: string; refNum: string } {
  if (atsSlug.includes('|')) {
    const [baseUrlRaw, refNumRaw] = atsSlug.split('|', 2);
    return {
      baseUrl: baseUrlRaw?.trim() || DEFAULT_BASE_URL,
      refNum: refNumRaw?.trim() || '',
    };
  }
  return { baseUrl: DEFAULT_BASE_URL, refNum: atsSlug };
}

async function loadPhenomConfig({ baseUrl, refNum }: { baseUrl: string; refNum: string }): Promise<PhenomConfig | null> {
  const searchUrl = `${baseUrl}/${DEFAULT_COUNTRY}/en/search-results`;
  const res = await fetch(searchUrl, { next: { revalidate: 0 } });
  if (!res.ok) {
    return null;
  }
  const html = await res.text();

  const tokenMatch = html.match(/\"csrfToken\"\\s*:\\s*\"([^\"]+)\"/i);
  const pageIdMatch = html.match(/\"pageId\"\\s*:\\s*\"([^\"]+)\"/i);
  const refNumMatch = html.match(/\"refNum\"\\s*:\\s*\"([^\"]+)\"/i);
  const localeMatch = html.match(/\"locale\"\\s*:\\s*\"([^\"]+)\"/i);
  const countryMatch = html.match(/\"country\"\\s*:\\s*\"([^\"]+)\"/i);

  return {
    baseUrl,
    csrfToken: tokenMatch?.[1],
    pageId: pageIdMatch?.[1] ?? DEFAULT_PAGE_ID,
    pageName: DEFAULT_PAGE_NAME,
    country: countryMatch?.[1] ?? DEFAULT_COUNTRY,
    lang: (localeMatch?.[1] ?? DEFAULT_LANG).toLowerCase(),
    refNum: refNumMatch?.[1] ?? refNum,
    siteType: DEFAULT_SITE_TYPE,
  };
}

function normalizeLocation(job: any): string | undefined {
  if (job?.cityStateCountry) return job.cityStateCountry;
  if (job?.cityState) return job.cityState;
  if (job?.location) return job.location;
  if (job?.city && job?.state) return `${job.city}, ${job.state}`;
  if (job?.city && job?.country) return `${job.city}, ${job.country}`;
  return job?.address ?? undefined;
}

export async function fetchPhenomJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const { baseUrl, refNum } = parseAtsSlug(atsSlug);
  const config = await loadPhenomConfig({ baseUrl, refNum });
  if (!config?.refNum) {
    return { source: 'phenom', jobs: [] };
  }

  const widgetsUrl = `${config.baseUrl}/widgets`;
  const pageSize = 100;
  const maxPages = 20;
  const allJobs: RawJob[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const from = page * pageSize;
    const payload = {
      lang: config.lang,
      deviceType: 'desktop',
      country: config.country,
      pageName: config.pageName,
      ddoKey: 'refineSearch',
      sortBy: '',
      subsearch: '',
      from,
      jobs: true,
      counts: true,
      all_fields: ['remote', 'country', 'state', 'city', 'experienceLevel', 'category', 'profession', 'employmentType', 'jobLevel'],
      size: pageSize,
      clearAll: false,
      jdsource: 'facets',
      isSliderEnable: false,
      pageId: config.pageId,
      siteType: config.siteType,
      keywords: '',
      global: true,
      selected_fields: {},
      locationData: {},
      refNum: config.refNum,
    };

    const res = await fetch(widgetsUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(config.csrfToken ? { 'X-CSRF-TOKEN': config.csrfToken } : {}),
      },
      body: JSON.stringify(payload),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      break;
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      break;
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      break;
    }

    const jobs: any[] = data?.refineSearch?.data?.jobs ?? [];
    for (const job of jobs) {
      allJobs.push({
        id: String(job?.jobId ?? job?.reqId ?? job?.jobSeqNo ?? job?.applyUrl ?? job?.title ?? ''),
        title: job?.title ?? 'Untitled',
        location: normalizeLocation(job),
        description: job?.descriptionTeaser ?? job?.ml_job_parser?.descriptionTeaser ?? undefined,
        applyUrl: job?.applyUrl ?? '',
        postedAt: job?.postedDate ?? job?.dateCreated ?? undefined,
        employmentType: job?.type ?? job?.employmentType ?? undefined,
        department: job?.department ?? undefined,
      });
    }

    const totalHits = Number(data?.refineSearch?.totalHits ?? data?.refineSearch?.data?.totalHits ?? 0);
    if (!jobs.length || (totalHits && from + pageSize >= totalHits)) {
      break;
    }
  }

  return { source: 'phenom', jobs: allJobs };
}
