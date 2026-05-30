import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DomicileWallet = {
  id: string;
  user_id: string;
  wallet_uid: string; // 16-digit, permanent
  currency: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

/** Formats a 16-digit UID as `XXXX XXXX XXXX XXXX`. */
export function formatWalletUid(uid: string): string {
  return (uid || '').replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Loads (creating if needed) the user's permanent domicile wallet.
 * The 16-digit `wallet_uid` is generated once and immutable.
 */
export function useDomicileWallet(userId: string | null, preferredCurrency?: string) {
  const [wallet, setWallet] = useState<DomicileWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase.rpc('get_or_create_domicile_wallet', {
        preferred_currency: preferredCurrency ?? null,
      } as any);
      if (e) throw e;
      setWallet(data as unknown as DomicileWallet);
    } catch (e: any) {
      setError(e?.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }, [userId, preferredCurrency]);

  useEffect(() => { refresh(); }, [refresh]);

  return { wallet, loading, error, refresh } as const;
}

/** Increment the domicile wallet balance for the current user (deposit demo). */
export async function depositToWallet(amount: number): Promise<DomicileWallet | null> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('not authenticated');
  // Read current
  const { data: cur, error: e1 } = await supabase
    .from('domicile_wallets')
    .select('*')
    .eq('user_id', user.user.id)
    .maybeSingle();
  if (e1) throw e1;
  if (!cur) throw new Error('wallet missing');
  const next = Number(cur.balance || 0) + amount;
  const { data, error: e2 } = await supabase
    .from('domicile_wallets')
    .update({ balance: next })
    .eq('user_id', user.user.id)
    .select('*')
    .maybeSingle();
  if (e2) throw e2;
  return data as unknown as DomicileWallet;
}