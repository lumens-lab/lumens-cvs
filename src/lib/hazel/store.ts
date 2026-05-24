import { useEffect, useState, useCallback } from 'react';
import { DEFAULT_EXPENSE_CATS, DEFAULT_INCOME_CATS, SEED_TXS } from './data';

export type Card = { id: number; num: string; holder: string; exp: string; theme: number };
export type Account = { id: number; name: string; type: string; number: string; icon?: string; color?: string };
export type Cat = { id: string; name: string; icon: string; color: string; budget?: number };
export type Tx = {
  id?: number;
  name: string;
  cat: string;
  icon: string;
  ibg: string;
  ic: string;
  date: string;
  amt: number;
  /** Merchant captured from receipt */
  merchant?: string;
  /** Free-form note */
  note?: string;
  /** Base64 image data of a scanned receipt */
  receipt?: string;
  /** Itemized receipt lines */
  items?: { name: string; amt: number }[];
};
export type Profile = {
  name: string; email: string; username: string; phone: string;
  dob: string; // YYYY-MM-DD
  avatar?: string; cover?: string;
};
export type Contact = { id: number; name: string; ini: string; ph: string; g: string; on: boolean };
export type ChatMsg = { id: number; text?: string; type?: 'money'; amt?: number; cur?: string; sent: boolean; time: string };
export type Conv = { cid: number; last: string; time: string; unread: number; msgs: ChatMsg[] };
export type PendingReq = { id: number; name: string; ini: string; dir: 'sent'|'received'; g: string };

export type HazelState = {
  profile: Profile;
  cards: Card[];
  accounts: Account[];
  txs: Tx[];
  contacts: Contact[];
  conversations: Conv[];
  pendingReqs: PendingReq[];
  incomeCats: Cat[];
  expenseCats: Cat[];
  budgets: Record<string, { total: number; period: 'month'|'week'|'custom'; start?: string; end?: string }>; // by YYYY-MM
  settings: {
    currency: string;
    language: string;
    theme: 'dark' | 'light';
    notifications: { transactions: boolean; budgetAlerts: boolean; chat: boolean; security: boolean; promotions: boolean; sound: boolean };
    security: { twoFA: boolean; biometrics: boolean };
    devices: { id: string; name: string; lastActive: string; current: boolean }[];
  };
  onboarded: boolean;
  pin: string | null;
};

const KEY = 'lumens-state-v2';

const initial: HazelState = {
  profile: {
    name: 'Kojo Ayim',
    email: 'kojo@hazelpay.app',
    username: '@kojoayim',
    phone: '+27 82 555 0142',
    dob: '1995-06-12',
    avatar: '',
    cover: '',
  },
  cards: [{ id: 1, num: '4583123456784829', holder: 'KOJO AYIM', exp: '09/28', theme: 0 }],
  accounts: [
    { id: 1, name: 'Standard Bank', type: 'Cheque', number: '••••4829' },
    { id: 2, name: 'Capitec', type: 'Savings', number: '••••1129' },
  ],
  txs: SEED_TXS.map((t, i) => ({ ...t, id: i + 1 })),
  contacts: [
    { id: 1, name: 'Sarah Rodriguez', ini: 'SR', ph: '+27 82 345 6789', g: 'from-pink-400 to-rose-500', on: true },
    { id: 2, name: 'James Davidson', ini: 'JD', ph: '+27 71 234 5678', g: 'from-blue-400 to-indigo-500', on: false },
    { id: 3, name: 'Alex Kim', ini: 'AK', ph: '+27 63 456 7890', g: 'from-emerald-400 to-teal-500', on: true },
  ],
  conversations: [
    { cid: 1, last: 'Thanks for the payment! 🎉', time: '2m', unread: 2, msgs: [
      { id: 1, text: 'Hey Sarah! Sending you the money for dinner', sent: true, time: '10:30 AM' },
      { id: 2, text: 'Awesome! How much was it?', sent: false, time: '10:31 AM' },
      { id: 3, type: 'money', amt: 850, cur: 'ZAR', sent: true, time: '10:32 AM' },
      { id: 4, text: 'Thanks for the payment! 🎉', sent: false, time: '10:33 AM' },
    ]},
    { cid: 3, last: "Sure, I'll send it via Stellar", time: '15m', unread: 0, msgs: [
      { id: 1, text: 'Can you send me $200 in XLM?', sent: false, time: '9:45 AM' },
      { id: 2, text: "Sure, I'll send it via Stellar", sent: true, time: '9:47 AM' },
    ]},
    { cid: 2, last: 'Let me check my balance', time: '1h', unread: 1, msgs: [
      { id: 1, text: 'Hey James, can we split the Uber fare?', sent: true, time: '8:20 AM' },
      { id: 2, text: 'Let me check my balance', sent: false, time: '8:25 AM' },
    ]},
  ],
  pendingReqs: [
    { id: 1, name: 'Nana Akuffo', ini: 'NA', dir: 'sent', g: 'from-amber-400 to-yellow-500' },
    { id: 2, name: 'Kwame Asante', ini: 'KA', dir: 'received', g: 'from-lime-400 to-green-500' },
  ],
  incomeCats: DEFAULT_INCOME_CATS,
  expenseCats: DEFAULT_EXPENSE_CATS,
  budgets: { '2024-12': { total: 3000, period: 'month' } },
  settings: {
    currency: 'ZAR',
    language: 'en',
    theme: 'dark',
    notifications: { transactions: true, budgetAlerts: true, chat: true, security: true, promotions: false, sound: true },
    security: { twoFA: false, biometrics: false },
    devices: [
      { id: 'd1', name: 'iPhone 15 Pro', lastActive: 'Active now', current: true },
      { id: 'd2', name: 'MacBook Air', lastActive: '2 days ago', current: false },
    ],
  },
  onboarded: false,
  pin: null,
};

function load(): HazelState {
  if (typeof window === 'undefined') return initial;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw);
    return { ...initial, ...parsed, settings: { ...initial.settings, ...(parsed.settings || {}) } };
  } catch { return initial; }
}

let mem: HazelState = initial;
const subs = new Set<() => void>();
let booted = false;

function boot() {
  if (booted || typeof window === 'undefined') return;
  mem = load();
  booted = true;
}

function persist() {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch {}
}

export function useHazelStore() {
  boot();
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    return () => { subs.delete(fn); };
  }, []);

  const set = useCallback((updater: (s: HazelState) => HazelState | void) => {
    const next = updater(mem);
    if (next) mem = next;
    else mem = { ...mem };
    persist();
    subs.forEach((s) => s());
  }, []);

  return { state: mem, set };
}

export function getStateSnapshot(): HazelState { boot(); return mem; }

export function importState(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    mem = { ...initial, ...parsed };
    persist();
    subs.forEach((s) => s());
    return true;
  } catch { return false; }
}

export function exportState(): string { return JSON.stringify(mem, null, 2); }

export function resetState() {
  mem = initial;
  persist();
  subs.forEach((s) => s());
}