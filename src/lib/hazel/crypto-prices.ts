import { useEffect, useState } from 'react';

export type CryptoMeta = { id: string; cgId: string; name: string; sym: string; clr: string };

/** Metadata for the assets we display. Live price + 24h change come from CoinGecko. */
export const CRYPTO_META: CryptoMeta[] = [
  { id: 'btc',  cgId: 'bitcoin',          name: 'Bitcoin',  sym: 'BTC',  clr: '#f7931a' },
  { id: 'eth',  cgId: 'ethereum',         name: 'Ethereum', sym: 'ETH',  clr: '#627eea' },
  { id: 'xlm',  cgId: 'stellar',          name: 'Stellar',  sym: 'XLM',  clr: '#818cf8' },
  { id: 'xrp',  cgId: 'ripple',           name: 'Ripple',   sym: 'XRP',  clr: '#94a3b8' },
  { id: 'usdc', cgId: 'usd-coin',         name: 'USDC',     sym: 'USDC', clr: '#60a5fa' },
  { id: 'usdt', cgId: 'tether',           name: 'Tether',   sym: 'USDT', clr: '#34d399' },
  { id: 'ada',  cgId: 'cardano',          name: 'Cardano',  sym: 'ADA',  clr: '#818cf8' },
  { id: 'hbar', cgId: 'hedera-hashgraph', name: 'Hedera',   sym: 'HBAR', clr: '#94a3b8' },
  { id: 'xvg',  cgId: 'verge',            name: 'Verge',    sym: 'XVG',  clr: '#00d3c9' },
  { id: 'qnt',  cgId: 'quant-network',    name: 'Quant',    sym: 'QNT',  clr: '#ff7a00' },
];

export type LivePrice = { price: number; chg: number };
export type CryptoQuote = CryptoMeta & LivePrice;

/**
 * Live prices via CoinGecko's public `simple/price` endpoint (no API key).
 * Polls every 60s and re-fetches when the tab regains focus.
 */
export function useCryptoPrices(vs: string = 'usd') {
  const [quotes, setQuotes] = useState<CryptoQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ids = CRYPTO_META.map((c) => c.cgId).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${encodeURIComponent(vs)}&include_24hr_change=true`;

    const fetchNow = async () => {
      try {
        const res = await fetch(url, { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: Record<string, Record<string, number>> = await res.json();
        if (cancelled) return;
        const out = CRYPTO_META.map((m) => {
          const row = json[m.cgId] || {};
          return {
            ...m,
            price: Number(row[vs]) || 0,
            chg: Number(row[`${vs}_24h_change`]) || 0,
          };
        });
        setQuotes(out);
        setUpdatedAt(Date.now());
        setError(null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load prices');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchNow();
    const interval = setInterval(fetchNow, 60_000);
    const onFocus = () => fetchNow();
    if (typeof window !== 'undefined') window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus);
    };
  }, [vs]);

  return { quotes, loading, error, updatedAt };
}