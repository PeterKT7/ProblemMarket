import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { captureRequestMeta, gateRateLimit, handleZod, ok, badRequest } from '@/lib/api';
import { notifyAdmin, sendEmail } from '@/lib/email';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

const pledgeSchema = z.object({
  case_no: z.string().min(1).max(20).optional(),
  case_id: z.string().uuid().optional(),
  pledger_name: z.string().min(1).max(200),
  pledger_email: z.string().email().max(200),
  pledger_org: z.string().max(200).optional().nullable(),
  amount_usd: z.number().int().min(5000).max(50_000_000), // $5K – $50M
  agree: z.literal(true),
  utm: z.record(z.string()).optional(),
});

export async function POST(req: Request) {
  const limited = gateRateLimit(req, 'pledge');
  if (limited) return limited;

  try {
    const body = await req.json();
    const data = pledgeSchema.parse(body);
    const meta = captureRequestMeta(req);
    const sb = supabaseAdmin();

    // Resolve the case by case_no or case_id (case_no is what the static HTML knows).
    let caseId: string | null = null;
    let caseNoSnapshot: string | null = null;
    if (data.case_id) {
      caseId = data.case_id;
    } else if (data.case_no) {
      const { data: c } = await sb.from('cases').select('id, case_no').eq('case_no', data.case_no).single();
      if (c) { caseId = c.id as string; caseNoSnapshot = c.case_no as string; }
      else { caseNoSnapshot = data.case_no; }
    }

    const { data: row, error } = await sb
      .from('pledges')
      .insert({
        case_id: caseId,
        case_no_snapshot: caseNoSnapshot,
        pledger_name: data.pledger_name,
        pledger_email: data.pledger_email,
        pledger_org: data.pledger_org ?? null,
        amount_cents: data.amount_usd * 100,
        status: 'pending',
        utm: data.utm ?? null,
        ip_address: meta.ip_address,
        user_agent: meta.user_agent,
      })
      .select('id, case_no_snapshot')
      .single();

    if (error) throw error;

    // Token for the optional "secure your card" follow-up. Using the pledge id
    // directly is fine — it's a uuid and the confirm route revalidates email.
    const confirmUrl = `${env.siteUrl()}/pledge/confirm/${row.id}`;
    const amountUsd = data.amount_usd.toLocaleString('en-US');

    void sendEmail({
      to: data.pledger_email,
      subject: `ProblemMarket — pledge registered ($${amountUsd})`,
      html: `<p>${escape(data.pledger_name)},</p>
        <p>Your pledge of <strong>$${amountUsd}</strong> on Case ${escape(caseNoSnapshot ?? '—')} is registered as <strong>intent</strong>. No money has moved.</p>
        <p>If you'd like to secure your pledge with a card on file (recommended — required once the pool reaches activation threshold), use this private link:</p>
        <p><a href="${confirmUrl}">${confirmUrl}</a></p>
        <p>If the pool fails to reach threshold, your card is never charged and you'll receive a 6% bonus on your committed amount per the dominant assurance contract.</p>
        <p>— ProblemMarket</p>`,
    });

    void notifyAdmin(
      `Pledge $${amountUsd} on Case ${caseNoSnapshot ?? '—'}`,
      `<p><strong>${escape(data.pledger_name)}</strong> (${escape(data.pledger_email)})${data.pledger_org ? ' — ' + escape(data.pledger_org) : ''}</p>
       <p><strong>Amount:</strong> $${amountUsd}</p>
       <p><strong>Case:</strong> ${escape(caseNoSnapshot ?? '—')}</p>
       <p><a href="${confirmUrl}">Confirm link</a></p>`,
    );

    return ok({ id: row.id, confirm_url: confirmUrl });
  } catch (e) {
    return handleZod(e);
  }
}

function escape(s: string | null | undefined) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
