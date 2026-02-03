Company sources

`companies.ts` ships with 250 reputable companies by name only.

To enable scanning for a company, add:
- `atsType`: one of greenhouse | lever
- `atsSlug`: the board slug used by the ATS
- `careersUrl`: optional

Examples of ATS URL patterns:
- Greenhouse: https://boards.greenhouse.io/{slug}
- Lever: https://jobs.lever.co/{slug}
 - Accenture API: https://www.accenture.com/us-en/careers/jobsearch (use `atsType: "accenture"`, `atsSlug: "us-en"`)

Add the slug part as `atsSlug`. Only companies with both fields set will be scanned.
