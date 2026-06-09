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

export type GroupMember = { user_id: string; role: 'owner' | 'admin' | 'member' };
export type Group = {
  id: string;
  name: string;
  avatar?: string;
  ownerId: string;
  memberCount: number;
  members?: GroupMember[];
  last: string;
  time: string;
  unread: number;
  msgs: ChatMsg[];
};

export type HazelState = {
  profile: Profile;
  cards: Card[];
  accounts: Account[];
  txs: Tx[];
  contacts: Contact[];
  conversations: Conv[];
  groups: Group[];
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
  groups: [],
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

/** Validate a parsed backup snapshot. Returns plain-English error strings. */
export function validateBackupSnapshot(parsed: any): string[] {
  const errs: string[] = [];
  if (!parsed || typeof parsed !== 'object') return ['File is not a valid Lumens backup (not a JSON object).'];
  const hasAny =
    parsed.profile || Array.isArray(parsed.txs) ||
    Array.isArray(parsed.incomeCats) || Array.isArray(parsed.expenseCats) ||
    parsed.settings || Array.isArray(parsed.accounts) || Array.isArray(parsed.cards);
  if (!hasAny) errs.push('No recognisable Lumens fields (txs, profile, settings, accounts…).');
  if (parsed.txs != null && !Array.isArray(parsed.txs)) errs.push('Field "txs" must be a list.');
  if (Array.isArray(parsed.txs)) {
    const bad = parsed.txs.findIndex((t: any) => !t || typeof t.name !== 'string' || typeof t.date !== 'string' || typeof t.amt !== 'number');
    if (bad >= 0) errs.push(`Transaction #${bad + 1} is missing required fields (name, date, amt).`);
  }
  if (parsed.settings && typeof parsed.settings !== 'object') errs.push('Field "settings" must be an object.');
  return errs;
}

/**
 * Restore a backup by MERGING into the current state — NEVER wipes data.
 * Dedupes transactions by (date|name|amt). Only fills empty profile fields.
 * PIN and onboarded flag are never imported.
 */
export function importState(json: string): boolean {
  return importStateDetailed(json).ok;
}

export function importStateDetailed(json: string): { ok: boolean; errors: string[]; added: { txs: number; cats: number } } {
  let parsed: any;
  try { parsed = JSON.parse(json); }
  catch { return { ok: false, errors: ['File is not valid JSON.'], added: { txs: 0, cats: 0 } }; }
  const errs = validateBackupSnapshot(parsed);
  if (errs.length) return { ok: false, errors: errs, added: { txs: 0, cats: 0 } };
  try {
    const next: HazelState = { ...mem };
    let addedTxs = 0;
    let addedCats = 0;
    if (parsed.profile && typeof parsed.profile === 'object') {
      next.profile = {
        ...next.profile,
        name: escStr(parsed.profile.name) || next.profile.name,
        email: escStr(parsed.profile.email) || next.profile.email,
        username: escStr(parsed.profile.username) || next.profile.username,
        phone: escStr(parsed.profile.phone) || next.profile.phone,
        dob: escStr(parsed.profile.dob) || next.profile.dob,
        avatar: (typeof parsed.profile.avatar === 'string' && parsed.profile.avatar.startsWith('data:image/')) ? parsed.profile.avatar : next.profile.avatar,
        cover: (typeof parsed.profile.cover === 'string' && parsed.profile.cover.startsWith('data:image/')) ? parsed.profile.cover : next.profile.cover,
      };
    }
    if (Array.isArray(parsed.txs)) {
      const incoming = parsed.txs.map(sanitizeTx).filter(Boolean) as Tx[];
      const seen = new Set(next.txs.map((t) => `${t.date}|${t.name}|${t.amt}`));
      const merged = [...next.txs];
      for (const t of incoming) {
        const k = `${t.date}|${t.name}|${t.amt}`;
        if (seen.has(k)) continue;
        seen.add(k);
        merged.unshift(t);
        addedTxs++;
      }
      next.txs = merged;
    }
    const mergeCats = (existing: Cat[], extra: any[]): Cat[] => {
      const out = [...existing];
      const seen = new Set(existing.map((c) => c.id));
      for (const raw of extra) {
        const c = sanitizeCat(raw);
        if (!c || seen.has(c.id)) continue;
        seen.add(c.id);
        out.push(c);
        addedCats++;
      }
      return out;
    };
    if (Array.isArray(parsed.incomeCats)) next.incomeCats = mergeCats(next.incomeCats, parsed.incomeCats);
    if (Array.isArray(parsed.expenseCats)) next.expenseCats = mergeCats(next.expenseCats, parsed.expenseCats);
    if (parsed.settings && typeof parsed.settings === 'object') {
      next.settings = {
        ...next.settings,
        ...parsed.settings,
        currency: typeof parsed.settings.currency === 'string' ? escStr(parsed.settings.currency).slice(0, 10) : next.settings.currency,
        language: typeof parsed.settings.language === 'string' ? escStr(parsed.settings.language).slice(0, 10) : next.settings.language,
        notifications: { ...next.settings.notifications, ...(parsed.settings.notifications || {}) },
        security: { ...next.settings.security, ...(parsed.settings.security || {}) },
        devices: next.settings.devices,
      };
    }
    next.pin = mem.pin;
    next.onboarded = mem.onboarded;
    mem = next;
    persist();
    subs.forEach((s) => s());
    return { ok: true, errors: [], added: { txs: addedTxs, cats: addedCats } };
  } catch (e: any) {
    return { ok: false, errors: [e?.message ?? 'Unknown error while restoring backup.'], added: { txs: 0, cats: 0 } };
  }
}

export function exportState(): string {
  const { pin: _pin, ...safe } = mem;
  return JSON.stringify(safe, null, 2);
}

export function resetState() {
  mem = initial;
  persist();
  subs.forEach((s) => s());
}