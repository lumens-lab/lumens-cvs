import { useMemo, useRef, useState } from 'react';
import { Ic, T, gl, COLORS, Sheet, showToast } from './ui';
import { useHazelStore, type Tx } from '@/lib/hazel/store';
import { getCurrencySym } from './screens';

const { W, S, S2, AC, GN, RD } = COLORS;

/* ── EXPENSES LIST ── */
export function ExpensesScreen({ openAdd, openDetail }: { openAdd: () => void; openDetail: (id: number) => void }) {
  const { state } = useHazelStore();
  const sym = getCurrencySym(state.settings.currency);
  const [q, setQ] = useState('');
  const expenses = useMemo(
    () =>
      state.txs
        .filter((t) => t.amt < 0 && t.name.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.txs, q],
  );
  const today = new Date().toISOString().slice(0, 10).slice(0, 7);
  const monthTotal = expenses
    .filter((t) => t.date.startsWith(today))
    .reduce((s, t) => s + Math.abs(t.amt), 0);

  return (
    <div className="afu" style={{ padding: '14px 20px 140px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ color: W, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Expenses</h1>
        <T onClick={openAdd} style={{ ...gl('rgba(94,234,212,0.12)', 14, { boxShadow: 'none', border: '1px solid rgba(94,234,212,0.3)' }), padding: '8px 14px', color: AC, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ic n="Plus" s={16} /> Add
        </T>
      </div>

      <div style={{ ...gl('rgba(94,234,212,0.06)', 20), padding: 18, marginBottom: 16, textAlign: 'center', border: '1px solid rgba(94,234,212,0.15)' }}>
        <div style={{ fontSize: 12, color: S, marginBottom: 4 }}>Spent this month</div>
        <div style={{ fontSize: 28, color: W, fontWeight: 800, letterSpacing: '-0.02em' }}>{sym}{monthTotal.toFixed(2)}</div>
        <div style={{ fontSize: 11, color: S, marginTop: 4 }}>{expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} total</div>
      </div>

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: S2 }}>
          <Ic n="Search" s={16} />
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search expenses..." style={{ width: '100%', padding: '12px 16px 12px 40px', ...gl(), color: W, fontSize: 13, outline: 'none', minHeight: 48 }} />
      </div>

      {expenses.length === 0 ? (
        <div style={{ ...gl(), padding: 24, textAlign: 'center', color: S }}>No expenses yet. Tap “+ Add” to record one.</div>
      ) : (
        expenses.map((t) => (
          <T key={t.id} onClick={() => openDetail(t.id!)} active="rgba(255,255,255,0.06)" style={{ width: '100%', textAlign: 'left', ...gl('rgba(255,255,255,0.05)', 16, { boxShadow: 'none' }), padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, border: 'none' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: t.ibg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Ic n={t.icon} s={18} c={t.ic} />
              {t.receipt && <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, background: AC, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="Paperclip" s={9} c="#001535" /></div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: W, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
              <div style={{ color: S, fontSize: 11 }}>{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{t.merchant ? ` • ${t.merchant}` : ''}</div>
            </div>
            <div style={{ color: W, fontSize: 14, fontWeight: 700 }}>{sym}{Math.abs(t.amt).toFixed(2)}</div>
          </T>
        ))
      )}
    </div>
  );
}

/* ── EXPENSE DETAIL ── */
export function ExpenseDetailScreen({ id, onBack }: { id: number; onBack: () => void }) {
  const { state, set } = useHazelStore();
  const sym = getCurrencySym(state.settings.currency);
  const tx = state.txs.find((t) => t.id === id);
  if (!tx) return null;
  const cat = state.expenseCats.find((c) => c.id === tx.cat);

  return (
    <div className="afi" style={{ padding: '14px 20px 140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <T onClick={onBack} style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: 'none', color: W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic n="ChevronLeft" s={20} />
        </T>
        <h1 style={{ color: W, fontSize: 20, fontWeight: 800, flex: 1 }}>Expense</h1>
        <T onClick={() => { set((s) => { s.txs = s.txs.filter((t) => t.id !== id); }); showToast('Deleted'); onBack(); }} style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: RD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic n="Trash2" s={18} />
        </T>
      </div>

      <div style={{ ...gl('rgba(255,255,255,0.06)', 22), padding: 22, marginBottom: 16, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', width: 54, height: 54, borderRadius: 16, background: tx.ibg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Ic n={tx.icon} s={26} c={tx.ic} />
        </div>
        <div style={{ fontSize: 14, color: S, marginBottom: 4 }}>{tx.name}</div>
        <div style={{ fontSize: 32, color: W, fontWeight: 800, letterSpacing: '-0.02em' }}>{sym}{Math.abs(tx.amt).toFixed(2)}</div>
        <div style={{ fontSize: 12, color: S, marginTop: 6 }}>{new Date(tx.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
      </div>

      <div style={{ ...gl('rgba(255,255,255,0.04)', 18), padding: 16, marginBottom: 16 }}>
        <Row label="Category" value={cat?.name ?? tx.cat} />
        {tx.merchant && <Row label="Merchant" value={tx.merchant} />}
        {tx.note && <Row label="Note" value={tx.note} />}
      </div>

      {tx.items && tx.items.length > 0 && (
        <div style={{ ...gl('rgba(255,255,255,0.04)', 18), padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: S, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Items</div>
          {tx.items.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i === tx.items!.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: W, fontSize: 13 }}>{it.name}</span>
              <span style={{ color: W, fontSize: 13, fontWeight: 600 }}>{sym}{it.amt.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {tx.receipt && (
        <div style={{ ...gl('rgba(255,255,255,0.04)', 18), padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: S, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 4px' }}>Receipt</div>
          <img src={tx.receipt} alt="Receipt" style={{ width: '100%', borderRadius: 12, display: 'block' }} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ color: S, fontSize: 12 }}>{label}</span>
      <span style={{ color: W, fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

/* ── ADD EXPENSE SHEET ── */
export function AddExpenseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, set } = useHazelStore();
  const sym = getCurrencySym(state.settings.currency);
  const [name, setName] = useState('');
  const [amt, setAmt] = useState('');
  const [cat, setCat] = useState(state.expenseCats[0]?.id ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<string>('');
  const [items, setItems] = useState<{ name: string; amt: number }[]>([]);
  const scanRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const reset = () => { setName(''); setAmt(''); setCat(state.expenseCats[0]?.id ?? ''); setDate(new Date().toISOString().slice(0, 10)); setMerchant(''); setNote(''); setReceipt(''); setItems([]); };

  const readFile = (file: File, cb: (dataUrl: string) => void) => {
    if (file.size > 6 * 1024 * 1024) return showToast('Image too large (max 6MB)');
    const r = new FileReader();
    r.onload = () => cb(r.result as string);
    r.readAsDataURL(file);
  };

  // Scan-to-fill: capture from camera, store image, prefill with placeholder
  // fields the user can edit. Real OCR can be added later by piping `img`
  // through Tesseract.js / a vision API; the UI is structured for it.
  const onScan = () => {
    const f = scanRef.current?.files?.[0];
    if (!f) return;
    readFile(f, (img) => {
      setReceipt(img);
      if (!name) setName('Receipt purchase');
      if (!merchant) setMerchant('Detected merchant');
      showToast('Receipt scanned — review fields');
    });
    if (scanRef.current) scanRef.current.value = '';
  };

  const onPhoto = () => {
    const f = photoRef.current?.files?.[0];
    if (!f) return;
    readFile(f, (img) => { setReceipt(img); showToast('Receipt photo attached'); });
    if (photoRef.current) photoRef.current.value = '';
  };

  const addItem = () => setItems([...items, { name: '', amt: 0 }]);
  const updateItem = (i: number, p: Partial<{ name: string; amt: number }>) => {
    setItems(items.map((it, ix) => (ix === i ? { ...it, ...p } : it)));
  };
  const removeItem = (i: number) => setItems(items.filter((_, ix) => ix !== i));

  const save = () => {
    const n = parseFloat(amt);
    if (!name.trim()) return showToast('Enter a name');
    if (!n || n <= 0) return showToast('Enter a valid amount');
    if (!cat) return showToast('Pick a category');
    const c = state.expenseCats.find((x) => x.id === cat)!;
    const tx: Tx = {
      id: Date.now(),
      name: name.trim(),
      cat,
      icon: c.icon,
      ibg: c.color + '22',
      ic: c.color,
      date,
      amt: -Math.abs(n),
      merchant: merchant.trim() || undefined,
      note: note.trim() || undefined,
      receipt: receipt || undefined,
      items: items.filter((i) => i.name.trim()).length ? items.filter((i) => i.name.trim()) : undefined,
    };
    set((s) => { s.txs = [tx, ...s.txs]; });
    reset(); onClose(); showToast('Expense saved');
  };

  return (
    <Sheet open={open} onClose={() => { reset(); onClose(); }} title="Add Expense">
      {/* Scan & Photo actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4, marginBottom: 14 }}>
        <T onClick={() => scanRef.current?.click()} style={{ ...gl('rgba(94,234,212,0.1)', 14, { border: '1px solid rgba(94,234,212,0.25)', boxShadow: 'none' }), padding: '14px 8px', color: AC, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Ic n="ScanLine" s={18} /> Scan receipt
        </T>
        <T onClick={() => photoRef.current?.click()} style={{ ...gl('rgba(96,165,250,0.1)', 14, { border: '1px solid rgba(96,165,250,0.25)', boxShadow: 'none' }), padding: '14px 8px', color: COLORS.BL, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Ic n="Camera" s={18} /> Photo only
        </T>
        <input ref={scanRef} type="file" accept="image/*" capture="environment" onChange={onScan} style={{ display: 'none' }} />
        <input ref={photoRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} style={{ display: 'none' }} />
      </div>

      {receipt && (
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <img src={receipt} alt="Receipt preview" style={{ width: '100%', borderRadius: 14, display: 'block', maxHeight: 240, objectFit: 'cover' }} />
          <T onClick={() => setReceipt('')} style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic n="X" s={14} />
          </T>
        </div>
      )}

      <Field label="What was it?"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Groceries at Pick n Pay" style={inp} /></Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label={`Amount (${sym})`}><input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" style={{ ...inp, fontSize: 20, fontWeight: 700 }} /></Field>
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} /></Field>
      </div>

      <Field label="Merchant (optional)"><input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Store name" style={inp} /></Field>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: S, marginBottom: 8 }}>Category</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }} className="no-scrollbar">
          {state.expenseCats.map((c) => (
            <T key={c.id} onClick={() => setCat(c.id)} style={{ padding: '8px 12px', borderRadius: 12, background: cat === c.id ? c.color + '22' : 'rgba(255,255,255,0.05)', border: cat === c.id ? `1px solid ${c.color}55` : '1px solid transparent', color: cat === c.id ? c.color : W, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <Ic n={c.icon} s={14} /> {c.name}
            </T>
          ))}
        </div>
      </div>

      <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Extra details" style={inp} /></Field>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: S }}>Items (optional)</div>
          <T onClick={addItem} style={{ fontSize: 12, color: AC, background: 'none', border: 'none', fontWeight: 700 }}>+ Add line</T>
        </div>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} placeholder="Item" style={{ ...inp, flex: 2 }} />
            <input inputMode="decimal" value={String(it.amt)} onChange={(e) => updateItem(i, { amt: parseFloat(e.target.value) || 0 })} placeholder="0.00" style={{ ...inp, flex: 1 }} />
            <T onClick={() => removeItem(i)} style={{ width: 40, borderRadius: 12, background: 'rgba(248,113,113,0.1)', color: RD, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic n="X" s={14} />
            </T>
          </div>
        ))}
      </div>

      <T onClick={save} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#5eead4,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800, marginTop: 8 }}>
        Save Expense
      </T>
    </Sheet>
  );
}

const inp: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: W,
  fontSize: 14,
  outline: 'none',
  minHeight: 44,
  fontFamily: 'inherit',
};

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: S, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}