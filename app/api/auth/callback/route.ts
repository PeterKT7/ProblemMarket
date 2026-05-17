import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

// Magic-link / OAuth callback. Supabase redirects here with ?code=...
// We exchange the code for a session cookie, then bounce to ?next= or /dashboard.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, env.siteUrl()));
    }
  }
  return NextResponse.redirect(new URL(next, env.siteUrl()));
}
