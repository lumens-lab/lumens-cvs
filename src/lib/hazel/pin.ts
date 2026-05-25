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

/** Constant-time string comparison (length-leak resistant via fixed XOR). */
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function verifyPin(input: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  // Back-compat: legacy plaintext PINs are compared in constant time by
  // hashing both sides, so timing cannot leak how many digits match.
  if (!stored.startsWith('sha256:')) {
    const hInput = await hashPin(input);
    const hStored = await hashPin(stored);
    return timingSafeEqual(hInput, hStored);
  }
  const h = await hashPin(input);
  return timingSafeEqual(h, stored);
}