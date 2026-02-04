import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

function pickFirst<T>(...values: Array<T | undefined | null>): T | undefined {
  return values.find((value) => value !== undefined && value !== null);
}

function buildAccentureForm(atsSlug?: string) {
  const form = new FormData();
  form.set('startIndex', '0');
  form.set('maxResultSize', '100');
  form.set('jobKeyword', '');
  form.set('jobCountry', 'USA');
  form.set('jobLanguage', 'en');
  form.set('countrySite', atsSlug || 'us-en');
  form.set('sortBy', '2');
  form.set('searchType', 'vectorSearch');
  form.set('enableQueryBoost', 'true');
  form.set('minScore', '0.6');
  form.set('getFeedbackJudgmentEnabled', 'true');
  form.set('useCleanEmbedding', 'true');
  form.set('score', 'true');
  form.set('totalHits', 'true');
  form.set('debugQuery', 'false');
  form.set('jobFilters', '[]');
  return form;
}

function normalizeAccentureUrl(url: string, atsSlug?: string): string {
  const slug = (atsSlug && atsSlug.trim()) || 'us-en';
  return url.replace(/%7B0%7D/gi, slug).replace(/\{0\}/g, slug);
}

async function fetchAccentureResponse(atsSlug?: string) {
  const form = buildAccentureForm(atsSlug);
  return fetch('https://www.accenture.com/api/accenture/elastic/findjobs', {
    method: 'POST',
    body: form,
    headers: {
      accept: 'application/json, text/plain, */*',
    },
    next: { revalidate: 0 },
  });
}

export async function fetchAccentureJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const res = await fetchAccentureResponse(atsSlug);
  if (!res.ok) {
    return { source: 'accenture', jobs: [] };
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return { source: 'accenture', jobs: [] };
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    return { source: 'accenture', jobs: [] };
  }

  const list: any[] =
    data?.data ??
    data?.jobs ??
    data?.jobList ??
    data?.jobSearchResult?.jobs ??
    data?.result?.jobs ??
    data?.hits?.hits ??
    [];

  const jobs: RawJob[] = list.map((job) => {
    const source = job?._source ?? job;
    const id = String(
      pickFirst(source?.jobId, source?.requisitionId, source?.requisitionID, source?.id, source?.jobReqId) ??
        source?.jobNumber ??
        ''
    );
    const title = pickFirst(source?.jobTitle, source?.title, source?.jobName) ?? 'Untitled';
    const location = pickFirst(source?.jobLocation, source?.location, source?.locationName, source?.city) ?? undefined;
    const postedAt = pickFirst(source?.postingDate, source?.postedDate, source?.datePosted) ?? undefined;
    const rawApplyUrl = pickFirst(source?.jobDetailUrl, source?.applyUrl, source?.jobUrl);
    const applyUrl = rawApplyUrl
      ? normalizeAccentureUrl(rawApplyUrl, atsSlug)
      : id
        ? `https://www.accenture.com/${(atsSlug && atsSlug.trim()) || 'us-en'}/careers/jobdetails?id=${id}`
        : '';

    return {
      id,
      title,
      location,
      description: source?.jobDescription ?? source?.description ?? undefined,
      applyUrl,
      postedAt,
      employmentType: source?.employmentType ?? source?.jobType ?? undefined,
      salaryText: source?.salary ?? source?.payRange ?? undefined,
      department: source?.jobCategory ?? source?.department ?? undefined,
    };
  });

  return { source: 'accenture', jobs };
}

export async function fetchAccentureJobsDebug({ atsSlug }: FetchJobsArgs): Promise<{
  result: FetchJobsResult;
  debug: {
    ok: boolean;
    status: number;
    contentType: string | null;
    snippet?: string;
    totalHits?: number;
    jobCount?: number;
  };
}> {
  const res = await fetchAccentureResponse(atsSlug);
  const contentType = res.headers.get('content-type');
  const debug = {
    ok: res.ok,
    status: res.status,
    contentType,
    snippet: undefined as string | undefined,
    totalHits: undefined as number | undefined,
    jobCount: undefined as number | undefined,
  };

  if (!res.ok || !contentType?.includes('application/json')) {
    try {
      const text = await res.text();
      debug.snippet = text.slice(0, 800);
    } catch {
      debug.snippet = undefined;
    }
    return { result: { source: 'accenture', jobs: [] }, debug };
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    return { result: { source: 'accenture', jobs: [] }, debug };
  }

  const list: any[] =
    data?.jobs ??
    data?.jobList ??
    data?.jobSearchResult?.jobs ??
    data?.result?.jobs ??
    data?.hits?.hits ??
    [];

  const jobs: RawJob[] = list.map((job) => {
    const source = job?._source ?? job;
    const id = String(
      pickFirst(source?.jobId, source?.requisitionId, source?.requisitionID, source?.id, source?.jobReqId) ??
        source?.jobNumber ??
        ''
    );
    const title = pickFirst(source?.jobTitle, source?.title, source?.jobName) ?? 'Untitled';
    const location = pickFirst(source?.jobLocation, source?.location, source?.locationName, source?.city) ?? undefined;
    const postedAt = pickFirst(source?.postingDate, source?.postedDate, source?.datePosted) ?? undefined;
    const rawApplyUrl = pickFirst(source?.jobDetailUrl, source?.applyUrl, source?.jobUrl);
    const applyUrl = rawApplyUrl
      ? normalizeAccentureUrl(rawApplyUrl, atsSlug)
      : id
        ? `https://www.accenture.com/${(atsSlug && atsSlug.trim()) || 'us-en'}/careers/jobdetails?id=${id}`
        : '';

    return {
      id,
      title,
      location,
      description: source?.jobDescription ?? source?.description ?? undefined,
      applyUrl,
      postedAt,
      employmentType: source?.employmentType ?? source?.jobType ?? undefined,
      salaryText: source?.salary ?? source?.payRange ?? undefined,
      department: source?.jobCategory ?? source?.department ?? undefined,
    };
  });

  const totalHits =
    data?.totalHits ??
    data?.jobSearchResult?.totalHits ??
    data?.result?.totalHits ??
    data?.hits?.totalHits ??
    data?.hits?.total ??
    undefined;
  debug.totalHits = typeof totalHits === 'number' ? totalHits : undefined;
  debug.jobCount = jobs.length;
  if (!jobs.length) {
    try {
      debug.snippet = JSON.stringify(data).slice(0, 800);
    } catch {
      debug.snippet = undefined;
    }
  }

  return { result: { source: 'accenture', jobs }, debug };
}
