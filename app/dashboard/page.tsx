import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/auth';
import { SignOutButton } from './SignOutButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');

  // Pull pledges + solver app + intake submissions tied to this email so the
  // dashboard works even before sign-in (when rows are written anonymously).
  const admin = supabaseAdmin();
  const email = user.email!;
  const [pledgesRes, solverRes, intakeRes] = await Promise.all([
    admin.from('pledges').select('id, case_no_snapshot, amount_cents, status, created_at, stripe_payment_method_id').eq('pledger_email', email).order('created_at', { ascending: false }),
    admin.from('solver_applications').select('id, primary_domain, entity_type, status, created_at').eq('email', email).order('created_at', { ascending: false }),
    admin.from('intake_submissions').select('id, organisation, status, created_at').eq('email', email).order('created_at', { ascending: false }),
  ]);

  const adminLink = (await isAdmin()) ? <a href="/admin" style={{ marginLeft: 16 }}>Admin →</a> : null;

  // Supabase types come back as `never` without a generated Database type; cast
  // the typed view through any so map() callbacks can read columns directly.
  const pledges = (pledgesRes.data ?? []) as any[];
  const solverApps = (solverRes.data ?? []) as any[];
  const intakes = (intakeRes.data ?? []) as any[];

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">ProblemMarket</a>
        <nav>
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{email}</span>
          {adminLink}
          <SignOutButton />
        </nav>
      </header>
      <main className="shell">
        <div className="mono">DASHBOARD</div>
        <h1>Your activity</h1>

        <section style={{ marginTop: 32 }}>
          <h2>Pledges</h2>
          {pledges.length ? (
            <table>
              <thead><tr><th>Case</th><th>Amount</th><th>Status</th><th>Card</th><th>When</th><th></th></tr></thead>
              <tbody>
                {pledges.map((p: any) => (
                  <tr key={p.id as string}>
                    <td>Case {p.case_no_snapshot ?? '—'}</td>
                    <td>${(Number(p.amount_cents) / 100).toLocaleString()}</td>
                    <td><span className={`pill ${p.status}`}>{String(p.status)}</span></td>
                    <td>{p.stripe_payment_method_id ? '✓ on file' : '—'}</td>
                    <td>{new Date(p.created_at as string).toLocaleDateString()}</td>
                    <td>{!p.stripe_payment_method_id && <a href={`/pledge/confirm/${p.id}`}>Add card →</a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: 'var(--ink-soft)' }}>No pledges yet.</p>}
        </section>

        <section style={{ marginTop: 32 }}>
          <h2>Solver applications</h2>
          {solverApps.length ? (
            <table>
              <thead><tr><th>Domain</th><th>Type</th><th>Status</th><th>When</th></tr></thead>
              <tbody>
                {solverApps.map((s: any) => (
                  <tr key={s.id as string}>
                    <td>{String(s.primary_domain)}</td>
                    <td>{String(s.entity_type)}</td>
                    <td><span className={`pill ${s.status}`}>{String(s.status)}</span></td>
                    <td>{new Date(s.created_at as string).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: 'var(--ink-soft)' }}>No solver applications yet.</p>}
        </section>

        <section style={{ marginTop: 32 }}>
          <h2>Problem submissions</h2>
          {intakes.length ? (
            <table>
              <thead><tr><th>Organisation</th><th>Status</th><th>When</th></tr></thead>
              <tbody>
                {intakes.map((r: any) => (
                  <tr key={r.id as string}>
                    <td>{String(r.organisation)}</td>
                    <td><span className={`pill ${r.status}`}>{String(r.status)}</span></td>
                    <td>{new Date(r.created_at as string).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: 'var(--ink-soft)' }}>No problem submissions yet.</p>}
        </section>
      </main>
    </>
  );
}
