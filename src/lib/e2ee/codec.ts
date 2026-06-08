/** ArrayBuffer ↔ base64 helpers used everywhere we touch the wire format. */
export function abToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return typeof window !== 'undefined' ? btoa(s) : Buffer.from(bytes).toString('base64');
}

export function b64ToAb(b64: string): ArrayBuffer {
  const bin = typeof window !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}