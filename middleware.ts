import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Refreshes the Supabase auth cookie on every navigation so server components
// see a fresh session. Skips static assets, the marketing landing, and any
// route that doesn't need auth — keeps the function invocations low.

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  // Only run on protected paths. Static landing (/) is served from public/
  // and never needs the auth cookie.
  const needsAuth = url.pathname.startsWith('/admin')
    || url.pathname.startsWith('/dashboard')
    || url.pathname === '/login'
    || url.pathname.startsWith('/pledge/confirm');
  if (!needsAuth) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(toSet: CookieToSet[]) {
          toSet.forEach(({ name, value, options }: CookieToSet) => res.cookies.set(name, value, options));
        },
      },
    },
  );
  await supabase.auth.getUser();
  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/login', '/pledge/confirm/:path*'],
};
