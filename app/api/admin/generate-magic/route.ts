import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Convenience endpoint for the operator: hit /api/admin/generate-magic?email=...&key=SERVICE_ROLE
// and get back the prod-safe magic link to share or self-use.
//
// Gated by service-role key (so it can't be hit by random visitors). This is
// strictly an admin emergency-access tool; normal users sign in via /login →
// Supabase email pipeline.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get('email');
  const key = url.searchParams.get('key') ?? req.headers.get('x-admin-key');

  if (!email) {
    return NextResponse.json({ error: 'email_required' }, { status: 400 });
  }

  // Compare against service-role key (only the operator has this).
  if (key !== env.supabaseServiceKey()) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const res = await fetch(`${env.supabaseUrl()}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'apikey': env.supabaseServiceKey(),
      'Authorization': `Bearer ${env.supabaseServiceKey()}`,
    },
    body: JSON.stringify({ type: 'magiclink', email }),
  });

  const json = await res.json();
  if (!res.ok || !json.hashed_token) {
    return NextResponse.json({ error: 'generate_failed', details: json }, { status: 500 });
  }

  const magicUrl = `${env.siteUrl()}/api/auth/magic?token_hash=${json.hashed_token}`;
  return NextResponse.json({ url: magicUrl, expires_in: '1 hour, single-use' });
}
