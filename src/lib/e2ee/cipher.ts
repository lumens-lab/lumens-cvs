import {
  SessionBuilder,
  SessionCipher,
  SignalProtocolAddress,
} from '@privacyresearch/libsignal-protocol-typescript';
import { supabase } from '@/integrations/supabase/client';
import { getSignalStore } from './store';
import { b64ToAb } from './codec';
import { ensureE2EEIdentity } from './identity';

/**
 * Single-device model for now — every user is one logical "device 1".
 * Multi-device support would generate per-device addresses and fan out.
 */
const DEVICE_ID = 1;
const addr = (userId: string) => new SignalProtocolAddress(userId, DEVICE_ID);

/**
 * Build a Signal session with `peerUserId` if we don't already have one
 * on this device. Fetches their prekey bundle (consumes one one-time
 * prekey atomically server-side) and runs X3DH.
 */
async function ensureSession(myUserId: string, peerUserId: string): Promise<void> {
  const store = getSignalStore(myUserId);
  const address = addr(peerUserId);
  const existing = await store.loadSession(address.toString());
  if (existing) return;

  const { data, error } = await supabase.rpc('fetch_prekey_bundle', { p_user_id: peerUserId });
  if (error) throw error;
  const row: any = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Peer has not published a prekey bundle yet');

  const device = {
    identityKey: b64ToAb(row.identity_key),
    signedPreKey: {
      keyId: row.signed_prekey_id as number,
      publicKey: b64ToAb(row.signed_prekey_public),
      signature: b64ToAb(row.signed_prekey_signature),
    },
    preKey: row.prekey_id != null && row.prekey_public
      ? { keyId: row.prekey_id as number, publicKey: b64ToAb(row.prekey_public) }
      : undefined,
    registrationId: row.registration_id as number,
  };
  const builder = new SessionBuilder(store, address);
  await builder.processPreKey(device);
}

/** Binary string ↔ base64 — SessionCipher returns body as a binary string. */
function binStrToB64(s: string): string {
  return typeof window !== 'undefined' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
}
function b64ToBinStr(s: string): string {
  return typeof window !== 'undefined' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
}

/** Wire-format envelope written to messages.ciphertext. */
export type SignalEnvelope = { e: 'signal'; v: 1; t: number; b: string };

export function isSignalEnvelope(s: string): boolean {
  if (!s || s[0] !== '{') return false;
  try {
    const o = JSON.parse(s);
    return o && o.e === 'signal' && typeof o.b === 'string' && typeof o.t === 'number';
  } catch { return false; }
}

/**
 * Encrypt an outgoing 1-1 payload object for `peerUserId`.
 * Returns the wire-format string to store in `messages.ciphertext`.
 */
export async function encryptDmPayload(
  myUserId: string,
  peerUserId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  await ensureSession(myUserId, peerUserId);
  const store = getSignalStore(myUserId);
  const cipher = new SessionCipher(store, addr(peerUserId));
  const json = JSON.stringify(payload);
  const buf = new TextEncoder().encode(json).buffer;
  const result = await cipher.encrypt(buf);
  if (!result.body) throw new Error('encrypt produced empty body');
  const env: SignalEnvelope = { e: 'signal', v: 1, t: result.type, b: binStrToB64(result.body) };
  return JSON.stringify(env);
}

/**
 * Decrypt an incoming 1-1 ciphertext string. `peerUserId` is the *other*
 * party (sender for messages we received, recipient for our own sent
 * messages — for the latter we just return our locally-known plaintext
 * path, since we cannot decrypt our own outbound Signal ciphertext).
 *
 * Returns the decoded payload object, or null if undecryptable.
 */
export async function decryptDmCiphertext(
  myUserId: string,
  peerUserId: string,
  ciphertext: string,
): Promise<Record<string, any> | null> {
  if (!isSignalEnvelope(ciphertext)) return null;
  const env = JSON.parse(ciphertext) as SignalEnvelope;
  const store = getSignalStore(myUserId);
  const cipher = new SessionCipher(store, addr(peerUserId));
  // Make sure our identity exists in case a brand-new install received
  // a PreKeyWhisperMessage before bootstrap finished — harmless if already done.
  try { await ensureE2EEIdentity(myUserId); } catch {}
  try {
    const binBody = b64ToBinStr(env.b);
    let pt: ArrayBuffer;
    if (env.t === 3) {
      pt = await cipher.decryptPreKeyWhisperMessage(binBody, 'binary');
    } else {
      pt = await cipher.decryptWhisperMessage(binBody, 'binary');
    }
    const json = new TextDecoder().decode(pt);
    return JSON.parse(json);
  } catch (err) {
    console.warn('[e2ee] failed to decrypt message', err);
    return null;
  }
}