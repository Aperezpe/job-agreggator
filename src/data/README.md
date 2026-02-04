Company sources

`companies.ts` ships with 250 reputable companies by name only.

To enable scanning for a company, add:
- `atsType`: one of greenhouse | lever | accenture | phenom | oraclecloud | jobsyn | eightfold | successfactors | radancy | apple | pcsx | smartrecruiters | atlassian | workday | baidu | bofa
- `atsSlug`: the board slug used by the ATS
- `careersUrl`: optional

Examples of ATS URL patterns:
- Greenhouse: https://boards.greenhouse.io/{slug}
- Lever: https://jobs.lever.co/{slug}
- Accenture API: https://www.accenture.com/us-en/careers/jobsearch (use `atsType: "accenture"`, `atsSlug: "us-en"`)
- Phenom (Adobe): https://careers.adobe.com/us/en/search-results (use `atsType: "phenom"`, `atsSlug: "ADOBUS"`)
- Oracle Cloud (Akamai): https://jobs.akamai.com/en/sites/CX_1 (use `atsType: "oraclecloud"`, `atsSlug: "fa-extu-saasfaprod1.fa.ocs.oraclecloud.com|CX_1|https://jobs.akamai.com"`)
- JobSyn (Alaska Airlines): https://careers.alaskaair.com/jobs/ (use `atsType: "jobsyn"`, `atsSlug: "careers.alaskaair.com"`)
- Eightfold (American Express): https://aexp.eightfold.ai/careers (use `atsType: "eightfold"`, `atsSlug: "aexp.eightfold.ai|38266033|aexp.com"`)
- SuccessFactors (American Airlines): https://jobs.aa.com/search/ (use `atsType: "successfactors"`, `atsSlug: "jobs.aa.com"`)
- Radancy (Amgen): https://careers.amgen.com/en/search-jobs (use `atsType: "radancy"`, `atsSlug: "careers.amgen.com|/en/search-jobs"`)
- Apple Jobs (Apple): https://jobs.apple.com/en-us/search?location=united-states-USA (use `atsType: "apple"`, `atsSlug: "en-us|united-states-USA|25"`)
- PCSx (Applied Materials): https://careers.appliedmaterials.com/careers?domain=appliedmaterials.com (use `atsType: "pcsx"`, `atsSlug: "careers.appliedmaterials.com|appliedmaterials.com|20"`)
- SmartRecruiters (Arista Networks): https://jobs.smartrecruiters.com/AristaNetworks (use `atsType: "smartrecruiters"`, `atsSlug: "AristaNetworks|100|20"`)
- Atlassian Careers (Atlassian): https://www.atlassian.com/company/careers/all-jobs (use `atsType: "atlassian"`, `atsSlug: "https://www.atlassian.com/endpoint/careers/listings"`)
- Workday (Autodesk): https://autodesk.wd1.myworkdayjobs.com/Ext (use `atsType: "workday"`, `atsSlug: "autodesk.wd1.myworkdayjobs.com|autodesk|Ext|20|10"`)
- Baidu Talent (Baidu): https://talent.baidu.com/ (use `atsType: "baidu"`, `atsSlug: "SOCIAL|20|10"`)
- Bank of America Careers: https://careers.bankofamerica.com/en-us/job-search (use `atsType: "bofa"`, `atsSlug: "https://careers.bankofamerica.com|50|30"`)

Add the slug part as `atsSlug`. Only companies with both fields set will be scanned.

Company onboarding checklist:
1) Identify ATS or job API.
2) Add `atsType`, `atsSlug`, and `careersUrl` in `companies.ts`.
3) Implement/update ATS fetcher when needed.
4) Verify via `/api/debug/company-jobs?name=<Company Name>`.
