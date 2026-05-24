/** PIN hashing helpers — never store raw PINs. */
const SALT = 'lumens-pin-v1::';

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + pin);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return 'sha256:' + toHex(digest);
}

export async function verifyPin(input: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  // Back-compat: legacy plaintext PINs (pre-hash rollout)
  if (!stored.startsWith('sha256:')) return input === stored;
  const h = await hashPin(input);
  return h === stored;
}