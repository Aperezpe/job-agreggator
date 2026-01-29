import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

export async function fetchLeverJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const url = `https://api.lever.co/v0/postings/${atsSlug}?mode=json`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    return { source: 'lever', jobs: [] };
  }
  const data = (await res.json()) as Array<any>;
  const jobs: RawJob[] = data.map((job) => ({
    id: String(job.id ?? job._id ?? job.hostedUrl ?? job.text ?? ''),
    title: job.text ?? job.title ?? 'Untitled',
    location: job.categories?.location ?? job.location ?? undefined,
    description: job.descriptionPlain ?? job.description ?? undefined,
    applyUrl: job.hostedUrl ?? job.applyUrl ?? job.url ?? '',
    postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : undefined,
    employmentType: job.categories?.commitment ?? undefined,
    department: job.categories?.team ?? undefined,
  }));

  return { source: 'lever', jobs };
}
