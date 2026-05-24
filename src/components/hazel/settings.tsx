import { useRef, useState } from 'react';
import { Ic, T, gl, COLORS, showToast, PageHeader } from './ui';
import { Field, inp } from './sheets';
import { CURRENCIES, LANGUAGES } from '@/lib/hazel/data';
import { useHazelStore, exportState, importState, resetState } from '@/lib/hazel/store';
import type { Cat } from '@/lib/hazel/store';

const { W, S, S2, AC, GN, RD, BL } = COLORS;

export type SettingsScreen =
  | 'settings'
  | 'set-currency'
  | 'set-language'
  | 'set-backup'
  | 'set-accounts'
  | 'set-income-cats'
  | 'set-expense-cats';

export function SettingsRoot({ go, onBack }: { go: (s: SettingsScreen) => void; onBack: () => void }) {
  const items: { id: SettingsScreen; icon: string; label: string; desc: string }[] = [
    { id: 'set-currency', icon: 'DollarSign', label: 'Preferred Currency', desc: 'Set your default currency' },
    { id: 'set-language', icon: 'Languages', label: 'Language', desc: 'Choose your language' },
    { id: 'set-backup', icon: 'CloudUpload', label: 'Backup & Export', desc: 'Backup data, export expenses' },
    { id: 'set-accounts', icon: 'Landmark', label: 'Account Settings', desc: 'Manage your bank accounts' },
    { id: 'set-income-cats', icon: 'TrendingUp', label: 'Income Categories', desc: 'Add, edit or remove' },
    { id: 'set-expense-cats', icon: 'TrendingDown', label: 'Expense Categories', desc: 'Add, edit or remove' },
  ];
  return (
    <div className="afi" style={{ padding: '0 20px 100px' }}>
      <PageHeader title="Settings" onBack={onBack} />
      {items.map((it) => (
        <T key={it.id} onClick={() => go(it.id)} active="rgba(255,255,255,0.08)" style={{ width: '100%', textAlign: 'left', ...gl('rgba(255,255,255,0.05)', 16, { boxShadow: 'none' }), padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, color: W }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(94,234,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic n={it.icon} s={18} c={AC} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{it.label}</div>
            <div style={{ fontSize: 11, color: S, marginTop: 2 }}>{it.desc}</div>
          </div>
          <Ic n="ChevronRight" s={16} c={S as any} />
        </T>
      ))}
    </div>
  );
}

export function CurrencyScreen({ onBack }: { onBack: () => void }) {
  const { state, set } = useHazelStore();
  const [q, setQ] = useState('');
  const cur = state.settings.currency;
  const filtered = CURRENCIES.filter((c) => (c.code + c.name).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="afi" style={{ padding: '0 20px 100px' }}>
      <PageHeader title="Preferred Currency" onBack={onBack} />
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: S2 }}><Ic n="Search" s={16} /></div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search currency..." style={{ width: '100%', padding: '12px 16px 12px 40px', ...gl(), color: W, fontSize: 13, outline: 'none', minHeight: 48 }} />
      </div>
      {filtered.map((c) => (
        <T key={c.code} onClick={() => { set((s) => { s.settings.currency = c.code; }); showToast(`Currency set to ${c.code}`); }} style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14, background: cur === c.code ? 'rgba(94,234,212,0.1)' : 'rgba(255,255,255,0.04)', border: cur === c.code ? '1px solid rgba(94,234,212,0.3)' : '1px solid transparent', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12, color: W }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: cur === c.code ? AC : W }}>{c.symbol}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{c.code}</div>
            <div style={{ fontSize: 11, color: S }}>{c.name}</div>
          </div>
          {cur === c.code && <Ic n="Check" s={18} c={AC} />}
        </T>
      ))}
    </div>
  );
}

export function LanguageScreen({ onBack }: { onBack: () => void }) {
  const { state, set } = useHazelStore();
  const cur = state.settings.language;
  return (
    <div className="afi" style={{ padding: '0 20px 100px' }}>
      <PageHeader title="Language" onBack={onBack} />
      {LANGUAGES.map((l) => (
        <T key={l.code} onClick={() => { set((s) => { s.settings.language = l.code; }); showToast(`Language set to ${l.name}`); }} style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14, background: cur === l.code ? 'rgba(94,234,212,0.1)' : 'rgba(255,255,255,0.04)', border: cur === l.code ? '1px solid rgba(94,234,212,0.3)' : '1px solid transparent', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12, color: W }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{l.name}</div>
            <div style={{ fontSize: 11, color: S }}>{l.native}</div>
          </div>
          {cur === l.code && <Ic n="Check" s={18} c={AC} />}
        </T>
      ))}
    </div>
  );
}

export function BackupScreen({ onBack }: { onBack: () => void }) {
  const { state } = useHazelStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const download = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => { download(`hazelpay-backup-${Date.now()}.json`, exportState(), 'application/json'); showToast('Backup downloaded'); };
  const exportCSV = () => {
    const headers = ['Date', 'Name', 'Category', 'Amount'];
    const rows = state.txs.map((t) => [t.date, `"${t.name.replace(/"/g, '""')}"`, t.cat, t.amt.toFixed(2)]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    download(`expenses-${Date.now()}.csv`, csv, 'text/csv');
    showToast('Expenses exported as CSV');
  };
  const exportXLS = () => {
    // Simple HTML-based XLS (Excel reads it). Avoids extra deps.
    const rows = state.txs.map((t) => `<tr><td>${t.date}</td><td>${t.name}</td><td>${t.cat}</td><td>${t.amt.toFixed(2)}</td></tr>`).join('');
    const html = `<html><head><meta charset="utf-8"/></head><body><table border="1"><tr><th>Date</th><th>Name</th><th>Category</th><th>Amount</th></tr>${rows}</table></body></html>`;
    download(`expenses-${Date.now()}.xls`, html, 'application/vnd.ms-excel');
    showToast('Expenses exported as XLS');
  };
  const exportPDF = () => {
    // Open print-friendly HTML; user uses browser "Save as PDF"
    const win = window.open('', '_blank');
    if (!win) return showToast('Popup blocked');
    const rows = state.txs.map((t) => `<tr><td>${t.date}</td><td>${t.name}</td><td>${t.cat}</td><td style="text-align:right">${t.amt.toFixed(2)}</td></tr>`).join('');
    win.document.write(`<html><head><title>HazelPay Expenses</title><style>body{font-family:Inter,system-ui;padding:30px}h1{margin:0 0 20px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #eee;font-size:13px;text-align:left}</style></head><body><h1>HazelPay Expenses</h1><table><thead><tr><th>Date</th><th>Name</th><th>Category</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><script>window.print()</script></body></html>`);
    win.document.close();
    showToast('Opening print view...');
  };

  const onImport = () => {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importState(reader.result as string);
      showToast(ok ? 'Backup restored' : 'Invalid backup file');
    };
    reader.readAsText(f);
  };

  const Btn = ({ icon, label, desc, onClick, color = AC, danger }: any) => (
    <T onClick={onClick} active="rgba(255,255,255,0.08)" style={{ width: '100%', textAlign: 'left', ...gl('rgba(255,255,255,0.05)', 14, { boxShadow: 'none' }), padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, color: danger ? RD : W }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: (danger ? RD : color) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Ic n={icon} s={18} c={danger ? RD : color} />
      </div>
      <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div><div style={{ fontSize: 11, color: S, marginTop: 2 }}>{desc}</div></div>
    </T>
  );

  return (
    <div className="afi" style={{ padding: '0 20px 100px' }}>
      <PageHeader title="Backup & Export" onBack={onBack} />
      <div style={{ fontSize: 11, color: S, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Backup</div>
      <Btn icon="Download" label="Download backup" desc="Save your data to a file (JSON)" onClick={exportJSON} />
      <Btn icon="Upload" label="Restore from backup" desc="Import a backup from another device" onClick={() => fileRef.current?.click()} color={BL} />
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />

      <div style={{ fontSize: 11, color: S, margin: '18px 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Export Expenses</div>
      <Btn icon="FileText" label="Export as PDF" desc="Print-ready document" onClick={exportPDF} color={RD} />
      <Btn icon="Sheet" label="Export as XLS" desc="Excel-compatible spreadsheet" onClick={exportXLS} color={GN} />
      <Btn icon="FileSpreadsheet" label="Export as CSV" desc="Comma-separated values" onClick={exportCSV} color={BL} />

      <div style={{ fontSize: 11, color: S, margin: '18px 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Danger zone</div>
      <Btn icon="Trash2" label="Reset all data" desc="Wipes local data and restores defaults" danger onClick={() => { if (confirm('Reset all HazelPay data on this device?')) { resetState(); showToast('Data reset'); } }} />
    </div>
  );
}

export function AccountsScreen({ onBack }: { onBack: () => void }) {
  const { state, set } = useHazelStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Cheque');
  const [number, setNumber] = useState('');
  const save = () => {
    if (!name.trim() || !number.trim()) return showToast('All fields required');
    set((s) => { s.accounts = [...s.accounts, { id: Date.now(), name: name.trim(), type, number: '••••' + number.slice(-4) }]; });
    setName(''); setNumber(''); setAdding(false); showToast('Account added');
  };
  return (
    <div className="afi" style={{ padding: '0 20px 100px' }}>
      <PageHeader title="Account Settings" onBack={onBack} right={
        <T onClick={() => setAdding(!adding)} style={{ padding: '8px 12px', borderRadius: 12, background: 'rgba(94,234,212,0.15)', border: '1px solid rgba(94,234,212,0.3)', color: AC, fontSize: 12, fontWeight: 700 }}>{adding ? 'Cancel' : '+ Add'}</T>
      } />
      {adding && (
        <div style={{ ...gl('rgba(255,255,255,0.05)', 16), padding: 14, marginBottom: 12 }}>
          <Field label="Bank / Provider"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard Bank" style={inp} /></Field>
          <Field label="Type">
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inp, appearance: 'auto' }}>
              <option>Cheque</option><option>Savings</option><option>Credit</option><option>Business</option>
            </select>
          </Field>
          <Field label="Account Number"><input value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))} placeholder="0000000000" style={inp} /></Field>
          <T onClick={save} style={{ width: '100%', padding: 12, borderRadius: 14, background: AC, color: '#001535', border: 'none', fontSize: 14, fontWeight: 800 }}>Save Account</T>
        </div>
      )}
      {state.accounts.map((a) => (
        <div key={a.id} style={{ ...gl('rgba(255,255,255,0.05)', 14, { boxShadow: 'none' }), padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="Landmark" s={18} c={BL} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ color: W, fontSize: 14, fontWeight: 700 }}>{a.name}</div>
            <div style={{ color: S, fontSize: 11 }}>{a.type} · {a.number}</div>
          </div>
          <T onClick={() => { set((s) => { s.accounts = s.accounts.filter((x) => x.id !== a.id); }); showToast('Account removed'); }} style={{ padding: 8, background: 'none', border: 'none', color: RD }}>
            <Ic n="Trash2" s={16} />
          </T>
        </div>
      ))}
    </div>
  );
}

export function CategoriesScreen({ kind, onBack }: { kind: 'income'|'expense'; onBack: () => void }) {
  const { state, set } = useHazelStore();
  const list: Cat[] = kind === 'income' ? state.incomeCats : state.expenseCats;
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#5eead4');
  const [icon, setIcon] = useState('Tag');
  const [budget, setBudget] = useState('');
  const colors = ['#5eead4', '#34d399', '#60a5fa', '#c084fc', '#f87171', '#fb923c', '#fbbf24', '#f472b6'];
  const icons = ['Tag', 'ShoppingBag', 'Coffee', 'Car', 'Music', 'Receipt', 'Home', 'Heart', 'Gift', 'Plane', 'Book', 'Briefcase'];

  const add = () => {
    if (!name.trim()) return showToast('Name required');
    const cat: Cat = { id: Date.now().toString(), name: name.trim(), color, icon, ...(kind === 'expense' && budget ? { budget: parseFloat(budget) } : {}) };
    set((s) => { if (kind === 'expense') s.expenseCats = [...s.expenseCats, cat]; else s.incomeCats = [...s.incomeCats, cat]; });
    setName(''); setBudget(''); setAdding(false); showToast('Category added');
  };
  const remove = (id: string) => set((s) => { if (kind === 'expense') s.expenseCats = s.expenseCats.filter((c) => c.id !== id); else s.incomeCats = s.incomeCats.filter((c) => c.id !== id); });

  return (
    <div className="afi" style={{ padding: '0 20px 100px' }}>
      <PageHeader title={kind === 'income' ? 'Income Categories' : 'Expense Categories'} onBack={onBack} right={
        <T onClick={() => setAdding(!adding)} style={{ padding: '8px 12px', borderRadius: 12, background: 'rgba(94,234,212,0.15)', border: '1px solid rgba(94,234,212,0.3)', color: AC, fontSize: 12, fontWeight: 700 }}>{adding ? 'Cancel' : '+ Add'}</T>
      } />
      {adding && (
        <div style={{ ...gl('rgba(255,255,255,0.05)', 16), padding: 14, marginBottom: 12 }}>
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Travel" style={inp} /></Field>
          {kind === 'expense' && <Field label="Monthly Budget (optional)"><input value={budget} inputMode="decimal" onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" style={inp} /></Field>}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: S, marginBottom: 6 }}>Color</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {colors.map((c) => (<T key={c} onClick={() => setColor(c)} style={{ width: 30, height: 30, borderRadius: 15, background: c, border: color === c ? '3px solid #fff' : '3px solid transparent' }} />))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: S, marginBottom: 6 }}>Icon</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>
              {icons.map((i) => (<T key={i} onClick={() => setIcon(i)} style={{ aspectRatio: '1', borderRadius: 10, background: icon === i ? color + '33' : 'rgba(255,255,255,0.05)', border: icon === i ? `1px solid ${color}` : '1px solid transparent', color: icon === i ? color : W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n={i} s={16} /></T>))}
            </div>
          </div>
          <T onClick={add} style={{ width: '100%', padding: 12, borderRadius: 14, background: AC, color: '#001535', border: 'none', fontSize: 14, fontWeight: 800 }}>Save Category</T>
        </div>
      )}
      {list.map((c) => (
        <div key={c.id} style={{ ...gl('rgba(255,255,255,0.05)', 14, { boxShadow: 'none' }), padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: c.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n={c.icon} s={18} c={c.color} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ color: W, fontSize: 14, fontWeight: 700 }}>{c.name}</div>
            {c.budget != null && <div style={{ color: S, fontSize: 11 }}>Budget: {c.budget.toFixed(2)}</div>}
          </div>
          <T onClick={() => remove(c.id)} style={{ padding: 8, background: 'none', border: 'none', color: RD }}><Ic n="Trash2" s={16} /></T>
        </div>
      ))}
    </div>
  );
}