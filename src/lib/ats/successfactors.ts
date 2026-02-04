import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

type SuccessFactorsConfig = {
  host: string;
};

function parseSuccessFactorsSlug(atsSlug: string): SuccessFactorsConfig {
  const host = atsSlug.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return { host: host || 'jobs.aa.com' };
}

function pickFirst<T>(...values: Array<T | undefined | null>): T | undefined {
  return values.find((value) => value !== undefined && value !== null);
}

function buildApplyUrl(host: string, urlTitle: string | undefined, id: string | undefined) {
  if (urlTitle && id) {
    return `https://${host}/job/${encodeURIComponent(urlTitle)}/${id}`;
  }
  if (id) {
    return `https://${host}/search/?q=${encodeURIComponent(id)}`;
  }
  return `https://${host}/search/`;
}

export async function fetchSuccessFactorsJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const { host } = parseSuccessFactorsSlug(atsSlug);
  const url = `https://${host}/services/recruiting/v1/jobs`;

  const jobs: RawJob[] = [];
  const seen = new Set<string>();
  const maxPages = 20;

  for (let pageNumber = 0; pageNumber < maxPages; pageNumber += 1) {
    const payload = {
      locale: 'en_US',
      pageNumber,
      sortBy: '',
      keywords: '',
      location: '',
      facetFilters: {},
      brand: '',
      skills: [],
      categoryId: 0,
      alertId: '',
      rcmCandidateId: '',
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/json',
        origin: `https://${host}`,
        referer: `https://${host}/search/`,
      },
      body: JSON.stringify(payload),
      next: { revalidate: 0 },
    });

    if (!res.ok) break;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) break;

    let data: any;
    try {
      data = await res.json();
    } catch {
      break;
    }

    const list: any[] = data?.jobSearchResult ?? [];
    if (!list.length) break;

    for (const item of list) {
      const job = item?.response ?? item;
      const id = String(
        pickFirst(job?.id, job?.jobId, job?.requisitionId, job?.jobReqId, job?.reqId) ?? ''
      );
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const title = pickFirst(job?.unifiedStandardTitle, job?.jobTitle, job?.title) ?? 'Untitled';
      const location = Array.isArray(job?.jobLocationShort)
        ? job.jobLocationShort[0]
        : job?.jobLocationShort ?? undefined;
      const urlTitle = pickFirst(job?.unifiedUrlTitle, job?.urlTitle);

      jobs.push({
        id,
        title,
        location,
        description: job?.jobDescription ?? undefined,
        applyUrl: buildApplyUrl(host, urlTitle, id),
        postedAt: pickFirst(job?.unifiedStandardStart, job?.postingStartDate) ?? undefined,
        employmentType: job?.jobType ?? undefined,
        department: job?.department ?? undefined,
      });
    }
  }

  return { source: 'successfactors', jobs };
}
