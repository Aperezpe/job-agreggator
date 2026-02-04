import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

type EightfoldConfig = {
  host: string;
  tenantId: string;
  domain: string;
};

const DEFAULT_HOST = 'aexp.eightfold.ai';
const DEFAULT_DOMAIN = 'aexp.com';

function parseEightfoldSlug(atsSlug: string): EightfoldConfig {
  const parts = atsSlug.split('|').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 1) {
    return { host: DEFAULT_HOST, tenantId: parts[0], domain: DEFAULT_DOMAIN };
  }
  if (parts.length === 2) {
    return { host: parts[0], tenantId: parts[1], domain: DEFAULT_DOMAIN };
  }
  return { host: parts[0], tenantId: parts[1], domain: parts[2] };
}

function pickFirst<T>(...values: Array<T | undefined | null>): T | undefined {
  return values.find((value) => value !== undefined && value !== null);
}

function normalizeLocation(job: any): string | undefined {
  if (typeof job?.location === 'string') return job.location;
  if (Array.isArray(job?.locations) && job.locations.length) return job.locations[0];
  if (typeof job?.primaryLocation === 'string') return job.primaryLocation;
  if (typeof job?.city === 'string' && typeof job?.state === 'string') return `${job.city}, ${job.state}`;
  return job?.country ?? undefined;
}

export async function fetchEightfoldJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const { host, tenantId, domain } = parseEightfoldSlug(atsSlug);
  const baseUrl = `https://${host}/api/apply/v2/jobs/${tenantId}/jobs?domain=${encodeURIComponent(domain)}`;

  const res = await fetch(baseUrl, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json',
      referer: `https://${host}/careers`,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return { source: 'eightfold', jobs: [] };
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return { source: 'eightfold', jobs: [] };
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    return { source: 'eightfold', jobs: [] };
  }

  const list: any[] =
    data?.positions ??
    data?.jobs ??
    data?.data?.jobs ??
    data?.jobList ??
    data?.results ??
    data?.response?.jobs ??
    [];

  const jobs: RawJob[] = list.map((job) => {
    const id = String(
      pickFirst(job?.id, job?.jobId, job?.reqId, job?.requisitionId, job?.jobRequisitionId, job?.display_job_id, job?.ats_job_id) ??
        job?.title ??
        ''
    );
    const title = pickFirst(job?.title, job?.jobTitle, job?.name) ?? 'Untitled';
    const applyUrl =
      pickFirst(job?.canonicalPositionUrl, job?.applyUrl, job?.apply_url, job?.jobUrl, job?.job_url, job?.detailUrl) ??
      '';
    const postedAtRaw = pickFirst(job?.postedDate, job?.datePosted, job?.createdDate, job?.updatedDate, job?.t_create, job?.t_update);
    const postedAt = typeof postedAtRaw === 'number' ? new Date(postedAtRaw * 1000).toISOString() : postedAtRaw;

    return {
      id,
      title,
      location: normalizeLocation(job),
      description: job?.job_description ?? job?.description ?? job?.jobDescription ?? job?.summary ?? undefined,
      applyUrl,
      postedAt,
      employmentType: job?.employmentType ?? job?.jobType ?? job?.type ?? undefined,
      department: job?.department ?? job?.category ?? job?.business_unit ?? undefined,
    };
  });

  return { source: 'eightfold', jobs };
}

export async function fetchEightfoldJobsDebug({ atsSlug }: FetchJobsArgs): Promise<{
  result: FetchJobsResult;
  debug: {
    ok: boolean;
    status: number;
    contentType: string | null;
    topKeys?: string[];
    listKeys?: string[];
    snippet?: string;
  };
}> {
  const { host, tenantId, domain } = parseEightfoldSlug(atsSlug);
  const baseUrl = `https://${host}/api/apply/v2/jobs/${tenantId}/jobs?domain=${encodeURIComponent(domain)}`;

  const res = await fetch(baseUrl, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json',
      referer: `https://${host}/careers`,
    },
    next: { revalidate: 0 },
  });

  const contentType = res.headers.get('content-type');
  const debug = {
    ok: res.ok,
    status: res.status,
    contentType,
    topKeys: undefined as string[] | undefined,
    listKeys: undefined as string[] | undefined,
    snippet: undefined as string | undefined,
  };

  if (!res.ok || !contentType?.includes('application/json')) {
    try {
      debug.snippet = (await res.text()).slice(0, 800);
    } catch {
      debug.snippet = undefined;
    }
    return { result: { source: 'eightfold', jobs: [] }, debug };
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    return { result: { source: 'eightfold', jobs: [] }, debug };
  }

  debug.topKeys = Object.keys(data ?? {});
  const list: any[] =
    data?.positions ??
    data?.jobs ??
    data?.data?.jobs ??
    data?.jobList ??
    data?.results ??
    data?.response?.jobs ??
    [];
  debug.listKeys = Array.isArray(list) && list.length ? Object.keys(list[0]) : undefined;
  if (!list.length) {
    try {
      debug.snippet = JSON.stringify(data).slice(0, 800);
    } catch {
      debug.snippet = undefined;
    }
    return { result: { source: 'eightfold', jobs: [] }, debug };
  }

  const jobs: RawJob[] = list.map((job) => {
    const id = String(
      pickFirst(job?.id, job?.jobId, job?.reqId, job?.requisitionId, job?.jobRequisitionId) ??
        job?.title ??
        ''
    );
    const title = pickFirst(job?.title, job?.jobTitle, job?.name) ?? 'Untitled';
    const applyUrl =
      pickFirst(job?.canonicalPositionUrl, job?.applyUrl, job?.apply_url, job?.jobUrl, job?.job_url, job?.detailUrl) ??
      '';
    const postedAtRaw = pickFirst(job?.postedDate, job?.datePosted, job?.createdDate, job?.updatedDate, job?.t_create, job?.t_update);
    const postedAt = typeof postedAtRaw === 'number' ? new Date(postedAtRaw * 1000).toISOString() : postedAtRaw;

    return {
      id,
      title,
      location: normalizeLocation(job),
      description: job?.job_description ?? job?.description ?? job?.jobDescription ?? job?.summary ?? undefined,
      applyUrl,
      postedAt,
      employmentType: job?.employmentType ?? job?.jobType ?? job?.type ?? undefined,
      department: job?.department ?? job?.category ?? job?.business_unit ?? undefined,
    };
  });

  return { result: { source: 'eightfold', jobs }, debug };
}
