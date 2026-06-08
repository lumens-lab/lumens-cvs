import { useEffect } from 'react';
import { ensureE2EEIdentity } from './identity';

/**
 * Bootstraps this user's Signal Protocol identity on the server. Safe to
 * call unconditionally on every sign-in — does the work once, then only
 * tops up one-time prekeys when the server pool runs low.
 */
export function useEnsureE2EEIdentity(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    ensureE2EEIdentity(userId).catch((e) => {
      console.warn('[e2ee] identity bootstrap failed', e);
    });
  }, [userId]);
}