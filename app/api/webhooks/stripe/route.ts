import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// We accept the webhook even if STRIPE_WEBHOOK_SECRET isn't set yet (local dev
// before you've run `stripe listen`), but with no signature verification the
// route only logs and returns 200 — it won't touch the DB.

export async function POST(req: Request) {
  const secret = env.stripeWebhookSecret();
  const sig = req.headers.get('stripe-signature');
  const raw = await req.text();

  let event: Stripe.Event;
  if (secret && sig) {
    try {
      event = stripe().webhooks.constructEvent(raw, sig, secret);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'bad_sig';
      return NextResponse.json({ error: `webhook_signature_invalid: ${msg}` }, { status: 400 });
    }
  } else {
    console.warn('[stripe webhook] missing secret or signature — ignoring payload');
    return NextResponse.json({ ok: true, ignored: true });
  }

  const sb = supabaseAdmin();

  try {
    switch (event.type) {
      case 'setup_intent.succeeded': {
        const si = event.data.object as Stripe.SetupIntent;
        const pledgeId = si.metadata?.pledge_id;
        const pmId = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method?.id;
        if (pledgeId && pmId) {
          await sb.from('pledges').update({
            stripe_payment_method_id: pmId,
            status: 'card_on_file',
          }).eq('id', pledgeId);
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const pledgeId = pi.metadata?.pledge_id;
        if (pledgeId) {
          await sb.from('pledges').update({
            status: 'charged',
            charge_id: pi.id,
            charged_at: new Date().toISOString(),
          }).eq('id', pledgeId);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const pledgeId = pi.metadata?.pledge_id;
        if (pledgeId) {
          await sb.from('pledges').update({ status: 'failed' } as any).eq('id', pledgeId);
        }
        break;
      }
      default:
        // ignore — we only act on what we care about
        break;
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('[stripe webhook handler]', e);
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }
}
