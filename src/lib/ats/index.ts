import type { FetchJobsResult } from './types';
import { fetchGreenhouseJobs } from './greenhouse';
import { fetchLeverJobs } from './lever';
import { fetchAccentureJobs } from './accenture';

export async function fetchJobsForCompany(atsType?: string, atsSlug?: string): Promise<FetchJobsResult> {
  if (!atsType || !atsSlug) {
    return { source: 'unknown', jobs: [] };
  }
  if (atsType === 'greenhouse') {
    return fetchGreenhouseJobs({ atsSlug });
  }
  if (atsType === 'lever') {
    return fetchLeverJobs({ atsSlug });
  }
  if (atsType === 'accenture') {
    return fetchAccentureJobs({ atsSlug });
  }
  return { source: atsType, jobs: [] };
}
