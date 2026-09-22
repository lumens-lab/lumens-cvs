import { supabase } from '@/integrations/supabase/client';
import { compressReceipt, dataUrlBytes } from './img-preprocess';

export type OptimizeProgress = { done: number; total: number; savedBytes: number };

/**
 * One-off maintenance: re-scan every receipt photo already stored on the
 * account into a tiny black-and-white scan (~5 KB) and write it back.
 *
 * Runs in the browser because the scan needs a canvas. Processes one record at
 * a time so a long history never holds several megabytes in memory.
 */
export async function optimizeStoredReceipts(
  userId: string,
  maxBytes = 5 * 1024,
  onProgress?: (p: OptimizeProgress) => void,
): Promise<OptimizeProgress> {
  const { data: ids, error } = await supabase
    .from('txs')
    .select('id')
    .eq('user_id', userId)
    .eq('has_receipt', true);
  if (error) throw error;
  const list = (ids ?? []) as { id: string }[];
  const progress: OptimizeProgress = { done: 0, total: list.length, savedBytes: 0 };
  onProgress?.({ ...progress });

  for (const row of list) {
    try {
      const { data } = await supabase.from('txs').select('receipt').eq('id', row.id).maybeSingle();
      const receipt = (data as any)?.receipt as string | null | undefined;
      if (receipt && receipt.startsWith('data:image/')) {
        const before = dataUrlBytes(receipt);
        if (before > maxBytes) {
          const scanned = await compressReceipt(receipt, 1000, maxBytes);
          const after = dataUrlBytes(scanned);
          if (after < before) {
            const { error: upErr } = await supabase.from('txs').update({ receipt: scanned }).eq('id', row.id);
            if (!upErr) progress.savedBytes += before - after;
          }
        }
      }
    } catch {
      /* skip unreadable receipts and keep going */
    }
    progress.done += 1;
    onProgress?.({ ...progress });
  }
  return progress;
}
