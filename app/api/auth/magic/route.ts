import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-side magic-link completion. Bypasses the
// supabase.co → vercel.app#access_token=... implicit flow that gets blocked
// by Safari Private, Brave's shields, uBlock, and various corporate proxies.
//
// Flow:
//   1. Admin endpoint generates a hashed_token (see /api/admin/generate-magic).
//   2. User clicks https://problemamvp.vercel.app/api/auth/magic?token_hash=XXX
//   3. We call supabase.auth.verifyOtp server-side. The @supabase/ssr server
//      client writes session cookies on the outgoing redirect response.
//   4. Redirect to /dashboard. User is logged in. No browser-side supabase
//      calls happen during the sign-in.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get('token_hash');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (!tokenHash) {
    return NextResponse.redirect(new URL('/login?error=missing_token', env.siteUrl()));
  }

  const sb = await supabaseServer();
  const { error } = await sb.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, env.siteUrl()),
    );
  }

  return NextResponse.redirect(new URL(next, env.siteUrl()));
}
