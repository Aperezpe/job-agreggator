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

  const url = new URL(request.url);
  const storeAll = url.searchParams.get('storeAll') === '1';

  const run = await supabaseAdmin.from('ingest_runs').insert({ status: 'running' }).select('id').single();
  if (run.error) {
    return NextResponse.json({ error: run.error.message }, { status: 500 });
  }

  const runId = run.data?.id;

  let companiesProcessed = 0;
  let jobsFound = 0;
  let jobsStored = 0;

  try {
    const companiesRes = await supabaseAdmin
      .from('companies')
      .select('id, name, ats_type, ats_slug');
    if (companiesRes.error) {
      throw new Error(companiesRes.error.message);
    }

    const existingByName = new Map((companiesRes.data ?? []).map((c) => [c.name.toLowerCase(), c]));

    const upserts = companySeeds.map((seed) => ({
      name: seed.name,
      ats_type: seed.atsType ?? null,
      ats_slug: seed.atsSlug ?? null,
      careers_url: seed.careersUrl ?? null,
      company_size: seed.companySize ?? null,
      headquarters: seed.headquarters ?? null,
    }));

    if (upserts.length) {
      const upsertRes = await supabaseAdmin.from('companies').upsert(upserts, { onConflict: 'name' });
      if (upsertRes.error) {
        throw new Error(upsertRes.error.message);
      }
    }

    const updatedCompaniesRes = await supabaseAdmin
      .from('companies')
      .select('id, name, ats_type, ats_slug');
    if (updatedCompaniesRes.error) {
      throw new Error(updatedCompaniesRes.error.message);
    }

    const errors: Array<{ company: string; message: string }> = [];

    for (const company of updatedCompaniesRes.data ?? []) {
      if (!company.ats_type || !company.ats_slug) continue;
      let result;
      try {
        result = await fetchJobsForCompany(company.ats_type, company.ats_slug);
      } catch (err) {
        errors.push({
          company: company.name,
          message: err instanceof Error ? err.message : 'Unknown fetch error',
        });
        continue;
      }
      companiesProcessed += 1;

      for (const job of result.jobs) {
        const normalized = normalizeJob(job, result.source);
        const eligible = isEligible(normalized);
        if (!eligible && !storeAll) continue;
        if (eligible) jobsFound += 1;
        jobsStored += 1;

        const insertPayload = {
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
        };

        const existingRes = await supabaseAdmin
          .from('jobs')
          .select('id')
          .eq('source', normalized.source)
          .eq('source_id', normalized.sourceId)
          .maybeSingle();

        if (existingRes.data) {
          const { found_at: _foundAt, ...updatePayload } = insertPayload;

          await supabaseAdmin
            .from('jobs')
            .update(updatePayload)
            .eq('id', existingRes.data.id);
        } else {
          await supabaseAdmin
            .from('jobs')
            .insert(insertPayload);
        }
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

    return NextResponse.json({ ok: true, companiesProcessed, jobsFound, jobsStored, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (runId) {
      await supabaseAdmin
        .from('ingest_runs')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          companies_processed: companiesProcessed,
          jobs_found: jobsFound,
          error: message,
        })
        .eq('id', runId);
    }

    return NextResponse.json({ error: 'Ingest failed', message }, { status: 500 });
  }
}
