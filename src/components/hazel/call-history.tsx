import { useEffect, useState } from 'react';
import { Ic, T, COLORS } from './ui';
import { gl, Av } from './ui';
import { supabase } from '@/integrations/supabase/client';
import { useHazelStore } from '@/lib/hazel/store';

const { W, S, S2, AC } = COLORS;

type CallRow = {
  id: string;
  caller_id: string;
  callee_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
};

function fmtWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function fmtDur(s: number | null) {
  if (!s || s <= 0) return '';
  const m = Math.floor(s / 60); const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

export function CallHistoryScreen({ onBack, onCall }: { onBack: () => void; onCall?: (contactId: string, mode: 'audio' | 'video') => void }) {
  const { state } = useHazelStore();
  const [me, setMe] = useState<string | null>(null);
  const [rows, setRows] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!live) return;
      setMe(user?.id ?? null);
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('calls')
        .select('id, caller_id, callee_id, status, started_at, ended_at, duration_seconds')
        .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
        .order('started_at', { ascending: false })
        .limit(100);
      if (!live) return;
      setRows((data as CallRow[]) || []);
      setLoading(false);
    })();
    return () => { live = false; };
  }, []);

  return (
    <div className="afu" style={{ padding: '14px 20px 140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <T onClick={onBack} style={{ ...gl('rgba(255,255,255,0.07)', 14, { boxShadow: 'none' }), width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S }}>
          <Ic n="ChevronLeft" s={20} />
        </T>
        <h1 style={{ color: W, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Calls</h1>
      </div>
      {loading ? (
        <div style={{ ...gl(), padding: 24, textAlign: 'center', color: S }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ ...gl(), padding: 24, textAlign: 'center', color: S }}>No calls yet.</div>
      ) : (
        <div style={{ ...gl(), padding: 6 }}>
          {rows.map((r) => {
            const otherId = r.caller_id === me ? r.callee_id : r.caller_id;
            const ct = state.contacts.find((c) => c.id === otherId);
            const outgoing = r.caller_id === me;
            const missed = r.status === 'declined' || (r.status === 'ended' && (r.duration_seconds || 0) === 0 && !outgoing);
            const color = missed ? '#ef4444' : (outgoing ? AC : '#22c55e');
            const icon = missed ? 'PhoneMissed' : (outgoing ? 'PhoneOutgoing' : 'PhoneIncoming');
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Av ini={(ct?.ini as any) || '?'} g={(ct?.g as any) || 'g1'} sz={42} src={ct?.avatar} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: missed ? '#ef4444' : W, fontSize: 14, fontWeight: 600 }}>{ct?.name || 'Unknown'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: S2, fontSize: 12, marginTop: 2 }}>
                    <Ic n={icon as any} s={12} c={color as any} />
                    <span>{fmtWhen(r.started_at)}</span>
                    {r.duration_seconds ? <span>· {fmtDur(r.duration_seconds)}</span> : null}
                  </div>
                </div>
                {ct && onCall && (
                  <T onClick={() => onCall(ct.id, 'audio')} style={{ ...gl('rgba(37,99,235,0.15)', 12, { boxShadow: 'none' }), width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AC as any }}>
                    <Ic n="Phone" s={16} />
                  </T>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}