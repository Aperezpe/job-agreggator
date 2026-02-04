import { NextResponse } from 'next/server';
import { companySeeds } from '@/data/companies';
import { fetchJobsForCompany } from '@/lib/ats';
import { fetchAccentureJobsDebug } from '@/lib/ats/accenture';
import { fetchEightfoldJobsDebug } from '@/lib/ats/eightfold';
import { fetchBaiduJobsDebug } from '@/lib/ats/baidu';

export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
  if (!process.env.DEBUG_SECRET) return true;
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  return secret === process.env.DEBUG_SECRET;
}

function findCompanySeed(name: string) {
  const needle = name.trim().toLowerCase();
  return companySeeds.find((seed) => seed.name.toLowerCase() === needle);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const name = url.searchParams.get('name') ?? url.searchParams.get('company');
  const debug = url.searchParams.get('debug') === '1';
  let atsType = url.searchParams.get('atsType') ?? url.searchParams.get('ats_type') ?? undefined;
  let atsSlug = url.searchParams.get('atsSlug') ?? url.searchParams.get('ats_slug') ?? undefined;

  let companyName: string | undefined;
  if (name) {
    const seed = findCompanySeed(name);
    if (!seed) {
      return NextResponse.json({ error: 'Company not found in seeds', name }, { status: 404 });
    }
    companyName = seed.name;
    atsType = atsType ?? seed.atsType ?? undefined;
    atsSlug = atsSlug ?? seed.atsSlug ?? undefined;
  }

  if (!atsType || !atsSlug) {
    return NextResponse.json(
      { error: 'Missing atsType/atsSlug', name: companyName ?? name ?? null, atsType, atsSlug },
      { status: 400 }
    );
  }

  if (debug && atsType === 'accenture') {
    const { result, debug: meta } = await fetchAccentureJobsDebug({ atsSlug });
    return NextResponse.json({
      company: companyName ?? name ?? null,
      atsType,
      atsSlug,
      source: result.source,
      count: result.jobs.length,
      debug: meta,
      jobs: result.jobs,
    });
  }
  if (debug && atsType === 'eightfold') {
    const { result, debug: meta } = await fetchEightfoldJobsDebug({ atsSlug });
    return NextResponse.json({
      company: companyName ?? name ?? null,
      atsType,
      atsSlug,
      source: result.source,
      count: result.jobs.length,
      debug: meta,
      jobs: result.jobs,
    });
  }
  if (debug && atsType === 'baidu') {
    const { result, debug: meta } = await fetchBaiduJobsDebug({ atsSlug });
    return NextResponse.json({
      company: companyName ?? name ?? null,
      atsType,
      atsSlug,
      source: result.source,
      count: result.jobs.length,
      debug: meta,
      jobs: result.jobs,
    });
  }

  const result = await fetchJobsForCompany(atsType, atsSlug);
  return NextResponse.json({
    company: companyName ?? name ?? null,
    atsType,
    atsSlug,
    source: result.source,
    count: result.jobs.length,
    jobs: result.jobs,
  });
}
