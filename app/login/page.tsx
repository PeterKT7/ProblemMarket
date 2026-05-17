'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  }

  return (
    <main className="shell-narrow">
      <div className="mono" style={{ marginBottom: 8 }}>SIGN IN</div>
      <h1>ProblemMarket</h1>
      <p style={{ color: 'var(--ink-soft)' }}>
        Sign in to manage your pledges, your solver application, or — if you're staff — the docket.
        We'll email you a one-time link.
      </p>

      {status === 'sent' ? (
        <div className="notice">
          ✓ Check <strong>{email}</strong> for a sign-in link. It expires in 1 hour.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card">
          <label className="field">
            <span>Work email</span>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
            />
          </label>
          <button className="btn" type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Send sign-in link →'}
          </button>
          {error && <p style={{ color: 'var(--signal)', marginTop: 12 }}>{error}</p>}
        </form>
      )}

      <p style={{ marginTop: 24, fontSize: 13, color: 'var(--ink-soft)' }}>
        <a href="/">← Back to the docket</a>
      </p>
    </main>
  );
}
