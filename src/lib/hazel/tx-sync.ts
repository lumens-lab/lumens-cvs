import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHazelStore, type Tx } from './store';

/**
 * Mirrors `state.txs` (CashFlow entries) to the Supabase `txs` table for
 * the signed-in user, and seeds the local list from Supabase on sign-in.
 *
 * Goals:
 *  - Records are per-account: sign in on any device and see your CashFlow.
 *  - Signing out / switching accounts on the same device shows that other
 *    user's records, not the previous user's.
 */
export function useTxSync(userId: string | null) {
  const { state, set } = useHazelStore();
  const seededFor = useRef<string | null>(null);
  const syncing = useRef(false);
  // Snapshot of last-pushed txs (by serverId) so we can diff on changes.
  const lastSnap = useRef<Map<string, string>>(new Map());

  // Initial load: replace local txs with server txs for this user.
  useEffect(() => {
    if (!userId) { seededFor.current = null; lastSnap.current = new Map(); return; }
    if (seededFor.current === userId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('txs')
        .select('id, name, cat, icon, ibg, ic, date, amt, merchant, note, receipt, items')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (cancelled || error || !data) return;
      const remote: Tx[] = data.map((r: any, i: number) => ({
        id: Date.now() + i,
        serverId: r.id,
        name: r.name,
        cat: r.cat,
        icon: r.icon,
        ibg: r.ibg,
        ic: r.ic,
        date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().slice(0, 10),
        amt: Number(r.amt),
        merchant: r.merchant ?? undefined,
        note: r.note ?? undefined,
        receipt: r.receipt ?? undefined,
        items: r.items ?? undefined,
      }));
      const snap = new Map<string, string>();
      remote.forEach((t) => { if (t.serverId) snap.set(t.serverId, JSON.stringify(rowOf(t))); });
      lastSnap.current = snap;
      seededFor.current = userId;
      set((s) => { s.txs = remote; });
    })();
    return () => { cancelled = true; };
  }, [userId, set]);

  // Diff-and-push on every store change once seeded.
  useEffect(() => {
    if (!userId || seededFor.current !== userId || syncing.current) return;
    syncing.current = true;
    (async () => {
      try {
        const current = state.txs;
        const currentServerIds = new Set(current.map((t) => t.serverId).filter(Boolean) as string[]);

        // Deletes: in snapshot but no longer present.
        const toDelete: string[] = [];
        lastSnap.current.forEach((_v, id) => { if (!currentServerIds.has(id)) toDelete.push(id); });
        if (toDelete.length) {
          await supabase.from('txs').delete().in('id', toDelete);
          toDelete.forEach((id) => lastSnap.current.delete(id));
        }

        // Inserts: no serverId yet.
        const toInsert = current.filter((t) => !t.serverId);
        if (toInsert.length) {
          const rows = toInsert.map((t) => ({ user_id: userId, ...rowOf(t) }));
          const { data: inserted } = await supabase.from('txs').insert(rows).select('id');
          if (inserted && inserted.length === toInsert.length) {
            set((s) => {
              for (let i = 0; i < toInsert.length; i++) {
                const local = toInsert[i];
                const sid = (inserted[i] as any).id as string;
                const idx = s.txs.findIndex((x) => x.id === local.id && !x.serverId);
                if (idx >= 0) s.txs[idx] = { ...s.txs[idx], serverId: sid };
                lastSnap.current.set(sid, JSON.stringify(rowOf({ ...local, serverId: sid })));
              }
            });
          }
        }

        // Updates: serverId present and row JSON changed since last push.
        const toUpdate = current.filter((t) => t.serverId && lastSnap.current.get(t.serverId) !== JSON.stringify(rowOf(t)));
        for (const t of toUpdate) {
          const row = rowOf(t);
          await supabase.from('txs').update(row).eq('id', t.serverId!);
          lastSnap.current.set(t.serverId!, JSON.stringify(row));
        }
      } finally {
        syncing.current = false;
      }
    })();
    // We intentionally only depend on state.txs identity changes here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.txs, userId]);
}

function rowOf(t: Tx) {
  return {
    name: t.name,
    cat: t.cat,
    icon: t.icon,
    ibg: t.ibg,
    ic: t.ic,
    date: t.date,
    amt: t.amt,
    merchant: t.merchant ?? null,
    note: t.note ?? null,
    receipt: t.receipt ?? null,
    items: t.items ?? null,
  };
}