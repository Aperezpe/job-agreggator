import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

function pickFirst<T>(...values: Array<T | undefined | null>): T | undefined {
  return values.find((value) => value !== undefined && value !== null);
}

export async function fetchAccentureJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
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

  const res = await fetch('https://www.accenture.com/api/accenture/elastic/findjobs', {
    method: 'POST',
    body: form,
    headers: {
      accept: 'application/json, text/plain, */*',
    },
    next: { revalidate: 0 },
  });

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
    const applyUrl =
      pickFirst(source?.jobDetailUrl, source?.applyUrl, source?.jobUrl) ??
      (id ? `https://www.accenture.com/us-en/careers/jobdetails?id=${id}` : '');

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
