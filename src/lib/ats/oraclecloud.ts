import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

type OracleCloudConfig = {
  host: string;
  siteNumber: string;
  careersBaseUrl?: string;
};

const DEFAULT_HOST = 'fa-extu-saasfaprod1.fa.ocs.oraclecloud.com';
const DEFAULT_SITE = 'CX_1';

function parseOracleCloudSlug(atsSlug: string): OracleCloudConfig {
  const parts = atsSlug.split('|').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 1) {
    return { host: DEFAULT_HOST, siteNumber: parts[0] };
  }
  if (parts.length === 2) {
    return { host: parts[0], siteNumber: parts[1] };
  }
  return { host: parts[0], siteNumber: parts[1], careersBaseUrl: parts[2] };
}

function buildFinderParams(siteNumber: string, limit: number, offset: number) {
  const facetsList = [
    'LOCATIONS',
    'WORK_LOCATIONS',
    'WORKPLACE_TYPES',
    'TITLES',
    'CATEGORIES',
    'ORGANIZATIONS',
    'POSTING_DATES',
    'FLEX_FIELDS',
  ].join('%3B');

  return `findReqs;siteNumber=${siteNumber},facetsList=${facetsList},limit=${limit},offset=${offset},sortBy=RELEVANCY`;
}

function buildApplyUrl(jobId: string, careersBaseUrl?: string, siteNumber?: string) {
  if (!careersBaseUrl || !siteNumber) return '';
  const base = careersBaseUrl.replace(/\/$/, '');
  return `${base}/en/sites/${siteNumber}/job/${jobId}`;
}

export async function fetchOracleCloudJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const { host, siteNumber, careersBaseUrl } = parseOracleCloudSlug(atsSlug);
  const baseUrl = `https://${host}`;

  const limit = 100;
  const maxPages = 20;
  const jobs: RawJob[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * limit;
    const finder = buildFinderParams(siteNumber, limit, offset);
    const url = `${baseUrl}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.workLocation,requisitionList.otherWorkLocations,requisitionList.secondaryLocations,requisitionList.requisitionFlexFields&finder=${finder}`;

    const res = await fetch(url, {
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/vnd.oracle.adf.resourceitem+json;charset=utf-8',
        'ora-irc-language': 'en',
        origin: careersBaseUrl ?? baseUrl,
        referer: careersBaseUrl ?? baseUrl,
      },
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

    const items = data?.items ?? [];
    const requisitions = items?.[0]?.requisitionList ?? [];
    const total = items?.[0]?.TotalJobsCount ?? data?.count ?? undefined;

    for (const req of requisitions) {
      const id = String(req?.Id ?? req?.RequisitionId ?? req?.requisitionId ?? '');
      const title = req?.Title ?? req?.PostingTitle ?? 'Untitled';
      const location = req?.PrimaryLocation ?? req?.PrimaryLocationCountry ?? undefined;
      jobs.push({
        id,
        title,
        location,
        description: req?.ShortDescriptionStr ?? undefined,
        applyUrl: buildApplyUrl(id, careersBaseUrl, siteNumber),
        postedAt: req?.PostedDate ?? undefined,
        employmentType: req?.JobType ?? req?.JobSchedule ?? undefined,
        department: req?.Department ?? req?.Organization ?? undefined,
      });
    }

    if (!requisitions.length) break;
    if (typeof total === 'number' && offset + limit >= total) break;
  }

  return { source: 'oraclecloud', jobs };
}
