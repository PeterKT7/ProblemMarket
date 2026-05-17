'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Case = {
  id: string;
  case_no: string;
  title: string;
  one_liner: string | null;
  sponsor_label: string | null;
  brief_md: string | null;
  success_criteria_md: string | null;
  ruled_out_md: string | null;
  what_sponsors_provide_md: string | null;
  bounty_amount_cents: number;
  pool_target_cents: number;
  deadline: string | null;
  status: string;
  featured: boolean;
};

const STATUSES = ['draft', 'open', 'funded', 'dispatched', 'adjudicated', 'refunded', 'cancelled'] as const;

export function CaseEditButton({ row }: { row: Case }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          padding: '4px 8px',
          border: '1px solid var(--ink)',
          background: 'transparent',
          color: 'var(--ink)',
          borderRadius: 2,
          cursor: 'pointer',
        }}
      >
        Edit
      </button>
      {open && <CaseEditorModal row={row} onClose={() => setOpen(false)} />}
    </>
  );
}

function CaseEditorModal({ row, onClose }: { row: Case; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    title: row.title,
    one_liner: row.one_liner ?? '',
    sponsor_label: row.sponsor_label ?? '',
    brief_md: row.brief_md ?? '',
    success_criteria_md: row.success_criteria_md ?? '',
    ruled_out_md: row.ruled_out_md ?? '',
    what_sponsors_provide_md: row.what_sponsors_provide_md ?? '',
    bounty_amount_dollars: Math.round(row.bounty_amount_cents / 100),
    pool_target_dollars: Math.round(row.pool_target_cents / 100),
    deadline: row.deadline ?? '',
    status: row.status,
    featured: row.featured,
  });

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const patch: Record<string, unknown> = {
        title: f.title,
        one_liner: f.one_liner || null,
        sponsor_label: f.sponsor_label || null,
        brief_md: f.brief_md || null,
        success_criteria_md: f.success_criteria_md || null,
        ruled_out_md: f.ruled_out_md || null,
        what_sponsors_provide_md: f.what_sponsors_provide_md || null,
        bounty_amount_cents: f.bounty_amount_dollars * 100,
        pool_target_cents: f.pool_target_dollars * 100,
        deadline: f.deadline || null,
        status: f.status,
        featured: f.featured,
      };
      const res = await fetch('/api/admin/case', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: row.id, patch }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'save_failed');
      }
      setSaved(true);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 16px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: 'var(--paper)',
          maxWidth: 760,
          width: '100%',
          padding: 32,
          borderRadius: 4,
          border: '1px solid var(--rule)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Edit Case {row.case_no}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--ink-soft)' }}>×</button>
        </div>
        <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 0 }}>
          Saves go live immediately at <a href={`/cases/${row.case_no}`} target="_blank" rel="noopener">/cases/{row.case_no}</a>.
        </p>

        <Field label="Title">
          <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="One-liner (subtitle on case page)">
          <input className="input" value={f.one_liner} onChange={(e) => setF({ ...f, one_liner: e.target.value })} />
        </Field>
        <Field label="Sponsor label (publicly displayed)">
          <input className="input" value={f.sponsor_label} onChange={(e) => setF({ ...f, sponsor_label: e.target.value })} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <Field label="Bounty ($)">
            <input className="input" type="number" min={0} value={f.bounty_amount_dollars} onChange={(e) => setF({ ...f, bounty_amount_dollars: Number(e.target.value) })} />
          </Field>
          <Field label="Pool target ($)">
            <input className="input" type="number" min={0} value={f.pool_target_dollars} onChange={(e) => setF({ ...f, pool_target_dollars: Number(e.target.value) })} />
          </Field>
          <Field label="Deadline (YYYY-MM-DD)">
            <input className="input" value={f.deadline} placeholder="2027-04-08" onChange={(e) => setF({ ...f, deadline: e.target.value })} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <Field label="Status">
            <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Featured">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, fontSize: 14 }}>
              <input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} />
              Highlight as the lead case
            </label>
          </Field>
        </div>

        <Field label="Brief (markdown — bold with **text**, paragraphs separated by blank lines)">
          <textarea className="input" rows={8} value={f.brief_md} onChange={(e) => setF({ ...f, brief_md: e.target.value })} />
        </Field>
        <Field label="Success criteria (markdown — use - for bullets)">
          <textarea className="input" rows={5} value={f.success_criteria_md} onChange={(e) => setF({ ...f, success_criteria_md: e.target.value })} />
        </Field>
        <Field label="Ruled out (markdown — use - for bullets)">
          <textarea className="input" rows={4} value={f.ruled_out_md} onChange={(e) => setF({ ...f, ruled_out_md: e.target.value })} />
        </Field>
        <Field label="What sponsors provide (markdown — use - for bullets)">
          <textarea className="input" rows={4} value={f.what_sponsors_provide_md} onChange={(e) => setF({ ...f, what_sponsors_provide_md: e.target.value })} />
        </Field>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 24 }}>
          <button className="btn" onClick={save} disabled={saving || pending}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          {saved && <span style={{ color: '#1b6c2c', fontSize: 13 }}>✓ Saved · live now</span>}
          {error && <span style={{ color: 'var(--signal)', fontSize: 13 }}>{error}</span>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
