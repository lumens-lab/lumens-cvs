import { supabase } from '@/integrations/supabase/client';
import { encryptDmPayload, decryptDmCiphertext, isSignalEnvelope } from './cipher';

/**
 * Group E2EE — per-message symmetric key fan-out.
 *
 * Each group message is encrypted once with a fresh AES-GCM 256 key. That
 * key is then wrapped for every recipient using their pairwise Signal
 * session (X3DH + Double Ratchet). The wire format carries the AES
 * ciphertext + IV + one wrapped key per member.
 *
 * This is simpler than long-lived sender keys (no per-sender chain key
 * to distribute, rotate, or recover) and still inherits forward secrecy
 * from the underlying pairwise ratchet — at the cost of O(N) ciphertext
 * size per message. Fine for typical small groups.
 */

export type GroupFanEnvelope = {
  e: 'groupfan';
  v: 1;
  iv: string; // base64
  ct: string; // base64
  keys: Record<string, string>; // recipientUserId -> SignalEnvelope JSON string
};

export function isGroupFanEnvelope(s: string): boolean {
  if (!s || s[0] !== '{') return false;
  try {
    const o = JSON.parse(s);
    return o && o.e === 'groupfan' && typeof o.ct === 'string' && typeof o.iv === 'string' && o.keys && typeof o.keys === 'object';
  } catch { return false; }
}

function abToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return typeof window !== 'undefined' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
}
function b64ToAb(s: string): ArrayBuffer {
  const bin = typeof window !== 'undefined' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function aesEncrypt(payload: Record<string, unknown>): Promise<{ keyRaw: ArrayBuffer; iv: Uint8Array; ct: ArrayBuffer }> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  const keyRaw = await crypto.subtle.exportKey('raw', key);
  return { keyRaw, iv, ct };
}

async function aesDecrypt(keyRaw: ArrayBuffer, iv: ArrayBuffer, ct: ArrayBuffer): Promise<Record<string, any> | null> {
  try {
    const key = await crypto.subtle.importKey('raw', keyRaw, { name: 'AES-GCM' }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, ct);
    return JSON.parse(new TextDecoder().decode(pt));
  } catch (err) {
    console.warn('[e2ee] group AES decrypt failed', err);
    return null;
  }
}

/**
 * Encrypt `payload` for delivery to `groupId`. Fetches the current member
 * list and wraps the per-message key for every other member using their
 * pairwise Signal session. Returns the wire string for messages.ciphertext.
 *
 * If a member has not yet published a prekey bundle, they are skipped —
 * they won't be able to read the message until they next install. The
 * sender's own slot is also skipped (we cache the plaintext locally).
 */
export async function encryptGroupPayload(
  myUserId: string,
  groupId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const { data: members, error } = await supabase
    .from('group_members').select('user_id').eq('group_id', groupId);
  if (error) throw error;
  const recipients = (members ?? []).map((m: any) => m.user_id as string).filter((u) => u !== myUserId);

  const { keyRaw, iv, ct } = await aesEncrypt(payload);
  const keyB64 = abToB64(keyRaw);

  const keys: Record<string, string> = {};
  await Promise.all(recipients.map(async (uid) => {
    try {
      const wrapped = await encryptDmPayload(myUserId, uid, { gk: keyB64 });
      keys[uid] = wrapped;
    } catch (err) {
      console.warn('[e2ee] failed to wrap group key for', uid, err);
    }
  }));

  const ivCopy = new Uint8Array(iv.length);
  ivCopy.set(iv);
  const env: GroupFanEnvelope = {
    e: 'groupfan', v: 1,
    iv: abToB64(ivCopy.buffer),
    ct: abToB64(ct),
    keys,
  };
  return JSON.stringify(env);
}

/**
 * Decrypt an incoming group ciphertext addressed to `myUserId`. Returns
 * the plaintext payload or null if no slot exists for this user (e.g.
 * sender's own row — caller should fall back to local cache).
 */
export async function decryptGroupCiphertext(
  myUserId: string,
  senderUserId: string,
  ciphertext: string,
): Promise<Record<string, any> | null> {
  if (!isGroupFanEnvelope(ciphertext)) return null;
  const env = JSON.parse(ciphertext) as GroupFanEnvelope;
  const wrapped = env.keys[myUserId];
  if (!wrapped || !isSignalEnvelope(wrapped)) return null;
  const unwrapped = await decryptDmCiphertext(myUserId, senderUserId, wrapped);
  if (!unwrapped || typeof unwrapped.gk !== 'string') return null;
  const keyRaw = b64ToAb(unwrapped.gk);
  const iv = b64ToAb(env.iv);
  const ct = b64ToAb(env.ct);
  return aesDecrypt(keyRaw, iv, ct);
}