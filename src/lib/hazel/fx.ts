/**
 * Currency conversion helper.
 * Uses the open exchangerate.host endpoint (no API key) and caches
 * latest rates for an hour in localStorage.
 */

const CACHE_KEY = 'lumens-fx-cache-v1';
const TTL_MS = 60 * 60 * 1000;

type RatesCache = { base: string; ts: number; rates: Record<string, number> };

async function loadRates(base: string): Promise<Record<string, number>> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    if (raw) {
      const c = JSON.parse(raw) as RatesCache;
      if (c.base === base && Date.now() - c.ts < TTL_MS && c.rates) return c.rates;
    }
  } catch {}
  // Primary: open.er-api.com (no key, supports most fiat)
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`);
    const j: any = await r.json();
    if (j?.rates && typeof j.rates === 'object') {
      const cache: RatesCache = { base, ts: Date.now(), rates: j.rates };
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
      return j.rates;
    }
  } catch {}
  // Fallback: exchangerate.host
  try {
    const r = await fetch(`https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`);
    const j: any = await r.json();
    if (j?.rates && typeof j.rates === 'object') {
      const cache: RatesCache = { base, ts: Date.now(), rates: j.rates };
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
      return j.rates;
    }
  } catch {}
  return {};
}

export async function getRate(from: string, to: string): Promise<number> {
  if (!from || !to || from === to) return 1;
  const rates = await loadRates(from);
  const v = rates[to];
  if (typeof v === 'number' && isFinite(v) && v > 0) return v;
  // try inverse
  const inv = await loadRates(to);
  const iv = inv[from];
  if (typeof iv === 'number' && isFinite(iv) && iv > 0) return 1 / iv;
  throw new Error(`No FX rate ${from}->${to}`);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}