import { KeyHelper } from '@privacyresearch/libsignal-protocol-typescript';
import { supabase } from '@/integrations/supabase/client';
import { getSignalStore } from './store';
import { abToB64 } from './codec';

const PREKEY_BATCH = 50;       // generate this many one-time prekeys per refill
const PREKEY_LOW_WATER = 10;   // refill when server count drops below this

/**
 * Ensure this user has a published Signal prekey bundle on the server.
 * Idempotent — safe to call on every sign-in. Generates a fresh identity
 * key + signed prekey + one-time prekeys the first time, then only tops
 * up one-time prekeys when the server-side pool runs low.
 *
 * Returns whether a fresh identity was generated (caller can warn user
 * that this device replaced any previous device identity).
 */
export async function ensureE2EEIdentity(userId: string): Promise<{ fresh: boolean }> {
  const store = getSignalStore(userId);

  let identity = await store.getIdentityKeyPair();
  let registrationId = await store.getLocalRegistrationId();
  let fresh = false;

  if (!identity || registrationId == null) {
    identity = await KeyHelper.generateIdentityKeyPair();
    registrationId = KeyHelper.generateRegistrationId();
    store.setIdentityKeyPair(identity);
    store.setLocalRegistrationId(registrationId);
    fresh = true;
  }

  // Always (re)publish identity + a fresh signed prekey + a batch of
  // one-time prekeys on the first call. Subsequent calls only top up
  // when the server pool dips below the low-water mark.
  const { data: countData } = await supabase.rpc('my_prekey_count');
  const serverCount = (countData as number | null) ?? 0;
  if (!fresh && serverCount >= PREKEY_LOW_WATER) {
    return { fresh: false };
  }

  const signedKeyId = store.nextSignedPreKeyId();
  const signedPreKey = await KeyHelper.generateSignedPreKey(identity, signedKeyId);
  await store.storeSignedPreKey(signedPreKey.keyId, signedPreKey.keyPair);

  const prekeyIds: number[] = [];
  const prekeyPublics: string[] = [];
  for (let i = 0; i < PREKEY_BATCH; i++) {
    const id = store.nextPreKeyId();
    const pk = await KeyHelper.generatePreKey(id);
    await store.storePreKey(pk.keyId, pk.keyPair);
    prekeyIds.push(pk.keyId);
    prekeyPublics.push(abToB64(pk.keyPair.pubKey));
  }

  const { error } = await supabase.rpc('publish_prekey_bundle', {
    p_registration_id: registrationId,
    p_identity_key: abToB64(identity.pubKey),
    p_signed_prekey_id: signedPreKey.keyId,
    p_signed_prekey_public: abToB64(signedPreKey.keyPair.pubKey),
    p_signed_prekey_signature: abToB64(signedPreKey.signature),
    p_prekey_ids: prekeyIds,
    p_prekey_publics: prekeyPublics,
  });
  if (error) throw error;

  return { fresh };
}