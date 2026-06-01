import { useMemo, useState, useRef, useEffect, type ChangeEvent } from 'react';
import { Ic, T, Av, gl, COLORS, showToast } from './ui';
import { CardComp } from './CardComp';
import { CryptoIcon } from './CryptoIcon';
import { CRYPTO, CURRENCIES, MONTHS, MS, fmtM } from '@/lib/hazel/data';
import { useHazelStore } from '@/lib/hazel/store';
import { sendChatMessage, deleteChatMessage, fetchContactProfile } from '@/lib/hazel/chat-sync';
import { useDebitOrders, deleteDebitOrder, daysUntil, isDue, type DebitOrder } from '@/lib/hazel/debit-orders';
import { useAuth } from '@/hooks/use-auth';
import { useDomicileWallet, depositToWallet, formatWalletUid } from '@/lib/hazel/wallet';
import lumensWordmark from '@/assets/lumens-wordmark.png';

export function LumensWordmark({ height = 100 }: { height?: number }) {
  return (
    <img
      src={lumensWordmark}
      alt="Lumens"
      height={height}
      style={{ height, width: 'auto', display: 'block' }}
    />
  );
}

const { W, S, S2, AC, GN, RD, BL, PP, AM } = COLORS;

export function getCurrencySym(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? '$';
}

/* ── HOME ── */
export function HomeScreen({
  goAnalytics, openSheet, openSub, cardVis, setCardVis, txFilter, setTxFilter, greeting,
}: any) {
  const { state } = useHazelStore();
  const { user } = useAuth();
  const { wallet, refresh: refreshWallet } = useDomicileWallet(user?.id ?? null, state.settings?.currency);
  const sym = getCurrencySym(state.settings?.currency ?? 'ZAR');
  const pName = state.profile?.name ?? 'Welcome';
  const filteredTx = useMemo(() => {
    const f = txFilter.toLowerCase();
    return (state.txs ?? []).filter((t) => (t?.name ?? '').toLowerCase().includes(f)).slice(0, 10);
  }, [txFilter, state.txs]);

  return (
    <div className="afu" style={{ padding: '14px 20px 140px' }}>
      {/* Brand wordmark */}
      <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'flex-start', marginLeft: -8 }}>
        <LumensWordmark height={100} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 12, color: S, marginBottom: 2 }}>{greeting}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: W, letterSpacing: '-0.02em' }}>{pName}</div>
        </div>
        <T onClick={() => openSub('profile')} aria-label="Open profile" style={{ background: 'none', border: 'none', padding: 0, borderRadius: 22 }}>
          <Av ini={pName.split(' ').map((w) => w[0] || '').join('').slice(0, 2)} src={state.profile?.avatar} sz={44} />
        </T>
      </div>

      {/* Domicile multi-currency wallet */}
      <DomicileWalletTile
        wallet={wallet}
        sym={sym}
        onSend={() => openSheet('send', { fromWallet: true })}
        onDeposit={async () => {
          try {
            await depositToWallet(50);
            await refreshWallet();
            showToast(`Deposited ${sym}50.00`);
          } catch (e: any) { showToast(e?.message || 'Deposit failed'); }
        }}
      />

      {/* Cards */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: W }}>My Cards</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <T onClick={() => setCardVis(!cardVis)} style={{ ...gl('rgba(255,255,255,0.07)', 10, { boxShadow: 'none' }), padding: '6px 10px', color: S, fontSize: 11, fontWeight: 600, border: 'none' }}>{cardVis ? 'Hide' : 'Show'}</T>
            <T onClick={() => openSheet('add-card')} style={{ ...gl('rgba(37,99,235,0.08)', 10, { boxShadow: 'none', border: '1px solid rgba(37,99,235,0.2)' }), padding: '6px 10px', color: AC, fontSize: 11, fontWeight: 600 }}>+ Add</T>
          </div>
        </div>
        <div className="no-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: 12, scrollSnapType: 'x mandatory', margin: '0 -20px', padding: '0 20px 4px' }}>
          {state.cards.length === 0 ? (
            <div className="frost" style={{ width: 340, minHeight: 180, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S, fontSize: 12, padding: 16, textAlign: 'center', flex: '0 0 auto', scrollSnapAlign: 'center' }}>
              No cards yet — tap “+ Add” to add your first card.
            </div>
          ) : (
            state.cards.map((c) => (
              <div key={c.id} style={{ flex: '0 0 auto', scrollSnapAlign: 'center' }}>
                <CardComp card={c} visible={cardVis} w={340} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { icon: 'QrCode', label: 'Pay', clr: COLORS.BLUE_BRIGHT, bg: 'rgba(37,99,235,0.12)', fn: () => openSheet('pay') },
          { icon: 'Download', label: 'Receive', clr: GN, bg: 'rgba(52,211,153,0.08)', fn: () => openSheet('receive') },
          { icon: 'ArrowLeftRight', label: 'Swap', clr: BL, bg: 'rgba(96,165,250,0.08)', fn: () => openSheet('swap') },
          { icon: 'Coins', label: 'Assets', clr: PP, bg: 'rgba(192,132,252,0.08)', fn: () => openSub('assets') },
        ].map((a) => (
          <T key={a.label} onClick={a.fn} style={{ ...gl(a.bg, 16, { boxShadow: 'none' }), padding: '14px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: W, border: 'none' }}>
            <Ic n={a.icon} s={20} c={a.clr} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>{a.label}</span>
          </T>
        ))}
      </div>

      {/* Transactions */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: W }}>Recent Transactions</div>
          <T onClick={goAnalytics} style={{ fontSize: 12, color: AC, background: 'none', border: 'none', fontWeight: 600 }}>See All →</T>
        </div>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: S2 }}>
            <Ic n="Search" s={16} />
          </div>
          <input
            value={txFilter}
            onChange={(e) => setTxFilter(e.target.value)}
            placeholder="Search transactions..."
            style={{ width: '100%', padding: '12px 16px 12px 40px', ...gl(), color: W, fontSize: 13, outline: 'none', minHeight: 48 }}
          />
        </div>
        {filteredTx.length === 0 ? (
          <div style={{ ...gl(), padding: 20, textAlign: 'center', color: S }}>No transactions found</div>
        ) : (
          filteredTx.map((t, i) => {
            const pos = t.amt >= 0;
            return (
              <div key={t.id ?? i} style={{ ...gl('rgba(255,255,255,0.05)', 16, { boxShadow: 'none' }), padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: t.ibg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic n={t.icon} s={18} c={t.ic} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: W, fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                  <div style={{ color: S, fontSize: 11 }}>{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
                <div style={{ color: pos ? GN : W, fontSize: 14, fontWeight: 700 }}>
                  {pos ? '+' : ''}{sym}{Math.abs(t.amt).toFixed(2)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── BUDGET (analytics) ── */
export function BudgetScreen({ openSheet, openCatDetail }: any) {
  const { state, set } = useHazelStore();
  const { user } = useAuth();
  const { orders } = useDebitOrders(user?.id ?? null);
  const sym = getCurrencySym(state.settings.currency);
  const [monthKey, setMonthKey] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [y, m] = monthKey.split('-').map(Number);
  const monthLabel = `${MONTHS[m - 1]} ${y}`;

  const monthTxs = useMemo(() => state.txs.filter((t) => t.date.startsWith(monthKey)), [state.txs, monthKey]);
  const spent = monthTxs.filter((t) => t.amt < 0).reduce((s, t) => s + Math.abs(t.amt), 0);
  const budget = state.budgets[monthKey]?.total ?? 3000;
  const pct = Math.min(100, (spent / budget) * 100);
  const left = Math.max(0, budget - spent);

  const byCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTxs) {
      if (t.amt < 0) map.set(t.cat, (map.get(t.cat) ?? 0) + Math.abs(t.amt));
    }
    return state.expenseCats
      .map((c) => ({ ...c, spent: map.get(c.id) ?? 0 }))
      .sort((a, b) => b.spent - a.spent);
  }, [monthTxs, state.expenseCats]);

  // Last 7 days
  const week = useMemo(() => {
    const today = new Date();
    const arr: { d: string; a: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const total = state.txs.filter((t) => t.date === key && t.amt < 0).reduce((s, t) => s + Math.abs(t.amt), 0);
      arr.push({ d: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()], a: total });
    }
    return arr;
  }, [state.txs]);
  const maxA = Math.max(1, ...week.map((w) => w.a));

  const setBudget = (n: number) => set((s) => {
    s.budgets = { ...s.budgets, [monthKey]: { ...(s.budgets[monthKey] ?? { period: 'month' as const }), total: n } };
  });

  return (
    <div className="afu" style={{ padding: '14px 20px 140px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1 style={{ color: W, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Budget</h1>
        <T onClick={() => openSheet('month-picker', { monthKey, onPick: setMonthKey })} style={{ ...gl('rgba(255,255,255,0.07)', 14, { boxShadow: 'none' }), display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', color: S, fontSize: 12, fontWeight: 600 }}>
          <Ic n="Calendar" s={14} /> {monthLabel}
        </T>
      </div>

      {/* Budget card */}
      <div style={{ ...gl('rgba(255,255,255,0.06)', 22), padding: 20, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: S, marginBottom: 4 }}>Monthly Budget</div>
            <div style={{ fontSize: 28, color: W, fontWeight: 800, letterSpacing: '-0.02em' }}>{sym}{fmtM(spent)}</div>
            <div style={{ fontSize: 12, color: S, marginTop: 2 }}>of {sym}{fmtM(budget)}</div>
          </div>
          <T onClick={() => openSheet('set-budget', { current: budget, onSave: setBudget })} style={{ ...gl('rgba(37,99,235,0.08)', 10, { boxShadow: 'none', border: '1px solid rgba(37,99,235,0.2)' }), padding: '8px 12px', color: AC, fontSize: 11, fontWeight: 600 }}>
            Edit
          </T>
        </div>
        <div style={{ height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct > 90 ? RD : 'linear-gradient(90deg,#2563eb,#34d399)', borderRadius: 6, transition: 'width .4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: S }}>
          <span>{pct.toFixed(0)}% spent</span>
          <span>{sym}{fmtM(left)} left</span>
        </div>
      </div>

      {/* Week chart */}
      <div style={{ ...gl('rgba(255,255,255,0.05)', 18), padding: 18, marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: W, marginBottom: 14 }}>Last 7 Days</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 110, gap: 8 }}>
          {week.map((d, i) => {
            const h = Math.max(6, (d.a / maxA) * 90);
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 9, color: S2 }}>{sym}{d.a.toFixed(0)}</div>
                <div className="bar-anim" style={{ width: '70%', height: h, borderRadius: 6, background: 'linear-gradient(180deg,rgba(37,99,235,0.7),rgba(37,99,235,0.25))' }} />
                <div style={{ fontSize: 10, color: S, fontWeight: 600 }}>{d.d}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Debit Orders */}
      <DebitOrdersBlock
        orders={orders}
        sym={sym}
        onAdd={() => openSheet('add-debit-order')}
        onEdit={(o: DebitOrder) => openSheet('add-debit-order', { order: o })}
      />

      {/* Categories */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: W }}>By Category</div>
          <T onClick={() => openSheet('add-expense-cat')} style={{ fontSize: 12, color: AC, background: 'none', border: 'none', fontWeight: 600 }}>+ Add</T>
        </div>
        {byCat.map((c) => {
          const bpct = c.budget ? Math.min(100, (c.spent / c.budget) * 100) : 0;
          return (
            <T key={c.id} onClick={() => openCatDetail(c.id, monthKey)} style={{ width: '100%', textAlign: 'left', ...gl('rgba(255,255,255,0.05)', 16, { boxShadow: 'none' }), padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, border: 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: c.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic n={c.icon} s={18} c={c.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: W, fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ color: W, fontSize: 13, fontWeight: 700 }}>{sym}{fmtM(c.spent)}</span>
                </div>
                {c.budget != null && (
                  <>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${bpct}%`, height: '100%', background: c.color }} />
                    </div>
                    <div style={{ fontSize: 10, color: S, marginTop: 3 }}>{sym}{fmtM(c.budget)} budget</div>
                  </>
                )}
              </div>
              <Ic n="ChevronRight" s={16} c={S as any} />
            </T>
          );
        })}
      </div>
    </div>
  );
}

/* ── CATEGORY DETAIL ── */
export function CatDetailScreen({ catId, monthKey, onBack, onPickMonth }: any) {
  const { state } = useHazelStore();
  const sym = getCurrencySym(state.settings.currency);
  const cat = state.expenseCats.find((c) => c.id === catId);
  const txs = state.txs
    .filter((t) => t.cat === catId && t.date.startsWith(monthKey))
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = txs.filter((t) => t.amt < 0).reduce((s, t) => s + Math.abs(t.amt), 0);
  const [y, m] = monthKey.split('-').map(Number);

  return (
    <div className="afu" style={{ padding: '14px 20px 140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <T onClick={onBack} style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: 'none', color: W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic n="ChevronLeft" s={20} />
        </T>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: W, fontSize: 20, fontWeight: 800 }}>{cat?.name ?? 'Category'}</h1>
        </div>
        <T onClick={onPickMonth} style={{ ...gl('rgba(255,255,255,0.07)', 14, { boxShadow: 'none' }), padding: '6px 10px', color: S, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Ic n="Calendar" s={12} /> {MS[m - 1]} {y}
        </T>
      </div>

      <div style={{ ...gl('rgba(255,255,255,0.06)', 20), padding: 18, marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: S, marginBottom: 4 }}>Total spent</div>
        <div style={{ fontSize: 30, color: W, fontWeight: 800, letterSpacing: '-0.02em' }}>{sym}{fmtM(total)}</div>
        <div style={{ fontSize: 11, color: S, marginTop: 4 }}>{txs.length} {txs.length === 1 ? 'transaction' : 'transactions'}</div>
      </div>

      {txs.length === 0 ? (
        <div style={{ ...gl(), padding: 24, textAlign: 'center', color: S }}>No activity this month.</div>
      ) : (
        txs.map((t, i) => (
          <div key={t.id ?? i} style={{ ...gl('rgba(255,255,255,0.05)', 16, { boxShadow: 'none' }), padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: t.ibg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic n={t.icon} s={18} c={t.ic} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: W, fontSize: 14, fontWeight: 600 }}>{t.name}</div>
              <div style={{ color: S, fontSize: 11 }}>{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
            <div style={{ color: t.amt > 0 ? GN : W, fontSize: 14, fontWeight: 700 }}>
              {t.amt > 0 ? '+' : '-'}{sym}{Math.abs(t.amt).toFixed(2)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ── WALLET (cards + crypto merged) ── */
export function WalletScreen({ openSheet, cardVis, setCardVis }: any) {
  const { state, set } = useHazelStore();
  const sym = getCurrencySym(state.settings.currency);
  const cryptoTotal = useMemo(() => CRYPTO.reduce((s, c) => s + c.price * c.bal, 0), []);

  return (
    <div className="afu" style={{ padding: '14px 20px 140px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1 style={{ color: W, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Assets</h1>
        <T onClick={() => setCardVis(!cardVis)} style={{ ...gl('rgba(255,255,255,0.07)', 14, { boxShadow: 'none' }), padding: '8px 12px', color: S, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ic n={cardVis ? 'EyeOff' : 'Eye'} s={14} /> {cardVis ? 'Hide' : 'Show'}
        </T>
      </div>

      {/* Cards section — centered */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: W, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 }}>Cards</div>
        <div className="no-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: 14, scrollSnapType: 'x mandatory', padding: '4px 4px 8px', margin: '0 -20px 0', paddingLeft: 20, paddingRight: 20 }}>
          {state.cards.map((c) => (
            <div key={c.id} style={{ position: 'relative', flex: '0 0 auto', scrollSnapAlign: 'center' }}>
              <CardComp card={c} visible={cardVis} w={340} />
              <T onClick={() => { set((s) => { s.cards = s.cards.filter((x) => x.id !== c.id); }); showToast('Card removed'); }} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic n="X" s={14} />
              </T>
            </div>
          ))}
          <T onClick={() => openSheet('add-card')} style={{ flex: '0 0 auto', scrollSnapAlign: 'center', width: 340, ...gl('rgba(37,99,235,0.08)', 18, { border: '1px solid rgba(37,99,235,0.2)' }), padding: 14, color: AC, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 200 }}>
            <Ic n="Plus" s={16} /> Add New Card
          </T>
        </div>
      </div>

      {/* Crypto section */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: W, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 }}>Crypto Assets</div>
        <div style={{ ...gl('rgba(37,99,235,0.06)', 18), padding: 18, marginBottom: 14, textAlign: 'center', border: '1px solid rgba(37,99,235,0.15)' }}>
          <div style={{ fontSize: 12, color: S, marginBottom: 4 }}>Total Portfolio Value</div>
          <div style={{ fontSize: 28, color: W, fontWeight: 800, letterSpacing: '-0.02em' }}>${fmtM(cryptoTotal)}</div>
        </div>
        {CRYPTO.map((c) => {
          const val = c.price * c.bal;
          const pos = c.chg >= 0;
          return (
            <div key={c.id} style={{ ...gl('rgba(255,255,255,0.05)', 16, { boxShadow: 'none' }), padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <CryptoIcon sym={c.sym} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: W, fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                  <div style={{ color: S, fontSize: 11 }}>{c.sym}</div>
                </div>
                <div style={{ color: pos ? GN : RD, fontSize: 12, fontWeight: 700 }}>{pos ? '+' : ''}{c.chg}%</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: S }}>
                <div><div>Price</div><div style={{ color: W, fontWeight: 600, marginTop: 2 }}>${fmtM(c.price)}</div></div>
                <div style={{ textAlign: 'right' }}><div>Balance</div><div style={{ color: W, fontWeight: 600, marginTop: 2 }}>{c.bal.toLocaleString()} {c.sym}</div><div style={{ color: S2, fontSize: 10 }}>≈ ${fmtM(val)}</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── CHAT LIST ── */
export function ChatScreen({ openSub, openChat }: any) {
  const { state } = useHazelStore();
  const [q, setQ] = useState('');
  const sym = getCurrencySym(state.settings.currency);
  const filtered = useMemo(() => {
    const f = q.toLowerCase();
    return state.conversations.filter((c) => {
      const ct = state.contacts.find((x) => x.id === c.cid);
      return ct && ct.name.toLowerCase().includes(f);
    });
  }, [q, state.conversations, state.contacts]);
  const confirmedContacts = useMemo(() => {
    const f = q.toLowerCase();
    const convIds = new Set(state.conversations.map((c) => c.cid));
    return state.contacts.filter((c) => c.confirmed && !convIds.has(c.id) && c.name.toLowerCase().includes(f));
  }, [q, state.contacts, state.conversations]);
  return (
    <div className="afu" style={{ padding: '14px 20px 140px' }}>
      <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'flex-start', marginLeft: -8 }}>
        <LumensWordmark height={100} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h1 style={{ color: W, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Chat</h1>
        <T onClick={() => openSub('find-people')} style={{ ...gl('rgba(255,255,255,0.07)', 14, { boxShadow: 'none' }), width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S }}>
          <Ic n="UserPlus" s={18} />
        </T>
      </div>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: S2 }}><Ic n="Search" s={16} /></div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats..." style={{ width: '100%', padding: '12px 16px 12px 40px', ...gl(), color: W, fontSize: 13, outline: 'none', minHeight: 48 }} />
      </div>
      <div>
        {filtered.length === 0 && confirmedContacts.length === 0 ? (
          <div style={{ ...gl(), padding: 24, textAlign: 'center', color: S }}>No chats yet. Tap the + icon to find people.</div>
        ) : filtered.map((conv) => {
          const ct = state.contacts.find((x) => x.id === conv.cid);
          if (!ct) return null;
          return (
            <T key={conv.cid} onClick={() => openChat(ct.id)} active="rgba(255,255,255,0.06)" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 4px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
              <Av ini={ct.ini} g={ct.g} on={ct.on} sz={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: W, fontSize: 14, fontWeight: 600 }}>{ct.name}</span>
                  <span style={{ color: S, fontSize: 11 }}>{conv.time}</span>
                </div>
                <div style={{ color: S, fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.last}</div>
              </div>
              {conv.unread > 0 && <div style={{ minWidth: 20, height: 20, borderRadius: 10, background: AC, color: '#001535', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>{conv.unread}</div>}
            </T>
          );
        })}
        {confirmedContacts.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, color: S, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Contacts</div>
            {confirmedContacts.map((ct) => (
              <T key={ct.id} onClick={() => openChat(ct.id)} active="rgba(255,255,255,0.06)" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'left' }}>
                <Av ini={ct.ini} g={ct.g} on={ct.on} sz={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: W, fontSize: 14, fontWeight: 600 }}>{ct.name}</div>
                  <div style={{ color: S, fontSize: 11 }}>Tap to start a chat</div>
                </div>
                <Ic n="MessageCircle" s={16} c={AC as any} />
              </T>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── CHAT VIEW ── */
export function ChatView({ contactId, onBack, onSendMoney }: any) {
  const { state, set } = useHazelStore();
  const ct = state.contacts.find((c) => c.id === contactId);
  const conv = state.conversations.find((c) => c.cid === contactId);
  const sym = getCurrencySym(state.settings.currency);
  const [msg, setMsg] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const fileImgRef = useRef<HTMLInputElement>(null);
  const fileVidRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<{ rec: MediaRecorder; chunks: Blob[]; start: number } | null>(null);
  const [recording, setRecording] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [actionFor, setActionFor] = useState<string | null>(null); // msg id with action popover open
  const [replyTo, setReplyTo] = useState<{ id: string; preview: string } | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conv?.msgs?.length]);
  if (!ct) return null;
  const canRichSend = ct.confirmed === true;

  const send = () => {
    if (!msg.trim()) return;
    const text = msg.trim();
    const ts = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const tmpId = `tmp-${Date.now()}`;
    set((s) => {
      const cv = s.conversations.find((c) => c.cid === contactId);
      const entry = { id: tmpId, text, sent: true, time: ts, pending: true };
      if (cv) {
        cv.msgs.push(entry);
        cv.last = text;
        cv.time = 'Just now';
      } else {
        s.conversations = [{ cid: contactId, last: text, time: 'Just now', unread: 0, msgs: [entry] }, ...s.conversations];
      }
    });
    setMsg('');
    sendChatMessage(contactId, { text }).catch((e) => {
      showToast(e?.message || 'Failed to send');
      set((s) => {
        const cv = s.conversations.find((c) => c.cid === contactId);
        if (cv) cv.msgs = cv.msgs.filter((m) => m.id !== tmpId);
      });
    });
  };

  const pushMsg = (m: { type?: 'image' | 'video' | 'voice' | 'money'; text?: string; media?: string; dur?: number; amt?: number; cur?: string }) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const preview = m.type === 'image' ? '📷 Photo' : m.type === 'video' ? '🎬 Video' : m.type === 'voice' ? '🎙️ Voice note' : m.type === 'money' ? `💸 ${m.cur || ''}${m.amt ?? ''}` : (m.text ?? '');
    const tmpId = `tmp-${Date.now()}`;
    set((s) => {
      const cv = s.conversations.find((c) => c.cid === contactId);
      const entry: any = { ...m, id: tmpId, sent: true, time: ts, pending: true };
      if (cv) {
        cv.msgs.push(entry);
        cv.last = preview;
        cv.time = 'Just now';
      } else {
        s.conversations = [{ cid: contactId, last: preview, time: 'Just now', unread: 0, msgs: [entry] }, ...s.conversations];
      }
    });
    sendChatMessage(contactId, m).catch((e) => {
      showToast(e?.message || 'Failed to send');
      set((s) => {
        const cv = s.conversations.find((c) => c.cid === contactId);
        if (cv) cv.msgs = cv.msgs.filter((mm) => mm.id !== tmpId);
      });
    });
  };

  const fileToDataURL = (f: File) => new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });

  const handleFile = async (e: ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const media = await fileToDataURL(f);
    pushMsg({ type, media });
  };

  const toggleRecord = async () => {
    if (recording && recRef.current) {
      recRef.current.rec.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const start = Date.now();
      rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        const media = await fileToDataURL(new File([blob], 'voice.webm', { type: blob.type }));
        const dur = Math.max(1, Math.round((Date.now() - start) / 1000));
        pushMsg({ type: 'voice', media, dur });
        recRef.current = null;
        setRecording(false);
      };
      recRef.current = { rec, chunks, start };
      rec.start();
      setRecording(true);
    } catch (err) {
      console.error('mic denied', err);
      alert('Microphone permission denied');
    }
  };

  return (
    <div className="afi" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,21,53,0.85)', backdropFilter: 'blur(20px)' }}>
        <T onClick={onBack} active="rgba(255,255,255,0.1)" style={{ padding: 10, background: 'none', border: 'none', color: W, borderRadius: 14, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic n="ChevronLeft" s={20} />
        </T>
        <T onClick={() => setProfileOpen(true)} aria-label="View contact profile" style={{ background: 'none', border: 'none', padding: 0, borderRadius: 22 }}>
          <Av ini={ct.ini} g={ct.g} on={ct.on} sz={40} src={ct.avatar} />
        </T>
        <T onClick={() => setProfileOpen(true)} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', padding: '4px 6px' }}>
          <div style={{ color: W, fontSize: 14, fontWeight: 700 }}>{ct.name}</div>
          <div style={{ color: ct.on ? GN : S, fontSize: 11 }}>{ct.on ? '● Online' : 'Offline'}</div>
        </T>
        <T onClick={onSendMoney} disabled={!canRichSend} aria-label="Send money" style={{ width: 38, height: 38, borderRadius: 19, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)', color: AC, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: canRichSend ? 1 : 0.4 }}>
          <Ic n="DollarSign" s={16} />
        </T>
        <T onClick={() => setMenuOpen((v) => !v)} aria-label="More actions" style={{ width: 38, height: 38, borderRadius: 19, background: 'rgba(255,255,255,0.07)', border: 'none', color: W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic n="MoreVertical" s={18} />
        </T>
        {/* 3-dot dropdown */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 12,
            zIndex: 30,
            minWidth: 200,
            ...gl('rgba(8,28,68,0.95)', 16),
            padding: 6,
            transformOrigin: 'top right',
            transform: menuOpen ? 'translateY(0) scaleY(1)' : 'translateY(-8px) scaleY(0.85)',
            opacity: menuOpen ? 1 : 0,
            pointerEvents: menuOpen ? 'auto' : 'none',
            transition: 'opacity .18s ease, transform .22s cubic-bezier(.2,.9,.3,1.2)',
          }}
        >
          {[
            { icon: 'Video', label: 'Video call', fn: () => { setMenuOpen(false); showToast('Calling…'); }, disabled: !canRichSend },
            { icon: 'ImagePlus', label: 'Attach picture', fn: () => { setMenuOpen(false); fileImgRef.current?.click(); }, disabled: !canRichSend },
            { icon: 'Film', label: 'Attach video', fn: () => { setMenuOpen(false); fileVidRef.current?.click(); }, disabled: !canRichSend },
            { icon: 'UserCircle2', label: 'View profile', fn: () => { setMenuOpen(false); setProfileOpen(true); } },
          ].map((it) => (
            <T key={it.label} onClick={it.fn} disabled={it.disabled} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', color: W, fontSize: 13, fontWeight: 600, textAlign: 'left', borderRadius: 10, opacity: it.disabled ? 0.4 : 1 }}>
              <Ic n={it.icon} s={16} c={AC as any} />
              {it.label}
            </T>
          ))}
        </div>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {conv?.msgs?.map((m) => (
          <div
            key={m.id}
            onContextMenu={(e) => { e.preventDefault(); setActionFor(m.id); }}
            onTouchStart={() => {
              if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
              pressTimerRef.current = setTimeout(() => setActionFor(m.id), 500);
            }}
            onTouchEnd={() => { if (pressTimerRef.current) clearTimeout(pressTimerRef.current); }}
            onTouchMove={() => { if (pressTimerRef.current) clearTimeout(pressTimerRef.current); }}
            onMouseDown={() => {
              if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
              pressTimerRef.current = setTimeout(() => setActionFor(m.id), 500);
            }}
            onMouseUp={() => { if (pressTimerRef.current) clearTimeout(pressTimerRef.current); }}
            onMouseLeave={() => { if (pressTimerRef.current) clearTimeout(pressTimerRef.current); }}
            style={{ display: 'flex', justifyContent: m.sent ? 'flex-end' : 'flex-start', marginBottom: 8, alignItems: 'flex-end', gap: 6, position: 'relative' }}
          >
            <div style={{ maxWidth: '78%', position: 'relative' }}>
              {m.type === 'money' ? (
                <div className={`chat-bubble ${m.sent ? 'bubble-sent' : 'bubble-recv'}`} style={{
                  background: m.sent
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                  color: '#fff',
                  padding: '14px 20px',
                  textAlign: 'center',
                  minWidth: 160,
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(22px)',
                  WebkitBackdropFilter: 'blur(22px)',
                  boxShadow: '0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.85 }}>Sent 💵</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, letterSpacing: '-0.02em' }}>{getCurrencySym(m.cur || state.settings?.currency || 'ZAR')}{(m.amt ?? 0).toFixed(2)}</div>
                </div>
              ) : m.type === 'image' && m.media ? (
                <MediaBubble sent={m.sent} kind="image" src={m.media} filename={`lumens-${m.id}.jpg`} />
              ) : m.type === 'video' && m.media ? (
                <MediaBubble sent={m.sent} kind="video" src={m.media} filename={`lumens-${m.id}.mp4`} />
              ) : m.type === 'voice' && m.media ? (
                <MediaBubble sent={m.sent} kind="voice" src={m.media} dur={m.dur} filename={`lumens-${m.id}.webm`} />
              ) : (
                <div className={`chat-bubble ${m.sent ? 'bubble-sent' : 'bubble-recv'}`} style={{
                  background: m.sent
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                  color: '#fff',
                  padding: '14px 22px',
                  fontSize: 15,
                  fontWeight: 500,
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(22px)',
                  WebkitBackdropFilter: 'blur(22px)',
                  boxShadow: '0 6px 22px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
                  lineHeight: 1.4,
                }}>{m.text}</div>
              )}
              <div style={{ fontSize: 10, color: S2, marginTop: 4, textAlign: m.sent ? 'right' : 'left' }}>{m.time}</div>
              {actionFor === m.id && (
                <MessageActions
                  sent={!!m.sent}
                  canDelete={!!m.sent && !m.pending}
                  canCopy={!!m.text}
                  onClose={() => setActionFor(null)}
                  onCopy={async () => {
                    try { await navigator.clipboard.writeText(m.text || ''); showToast('Copied'); }
                    catch { showToast('Copy failed'); }
                  }}
                  onReply={() => {
                    const prev = m.text || (m.type === 'image' ? '📷 Photo' : m.type === 'video' ? '🎬 Video' : m.type === 'voice' ? '🎙️ Voice note' : '');
                    setReplyTo({ id: m.id, preview: prev.slice(0, 80) });
                  }}
                  onForward={() => showToast('Forward: pick contact (coming soon)')}
                  onDelete={() => {
                    set((s) => {
                      const cv = s.conversations.find((c) => c.cid === contactId);
                      if (cv) cv.msgs = cv.msgs.filter((mm) => mm.id !== m.id);
                    });
                    deleteChatMessage(m.id).catch((e) => showToast(e?.message || 'Failed to delete'));
                  }}
                />
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,21,53,0.85)', backdropFilter: 'blur(20px)' }}>
        {!canRichSend && (
          <div style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fecaca', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic n="Lock" s={14} />
            Both users must accept the request to share money, media and location.
          </div>
        )}
        {replyTo && (
          <div style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 12, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 3, height: 28, background: AC, borderRadius: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: AC, fontWeight: 700 }}>Replying to</div>
              <div style={{ color: W, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.preview}</div>
            </div>
            <T onClick={() => setReplyTo(null)} style={{ width: 26, height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.08)', border: 'none', color: W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic n="X" s={14} />
            </T>
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input ref={fileImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e, 'image')} />
          <input ref={fileVidRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleFile(e, 'video')} />
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Type a message..."
            style={{ flex: 1, padding: '12px 18px', ...gl('rgba(255,255,255,0.07)', 24, { boxShadow: 'none' }), color: W, fontSize: 15, outline: 'none', minHeight: 46, minWidth: 0 }}
          />
          <T onClick={() => fileImgRef.current?.click()} disabled={!canRichSend} aria-label="Attach photo" style={{ width: 38, height: 38, borderRadius: 19, background: 'rgba(255,255,255,0.07)', border: 'none', color: W, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: canRichSend ? 1 : 0.4, cursor: canRichSend ? 'pointer' : 'not-allowed' }}>
            <Ic n="ImagePlus" s={16} />
          </T>
          <T onClick={() => fileVidRef.current?.click()} disabled={!canRichSend} aria-label="Attach video" style={{ width: 38, height: 38, borderRadius: 19, background: 'rgba(255,255,255,0.07)', border: 'none', color: W, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: canRichSend ? 1 : 0.4, cursor: canRichSend ? 'pointer' : 'not-allowed' }}>
            <Ic n="Film" s={16} />
          </T>
          {msg.trim() ? (
            <T onClick={send} aria-label="Send" style={{ width: 44, height: 44, borderRadius: 22, background: AC, border: 'none', color: '#001535', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic n="ArrowUp" s={18} />
            </T>
          ) : (
            <T onClick={toggleRecord} disabled={!canRichSend} aria-label={recording ? 'Stop recording' : 'Record voice note'} style={{ width: 44, height: 44, borderRadius: 22, background: recording ? '#ef4444' : AC, border: 'none', color: '#001535', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: recording ? '0 0 0 4px rgba(239,68,68,0.25)' : 'none', opacity: canRichSend ? 1 : 0.4, cursor: canRichSend ? 'pointer' : 'not-allowed' }}>
              <Ic n={recording ? 'Square' : 'Mic'} s={18} />
            </T>
          )}
        </div>
        {recording && <div style={{ marginTop: 8, fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: '#ef4444', animation: 'pulse 1s infinite' }} /> Recording…</div>}
      </div>
      {profileOpen && <ContactProfileSheet contactId={contactId} fallback={ct} onClose={() => setProfileOpen(false)} />}
    </div>
  );
}

/* ── PROFILE ── */
export function ProfileScreen({ openSub }: any) {
  const { state } = useHazelStore();
  const p = state.profile ?? { name: '', username: '', email: '', phone: '', dob: '', avatar: '', cover: '' } as any;
  const dobDate = p.dob ? new Date(p.dob) : null;
  // Hide year of birth from display (year is private to the user)
  const dobShown = dobDate ? dobDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Not set';
  const items = [
    { icon: 'User', label: 'Edit Profile', fn: () => openSub('edit-profile') },
    { icon: 'Settings', label: 'Settings', fn: () => openSub('settings') },
    { icon: 'Bell', label: 'Notifications', fn: () => openSub('set-notifications') },
    { icon: 'Shield', label: 'Security', fn: () => openSub('security') },
    { icon: 'HelpCircle', label: 'Help & Support', fn: () => openSub('help') },
    { icon: 'LogOut', label: 'Sign out', danger: true, fn: async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.auth.signOut();
    } },
  ];
  return (
    <div className="afu" style={{ padding: '0 0 140px' }}>
      {/* Cover */}
      <div style={{
        height: 160,
        background: p.cover ? `url(${p.cover}) center/cover` : 'linear-gradient(135deg,#0a2858,#143a82,#2563eb)',
        position: 'relative',
      }} />
      <div style={{ padding: '0 20px' }}>
        <div style={{ marginTop: -48, display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <Av ini={(p.name || '').split(' ').map((w: string) => w[0] || '').join('').slice(0, 2)} src={p.avatar} sz={96} />
          <div style={{ flex: 1, paddingBottom: 8 }}>
            <div style={{ color: W, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{p.name}</div>
            <div style={{ color: S, fontSize: 12 }}>{p.username}</div>
          </div>
          <T onClick={() => openSub('edit-profile')} style={{ ...gl('rgba(37,99,235,0.1)', 12, { border: '1px solid rgba(37,99,235,0.25)', boxShadow: 'none' }), padding: '8px 12px', color: AC, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            Edit
          </T>
        </div>

        <div style={{ ...gl('rgba(255,255,255,0.05)', 16), padding: 14, marginTop: 18 }}>
          <Row icon="Mail" label="Email" value={p.email} />
          <Row icon="Phone" label="Phone" value={p.phone} />
          <Row icon="Cake" label="Birthday" value={dobShown} />
          <Row icon="AtSign" label="Username" value={p.username} last />
        </div>

        <div style={{ marginTop: 18 }}>
          {items.map((it, i) => (
            <T key={i} onClick={it.fn} active="rgba(255,255,255,0.08)" style={{ width: '100%', textAlign: 'left', ...gl('rgba(255,255,255,0.04)', 14, { boxShadow: 'none' }), padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, color: it.danger ? RD : W, fontSize: 14, fontWeight: 600 }}>
              <Ic n={it.icon} s={18} c={it.danger ? RD : (AC as any)} />
              <span style={{ flex: 1 }}>{it.label}</span>
              <Ic n="ChevronRight" s={16} c={S as any} />
            </T>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Ic n={icon} s={16} c={COLORS.AC} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: S }}>{label}</div>
        <div style={{ fontSize: 13, color: W, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>
  );
}

/* ── DEBIT ORDERS BLOCK ── */
function DebitOrdersBlock({ orders, sym, onAdd, onEdit }: { orders: DebitOrder[]; sym: string; onAdd: () => void; onEdit: (o: DebitOrder) => void }) {
  const due = orders.filter(isDue);
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: W, display: 'flex', alignItems: 'center', gap: 8 }}>
          Debit Orders
          {due.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(251,191,36,0.18)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)' }}>
              {due.length} due
            </span>
          )}
        </div>
        <T onClick={onAdd} style={{ fontSize: 12, color: AC, background: 'none', border: 'none', fontWeight: 600 }}>+ Add</T>
      </div>
      {orders.length === 0 ? (
        <div style={{ ...gl('rgba(255,255,255,0.05)', 16), padding: 18, textAlign: 'center', color: S, fontSize: 12 }}>
          No debit orders yet. Add your recurring debits to get reminders before they hit.
        </div>
      ) : (
        orders.map((o) => {
          const d = daysUntil(o);
          const overdue = d < 0;
          const soon = d >= 0 && d <= o.remind_days_before;
          const tint = overdue ? '#f87171' : soon ? '#fbbf24' : '#2563eb';
          return (
            <T key={o.id} onClick={() => onEdit(o)} style={{ width: '100%', textAlign: 'left', ...gl('rgba(255,255,255,0.05)', 16, { boxShadow: 'none' }), padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, border: 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: tint + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic n="CalendarClock" s={18} c={tint} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: W, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>
                  <span style={{ color: W, fontSize: 13, fontWeight: 700 }}>{sym}{o.amount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: S }}>
                  <span style={{ textTransform: 'capitalize' }}>{o.period}</span>
                  <span style={{ color: tint, fontWeight: 700 }}>
                    {overdue ? `Overdue ${Math.abs(d)}d` : d === 0 ? 'Today' : `in ${d}d · ${new Date(o.next_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  </span>
                </div>
              </div>
            </T>
          );
        })
      )}
    </div>
  );
}
/* ── DOMICILE WALLET TILE (glassmorphic Send + Deposit) ── */
function DomicileWalletTile({ wallet, sym, onSend, onDeposit }: { wallet: any; sym: string; onSend: () => void; onDeposit: () => void }) {
  return (
    <div
      style={{
        marginBottom: 22,
        padding: 18,
        borderRadius: 22,
        background: 'linear-gradient(135deg, rgba(37,99,235,0.10), rgba(96,165,250,0.08))',
        border: '1px solid rgba(255,255,255,0.14)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Domicile Wallet</div>
          <div style={{ fontSize: 26, color: '#fff', fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {sym}{Number(wallet?.balance ?? 0).toFixed(2)}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 6, letterSpacing: '0.18em', fontVariantNumeric: 'tabular-nums' }}>
            {wallet ? formatWalletUid(wallet.wallet_uid) : '•••• •••• •••• ••••'}
          </div>
        </div>
        <div style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.10)', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>
          {wallet?.currency || 'ZAR'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <T
          onClick={onSend}
          style={{
            padding: '14px 12px',
            borderRadius: 18,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))',
            border: '1px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          <Ic n="Send" s={16} c="#2563eb" /> Send
        </T>
        <T
          onClick={onDeposit}
          style={{
            padding: '14px 12px',
            borderRadius: 18,
            background: 'linear-gradient(135deg, rgba(37,99,235,0.22), rgba(96,165,250,0.10))',
            border: '1px solid rgba(37,99,235,0.30)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          <Ic n="Download" s={16} c="#2563eb" /> Deposit
        </T>
      </div>
    </div>
  );
}

/* ── Message long-press action popover ── */
function MessageActions({ sent, canDelete, canCopy, onClose, onCopy, onReply, onForward, onDelete }: {
  sent: boolean; canDelete: boolean; canCopy: boolean;
  onClose: () => void; onCopy: () => void; onReply: () => void; onForward: () => void; onDelete: () => void;
}) {
  useEffect(() => {
    const fn = () => onClose();
    window.addEventListener('click', fn);
    return () => window.removeEventListener('click', fn);
  }, [onClose]);
  const items: { icon: string; label: string; fn: () => void; danger?: boolean; show: boolean }[] = [
    { icon: 'Copy', label: 'Copy', fn: onCopy, show: canCopy },
    { icon: 'Reply', label: 'Reply', fn: onReply, show: true },
    { icon: 'Forward', label: 'Forward', fn: onForward, show: true },
    { icon: 'Trash2', label: 'Delete', fn: onDelete, danger: true, show: canDelete },
  ];
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 6px)',
        [sent ? 'right' : 'left']: 0,
        zIndex: 20,
        minWidth: 150,
        ...gl('rgba(8,28,68,0.96)', 14),
        padding: 4,
        animation: 'pulse .18s ease',
      }}
    >
      {items.filter((i) => i.show).map((it) => (
        <T key={it.label} onClick={() => { it.fn(); onClose(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'none', border: 'none', color: it.danger ? COLORS.RD : COLORS.W, fontSize: 13, fontWeight: 600, textAlign: 'left', borderRadius: 10 }}>
          <Ic n={it.icon} s={15} c={(it.danger ? COLORS.RD : COLORS.AC) as any} />
          {it.label}
        </T>
      ))}
    </div>
  );
}

/* ── Media bubble with download + share controls ── */
function MediaBubble({ sent, kind, src, dur, filename }: { sent: boolean; kind: 'image' | 'video' | 'voice'; src: string; dur?: number; filename: string }) {
  const download = () => {
    const a = document.createElement('a');
    a.href = src; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  };
  const share = async () => {
    try {
      if ((navigator as any).share) {
        // Try Web Share with file when possible
        try {
          const r = await fetch(src);
          const blob = await r.blob();
          const file = new File([blob], filename, { type: blob.type });
          if ((navigator as any).canShare?.({ files: [file] })) {
            await (navigator as any).share({ files: [file] });
            return;
          }
        } catch {}
        await (navigator as any).share({ title: 'Lumens', url: src });
      } else {
        await navigator.clipboard.writeText(src);
        showToast('Link copied');
      }
    } catch {}
  };
  const bg = sent
    ? 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))'
    : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))';
  return (
    <div className={`chat-bubble ${sent ? 'bubble-sent' : 'bubble-recv'}`} style={{ padding: kind === 'voice' ? '10px 14px' : 4, border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', overflow: 'hidden', background: kind === 'voice' ? bg : undefined, position: 'relative' }}>
      {kind === 'image' && <img src={src} alt="attachment" style={{ display: 'block', maxWidth: 260, maxHeight: 320, borderRadius: 16, objectFit: 'cover' }} />}
      {kind === 'video' && <video src={src} controls style={{ display: 'block', maxWidth: 260, maxHeight: 320, borderRadius: 16 }} />}
      {kind === 'voice' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
          <Ic n="Mic" s={16} />
          <audio src={src} controls style={{ height: 32 }} />
          {dur ? <span style={{ fontSize: 11, opacity: 0.7 }}>{dur}s</span> : null}
        </div>
      )}
      <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4 }}>
        <T onClick={download} aria-label="Download" style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic n="Download" s={13} />
        </T>
        <T onClick={share} aria-label="Share" style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic n="Share2" s={13} />
        </T>
      </div>
    </div>
  );
}

/* ── Contact profile sheet (cover, avatar, bio fields) ── */
function ContactProfileSheet({ contactId, fallback, onClose }: { contactId: string; fallback: any; onClose: () => void }) {
  const [p, setP] = useState<any>(null);
  useEffect(() => {
    let cancelled = false;
    fetchContactProfile(contactId).then((row) => { if (!cancelled) setP(row); }).catch(() => {});
    return () => { cancelled = true; };
  }, [contactId]);
  const name = p?.display_name || fallback?.name || 'Contact';
  const username = p?.username || '';
  const avatar = p?.avatar_url || fallback?.avatar;
  const cover = p?.cover_url;
  const phone = p?.phone || '';
  const dobDate = p?.dob ? new Date(p.dob) : null;
  const dobShown = dobDate ? dobDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '';
  const ini = name.split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto', background: '#001535', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24, animation: 'pulse .22s ease' }}>
        <div style={{ height: 160, background: cover ? `url(${cover}) center/cover` : 'linear-gradient(135deg,#0a2858,#143a82,#2563eb)' }} />
        <div style={{ padding: '0 20px' }}>
          <div style={{ marginTop: -48, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <Av ini={ini} src={avatar} sz={96} />
            <T onClick={onClose} style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.1)', border: 'none', color: COLORS.W, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Ic n="X" s={16} />
            </T>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ color: COLORS.W, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{name}</div>
            {username && <div style={{ color: COLORS.S, fontSize: 13 }}>@{username}</div>}
          </div>
          <div style={{ ...gl('rgba(255,255,255,0.05)', 16), padding: 14, marginTop: 18 }}>
            {phone && <Row icon="Phone" label="Phone" value={phone} />}
            {dobShown && <Row icon="Cake" label="Birthday" value={dobShown} last={!username} />}
            {username && <Row icon="AtSign" label="Username" value={'@' + username} last />}
            {!phone && !dobShown && !username && (
              <div style={{ color: COLORS.S, fontSize: 12, textAlign: 'center', padding: 8 }}>No additional details shared.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
