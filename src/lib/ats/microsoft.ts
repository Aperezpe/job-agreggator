import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

const DEFAULT_QUERY = 'frontend';
const DEFAULT_LOCATION = 'Texas';

function pickFirst<T>(...values: Array<T | undefined | null>): T | undefined {
  return values.find((value) => value !== undefined && value !== null);
}

export async function fetchMicrosoftJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const domain = atsSlug || 'microsoft.com';
  const url = new URL('https://apply.careers.microsoft.com/api/pcsx/search');
  url.searchParams.set('domain', domain);
  url.searchParams.set('query', DEFAULT_QUERY);
  url.searchParams.set('location', DEFAULT_LOCATION);
  url.searchParams.set('start', '0');
  url.searchParams.set('filter_include_remote', '1');

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    return { source: 'microsoft', jobs: [] };
  }

  const data = (await res.json()) as any;
  const results: any[] =
    data?.operationResult?.resultSet ??
    data?.operationResult?.results ??
    data?.resultSet ??
    data?.results ??
    data?.items ??
    data?.jobs ??
    [];

  const jobs: RawJob[] = results.map((job) => {
    const id = String(
      pickFirst(job?.jobId, job?.jobID, job?.requisitionId, job?.requisitionID, job?.id, job?.jobPostingId) ??
        job?.applyUrl ??
        job?.jobDetailUrl ??
        ''
    );

    const title =
      pickFirst(job?.title, job?.postingTitle, job?.jobTitle, job?.name, job?.jobTitleText) ?? 'Untitled';

    const location = pickFirst(job?.location, job?.locations?.[0], job?.locationName, job?.primaryLocation, job?.locationText);

    const postedAt =
      pickFirst(job?.postedDate, job?.postedDateTime, job?.datePosted, job?.publishDate, job?.postingDate) ?? undefined;

    const applyUrl =
      pickFirst(job?.applyUrl, job?.jobDetailUrl, job?.jobUrl, job?.url) ??
      (job?.jobId ? `https://careers.microsoft.com/v2/global/en/job/${job.jobId}` : '');

    return {
      id,
      title,
      location,
      description: job?.description ?? job?.jobDescription ?? job?.summary ?? undefined,
      applyUrl,
      postedAt,
      employmentType: job?.employmentType ?? job?.timeType ?? undefined,
      salaryText: job?.salary ?? job?.payRange ?? job?.compensation ?? undefined,
      department: job?.category ?? job?.function ?? undefined,
    };
  });

  return { source: 'microsoft', jobs };
}
