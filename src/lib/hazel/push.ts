import { supabase } from '@/integrations/supabase/client';

export const VAPID_PUBLIC_KEY =
  'BJ1enulq3UtdHBklrQqONpwHpFGXffIYtUTsQgpow_UkMH3bQ4-Sbe_ZrdhEObe00BX9PaCOlG07iLRfXmkfV7Q';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Subscribe the current browser to Web Push and persist the subscription
 * for the signed-in user. Safe to call multiple times. Silently no-ops
 * when SW/push aren't available or permission is denied.
 */
export async function subscribeToPush(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js').catch(() => null);
    if (!reg) return false;

    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = sub.toJSON();
    const device = navigator.userAgent.slice(0, 200);
    await supabase
      .from('push_subscriptions')
      .upsert(
        { user_id: userId, subscription: json as any, device },
        { onConflict: 'user_id,device' as any },
      );
    return true;
  } catch (e) {
    console.warn('[push] subscribe failed', e);
    return false;
  }
}