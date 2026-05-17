import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { captureRequestMeta, gateRateLimit, handleZod, ok } from '@/lib/api';
import { notifyAdmin, sendEmail } from '@/lib/email';

export const runtime = 'nodejs';

const intakeSchema = z.object({
  full_name: z.string().min(1).max(200),
  organisation: z.string().min(1).max(200),
  email: z.string().email().max(200),
  problem_statement: z.string().min(10).max(4000),
  estimated_value: z.string().max(500).optional().nullable(),
  utm: z.record(z.string()).optional(),
});

export async function POST(req: Request) {
  const limited = gateRateLimit(req, 'intake');
  if (limited) return limited;

  try {
    const body = await req.json();
    const data = intakeSchema.parse(body);
    const meta = captureRequestMeta(req);

    const { data: row, error } = await supabaseAdmin()
      .from('intake_submissions')
      .insert({
        full_name: data.full_name,
        organisation: data.organisation,
        email: data.email,
        problem_statement: data.problem_statement,
        estimated_value: data.estimated_value ?? null,
        utm: data.utm ?? null,
        ip_address: meta.ip_address,
        user_agent: meta.user_agent,
      })
      .select('id')
      .single();

    if (error) throw error;

    // Fire-and-forget: confirmation to sponsor + ping to admin.
    void sendEmail({
      to: data.email,
      subject: 'ProblemMarket — intake received',
      html: `<p>${escapeHtml(data.full_name)},</p>
        <p>Thanks for submitting <em>${escapeHtml(data.organisation)}</em>'s problem to ProblemMarket. We review every submission within 48 hours and respond with a go / no-go on the intake interview.</p>
        <p>About 60% of submissions don't make it past initial screening. We'll be candid either way.</p>
        <p>— ProblemMarket editorial</p>`,
    });

    void notifyAdmin(
      `New intake — ${data.organisation}`,
      `<p><strong>${escapeHtml(data.full_name)}</strong> (${escapeHtml(data.email)}) from <strong>${escapeHtml(data.organisation)}</strong></p>
       <p><strong>Estimated value:</strong> ${escapeHtml(data.estimated_value ?? '—')}</p>
       <p><strong>Problem:</strong></p>
       <blockquote>${escapeHtml(data.problem_statement)}</blockquote>`,
    );

    return ok({ id: row.id });
  } catch (e) {
    return handleZod(e);
  }
}

function escapeHtml(s: string | null | undefined) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
