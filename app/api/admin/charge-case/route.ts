import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { isAdmin } from '@/lib/auth';
import { badRequest, handleZod, ok, serverError } from '@/lib/api';

export const runtime = 'nodejs';

const bodySchema = z.object({
  case_id: z.string().uuid(),
  dry_run: z.boolean().optional().default(false),
});

// Admin-only: when a case reaches its activation threshold and the editorial
// team approves, this fans out off-session PaymentIntents against every
// card-on-file pledge in the case. Idempotent on `pledges.charge_id`.
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  try {
    const { case_id, dry_run } = bodySchema.parse(await req.json());
    const sb = supabaseAdmin();

    const { data: caseRow, error: caseErr } = await sb
      .from('cases')
      .select('id, case_no, title, pool_target_cents, pool_current_cents, status')
      .eq('id', case_id)
      .single();
    if (caseErr || !caseRow) return badRequest('case_not_found');

    const { data: pledges, error: pErr } = await sb
      .from('pledges')
      .select('id, amount_cents, stripe_customer_id, stripe_payment_method_id, charge_id, status, pledger_email')
      .eq('case_id', case_id)
      .eq('status', 'card_on_file');
    if (pErr) throw pErr;

    if (dry_run) {
      return ok({
        case_no: caseRow.case_no,
        eligible_pledges: pledges?.length ?? 0,
        total_cents: (pledges ?? []).reduce((s, p) => s + Number(p.amount_cents), 0),
      });
    }

    const results: Array<{ id: string; ok: boolean; error?: string; charge_id?: string }> = [];
    const s = stripe();

    for (const p of pledges ?? []) {
      try {
        if (p.charge_id) {
          results.push({ id: p.id as string, ok: true, charge_id: p.charge_id as string });
          continue;
        }
        if (!p.stripe_customer_id || !p.stripe_payment_method_id) {
          results.push({ id: p.id as string, ok: false, error: 'no_card_on_file' });
          continue;
        }
        const pi = await s.paymentIntents.create({
          amount: Number(p.amount_cents),
          currency: 'usd',
          customer: p.stripe_customer_id as string,
          payment_method: p.stripe_payment_method_id as string,
          off_session: true,
          confirm: true,
          metadata: { pledge_id: p.id as string, case_id, case_no: caseRow.case_no as string },
          description: `ProblemMarket — Case ${caseRow.case_no}: ${caseRow.title}`,
        });
        await sb.from('pledges').update({
          status: 'charged',
          charge_id: pi.id,
          charged_at: new Date().toISOString(),
        }).eq('id', p.id);
        results.push({ id: p.id as string, ok: true, charge_id: pi.id });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown';
        await sb.from('pledges').update({ status: 'failed' }).eq('id', p.id);
        results.push({ id: p.id as string, ok: false, error: msg });
      }
    }

    await sb.from('cases').update({ status: 'funded' }).eq('id', case_id);
    await sb.from('audit_log').insert({
      action: 'charge_case',
      entity_type: 'case',
      entity_id: case_id,
      diff: { results },
    });

    return ok({ case_no: caseRow.case_no, results });
  } catch (e) {
    if (e instanceof Error && e.message.includes('ZodError')) return handleZod(e);
    return serverError(e);
  }
}
