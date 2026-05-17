'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Kind = 'solver' | 'intake';
type Status = string;

const SOLVER_OPTIONS: { label: string; status: Status; tone: 'approve' | 'reject' | 'neutral' }[] = [
  { label: 'Approve', status: 'approved', tone: 'approve' },
  { label: 'Waitlist', status: 'waitlisted', tone: 'neutral' },
  { label: 'Reject', status: 'rejected', tone: 'reject' },
];

const INTAKE_OPTIONS: { label: string; status: Status; tone: 'approve' | 'reject' | 'neutral' }[] = [
  { label: 'Interview', status: 'interviewing', tone: 'neutral' },
  { label: 'Accept', status: 'accepted', tone: 'approve' },
  { label: 'Revise', status: 'revise', tone: 'neutral' },
  { label: 'Decline', status: 'declined', tone: 'reject' },
];

export function DecisionButtons({ kind, id, current }: { kind: Kind; id: string; current: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = kind === 'solver' ? SOLVER_OPTIONS : INTAKE_OPTIONS;
  const endpoint = kind === 'solver' ? '/api/admin/solver' : '/api/admin/intake';

  async function decide(status: Status) {
    setBusy(status);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'decision_failed');
      }
      // Optimistic — also trigger server data refresh
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {options.map((opt) => {
        const active = current === opt.status;
        const color = opt.tone === 'approve' ? '#1b6c2c' : opt.tone === 'reject' ? '#9c2c1f' : '#4a4a4a';
        return (
          <button
            key={opt.status}
            disabled={busy !== null || pending || active}
            onClick={() => decide(opt.status)}
            title={active ? 'Current status' : `Set status: ${opt.status}`}
            style={{
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '4px 8px',
              border: '1px solid ' + color,
              background: active ? color : 'transparent',
              color: active ? 'white' : color,
              borderRadius: 2,
              cursor: active ? 'default' : 'pointer',
              opacity: busy === opt.status ? 0.5 : 1,
            }}
          >
            {busy === opt.status ? '…' : opt.label}
          </button>
        );
      })}
      {error && <span style={{ color: '#9c2c1f', fontSize: 11 }}>{error}</span>}
    </div>
  );
}
