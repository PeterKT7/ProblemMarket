import { Resend } from 'resend';
import { env } from './env';

// Email is best-effort: if RESEND_API_KEY is missing (early-stage launch) we
// silently no-op and just log to the server console. Submissions still save.
let cached: Resend | null = null;

function resendClient(): Resend | null {
  const key = env.resendKey();
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  const client = resendClient();
  if (!client) {
    console.log('[email skipped — no RESEND_API_KEY]', { to: args.to, subject: args.subject });
    return { ok: false, error: 'resend_not_configured' };
  }
  try {
    const res = await client.emails.send({
      from: env.resendFrom(),
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
    });
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true, id: res.data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error('[email error]', msg);
    return { ok: false, error: msg };
  }
}

// Notify admin(s) that something new landed. Cheap operational signal.
export async function notifyAdmin(subject: string, html: string) {
  const admins = env.adminEmails();
  if (admins.length === 0) return;
  await sendEmail({ to: admins, subject: `[PM] ${subject}`, html });
}
