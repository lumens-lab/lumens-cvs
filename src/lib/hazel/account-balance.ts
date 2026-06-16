import type { Account, Tx } from './store';

/**
 * Compute the live balance of an account = opening balance + Σ tx attributed
 * to that account. Income adds, expense subtracts. Transfers move funds from
 * `accountId` (source) to `toAccountId` (destination).
 */
export function accountBalance(account: Account, txs: Tx[]): number {
  const id = String(account.id);
  let bal = account.balance ?? 0;
  for (const t of txs) {
    if (t.cat === '__transfer__') {
      const amt = Math.abs(t.amt);
      if (t.accountId === id) bal -= amt;
      if (t.toAccountId === id) bal += amt;
    } else if (t.accountId === id) {
      bal += t.amt; // amt is signed (+income / -expense)
    }
  }
  return bal;
}