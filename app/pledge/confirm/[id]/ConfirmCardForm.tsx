'use client';

import { useEffect, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}

export default function ConfirmCardForm({ pledgeId, email, amountCents }: { pledgeId: string; email: string; amountCents: number }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/pledge/setup-intent', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ pledge_id: pledgeId, email }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'setup_failed');
        if (!cancelled) setClientSecret(json.client_secret);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'failed');
      }
    })();
    return () => { cancelled = true; };
  }, [pledgeId, email]);

  if (error) return <div className="notice">Error: {error}</div>;
  if (!clientSecret) return <p style={{ color: 'var(--ink-soft)' }}>Loading secure card form…</p>;

  return (
    <Elements stripe={getStripe()} options={{ clientSecret, appearance: { theme: 'flat' } }}>
      <InnerForm pledgeId={pledgeId} amountCents={amountCents} />
    </Elements>
  );
}

function InnerForm({ pledgeId, amountCents }: { pledgeId: string; amountCents: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: `${window.location.origin}/pledge/confirm/${pledgeId}` },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'card_declined');
      setSubmitting(false);
      return;
    }

    if (setupIntent?.status === 'succeeded') {
      await fetch('/api/pledge/finalize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pledge_id: pledgeId, setup_intent_id: setupIntent.id }),
      });
      window.location.reload();
    }
  }

  return (
    <form onSubmit={onSubmit} className="card">
      <PaymentElement />
      <button className="btn" type="submit" disabled={!stripe || submitting} style={{ marginTop: 16 }}>
        {submitting ? 'Securing…' : `Authorize $${(amountCents / 100).toLocaleString()} (no charge today) →`}
      </button>
      {error && <p style={{ color: 'var(--signal)', marginTop: 12 }}>{error}</p>}
      <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 12 }}>
        Powered by Stripe. We never see your card details. You will be charged only on threshold activation.
      </p>
    </form>
  );
}
