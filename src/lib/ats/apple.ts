import type { FetchJobsArgs, FetchJobsResult, RawJob } from './types';

type AppleConfig = {
  locale: string;
  location: string;
  maxPages: number;
};

const DEFAULT_LOCALE = 'en-us';
const DEFAULT_LOCATION = 'united-states-USA';
const DEFAULT_MAX_PAGES = 25;

function parseAppleSlug(atsSlug: string): AppleConfig {
  if (atsSlug.includes('|')) {
    const [localeRaw, locationRaw, maxPagesRaw] = atsSlug.split('|', 3);
    const maxPages = Number(maxPagesRaw);
    return {
      locale: localeRaw?.trim() || DEFAULT_LOCALE,
      location: locationRaw?.trim() || DEFAULT_LOCATION,
      maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : DEFAULT_MAX_PAGES,
    };
  }
  return { locale: atsSlug.trim() || DEFAULT_LOCALE, location: DEFAULT_LOCATION, maxPages: DEFAULT_MAX_PAGES };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractNextUrl(html: string): string | null {
  const match = html.match(/rel=\"next\" href=\"([^\"]+)\"/i);
  if (!match) return null;
  let nextUrl = decodeEntities(match[1]);
  if (nextUrl.includes('/searchlocation=')) {
    nextUrl = nextUrl.replace('/searchlocation=', '/search?location=');
  } else if (nextUrl.includes('/search&')) {
    nextUrl = nextUrl.replace('/search&', '/search?');
  }
  if (nextUrl.startsWith('http')) return nextUrl;
  return `https://jobs.apple.com${nextUrl}`;
}

function parseJobsFromHtml(html: string): RawJob[] {
  const jobs: RawJob[] = [];
  const seen = new Set<string>();
  const marker = 'job-title job-list-item';
  const parts = html.split(marker).slice(1);

  for (const chunk of parts) {
    const hrefMatch = chunk.match(/href="(\/[^"]*\/details\/[^"]+)"/i);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];
    const idMatch = href.match(/details\/([^/]+)/i);
    const id = idMatch?.[1] ?? href;
    if (seen.has(id)) continue;

    const titleMatch = chunk.match(/<a[^>]*class="[^"]*link-inline[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    const teamMatch = chunk.match(/class="team-name[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const dateMatch = chunk.match(/class="job-posted-date"[^>]*>([\s\S]*?)<\/span>/i);
    const locationMatch = chunk.match(/class="table--advanced-search__location-sub"[^>]*>([\s\S]*?)<\/span>/i);

    const title = titleMatch ? decodeEntities(stripTags(titleMatch[1]).trim()) : 'Untitled';
    const team = teamMatch ? decodeEntities(stripTags(teamMatch[1]).trim()) : undefined;
    const postedAt = dateMatch ? decodeEntities(stripTags(dateMatch[1]).trim()) : undefined;
    const location = locationMatch ? decodeEntities(stripTags(locationMatch[1]).trim()) : undefined;

    seen.add(id);
    jobs.push({
      id,
      title,
      location,
      description: team,
      applyUrl: `https://jobs.apple.com${href}`,
      postedAt,
    });
  }

  return jobs;
}

function buildSearchUrl(locale: string, location: string, page: number): string {
  const params = new URLSearchParams();
  if (location) params.set('location', location);
  if (page > 1) params.set('page', String(page));
  return `https://jobs.apple.com/${locale}/search?${params.toString()}`;
}

export async function fetchAppleJobs({ atsSlug }: FetchJobsArgs): Promise<FetchJobsResult> {
  const { locale, location, maxPages } = parseAppleSlug(atsSlug);
  let page = 1;
  let nextUrl: string | null = buildSearchUrl(locale, location, page);
  const jobs: RawJob[] = [];
  const seen = new Set<string>();

  while (nextUrl && page <= maxPages) {
    const res = await fetch(nextUrl, { next: { revalidate: 0 } });
    if (!res.ok) break;
    const html = await res.text();
    for (const job of parseJobsFromHtml(html)) {
      if (seen.has(job.id)) continue;
      seen.add(job.id);
      jobs.push(job);
    }
    nextUrl = extractNextUrl(html);
    page += 1;
  }

  return { source: 'apple', jobs };
}
