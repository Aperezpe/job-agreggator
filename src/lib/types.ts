export type JobRow = {
  id: string;
  title: string;
  location: string | null;
  work_mode: string | null;
  employment_type: string | null;
  level: string | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_currency: string | null;
  description_snippet: string | null;
  posted_at: string | null;
  found_at: string | null;
  apply_url: string;
  company: {
    name: string;
    company_size: string | null;
    headquarters: string | null;
  } | null;
};

export type UserJobRow = {
  id: string;
  job_id: string;
  status: 'applied' | 'hidden';
};
