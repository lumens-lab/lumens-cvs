import { useEffect, useState } from 'react';

/** Lightweight, app-wide sync status + "last synced" clock.
 *  Persisted per user so the timestamp survives a reload/sign-in. */
export type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

type Snap = { status: SyncState; lastSync: number | null; message?: string };

let uid: string | null = null;
let snap: Snap = { status: 'idle', lastSync: null };
const subs = new Set<() => void>();

const key = (u: string | null) => `lumens:lastSync:${u ?? 'anon'}`;

function emit() {
  snap = { ...snap };
  subs.forEach((f) => f());
}

export function bindSyncUser(userId: string | null) {
  if (uid === userId) return;
  uid = userId;
  let last: number | null = null;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key(userId)) : null;
    if (raw) last = Number(raw) || null;
  } catch { /* ignore */ }
  snap = { status: 'idle', lastSync: last };
  emit();
}

export function markSyncing() {
  snap.status = 'syncing';
  snap.message = undefined;
  emit();
}

export function markSynced() {
  const now = Date.now();
  snap.status = 'synced';
  snap.lastSync = now;
  snap.message = undefined;
  try { localStorage.setItem(key(uid), String(now)); } catch { /* ignore */ }
  emit();
}

export function markSyncError(message?: string) {
  snap.status = 'error';
  snap.message = message;
  emit();
}

export function getSyncSnapshot(): Snap { return snap; }

export function useSyncStatus(): Snap {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    return () => { subs.delete(fn); };
  }, []);
  return snap;
}

/** "Just now" / "5 min ago" / "12 Aug, 14:03" */
export function formatLastSync(ts: number | null): string {
  if (!ts) return 'Never synced on this device';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Synced just now';
  if (diff < 3_600_000) return `Synced ${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `Synced ${Math.floor(diff / 3_600_000)} h ago`;
  return `Synced ${new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
}
