import { useCallback, useEffect, useState } from 'react';

/** CoinGecko-supported fiat vs_currencies we expose in the selector. */
export const SUPPORTED_FIAT = [
  'USD','EUR','GBP','JPY','CNY','INR','AUD','CAD','CHF','HKD','SGD','NZD',
  'SEK','NOK','DKK','KRW','MXN','BRL','ARS','CLP','TRY','RUB','AED','SAR',
  'NGN','THB','IDR','MYR','VND','PKR','BDT','LKR','PLN','CZK','HUF','RON',
  'BGN','UAH','ILS','PHP','TWD','ZAR',
];

export function resolveVs(code: string | undefined | null): string {
  const u = (code || 'USD').toUpperCase();
  return (SUPPORTED_FIAT.includes(u) ? u : 'USD').toLowerCase();
}

const WATCH_KEY = 'lumens-watchlist-v1';
const ALERT_KEY = 'lumens-price-alerts-v1';

function readJSON<T>(k: string, fb: T): T {
  if (typeof window === 'undefined') return fb;
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fb; } catch { return fb; }
}
function writeJSON(k: string, v: unknown) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

const watchSubs = new Set<() => void>();
let watchMem: string[] | null = null;
function getWatch(): string[] {
  if (watchMem == null) watchMem = readJSON<string[]>(WATCH_KEY, []);
  return watchMem!;
}
export function useWatchlist() {
  const [, force] = useState(0);
  useEffect(() => { const fn = () => force((n) => n + 1); watchSubs.add(fn); return () => { watchSubs.delete(fn); }; }, []);
  const list = getWatch();
  const toggle = useCallback((id: string) => {
    const cur = getWatch();
    watchMem = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    writeJSON(WATCH_KEY, watchMem);
    watchSubs.forEach((s) => s());
  }, []);
  return { watchlist: list, isPinned: (id: string) => list.includes(id), togglePin: toggle };
}

export type PriceAlert = {
  id: string;
  coinId: string;   // crypto.id (e.g. 'btc')
  coinSym: string;  // 'BTC'
  target: number;
  direction: 'above' | 'below';
  vs: string;       // fiat code (lowercase)
  triggered?: boolean;
  createdAt: number;
};

const alertSubs = new Set<() => void>();
let alertMem: PriceAlert[] | null = null;
function getAlerts(): PriceAlert[] {
  if (alertMem == null) alertMem = readJSON<PriceAlert[]>(ALERT_KEY, []);
  return alertMem!;
}
function setAlerts(next: PriceAlert[]) {
  alertMem = next;
  writeJSON(ALERT_KEY, next);
  alertSubs.forEach((s) => s());
}

export function usePriceAlerts() {
  const [, force] = useState(0);
  useEffect(() => { const fn = () => force((n) => n + 1); alertSubs.add(fn); return () => { alertSubs.delete(fn); }; }, []);
  const alerts = getAlerts();
  const add = useCallback((a: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setAlerts([{ ...a, id, createdAt: Date.now() }, ...getAlerts()]);
  }, []);
  const remove = useCallback((id: string) => { setAlerts(getAlerts().filter((a) => a.id !== id)); }, []);
  const markTriggered = useCallback((id: string) => {
    setAlerts(getAlerts().map((a) => (a.id === id ? { ...a, triggered: true } : a)));
  }, []);
  const forCoin = useCallback((coinId: string) => alerts.filter((a) => a.coinId === coinId && !a.triggered), [alerts]);
  return { alerts, add, remove, markTriggered, forCoin };
}

/** Best-effort browser notification (no-op without permission). */
export async function notify(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch {}
    }
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  } catch {}
}

export async function ensureNotifyPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try { const p = await Notification.requestPermission(); return p === 'granted'; } catch { return false; }
}