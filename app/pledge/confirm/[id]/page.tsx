import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import ConfirmCardForm from './ConfirmCardForm';

export const dynamic = 'force-dynamic';

export default async function PledgeConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('pledges')
    .select('id, case_no_snapshot, pledger_name, pledger_email, amount_cents, status, stripe_payment_method_id')
    .eq('id', id)
    .single();

  if (!data) notFound();
  const pledge = data as any;

  if (pledge.status === 'card_on_file' || pledge.status === 'charged' || pledge.stripe_payment_method_id) {
    return (
      <main className="shell-narrow">
        <div className="mono">PLEDGE CONFIRMED</div>
        <h1>Your card is on file.</h1>
        <p>You pledged <strong>${(Number(pledge.amount_cents) / 100).toLocaleString()}</strong> on Case {pledge.case_no_snapshot ?? '—'}.</p>
        <p>You'll be charged only if the pool reaches activation threshold. If it doesn't, you'll receive a 6% bonus on your committed amount.</p>
        <p><a href="/dashboard">→ Your dashboard</a></p>
      </main>
    );
  }

  return (
    <main className="shell-narrow">
      <div className="mono">SECURE YOUR PLEDGE — STEP 2</div>
      <h1>Add a card on file.</h1>
      <p>You pledged <strong>${(Number(pledge.amount_cents) / 100).toLocaleString()}</strong> on Case {pledge.case_no_snapshot ?? '—'}. No money is taken now. Your card is only charged if the pool hits its activation threshold.</p>
      <ConfirmCardForm
        pledgeId={pledge.id as string}
        email={pledge.pledger_email as string}
        amountCents={Number(pledge.amount_cents)}
      />
    </main>
  );
}
