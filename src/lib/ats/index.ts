import type { FetchJobsResult } from './types';
import { fetchGreenhouseJobs } from './greenhouse';
import { fetchLeverJobs } from './lever';
import { fetchMicrosoftJobs } from './microsoft';

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
  if (atsType === 'microsoft') {
    return fetchMicrosoftJobs({ atsSlug });
  }
  return { source: atsType, jobs: [] };
}
