import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { handleZod, ok, serverError } from '@/lib/api';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(['approved', 'rejected', 'waitlisted', 'pending']),
  note: z.string().max(2000).optional(),
});

// Admin: decide on a solver application. Status flip + email notification +
// audit log entry. Idempotent — repeated decisions update reviewed_at.
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const me = await getCurrentUser();

  try {
    const { id, status, note } = schema.parse(await req.json());
    const sb = supabaseAdmin();

    const { data: row, error: readErr } = await sb
      .from('solver_applications')
      .select('id, email, full_name, primary_domain')
      .eq('id', id)
      .single();
    if (readErr || !row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Look up reviewer profile id (the auth user maps to profiles via the trigger)
    const reviewerId = me?.id ?? null;

    const { error: updateErr } = await sb
      .from('solver_applications')
      .update({
        status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: note ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (updateErr) throw updateErr;

    await sb.from('audit_log').insert({
      actor_user_id: reviewerId,
      actor_email: me?.email ?? null,
      action: `solver.${status}`,
      entity_type: 'solver_application',
      entity_id: id,
      diff: { status, note: note ?? null },
    });

    // Fire decision email (skip the 'pending' rollback case)
    if (status === 'approved') {
      void sendEmail({
        to: (row as any).email,
        subject: 'ProblemMarket — solver access granted',
        html: `<p>${esc((row as any).full_name)},</p>
          <p>Your solver application for <strong>${esc((row as any).primary_domain)}</strong> is approved. You can now bid on any open case on the docket.</p>
          <p>Sign in: <a href="https://problemamvp.vercel.app/login">problemamvp.vercel.app/login</a></p>
          <p>— ProblemMarket editorial</p>`,
      });
    } else if (status === 'rejected') {
      void sendEmail({
        to: (row as any).email,
        subject: 'ProblemMarket — solver application decision',
        html: `<p>${esc((row as any).full_name)},</p>
          <p>Thanks for applying. After review we won't be moving forward with your application at this time. We try to be candid: this is not a comment on the quality of your work, only on the fit with currently active cases.</p>
          ${note ? `<p><em>${esc(note)}</em></p>` : ''}
          <p>— ProblemMarket editorial</p>`,
      });
    } else if (status === 'waitlisted') {
      void sendEmail({
        to: (row as any).email,
        subject: 'ProblemMarket — application waitlisted',
        html: `<p>${esc((row as any).full_name)},</p>
          <p>Your solver application is strong but we don't have an immediate case match. We'll reach out when one opens.</p>
          <p>— ProblemMarket editorial</p>`,
      });
    }

    return ok({ id, status });
  } catch (e) {
    return e instanceof Error && e.message.includes('ZodError') ? handleZod(e) : serverError(e);
  }
}

function esc(s: string | null | undefined) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
