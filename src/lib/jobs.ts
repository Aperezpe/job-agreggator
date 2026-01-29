import type { RawJob } from './ats/types';

const txKeywords = ['texas', 'tx', 'austin', 'dallas', 'houston', 'san antonio', 'fort worth', 'plano', 'irving', 'frisco', 'round rock'];
const remoteKeywords = ['remote', 'work from home', 'wfh', 'telecommute', 'distributed'];

export type NormalizedJob = {
  title: string;
  location?: string;
  workMode: 'remote_us' | 'remote_tx' | 'onsite_tx' | 'hybrid_tx' | 'other';
  employmentType?: string;
  level?: string;
  payMin?: number;
  payMax?: number;
  payCurrency?: string;
  descriptionSnippet?: string;
  postedAt?: string;
  foundAt: string;
  applyUrl: string;
  source: string;
  sourceId: string;
  raw: RawJob;
};

export function normalizeJob(job: RawJob, source: string): NormalizedJob {
  const locationText = (job.location ?? '').toLowerCase();
  const isRemote = remoteKeywords.some((k) => locationText.includes(k));
  const isTx = txKeywords.some((k) => locationText.includes(k));
  const workMode = deriveWorkMode(locationText, isRemote, isTx);

  const { min, max, currency } = extractPayRange(job.salaryText ?? job.description ?? '');

  return {
    title: job.title,
    location: job.location,
    workMode,
    employmentType: normalizeEmployment(job.employmentType, job.description ?? ''),
    level: inferLevel(`${job.title} ${job.description ?? ''}`),
    payMin: min,
    payMax: max,
    payCurrency: currency,
    descriptionSnippet: trimText(job.description ?? '', 220),
    postedAt: job.postedAt,
    foundAt: new Date().toISOString(),
    applyUrl: job.applyUrl,
    source,
    sourceId: job.id,
    raw: job,
  };
}

export function isEligible(job: NormalizedJob): boolean {
  return ['remote_us', 'remote_tx', 'onsite_tx', 'hybrid_tx'].includes(job.workMode) && isFrontendRole(job);
}

function deriveWorkMode(locationText: string, isRemote: boolean, isTx: boolean): NormalizedJob['workMode'] {
  if (isRemote && locationText.includes('texas')) return 'remote_tx';
  if (isRemote && locationText.includes('united states')) return 'remote_us';
  if (isRemote && !isTx) return 'remote_us';
  if (isTx && locationText.includes('hybrid')) return 'hybrid_tx';
  if (isTx) return 'onsite_tx';
  return 'other';
}

function normalizeEmployment(type?: string, description?: string): string | undefined {
  const text = `${type ?? ''} ${description ?? ''}`.toLowerCase();
  if (text.includes('part-time') || text.includes('part time')) return 'part-time';
  if (text.includes('contract') || text.includes('temporary') || text.includes('temp')) return 'contract';
  if (text.includes('intern')) return 'intern';
  if (text.includes('full-time') || text.includes('full time')) return 'full-time';
  return type;
}

function inferLevel(text: string): string | undefined {
  const t = text.toLowerCase();
  if (t.includes('intern')) return 'intern';
  if (t.includes('junior') || t.includes('jr.')) return 'junior';
  if (t.includes('entry')) return 'junior';
  if (t.includes('mid') || t.includes('intermediate')) return 'mid';
  if (t.includes('senior') || t.includes('sr.')) return 'senior';
  if (t.includes('staff')) return 'staff';
  if (t.includes('principal')) return 'principal';
  if (t.includes('lead')) return 'lead';
  return undefined;
}

function isFrontendRole(job: NormalizedJob): boolean {
  const text = `${job.title} ${job.raw.description ?? ''}`.toLowerCase();
  const keywords = [
    'front end',
    'frontend',
    'ui engineer',
    'ui developer',
    'web developer',
    'web engineer',
    'react',
    'angular',
    'vue',
    'javascript',
    'typescript',
    'design systems',
  ];
  return keywords.some((keyword) => text.includes(keyword));
}

function extractPayRange(text: string): { min?: number; max?: number; currency?: string } {
  const t = text.replace(/,/g, '');
  const match = t.match(/\$\s*(\d{2,3})(?:k|,?\d{3})?\s*(?:-|to)\s*\$\s*(\d{2,3})(?:k|,?\d{3})?/i);
  if (match) {
    const min = parseNumber(match[1]);
    const max = parseNumber(match[2]);
    return { min, max, currency: 'USD' };
  }
  return {};
}

function parseNumber(raw: string): number {
  const value = Number(raw);
  if (raw.length <= 3) {
    return value * 1000;
  }
  return value;
}

function trimText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 3)}...`;
}
