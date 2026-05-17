import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { handleZod, ok, serverError } from '@/lib/api';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(['new', 'interviewing', 'accepted', 'revise', 'declined']),
  note: z.string().max(2000).optional(),
});

// Admin: decide on an intake submission (incoming problem from a sponsor).
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const me = await getCurrentUser();

  try {
    const { id, status, note } = schema.parse(await req.json());
    const sb = supabaseAdmin();

    const { data: row, error: readErr } = await sb
      .from('intake_submissions')
      .select('id, email, full_name, organisation, problem_statement')
      .eq('id', id)
      .single();
    if (readErr || !row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const reviewerId = me?.id ?? null;

    const { error: updateErr } = await sb
      .from('intake_submissions')
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
      action: `intake.${status}`,
      entity_type: 'intake_submission',
      entity_id: id,
      diff: { status, note: note ?? null },
    });

    const r = row as any;

    if (status === 'interviewing') {
      void sendEmail({
        to: r.email,
        subject: 'ProblemMarket — moving to intake interview',
        html: `<p>${esc(r.full_name)},</p>
          <p>Your problem submission for <strong>${esc(r.organisation)}</strong> passed initial screen. We'd like to schedule a structured two-hour interview to find the actual bottleneck.</p>
          <p>Reply with two or three windows that work in the next 5 business days.</p>
          ${note ? `<p><em>${esc(note)}</em></p>` : ''}
          <p>— ProblemMarket editorial</p>`,
      });
    } else if (status === 'accepted') {
      void sendEmail({
        to: r.email,
        subject: 'ProblemMarket — accepted to the docket',
        html: `<p>${esc(r.full_name)},</p>
          <p><strong>${esc(r.organisation)}</strong>'s problem is accepted. We'll work with you to write the case brief, set success criteria, and assemble the judging panel. Median time from here to live listing: 11 days.</p>
          ${note ? `<p><em>${esc(note)}</em></p>` : ''}
          <p>— ProblemMarket editorial</p>`,
      });
    } else if (status === 'revise') {
      void sendEmail({
        to: r.email,
        subject: 'ProblemMarket — revise and resubmit',
        html: `<p>${esc(r.full_name)},</p>
          <p>Your submission is close but needs sharpening before it can pass intake. ${note ? `Specifically: <em>${esc(note)}</em>` : "Reply to this email and we'll set up a 30-minute call to walk through what would make this submittable."}</p>
          <p>— ProblemMarket editorial</p>`,
      });
    } else if (status === 'declined') {
      void sendEmail({
        to: r.email,
        subject: 'ProblemMarket — submission decision',
        html: `<p>${esc(r.full_name)},</p>
          <p>Thanks for submitting <strong>${esc(r.organisation)}</strong>'s problem. After review we won't be listing it on the docket. The 93% decline rate at this stage is our quality bar, not a comment on your problem.</p>
          ${note ? `<p><em>${esc(note)}</em></p>` : ''}
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
