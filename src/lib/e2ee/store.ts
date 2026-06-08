import type {
  Direction,
  KeyPairType,
  SessionRecordType,
  StorageType,
} from '@privacyresearch/libsignal-protocol-typescript';
import { abToB64, b64ToAb } from './codec';

/**
 * localStorage-backed SignalProtocolStore, scoped per userId so multiple
 * sign-ins on the same browser don't collide.
 *
 * Identity keys, prekeys, signed prekeys and sessions all live under
 * `lumens-e2ee:<userId>:<kind>:<id>`.
 */
export class LocalSignalStore implements StorageType {
  private prefix: string;
  constructor(public readonly userId: string) {
    this.prefix = `lumens-e2ee:${userId}:`;
  }
  private k(kind: string, id: string | number = ''): string {
    return this.prefix + kind + (id === '' ? '' : ':' + id);
  }
  private get(key: string): any {
    const raw = typeof window === 'undefined' ? null : localStorage.getItem(key);
    if (!raw) return undefined;
    try { return JSON.parse(raw); } catch { return undefined; }
  }
  private put(key: string, val: unknown) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(val));
  }
  private del(key: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
  private serializeKeyPair(kp: KeyPairType): { pub: string; priv: string } {
    return { pub: abToB64(kp.pubKey), priv: abToB64(kp.privKey) };
  }
  private deserializeKeyPair(o: { pub: string; priv: string }): KeyPairType {
    return { pubKey: b64ToAb(o.pub), privKey: b64ToAb(o.priv) };
  }

  // ── identity ──
  async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
    const o = this.get(this.k('identity'));
    return o ? this.deserializeKeyPair(o) : undefined;
  }
  setIdentityKeyPair(kp: KeyPairType) {
    this.put(this.k('identity'), this.serializeKeyPair(kp));
  }
  async getLocalRegistrationId(): Promise<number | undefined> {
    const v = this.get(this.k('registrationId'));
    return typeof v === 'number' ? v : undefined;
  }
  setLocalRegistrationId(id: number) { this.put(this.k('registrationId'), id); }

  // ── trust ──  Trust-on-first-use: store identity per address; warn on mismatch.
  async isTrustedIdentity(identifier: string, identityKey: ArrayBuffer, _direction: Direction): Promise<boolean> {
    const existing = this.get(this.k('idkey', identifier));
    if (!existing) return true;
    return existing === abToB64(identityKey);
  }
  async saveIdentity(encodedAddress: string, publicKey: ArrayBuffer): Promise<boolean> {
    const prev = this.get(this.k('idkey', encodedAddress));
    const next = abToB64(publicKey);
    this.put(this.k('idkey', encodedAddress), next);
    return prev != null && prev !== next; // true → identity changed
  }

  // ── one-time prekeys ──
  async loadPreKey(keyId: string | number): Promise<KeyPairType | undefined> {
    const o = this.get(this.k('prekey', keyId));
    return o ? this.deserializeKeyPair(o) : undefined;
  }
  async storePreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    this.put(this.k('prekey', keyId), this.serializeKeyPair(keyPair));
  }
  async removePreKey(keyId: string | number): Promise<void> {
    this.del(this.k('prekey', keyId));
  }

  // ── signed prekeys ──
  async loadSignedPreKey(keyId: string | number): Promise<KeyPairType | undefined> {
    const o = this.get(this.k('signedprekey', keyId));
    return o ? this.deserializeKeyPair(o) : undefined;
  }
  async storeSignedPreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    this.put(this.k('signedprekey', keyId), this.serializeKeyPair(keyPair));
  }
  async removeSignedPreKey(keyId: string | number): Promise<void> {
    this.del(this.k('signedprekey', keyId));
  }

  // ── sessions ──  Stored as opaque strings produced by libsignal.
  async loadSession(encodedAddress: string): Promise<SessionRecordType | undefined> {
    const v = this.get(this.k('session', encodedAddress));
    return typeof v === 'string' ? v : undefined;
  }
  async storeSession(encodedAddress: string, record: SessionRecordType): Promise<void> {
    this.put(this.k('session', encodedAddress), record);
  }

  /** Counters used to allocate new prekey IDs without collision. */
  nextPreKeyId(): number {
    const cur = this.get(this.k('nextPreKeyId')) ?? 1;
    this.put(this.k('nextPreKeyId'), cur + 1);
    return cur;
  }
  nextSignedPreKeyId(): number {
    const cur = this.get(this.k('nextSignedPreKeyId')) ?? 1;
    this.put(this.k('nextSignedPreKeyId'), cur + 1);
    return cur;
  }
}

let cached: LocalSignalStore | null = null;
export function getSignalStore(userId: string): LocalSignalStore {
  if (!cached || cached.userId !== userId) cached = new LocalSignalStore(userId);
  return cached;
}