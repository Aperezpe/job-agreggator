import type { FetchJobsResult } from './types';
import { fetchGreenhouseJobs } from './greenhouse';
import { fetchLeverJobs } from './lever';
import { fetchAccentureJobs } from './accenture';
import { fetchPhenomJobs } from './phenom';
import { fetchOracleCloudJobs } from './oraclecloud';
import { fetchJobSynJobs } from './jobsyn';
import { fetchEightfoldJobs } from './eightfold';
import { fetchSuccessFactorsJobs } from './successfactors';
import { fetchRadancyJobs } from './radancy';
import { fetchAppleJobs } from './apple';
import { fetchPcsxJobs } from './pcsx';
import { fetchSmartRecruitersJobs } from './smartrecruiters';
import { fetchAtlassianJobs } from './atlassian';
import { fetchWorkdayJobs } from './workday';
import { fetchBaiduJobs } from './baidu';
import { fetchBofaJobs } from './bofa';

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
  if (atsType === 'phenom') {
    return fetchPhenomJobs({ atsSlug });
  }
  if (atsType === 'oraclecloud') {
    return fetchOracleCloudJobs({ atsSlug });
  }
  if (atsType === 'jobsyn') {
    return fetchJobSynJobs({ atsSlug });
  }
  if (atsType === 'eightfold') {
    return fetchEightfoldJobs({ atsSlug });
  }
  if (atsType === 'successfactors') {
    return fetchSuccessFactorsJobs({ atsSlug });
  }
  if (atsType === 'radancy') {
    return fetchRadancyJobs({ atsSlug });
  }
  if (atsType === 'apple') {
    return fetchAppleJobs({ atsSlug });
  }
  if (atsType === 'pcsx') {
    return fetchPcsxJobs({ atsSlug });
  }
  if (atsType === 'smartrecruiters') {
    return fetchSmartRecruitersJobs({ atsSlug });
  }
  if (atsType === 'atlassian') {
    return fetchAtlassianJobs({ atsSlug });
  }
  if (atsType === 'workday') {
    return fetchWorkdayJobs({ atsSlug });
  }
  if (atsType === 'baidu') {
    return fetchBaiduJobs({ atsSlug });
  }
  if (atsType === 'bofa') {
    return fetchBofaJobs({ atsSlug });
  }
  return { source: atsType, jobs: [] };
}
