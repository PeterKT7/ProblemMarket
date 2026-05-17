import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { captureRequestMeta, gateRateLimit, handleZod, ok } from '@/lib/api';
import { notifyAdmin, sendEmail } from '@/lib/email';

export const runtime = 'nodejs';

const solverSchema = z.object({
  full_name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  primary_domain: z.string().min(1).max(200),
  entity_type: z.enum(['individual', 'syndicate', 'lab']),
  credentials_md: z.string().min(10).max(4000),
  links: z.array(z.object({ label: z.string().max(100), url: z.string().url().max(500) })).optional(),
  utm: z.record(z.string()).optional(),
});

export async function POST(req: Request) {
  const limited = gateRateLimit(req, 'solver');
  if (limited) return limited;

  try {
    const body = await req.json();
    const data = solverSchema.parse(body);
    const meta = captureRequestMeta(req);

    const { data: row, error } = await supabaseAdmin()
      .from('solver_applications')
      .insert({
        full_name: data.full_name,
        email: data.email,
        primary_domain: data.primary_domain,
        entity_type: data.entity_type,
        credentials_md: data.credentials_md,
        links: data.links ?? null,
        utm: data.utm ?? null,
        ip_address: meta.ip_address,
        user_agent: meta.user_agent,
      })
      .select('id')
      .single();

    if (error) throw error;

    void sendEmail({
      to: data.email,
      subject: 'ProblemMarket — solver application received',
      html: `<p>${escapeHtml(data.full_name)},</p>
        <p>Your solver application is in. We verify credentials manually — expect a response within 3–5 business days.</p>
        <p>If approved, you'll get docket access and the option to bid on any open case.</p>
        <p>— ProblemMarket</p>`,
    });

    void notifyAdmin(
      `New solver — ${data.primary_domain} (${data.entity_type})`,
      `<p><strong>${escapeHtml(data.full_name)}</strong> (${escapeHtml(data.email)})</p>
       <p><strong>Domain:</strong> ${escapeHtml(data.primary_domain)}</p>
       <p><strong>Type:</strong> ${data.entity_type}</p>
       <p><strong>Credentials:</strong></p>
       <blockquote>${escapeHtml(data.credentials_md)}</blockquote>`,
    );

    return ok({ id: row.id });
  } catch (e) {
    return handleZod(e);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
