import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const modes = url.searchParams.get('mode');
  const limit = Number(url.searchParams.get('limit') ?? '200');
  const query = url.searchParams.get('q');

  let req = supabaseServer
    .from('jobs')
    .select('id, title, location, work_mode, employment_type, level, pay_min, pay_max, pay_currency, description_snippet, posted_at, found_at, apply_url, company:companies (name, company_size, headquarters)')
    .eq('eligible', true)
    .limit(Math.min(limit, 500))
    .order('posted_at', { ascending: false, nullsFirst: false })
    .order('found_at', { ascending: false });

  if (modes) {
    req = req.in('work_mode', modes.split(',').map((m) => m.trim()));
  }

  if (query) {
    req = req.ilike('title', `%${query}%`);
  }

  const { data, error } = await req;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: data ?? [] });
}
