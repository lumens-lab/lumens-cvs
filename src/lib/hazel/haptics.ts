/** Tiny haptic helper. Silent no-op when unsupported (iOS Safari, desktop). */
export function haptic(ms: number = 10): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      (navigator as any).vibrate(ms);
    }
  } catch {}
}
export const hapticTap = () => haptic(8);
export const hapticSuccess = () => haptic([10, 30, 10] as unknown as number);
export const hapticError = () => haptic([30, 40, 30] as unknown as number);