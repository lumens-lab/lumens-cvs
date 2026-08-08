import { useEffect, useRef, useState } from 'react';
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
 *  - Realtime: changes made on Device A appear on Device B within seconds,
 *    without requiring a fresh sign-in or app reload.
 */
export function useTxSync(userId: string | null) {
  const { state, set } = useHazelStore();
  const seededFor = useRef<string | null>(null);
  const syncing = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  // Snapshot of last-pushed txs (by serverId) so we can diff on changes.
  const lastSnap = useRef<Map<string, string>>(new Map());

  // Pull-from-server helper (initial seed + realtime refresh + tab focus).
  // Merges remote rows with any locally-added rows that haven't been pushed
  // yet (no serverId) so we never lose an in-flight insert.
  const pullRemote = async (uid: string) => {
    // Pull the user's FULL history — no date window, no row cap. Anything less
    // makes older CashFlow entries silently disappear on a fresh device.
    // PostgREST caps a single response at 1000 rows, so page through.
    const PAGE = 1000;
    const rows: any[] = [];
    for (let page = 0; ; page++) {
      const { data, error } = await supabase
        .from('txs')
        .select('id, name, cat, icon, ibg, ic, date, amt, merchant, note, receipt, items, account_id, to_account_id')
        .eq('user_id', uid)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) return; // never seed from a partial/failed read
      if (!data || data.length === 0) break;
      rows.push(...data);
      if (data.length < PAGE) break;
    }
    const remote: Tx[] = rows.map((r: any, i: number) => ({
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
      accountId: r.account_id ?? undefined,
      toAccountId: r.to_account_id ?? undefined,
    }));
    const snap = new Map<string, string>();
    remote.forEach((t) => { if (t.serverId) snap.set(t.serverId, JSON.stringify(rowOf(t))); });
    lastSnap.current = snap;
    seededFor.current = uid;
    set((s) => {
      // Preserve un-synced local rows (no serverId yet) so an entry the user
      // just added doesn't vanish if a realtime tick races the push — but drop
      // the ones the server already has, otherwise a realtime tick that lands
      // between insert and serverId attachment leaves a phantom "new" row that
      // gets inserted again on the next push (the duplicate-rows bug).
      const remaining = new Map<string, number>();
      remote.forEach((t) => remaining.set(sigOf(t), (remaining.get(sigOf(t)) ?? 0) + 1));
      // Rows already synced locally account for their remote copies first.
      s.txs.filter((t) => t.serverId).forEach((t) => {
        const k = sigOf(t);
        const n = remaining.get(k);
        if (n) remaining.set(k, n - 1);
      });
      const localUnsynced = s.txs.filter((t) => {
        if (t.serverId) return false;
        const k = sigOf(t);
        const n = remaining.get(k) ?? 0;
        if (n > 0) { remaining.set(k, n - 1); return false; } // already on the server
        return true;
      });
      s.txs = [...localUnsynced, ...remote];
    });
  };

  // Initial load: replace local txs with server txs for this user.
  useEffect(() => {
    if (!userId) { seededFor.current = null; lastSnap.current = new Map(); return; }
    if (seededFor.current === userId) return;
    let cancelled = false;
    (async () => { if (!cancelled) await pullRemote(userId); })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Realtime: any insert/update/delete on this user's rows from any device
  // triggers a re-pull. Also refetch when the tab regains focus or the
  // browser comes back online — both common "I just signed in on another
  // device" recovery moments.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`txs:${userId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'txs', filter: `user_id=eq.${userId}` },
        () => { pullRemote(userId); },
      )
      .subscribe();
    const onFocus = () => { if (document.visibilityState === 'visible') pullRemote(userId); };
    const onOnline = () => pullRemote(userId);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', onOnline);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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
          const { error } = await supabase.from('txs').delete().in('id', toDelete);
          if (error) throw error;
          toDelete.forEach((id) => lastSnap.current.delete(id));
        }

        // Inserts: no serverId yet.
        const toInsert = current.filter((t) => !t.serverId);
        if (toInsert.length) {
          const rows = toInsert.map((t) => ({ user_id: userId, ...rowOf(t) }));
          const { data: inserted, error } = await supabase.from('txs').insert(rows).select('id');
          if (error) throw error;
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
          const serverId = t.serverId;
          if (!serverId) continue;
          const row = rowOf(t);
          const { error } = await supabase.from('txs').update(row).eq('id', serverId);
          if (error) throw error;
          lastSnap.current.set(serverId, JSON.stringify(row));
        }
        if (retryTimer.current) {
          clearTimeout(retryTimer.current);
          retryTimer.current = null;
        }
      } catch {
        if (!retryTimer.current) {
          retryTimer.current = setTimeout(() => {
            retryTimer.current = null;
            setRetryTick((tick) => tick + 1);
          }, 5_000);
        }
      } finally {
        syncing.current = false;
      }
    })();
    // We intentionally only depend on state.txs identity changes here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.txs, userId, retryTick]);

  useEffect(() => () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
  }, []);
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
    account_id: t.accountId ?? null,
    to_account_id: t.toAccountId ?? null,
  };
}

/** Identity of a CashFlow entry independent of its row id — used to detect
 *  rows that already exist server-side. */
export function sigOf(t: Tx) {
  return `${t.date}|${t.amt}|${t.name}|${t.cat}`;
}

function _unusedRowOf(t: Tx) {
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
    account_id: t.accountId ?? null,
    to_account_id: t.toAccountId ?? null,
  };
}