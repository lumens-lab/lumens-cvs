import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DebitOrder = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  category_slug: string | null;
  account_id: string | null;
  next_date: string;          // YYYY-MM-DD
  remind_days_before: number;
  active: boolean;
};

export type DebitOrderInput = Omit<DebitOrder, 'id' | 'user_id'>;

export function useDebitOrders(userId: string | null) {
  const [orders, setOrders] = useState<DebitOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) { setOrders([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('debit_orders')
      .select('*')
      .eq('user_id', userId)
      .order('next_date', { ascending: true });
    setOrders((data ?? []) as DebitOrder[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    reload();
    const ch = supabase
      .channel(`debit_orders:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debit_orders', filter: `user_id=eq.${userId}` }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, reload]);

  return { orders, loading, reload };
}

export async function createDebitOrder(userId: string, input: DebitOrderInput) {
  const { error } = await supabase.from('debit_orders').insert({ ...input, user_id: userId });
  if (error) throw error;
}

export async function updateDebitOrder(id: string, patch: Partial<DebitOrderInput>) {
  const { error } = await supabase.from('debit_orders').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteDebitOrder(id: string) {
  const { error } = await supabase.from('debit_orders').delete().eq('id', id);
  if (error) throw error;
}

/** True if `next_date` falls within `remind_days_before` from today (inclusive). */
export function isDue(o: DebitOrder): boolean {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const nd = new Date(o.next_date + 'T00:00:00');
  const diff = Math.floor((nd.getTime() - now.getTime()) / 86_400_000);
  return diff <= o.remind_days_before && diff >= 0;
}

export function daysUntil(o: DebitOrder): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const nd = new Date(o.next_date + 'T00:00:00');
  return Math.floor((nd.getTime() - now.getTime()) / 86_400_000);
}