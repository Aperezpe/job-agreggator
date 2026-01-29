import { NextResponse } from 'next/server';
import { companySeeds } from '@/data/companies';
import { fetchJobsForCompany } from '@/lib/ats';
import { isEligible, normalizeJob } from '@/lib/jobs';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const run = await supabaseAdmin
    .from('ingest_runs')
    .insert({ status: 'running' })
    .select('id')
    .single();

  const runId = run.data?.id;

  let companiesProcessed = 0;
  let jobsFound = 0;

  try {
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id, name, ats_type, ats_slug');

    const existingByName = new Map((companies ?? []).map((c) => [c.name.toLowerCase(), c]));

    const upserts = companySeeds.map((seed) => ({
      name: seed.name,
      ats_type: seed.atsType ?? null,
      ats_slug: seed.atsSlug ?? null,
      careers_url: seed.careersUrl ?? null,
      company_size: seed.companySize ?? null,
      headquarters: seed.headquarters ?? null,
    }));

    if (upserts.length) {
      await supabaseAdmin.from('companies').upsert(upserts, { onConflict: 'name' });
    }

    const { data: updatedCompanies } = await supabaseAdmin
      .from('companies')
      .select('id, name, ats_type, ats_slug');

    for (const company of updatedCompanies ?? []) {
      if (!company.ats_type || !company.ats_slug) continue;
      const result = await fetchJobsForCompany(company.ats_type, company.ats_slug);
      companiesProcessed += 1;

      for (const job of result.jobs) {
        const normalized = normalizeJob(job, result.source);
        const eligible = isEligible(normalized);
        if (!eligible) continue;
        jobsFound += 1;

        await supabaseAdmin
          .from('jobs')
          .upsert({
            company_id: company.id,
            title: normalized.title,
            location: normalized.location ?? null,
            work_mode: normalized.workMode,
            employment_type: normalized.employmentType ?? null,
            level: normalized.level ?? null,
            pay_min: normalized.payMin ?? null,
            pay_max: normalized.payMax ?? null,
            pay_currency: normalized.payCurrency ?? null,
            description_snippet: normalized.descriptionSnippet ?? null,
            posted_at: normalized.postedAt ?? null,
            found_at: normalized.foundAt,
            apply_url: normalized.applyUrl,
            source: normalized.source,
            source_id: normalized.sourceId,
            eligible,
            raw: normalized.raw,
          }, { onConflict: 'source,source_id' });
      }
    }

    if (runId) {
      await supabaseAdmin
        .from('ingest_runs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          companies_processed: companiesProcessed,
          jobs_found: jobsFound,
        })
        .eq('id', runId);
    }

    return NextResponse.json({ ok: true, companiesProcessed, jobsFound });
  } catch (error) {
    if (runId) {
      await supabaseAdmin
        .from('ingest_runs')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          companies_processed: companiesProcessed,
          jobs_found: jobsFound,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', runId);
    }

    return NextResponse.json({ error: 'Ingest failed' }, { status: 500 });
  }
}
