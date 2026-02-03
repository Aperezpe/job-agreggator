import { NextResponse } from 'next/server';
import { normalizeJob, isEligible } from '@/lib/jobs';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { RawJob } from '@/lib/ats/types';

export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

function toRawJob(row: any): RawJob {
  const raw = row.raw ?? {};
  return {
    id: String(raw.id ?? row.source_id ?? row.id),
    title: raw.title ?? row.title ?? 'Untitled',
    location: raw.location ?? row.location ?? undefined,
    description: raw.description ?? raw.content ?? undefined,
    applyUrl: raw.applyUrl ?? row.apply_url ?? '',
    postedAt: raw.postedAt ?? row.posted_at ?? undefined,
    employmentType: raw.employmentType ?? row.employment_type ?? undefined,
    salaryText: raw.salaryText ?? undefined,
    department: raw.department ?? undefined,
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const batchSize = Math.min(Number(url.searchParams.get('limit') ?? '500'), 1000);

  let updated = 0;
  let processed = 0;
  let offset = 0;

  try {
    while (true) {
      const { data, error } = await supabaseAdmin
        .from('jobs')
        .select('id, company_id, title, location, apply_url, source, source_id, employment_type, level, pay_min, pay_max, pay_currency, description_snippet, posted_at, found_at, raw')
        .order('created_at', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) break;

      const updates = data.map((row) => {
        const rawJob = toRawJob(row);
        const normalized = normalizeJob(rawJob, row.source);
        const eligible = isEligible(normalized);
        processed += 1;

        return {
          id: row.id,
          company_id: row.company_id,
          title: row.title ?? normalized.title,
          apply_url: row.apply_url ?? normalized.applyUrl,
          source: row.source ?? normalized.source,
          source_id: row.source_id ?? normalized.sourceId,
          work_mode: normalized.workMode,
          employment_type: normalized.employmentType ?? null,
          level: normalized.level ?? null,
          pay_min: normalized.payMin ?? null,
          pay_max: normalized.payMax ?? null,
          pay_currency: normalized.payCurrency ?? null,
          description_snippet: normalized.descriptionSnippet ?? null,
          posted_at: normalized.postedAt ?? row.posted_at ?? null,
          eligible,
          found_at: row.found_at ?? normalized.foundAt,
        };
      });

      const { error: upsertError } = await supabaseAdmin.from('jobs').upsert(updates, { onConflict: 'id' });
      if (upsertError) {
        throw new Error(upsertError.message);
      }

      updated += updates.length;
      offset += batchSize;
    }

    return NextResponse.json({ ok: true, processed, updated });
  } catch (err) {
    return NextResponse.json(
      { error: 'Backfill failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
