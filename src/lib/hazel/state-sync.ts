import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHazelStore, getStateSnapshot, getUserScope } from './store';

/**
 * Mirrors per-user app state (categories, budgets, accounts, cards, settings)
 * to the `user_state` table so it follows the user across devices.
 *
 * - On sign-in: pulls the remote row (if any) and merges it into the store.
 * - On change: debounced upsert of the affected slices for the signed-in user.
 * - Realtime: subscribes to the user's `user_state` row so updates from
 *   another device propagate to this one without a re-sign-in.
 */
export function useUserStateSync(userId: string | null) {
  const { state, set } = useHazelStore();
  const seededFor = useRef<string | null>(null);
  const lastSnap = useRef<string>('');
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pullRemote = async (uid: string, isInitial: boolean) => {
    // Never seed or bootstrap while the local store is still bound to another
    // user (or to the signed-out namespace) — doing so pushes this device's
    // default categories over the account's saved ones.
    if (getUserScope() !== uid) return false;
    const { data, error } = await supabase
        .from('user_state' as any)
        .select('income_cats, expense_cats, budgets, accounts, cards, settings')
      .eq('user_id', uid)
        .maybeSingle();
    if (error) return false; // a failed read must never bootstrap/overwrite
      const hasRemoteCats =
        !!data && (Array.isArray((data as any).income_cats) || Array.isArray((data as any).expense_cats));
      if (data) {
        const row: any = data;
        set((s) => {
          if (Array.isArray(row.income_cats)) s.incomeCats = row.income_cats;
          if (Array.isArray(row.expense_cats)) s.expenseCats = row.expense_cats;
          if (row.budgets && typeof row.budgets === 'object') s.budgets = row.budgets;
          if (Array.isArray(row.accounts)) s.accounts = row.accounts;
          if (Array.isArray(row.cards)) s.cards = row.cards;
          if (row.settings && typeof row.settings === 'object') {
            s.settings = {
              ...s.settings,
              ...row.settings,
              notifications: { ...s.settings.notifications, ...(row.settings.notifications || {}) },
              security: { ...s.settings.security, ...(row.settings.security || {}) },
              devices: s.settings.devices,
            };
          }
        });
      }
    if (getUserScope() !== uid) return false;
    seededFor.current = uid;
      const live = getStateSnapshot();
      lastSnap.current = snapshot(live);
    if (isInitial && !data) {
        // Bootstrap the row with current local state so other devices that
        // sign in next can pull a meaningful snapshot immediately.
        await supabase.from('user_state' as any).upsert({
        user_id: uid,
          income_cats: live.incomeCats,
          expense_cats: live.expenseCats,
          budgets: live.budgets,
          accounts: live.accounts,
          cards: live.cards,
          settings: live.settings,
        }, { onConflict: 'user_id' });
      }
    return hasRemoteCats || !!data;
  };

  // Initial pull on sign-in.
  useEffect(() => {
    if (!userId) { seededFor.current = null; lastSnap.current = ''; return; }
    if (seededFor.current === userId) return;
    let cancelled = false;
    let tries = 0;
    const attempt = async () => {
      if (cancelled) return;
      const ok = getUserScope() === userId ? await pullRemote(userId, true) : false;
      if (!ok && getUserScope() !== userId && tries++ < 40) setTimeout(attempt, 150);
    };
    attempt();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Realtime + focus/online refresh.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`user_state:${userId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'user_state', filter: `user_id=eq.${userId}` },
        () => { pullRemote(userId, false); },
      )
      .subscribe();
    const onFocus = () => { if (document.visibilityState === 'visible') pullRemote(userId, false); };
    const onOnline = () => pullRemote(userId, false);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', onOnline);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Debounced push on relevant state changes.
  useEffect(() => {
    if (!userId || seededFor.current !== userId || getUserScope() !== userId) return;
    const snap = snapshot(state);
    if (snap === lastSnap.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      if (getUserScope() !== userId) return;
      lastSnap.current = snap;
      await supabase.from('user_state' as any).upsert({
        user_id: userId,
        income_cats: state.incomeCats,
        expense_cats: state.expenseCats,
        budgets: state.budgets,
        accounts: state.accounts,
        cards: state.cards,
        settings: state.settings,
      }, { onConflict: 'user_id' });
    }, 800);
    return () => { if (pushTimer.current) clearTimeout(pushTimer.current); };
  }, [state.incomeCats, state.expenseCats, state.budgets, state.accounts, state.cards, state.settings, userId]);
}

function snapshot(s: any): string {
  try {
    return JSON.stringify({
      i: s.incomeCats, e: s.expenseCats, b: s.budgets,
      a: s.accounts, c: s.cards, st: s.settings,
    });
  } catch { return ''; }
}