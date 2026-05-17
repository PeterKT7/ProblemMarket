import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '../env';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Per-request server client that reads the user's session from cookies.
// Use in Server Components, route handlers, and Server Actions.
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet: CookieToSet[]) {
        try {
          toSet.forEach(({ name, value, options }: CookieToSet) => cookieStore.set(name, value, options));
        } catch {
          // setAll called from a Server Component — middleware refreshes the session.
        }
      },
    },
  });
}
