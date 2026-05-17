import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// Public read of the docket. The static index.html can fetch this to hydrate
// live pool / status numbers without breaking the design.
export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from('cases')
    .select('case_no, slug, title, sponsor_label, one_liner, bounty_amount_cents, pool_target_cents, pool_current_cents, deadline, status, featured')
    .neq('status', 'draft')
    .order('featured', { ascending: false })
    .order('case_no', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cases: data ?? [] }, {
    headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=120' },
  });
}
