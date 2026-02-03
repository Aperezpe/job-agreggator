import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

export async function fetchGreenhouseJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${atsSlug}/jobs?content=true`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    return { source: 'greenhouse', jobs: [] };
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return { source: 'greenhouse', jobs: [] };
  }

  let data: { jobs: Array<any> };
  try {
    data = (await res.json()) as { jobs: Array<any> };
  } catch {
    return { source: 'greenhouse', jobs: [] };
  }
  const jobs: RawJob[] = (data.jobs ?? []).map((job) => ({
    id: String(job.id ?? job.absolute_url ?? job.title ?? ''),
    title: job.title ?? 'Untitled',
    location: job.location?.name ?? undefined,
    description: job.content ?? undefined,
    applyUrl: job.absolute_url ?? '',
    postedAt: job.updated_at ?? job.created_at ?? undefined,
    department: job.departments?.[0]?.name ?? undefined,
  }));

  return { source: 'greenhouse', jobs };
}
