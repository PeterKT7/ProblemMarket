'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // If we land here with a session already established (e.g. magic-link hash
  // tokens auto-processed by supabase-js on init, or a returning user),
  // bounce to /dashboard. This is what makes admin-generated implicit-flow
  // links work — the hash is parsed client-side, session cookies are written,
  // and we redirect to the authenticated area.
  //
  // Also surface expired/invalid magic-link errors that arrive in the URL
  // hash (Supabase puts them there on `verify` failure). Without this, the
  // unhandled rejection from supabase-js triggers Next.js's red-screen
  // "Application error" overlay and the user thinks the site is broken.
  useEffect(() => {
    try {
      const hash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(hash);
      const err = params.get('error_description') || params.get('error');
      if (err) {
        setError(decodeURIComponent(err).replace(/\+/g, ' '));
        // Clear the hash so the error doesn't survive a refresh.
        history.replaceState(null, '', window.location.pathname + window.location.search);
        return;
      }
    } catch { /* ignore — best-effort */ }

    const sb = supabaseBrowser();
    sb.auth.getSession()
      .then(({ data }) => {
        if (data.session) {
          const next = new URLSearchParams(window.location.search).get('next') || '/dashboard';
          window.location.replace(next);
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'session_read_failed');
      });
  }, []);

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
