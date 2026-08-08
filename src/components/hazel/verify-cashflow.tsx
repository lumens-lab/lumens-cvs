import { useCallback, useEffect, useState } from 'react';
import { Ic, T, gl, COLORS, Sheet } from './ui';
import { useHazelStore } from '@/lib/hazel/store';
import { sigOf } from '@/lib/hazel/tx-sync';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

const { W, S, S2, GN, RD, AM, AC } = COLORS;

type Report = {
  serverCount: number;
  localCount: number;
  oldest: string | null;
  newest: string | null;
  perYear: { year: string; count: number }[];
  duplicates: { sig: string; n: number }[];
  missingLocally: number;
  notSynced: number;
};

/** Five-year CashFlow audit: compares what is stored on the account with what
 *  the device is showing, and flags duplicate or missing entries. */
export function VerifySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useHazelStore();
  const { user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      const since = new Date();
      since.setFullYear(since.getFullYear() - 5);
      const from = since.toISOString().slice(0, 10);
      const PAGE = 1000;
      const rows: any[] = [];
      for (let page = 0; ; page++) {
        const { data, error } = await supabase
          .from('txs')
          .select('id, name, cat, date, amt')
          .eq('user_id', user.id)
          .gte('date', from)
          .order('date', { ascending: false })
          .range(page * PAGE, page * PAGE + PAGE - 1);
        if (error) break;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE) break;
      }
      const serverSigs = new Map<string, number>();
      const perYear = new Map<string, number>();
      rows.forEach((r) => {
        const d = typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().slice(0, 10);
        const k = sigOf({ date: d, amt: Number(r.amt), name: r.name, cat: r.cat } as any);
        serverSigs.set(k, (serverSigs.get(k) ?? 0) + 1);
        const y = d.slice(0, 4);
        perYear.set(y, (perYear.get(y) ?? 0) + 1);
      });
      const localInWindow = state.txs.filter((t) => t.date >= from);
      const localSigs = new Map<string, number>();
      localInWindow.forEach((t) => localSigs.set(sigOf(t), (localSigs.get(sigOf(t)) ?? 0) + 1));

      let missingLocally = 0;
      serverSigs.forEach((n, k) => { missingLocally += Math.max(0, n - (localSigs.get(k) ?? 0)); });

      const duplicates: { sig: string; n: number }[] = [];
      serverSigs.forEach((n, k) => { if (n > 1) duplicates.push({ sig: k, n }); });
      duplicates.sort((a, b) => b.n - a.n);

      const dates = rows.map((r) => (typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().slice(0, 10))).sort();
      setReport({
        serverCount: rows.length,
        localCount: localInWindow.length,
        oldest: dates[0] ?? null,
        newest: dates[dates.length - 1] ?? null,
        perYear: [...perYear.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([year, count]) => ({ year, count })),
        duplicates: duplicates.slice(0, 12),
        missingLocally,
        notSynced: state.txs.filter((t) => !t.serverId).length,
      });
    } finally {
      setBusy(false);
    }
  }, [user?.id, state.txs]);

  useEffect(() => { if (open) run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);

  const ok = report && report.missingLocally === 0 && report.duplicates.length === 0 && report.notSynced === 0;

  return (
    <Sheet open={open} onClose={onClose} title="Verify CashFlow">
      {!report ? (
        <div style={{ color: S, fontSize: 13, padding: '24px 0', textAlign: 'center' }}>Checking your records…</div>
      ) : (
        <div>
          <div style={{ ...gl(ok ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)', 16, { border: `1px solid ${ok ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}` }), padding: 14, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
            <Ic n={ok ? 'ShieldCheck' : 'TriangleAlert'} s={22} c={ok ? GN : AM} />
            <div>
              <div style={{ color: W, fontSize: 14, fontWeight: 800 }}>{ok ? 'All records verified' : 'Issues found'}</div>
              <div style={{ color: S, fontSize: 11, marginTop: 2 }}>
                {report.serverCount} stored on your account · {report.localCount} shown on this device
              </div>
            </div>
          </div>

          <Row label="Date range" value={report.oldest ? `${report.oldest} → ${report.newest}` : '—'} />
          <Row label="Missing on this device" value={String(report.missingLocally)} tone={report.missingLocally ? RD : GN} />
          <Row label="Duplicate records" value={String(report.duplicates.length)} tone={report.duplicates.length ? AM : GN} />
          <Row label="Waiting to sync" value={String(report.notSynced)} tone={report.notSynced ? AM : GN} />

          <div style={{ color: S, fontSize: 11, fontWeight: 700, margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Per year</div>
          {report.perYear.map((y) => (
            <div key={y.year} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: W, fontSize: 13 }}>{y.year}</span>
              <span style={{ color: S, fontSize: 13 }}>{y.count} record{y.count === 1 ? '' : 's'}</span>
            </div>
          ))}

          {report.duplicates.length > 0 && (
            <>
              <div style={{ color: S, fontSize: 11, fontWeight: 700, margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Flagged duplicates</div>
              {report.duplicates.map((d) => {
                const [date, amt, name] = d.sig.split('|');
                return (
                  <div key={d.sig} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: W, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{name} · {date}</span>
                    <span style={{ color: AM, fontSize: 12, fontWeight: 700 }}>×{d.n} ({amt})</span>
                  </div>
                );
              })}
            </>
          )}

          <T onClick={run} disabled={busy} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'rgba(37,99,235,0.9)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, marginTop: 18 }}>
            {busy ? 'Checking…' : 'Re-run check'}
          </T>
          <div style={{ color: S2, fontSize: 10, textAlign: 'center', marginTop: 8 }}>Covers the last 5 years of income and expenses.</div>
        </div>
      )}
    </Sheet>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ color: S, fontSize: 12 }}>{label}</span>
      <span style={{ color: tone ?? W, fontSize: 13, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

export const VERIFY_ACCENT = AC;