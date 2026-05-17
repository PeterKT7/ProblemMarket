import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { badRequest, handleZod, ok, serverError } from '@/lib/api';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

const bodySchema = z.object({
  pledge_id: z.string().uuid(),
  setup_intent_id: z.string(),
});

// Called by the /pledge/confirm/[id] page after Stripe Elements reports success.
// We re-verify with the Stripe API rather than trust the client, then mark the
// pledge as card-on-file. The webhook does the same thing — defense in depth.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pledge_id, setup_intent_id } = bodySchema.parse(body);
    const sb = supabaseAdmin();

    const si = await stripe().setupIntents.retrieve(setup_intent_id);
    if (si.status !== 'succeeded') return badRequest('setup_intent_not_succeeded');
    if (!si.payment_method) return badRequest('no_payment_method');
    if (si.metadata?.pledge_id !== pledge_id) return badRequest('pledge_mismatch');

    const pmId = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method.id;

    const { error } = await sb
      .from('pledges')
      .update({
        stripe_payment_method_id: pmId,
        status: 'card_on_file',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pledge_id);

    if (error) throw error;
    return ok({});
  } catch (e) {
    if (e instanceof Error && e.message.includes('ZodError')) return handleZod(e);
    return serverError(e);
  }
}
