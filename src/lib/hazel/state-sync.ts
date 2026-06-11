import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHazelStore } from './store';

/**
 * Mirrors per-user app state (categories, budgets, accounts, cards, settings)
 * to the `user_state` table so it follows the user across devices.
 *
 * - On sign-in: pulls the remote row (if any) and merges it into the store.
 * - On change: debounced upsert of the affected slices for the signed-in user.
 */
export function useUserStateSync(userId: string | null) {
  const { state, set } = useHazelStore();
  const seededFor = useRef<string | null>(null);
  const lastSnap = useRef<string>('');
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pull remote state on sign-in.
  useEffect(() => {
    if (!userId) { seededFor.current = null; lastSnap.current = ''; return; }
    if (seededFor.current === userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_state' as any)
        .select('income_cats, expense_cats, budgets, accounts, cards, settings')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const row: any = data;
        set((s) => {
          if (Array.isArray(row.income_cats) && row.income_cats.length) s.incomeCats = row.income_cats;
          if (Array.isArray(row.expense_cats) && row.expense_cats.length) s.expenseCats = row.expense_cats;
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
      seededFor.current = userId;
      lastSnap.current = snapshot(state);
      // Ensure a row exists for this user (so first-write conflicts don't matter).
      await supabase
        .from('user_state' as any)
        .upsert({ user_id: userId }, { onConflict: 'user_id' });
    })();
    return () => { cancelled = true; };
  }, [userId, set]);

  // Debounced push on relevant state changes.
  useEffect(() => {
    if (!userId || seededFor.current !== userId) return;
    const snap = snapshot(state);
    if (snap === lastSnap.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
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