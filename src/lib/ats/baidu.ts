import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

type BaiduConfig = {
  recruitType: string;
  pageSize: number;
  maxPages: number;
};

const DEFAULT_RECRUIT_TYPE = 'SOCIAL';
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_MAX_PAGES = 30;

function parseBaiduSlug(atsSlug: string): BaiduConfig {
  const parts = atsSlug.split('|').map((part) => part.trim()).filter(Boolean);
  const recruitType = parts[0] ?? DEFAULT_RECRUIT_TYPE;
  const pageSize = Number(parts[1]);
  const maxPages = Number(parts[2]);
  return {
    recruitType,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE,
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : DEFAULT_MAX_PAGES,
  };
}

function buildDescription(job: any): string | undefined {
  const pieces = [job?.workContent, job?.serviceCondition].filter(Boolean);
  return pieces.length ? pieces.join('\n') : undefined;
}

type BaiduDebug = {
  ok: boolean;
  status?: number;
  contentType?: string | null;
  snippet?: string;
};

async function fetchBaiduJobsInternal(atsSlug: string, debug = false): Promise<{ result: FetchJobsResult; debug?: BaiduDebug }> {
  const { recruitType, pageSize, maxPages } = parseBaiduSlug(atsSlug);
  const url = 'https://talent.baidu.com/httservice/getPostListNew';
  const headers = {
    referer: 'https://talent.baidu.com/',
    'x-requested-with': 'XMLHttpRequest',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  };
  const jobs: RawJob[] = [];
  const seen = new Set<string>();
  let page = 1;
  let total: number | undefined;

  let debugMeta: BaiduDebug | undefined;

  while (page <= maxPages) {
    const body = new URLSearchParams({
      recruitType,
      pageSize: String(pageSize),
      keyWord: '',
      curPage: String(page),
      projectType: '',
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: body.toString(),
      cache: 'no-store',
      next: { revalidate: 0 },
    });

    const text = await res.text();
    if (debug && !debugMeta) {
      debugMeta = {
        ok: res.ok,
        status: res.status,
        contentType: res.headers.get('content-type'),
        snippet: text.slice(0, 600),
      };
    }
    if (!res.ok) break;
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      break;
    }
    if (data?.status !== 'ok') break;

    const list: any[] = data?.data?.list ?? data?.list ?? [];
    total = Number(data?.data?.total ?? data?.total) || total;
    if (!list.length) break;

    for (const job of list) {
      const id = String(job?.postId ?? job?.jobId ?? job?.name ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      jobs.push({
        id,
        title: job?.name ?? 'Untitled',
        location: job?.workPlace ?? undefined,
        description: buildDescription(job),
        applyUrl: `https://talent.baidu.com/jobs/detail/${recruitType}/${job?.postId ?? ''}`,
        postedAt: job?.publishDate ?? job?.updateDate ?? undefined,
        employmentType: job?.postType ?? undefined,
      });
    }

    const fetched = page * pageSize;
    if (typeof total === 'number' && fetched >= total) break;
    page += 1;
  }

  return { result: { source: 'baidu', jobs }, debug: debugMeta };
}

export async function fetchBaiduJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const { result } = await fetchBaiduJobsInternal(atsSlug, false);
  return result;
}

export async function fetchBaiduJobsDebug({ atsSlug }: FetchJobsArgs): Promise<{ result: FetchJobsResult; debug: BaiduDebug }> {
  const { result, debug } = await fetchBaiduJobsInternal(atsSlug, true);
  return { result, debug: debug ?? { ok: false } };
}
