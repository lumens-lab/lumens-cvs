import { useEffect, useState, useCallback } from 'react';
import { DEFAULT_EXPENSE_CATS, DEFAULT_INCOME_CATS } from './data';

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
export type Contact = { id: string; name: string; ini: string; ph: string; g: string; on: boolean; confirmed?: boolean; avatar?: string };
export type ChatMsg = {
  id: string;
  text?: string;
  type?: 'money' | 'image' | 'video' | 'voice';
  amt?: number;
  cur?: string;
  /** data URL for image/video/voice attachments */
  media?: string;
  /** voice note duration in seconds */
  dur?: number;
  sent: boolean;
  time: string;
  pending?: boolean;
};
export type Conv = { cid: string; convId?: string; last: string; time: string; unread: number; msgs: ChatMsg[] };
export type PendingReq = { id: string; name: string; ini: string; dir: 'sent'|'received'; g: string };

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
    theme: 'dark' | 'light' | 'hazel' | 'peach' | 'graphite' | 'deepnavy';
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
    name: '',
    email: '',
    username: '',
    phone: '',
    dob: '',
    avatar: '',
    cover: '',
  },
  cards: [],
  accounts: [],
  txs: [],
  contacts: [],
  conversations: [],
  pendingReqs: [],
  incomeCats: DEFAULT_INCOME_CATS,
  expenseCats: DEFAULT_EXPENSE_CATS,
  budgets: {},
  settings: {
    currency: 'ZAR',
    language: 'en',
    theme: 'dark',
    notifications: { transactions: true, budgetAlerts: true, chat: true, security: true, promotions: false, sound: true },
    security: { twoFA: false, biometrics: false },
    devices: [],
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
    return {
      ...initial,
      ...parsed,
      profile: { ...initial.profile, ...(parsed.profile || {}) },
      settings: {
        ...initial.settings,
        ...(parsed.settings || {}),
        notifications: { ...initial.settings.notifications, ...((parsed.settings || {}).notifications || {}) },
        security: { ...initial.settings.security, ...((parsed.settings || {}).security || {}) },
      },
    };
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
  try {
    // Strip sensitive PII (phone, dob, email) from the persisted snapshot —
    // these are reloaded from Supabase on each session, so localStorage
    // never holds plaintext PII that an XSS payload could exfiltrate.
    const { profile, ...rest } = mem;
    const safeProfile = {
      ...profile,
      email: '',
      phone: '',
      dob: '',
    };
    localStorage.setItem(KEY, JSON.stringify({ ...rest, profile: safeProfile }));
  } catch {}
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

/** Escape HTML special chars to neutralize any pre-injected XSS payloads. */
function escStr(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeTx(t: any): Tx | null {
  if (!t || typeof t !== 'object') return null;
  if (typeof t.name !== 'string' || typeof t.cat !== 'string' || typeof t.date !== 'string') return null;
  if (typeof t.amt !== 'number' || !isFinite(t.amt)) return null;
  return {
    id: typeof t.id === 'number' ? t.id : undefined,
    name: escStr(t.name).slice(0, 200),
    cat: escStr(t.cat).slice(0, 80),
    icon: escStr(t.icon).slice(0, 60) || 'Tag',
    ibg: escStr(t.ibg).slice(0, 80),
    ic: escStr(t.ic).slice(0, 80),
    date: escStr(t.date).slice(0, 40),
    amt: t.amt,
    merchant: t.merchant ? escStr(t.merchant).slice(0, 200) : undefined,
    note: t.note ? escStr(t.note).slice(0, 1000) : undefined,
    receipt: typeof t.receipt === 'string' && t.receipt.startsWith('data:image/') ? t.receipt.slice(0, 5_000_000) : undefined,
    items: Array.isArray(t.items)
      ? t.items
          .filter((i: any) => i && typeof i.name === 'string' && typeof i.amt === 'number')
          .slice(0, 200)
          .map((i: any) => ({ name: escStr(i.name).slice(0, 200), amt: i.amt }))
      : undefined,
  };
}

function sanitizeCat(c: any): Cat | null {
  if (!c || typeof c !== 'object') return null;
  if (typeof c.id !== 'string' || typeof c.name !== 'string') return null;
  return {
    id: escStr(c.id).slice(0, 80),
    name: escStr(c.name).slice(0, 80),
    icon: escStr(c.icon).slice(0, 60) || 'Tag',
    color: typeof c.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c.color) ? c.color : '#5eead4',
    budget: typeof c.budget === 'number' && isFinite(c.budget) ? c.budget : undefined,
  };
}

/**
 * Restore a backup. Validates shape, escapes string fields, and NEVER
 * imports the PIN or onboarded flag — those stay as the existing
 * in-memory values so a malicious backup cannot bypass the lock screen.
 */
export function importState(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return false;

    const next: HazelState = { ...initial };

    if (parsed.profile && typeof parsed.profile === 'object') {
      next.profile = {
        ...initial.profile,
        name: escStr(parsed.profile.name) || initial.profile.name,
        email: escStr(parsed.profile.email) || initial.profile.email,
        username: escStr(parsed.profile.username) || initial.profile.username,
        phone: escStr(parsed.profile.phone) || initial.profile.phone,
        dob: escStr(parsed.profile.dob) || initial.profile.dob,
        avatar: typeof parsed.profile.avatar === 'string' && parsed.profile.avatar.startsWith('data:image/') ? parsed.profile.avatar : '',
        cover: typeof parsed.profile.cover === 'string' && parsed.profile.cover.startsWith('data:image/') ? parsed.profile.cover : '',
      };
    }

    if (Array.isArray(parsed.txs)) {
      next.txs = parsed.txs.map(sanitizeTx).filter(Boolean) as Tx[];
    }
    if (Array.isArray(parsed.incomeCats)) {
      next.incomeCats = parsed.incomeCats.map(sanitizeCat).filter(Boolean) as Cat[];
    }
    if (Array.isArray(parsed.expenseCats)) {
      next.expenseCats = parsed.expenseCats.map(sanitizeCat).filter(Boolean) as Cat[];
    }
    if (parsed.settings && typeof parsed.settings === 'object') {
      next.settings = {
        ...initial.settings,
        ...parsed.settings,
        currency: typeof parsed.settings.currency === 'string' ? escStr(parsed.settings.currency).slice(0, 10) : initial.settings.currency,
        language: typeof parsed.settings.language === 'string' ? escStr(parsed.settings.language).slice(0, 10) : initial.settings.language,
        notifications: { ...initial.settings.notifications, ...(parsed.settings.notifications || {}) },
        security: { ...initial.settings.security, ...(parsed.settings.security || {}) },
        devices: initial.settings.devices,
      };
    }

    // Preserve existing PIN + onboarded — never import from backup.
    next.pin = mem.pin;
    next.onboarded = mem.onboarded;

    mem = next;
    persist();
    subs.forEach((s) => s());
    return true;
  } catch { return false; }
}

/** Export state with PIN stripped — credentials never leave the device. */
export function exportState(): string {
  const { pin: _pin, ...safe } = mem;
  return JSON.stringify(safe, null, 2);
}

export function resetState() {
  mem = initial;
  persist();
  subs.forEach((s) => s());
}