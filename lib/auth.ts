import { supabaseServer } from './supabase/server';
import { env } from './env';

export async function getCurrentUser() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user?.email) return false;
  return env.adminEmails().includes(user.email.toLowerCase());
}

export async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Response('Forbidden', { status: 403 });
  }
}
