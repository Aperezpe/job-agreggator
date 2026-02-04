import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

type JobSynResponse = {
  featured_jobs?: Array<any>;
  jobs?: Array<any>;
  pagination?: { total_pages?: number };
};

function normalizeOrigin(atsSlug: string) {
  const raw = atsSlug.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return raw || 'careers.alaskaair.com';
}

function pickFirst<T>(...values: Array<T | undefined | null>): T | undefined {
  return values.find((value) => value !== undefined && value !== null);
}

function normalizeLocation(job: any): string | undefined {
  return (
    job?.location_exact ??
    job?.city_exact ??
    job?.location ??
    (Array.isArray(job?.all_locations) ? job.all_locations[0] : undefined)
  );
}

function normalizeApplyUrl(job: any, origin: string): string {
  return (
    job?.apply_url ??
    job?.job_url ??
    job?.url ??
    job?.detail_url ??
    `https://${origin}/jobs/`
  );
}

export async function fetchJobSynJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const origin = normalizeOrigin(atsSlug);
  const baseUrl = 'https://prod-search-api.jobsyn.org/api/v1/solr/search';
  const perPage = 100;
  const maxPages = 20;
  const jobs: RawJob[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= maxPages; page += 1) {
    const url = `${baseUrl}?page=${page}&num_items=${perPage}`;
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        'x-origin': origin,
        origin: `https://${origin}`,
        referer: `https://${origin}/`,
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

    let data: JobSynResponse;
    try {
      data = (await res.json()) as JobSynResponse;
    } catch {
      break;
    }

    const batch = [...(data.featured_jobs ?? []), ...(data.jobs ?? [])];
    for (const job of batch) {
      const id = String(
        pickFirst(job?.guid, job?.id, job?.reqid, job?.title_exact, job?.title_slug) ?? ''
      );
      if (!id || seen.has(id)) continue;
      seen.add(id);

      jobs.push({
        id,
        title: job?.title_exact ?? job?.title ?? job?.job_title ?? job?.title_slug ?? 'Untitled',
        location: normalizeLocation(job),
        description: job?.description ?? undefined,
        applyUrl: normalizeApplyUrl(job, origin),
        postedAt: job?.date_updated ?? job?.date_added ?? job?.date_new ?? undefined,
        employmentType: job?.job_type ?? undefined,
        department: job?.company_exact ?? job?.department ?? undefined,
      });
    }

    const totalPages = data?.pagination?.total_pages ?? 0;
    if (totalPages && page >= totalPages) break;
    if (!batch.length) break;
  }

  return { source: 'jobsyn', jobs };
}
