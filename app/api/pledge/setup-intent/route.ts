import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { badRequest, handleZod, ok, serverError } from '@/lib/api';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

const bodySchema = z.object({
  pledge_id: z.string().uuid(),
  email: z.string().email(),
});

// Create (or reuse) a Stripe Customer + SetupIntent for an existing pledge row.
// Returns a client_secret the browser uses with Stripe Elements to capture
// the card without charging it. The pledge stays at status='pending' until
// the SetupIntent succeeds, then the webhook (or /api/pledge/finalize) flips it
// to 'card_on_file'.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pledge_id, email } = bodySchema.parse(body);
    const sb = supabaseAdmin();

    const { data: pledge, error } = await sb
      .from('pledges')
      .select('id, pledger_email, pledger_name, amount_cents, stripe_customer_id, stripe_setup_intent_id, status')
      .eq('id', pledge_id)
      .single();

    if (error || !pledge) return badRequest('pledge_not_found');
    if (String(pledge.pledger_email).toLowerCase() !== email.toLowerCase()) {
      return badRequest('email_mismatch');
    }
    if (pledge.status === 'charged' || pledge.status === 'refunded' || pledge.status === 'cancelled') {
      return badRequest('pledge_not_actionable');
    }

    const s = stripe();

    let customerId = pledge.stripe_customer_id as string | null;
    if (!customerId) {
      const cust = await s.customers.create({
        email: pledge.pledger_email as string,
        name: pledge.pledger_name as string,
        metadata: { pledge_id: pledge.id as string },
      });
      customerId = cust.id;
    }

    const setupIntent = await s.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      payment_method_types: ['card'],
      metadata: { pledge_id: pledge.id as string },
    });

    await sb
      .from('pledges')
      .update({
        stripe_customer_id: customerId,
        stripe_setup_intent_id: setupIntent.id,
      })
      .eq('id', pledge.id);

    return ok({
      client_secret: setupIntent.client_secret,
      customer_id: customerId,
      amount_cents: pledge.amount_cents,
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes('ZodError')) return handleZod(e);
    return serverError(e);
  }
}
