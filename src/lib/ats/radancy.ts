import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

type RadancyConfig = {
  host: string;
  searchPath: string;
};

const DEFAULT_HOST = 'careers.amgen.com';
const DEFAULT_PATH = '/en/search-jobs';

function parseRadancySlug(atsSlug: string): RadancyConfig {
  if (atsSlug.includes('|')) {
    const [hostRaw, pathRaw] = atsSlug.split('|', 2);
    return {
      host: hostRaw?.trim() || DEFAULT_HOST,
      searchPath: pathRaw?.trim() || DEFAULT_PATH,
    };
  }
  const host = atsSlug.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return { host: host || DEFAULT_HOST, searchPath: DEFAULT_PATH };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function extractLines(html: string): string[] {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/h3>/gi, '\n')
    .replace(/<\/p>/gi, '\n');
  return stripTags(cleaned)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseJobIdFromHref(href: string): string {
  const match = href.match(/\/(\d+)(?:\?.*)?$/);
  return match?.[1] ?? href;
}

function parseJobCard(html: string, baseUrl: string): RawJob | null {
  const hrefMatch = html.match(/href=\"([^\"]+)\"/i);
  if (!hrefMatch) return null;
  const href = hrefMatch[1];
  const id = parseJobIdFromHref(href);
  const titleMatch = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
  const title = titleMatch ? stripTags(titleMatch[1]).trim() : undefined;
  const locationMatch = html.match(/class=\"job-location\"[^>]*>([\s\S]*?)<\/span>/i);
  const location = locationMatch ? stripTags(locationMatch[1]).trim() : undefined;
  const postedMatch = html.match(/Posted:\s*<\/strong>\s*([^<]+)/i);
  const postedAt = postedMatch ? postedMatch[1].trim() : undefined;

  const lines = extractLines(html);
  const dateRegex = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.\s+\d{2},\s+\d{4}\b/i;
  const dateLine = lines.find((line) => dateRegex.test(line));
  const locationLine =
    location ??
    lines.find((line) => /,\s*[A-Z]{2}\b/.test(line) || line.includes('Remote') || line.includes('Off-site')) ??
    undefined;

  return {
    id,
    title:
      title ||
      lines.find((line) => !dateRegex.test(line) && !/save job/i.test(line) && !/^save$/i.test(line)) ||
      'Untitled',
    location: locationLine,
    description: undefined,
    applyUrl: href.startsWith('http') ? href : `${baseUrl}${href}`,
    postedAt: postedAt ?? dateLine,
  };
}

export async function fetchRadancyJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const { host, searchPath } = parseRadancySlug(atsSlug);
  const baseUrl = `https://${host}`;

  const firstUrl = `${baseUrl}${searchPath}`;
  const res = await fetch(firstUrl, { next: { revalidate: 0 } });
  if (!res.ok) {
    return { source: 'radancy', jobs: [] };
  }
  const html = await res.text();
  const totalPagesMatch = html.match(/data-total-pages=\"(\d+)\"/i);
  const totalPages = totalPagesMatch ? Number(totalPagesMatch[1]) : 1;

  const jobs: RawJob[] = [];
  const seen = new Set<string>();

  const maxPages = Math.min(totalPages || 1, 100);
  for (let page = 1; page <= maxPages; page += 1) {
    const pageUrl = page === 1 ? firstUrl : `${firstUrl}?p=${page}`;
    const pageRes = page === 1 ? res : await fetch(pageUrl, { next: { revalidate: 0 } });
    if (!pageRes.ok) break;
    const pageHtml = page === 1 ? html : await pageRes.text();

    const listMatches = pageHtml.match(/<li[\s\S]*?<\/li>/gi) ?? [];
    for (const block of listMatches) {
      if (!block.includes('/job/')) continue;
      const job = parseJobCard(block, baseUrl);
      if (!job) continue;
      if (seen.has(job.id)) continue;
      seen.add(job.id);
      jobs.push(job);
    }
  }

  return { source: 'radancy', jobs };
}
