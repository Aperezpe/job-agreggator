export type RawJob = {
  id: string;
  title: string;
  location?: string;
  description?: string;
  applyUrl: string;
  postedAt?: string;
  employmentType?: string;
  salaryText?: string;
  department?: string;
};

export type CompanySource = {
  name: string;
  atsType?: string;
  atsSlug?: string;
  careersUrl?: string;
};

export type FetchJobsArgs = {
  atsSlug: string;
};

export type FetchJobsResult = {
  source: string;
  jobs: RawJob[];
};
