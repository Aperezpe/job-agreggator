import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

type AtlassianConfig = {
  baseUrl: string;
};

const DEFAULT_BASE_URL = 'https://www.atlassian.com/endpoint/careers/listings';

function parseAtlassianSlug(atsSlug: string): AtlassianConfig {
  const baseUrl = atsSlug.trim() || DEFAULT_BASE_URL;
  return { baseUrl };
}

export async function fetchAtlassianJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const { baseUrl } = parseAtlassianSlug(atsSlug);
  const res = await fetch(baseUrl, { next: { revalidate: 0 } });
  if (!res.ok) return { source: 'atlassian', jobs: [] };
  let data: any;
  try {
    data = await res.json();
  } catch {
    return { source: 'atlassian', jobs: [] };
  }

  const list: any[] = Array.isArray(data) ? data : [];
  const jobs: RawJob[] = list.map((job) => {
    const id = String(job?.id ?? job?.portalJobPost?.id ?? job?.applyUrl ?? '');
    const title = job?.title ?? 'Untitled';
    const locations = Array.isArray(job?.locations) ? job.locations : [];
    const location = locations.length ? locations[0] : undefined;
    const postedAt = job?.portalJobPost?.updatedDate ?? undefined;
    return {
      id,
      title,
      location,
      description: job?.category ?? undefined,
      applyUrl: job?.applyUrl ?? job?.portalJobPost?.portalUrl ?? '',
      postedAt,
    };
  });

  return { source: 'atlassian', jobs };
}
