import { useState, useRef } from 'react';
import { Ic, T, Av, gl, COLORS, Sheet, showToast } from './ui';
import { CardComp } from './CardComp';
import { CARD_THEMES, MONTHS, PAY_METHODS, SEARCH_USERS, GRAD_MAP } from '@/lib/hazel/data';
import { useHazelStore } from '@/lib/hazel/store';
import { ICON_LIBRARY, ICON_COLORS } from '@/lib/hazel/icons';

const { W, S, S2, AC, GN, RD, BL, PP } = COLORS;

/* ── Add Card ── */
export function AddCardSheet({ open, onClose }: any) {
  const { set } = useHazelStore();
  const [num, setNum] = useState('');
  const [name, setName] = useState('');
  const [exp, setExp] = useState('');
  const [cvv, setCvv] = useState('');
  const [theme, setTheme] = useState(0);

  const save = () => {
    const n = num.replace(/\D/g, '');
    if (n.length < 13) return showToast('Enter a valid card number');
    if (!name.trim()) return showToast('Enter cardholder name');
    if (!/^\d{2}\/\d{2}$/.test(exp)) return showToast('Enter expiry as MM/YY');
    set((s) => { s.cards = [...s.cards, { id: Date.now(), num: n, holder: name.trim().toUpperCase(), exp, theme }]; });
    setNum(''); setName(''); setExp(''); setCvv(''); setTheme(0);
    onClose(); showToast('Card added');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add Card">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, marginTop: 8 }}>
        <CardComp preview previewData={{ num: num.replace(/\D/g, ''), holder: name.trim().toUpperCase(), exp, theme }} w={320} />
      </div>
      <Field label="Card Number"><input inputMode="numeric" maxLength={19} value={num.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim()} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="0000 0000 0000 0000" style={inp} /></Field>
      <Field label="Cardholder Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={inp} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Expiry"><input value={exp} onChange={(e) => {
          let v = e.target.value.replace(/\D/g, '').slice(0, 4);
          if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
          setExp(v);
        }} placeholder="MM/YY" style={inp} /></Field>
        <Field label="CVV"><input inputMode="numeric" maxLength={4} value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))} placeholder="•••" style={inp} /></Field>
      </div>
      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: S, marginBottom: 8 }}>Theme</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }} className="no-scrollbar">
          {CARD_THEMES.map((t, i) => (
            <T key={i} onClick={() => setTheme(i)} style={{ minWidth: 70, height: 50, borderRadius: 12, background: t.bg, border: theme === i ? '2px solid #5eead4' : '2px solid transparent', flexShrink: 0 }} aria-label={t.label} />
          ))}
        </div>
      </div>
      <T onClick={save} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#5eead4,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800, marginTop: 18, marginBottom: 8 }}>Add Card</T>
    </Sheet>
  );
}

/* ── Set Budget ── */
export function SetBudgetSheet({ open, onClose, current, onSave }: any) {
  const [val, setVal] = useState(String(current ?? ''));
  const [period, setPeriod] = useState<'month'|'week'|'custom'>('month');
  return (
    <Sheet open={open} onClose={onClose} title="Set Budget">
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 12, color: S, marginBottom: 8 }}>Period</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['month', 'week', 'custom'] as const).map((p) => (
            <T key={p} onClick={() => setPeriod(p)} style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: period === p ? 'rgba(94,234,212,0.15)' : 'rgba(255,255,255,0.05)', border: period === p ? '1px solid rgba(94,234,212,0.3)' : '1px solid transparent', color: period === p ? AC : S, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{p}</T>
          ))}
        </div>
        <Field label="Budget amount">
          <input inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" style={inp} />
        </Field>
        <T onClick={() => { const n = parseFloat(val); if (!n || n <= 0) return showToast('Enter a valid amount'); onSave(n); onClose(); showToast('Budget updated'); }} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#5eead4,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800, marginTop: 14 }}>Save Budget</T>
      </div>
    </Sheet>
  );
}

/* ── Month Picker ── */
export function MonthPickerSheet({ open, onClose, monthKey, onPick }: any) {
  const [y, m] = (monthKey ?? '2024-12').split('-').map(Number);
  const [yr, setYr] = useState(y || 2024);
  const [mo, setMo] = useState((m || 12) - 1);
  return (
    <Sheet open={open} onClose={onClose} title="Select Month">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 8 }}>
        <T onClick={() => setYr(yr - 1)} style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: 'none', color: W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="ChevronLeft" s={18} /></T>
        <div style={{ color: W, fontSize: 18, fontWeight: 800 }}>{yr}</div>
        <T onClick={() => setYr(yr + 1)} style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: 'none', color: W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="ChevronRight" s={18} /></T>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
        {MONTHS.map((mn, i) => (
          <T key={mn} onClick={() => setMo(i)} style={{ padding: '12px 0', borderRadius: 12, background: mo === i ? 'rgba(94,234,212,0.15)' : 'rgba(255,255,255,0.04)', border: mo === i ? '1px solid rgba(94,234,212,0.3)' : '1px solid transparent', color: mo === i ? AC : W, fontSize: 12, fontWeight: 600 }}>{mn.slice(0, 3)}</T>
        ))}
      </div>
      <T onClick={() => { onPick(`${yr}-${String(mo + 1).padStart(2, '0')}`); onClose(); }} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#5eead4,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800 }}>Apply</T>
    </Sheet>
  );
}

/* ── Add expense category ── */
export function AddCatSheet({ open, onClose, kind = 'expense' }: { open: boolean; onClose: () => void; kind?: 'income'|'expense' }) {
  const { set } = useHazelStore();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState('#5eead4');
  const [budget, setBudget] = useState('');
  const colors = ICON_COLORS;
  const icons = ICON_LIBRARY;
  const save = () => {
    if (!name.trim()) return showToast('Enter a name');
    const cat = { id: Date.now().toString(), name: name.trim(), icon, color, ...(kind === 'expense' && budget ? { budget: parseFloat(budget) } : {}) };
    set((s) => { if (kind === 'expense') s.expenseCats = [...s.expenseCats, cat]; else s.incomeCats = [...s.incomeCats, cat]; });
    setName(''); setBudget(''); onClose(); showToast('Category added');
  };
  return (
    <Sheet open={open} onClose={onClose} title={`Add ${kind === 'expense' ? 'Expense' : 'Income'} Category`}>
      <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Travel" style={inp} /></Field>
      {kind === 'expense' && <Field label="Monthly Budget (optional)"><input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" style={inp} /></Field>}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, color: S, marginBottom: 8 }}>Color</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {colors.map((c) => (
            <T key={c} onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: 16, background: c, border: color === c ? '3px solid #fff' : '3px solid transparent' }} />
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, color: S, marginBottom: 8 }}>Icon</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
          {icons.map((i) => (
            <T key={i} onClick={() => setIcon(i)} style={{ aspectRatio: '1', borderRadius: 12, background: icon === i ? color + '33' : 'rgba(255,255,255,0.05)', border: icon === i ? `1px solid ${color}` : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: icon === i ? color : W }}>
              <Ic n={i} s={18} />
            </T>
          ))}
        </div>
      </div>
      <T onClick={save} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#5eead4,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800, marginTop: 18 }}>Save</T>
    </Sheet>
  );
}

/* ── Send Money ── */
export function SendSheet({ open, onClose, fromChat, recip, onSent, requirePin }: any) {
  const { state } = useHazelStore();
  const [step, setStep] = useState(fromChat ? 2 : 1);
  const [chosen, setChosen] = useState(recip ?? null);
  const [method, setMethod] = useState<any>(null);
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');

  const close = () => { onClose(); setStep(fromChat ? 2 : 1); setChosen(recip ?? null); setMethod(null); setAmt(''); setNote(''); };

  const doSend = () => {
    const n = parseFloat(amt);
    if (!n || n <= 0) return showToast('Enter a valid amount');
    if (!method) return showToast('Choose a payment method');
    onSent?.({ recip: chosen, method, amt: n, note });
    showToast(`${method.sym}${n.toFixed(2)} sent to ${chosen.name}`);
    close();
  };
  const confirm = () => {
    const n = parseFloat(amt);
    if (!n || n <= 0) return showToast('Enter a valid amount');
    if (!method) return showToast('Choose a payment method');
    if (requirePin) requirePin(doSend, 'Confirm transfer', `Enter PIN to send ${method.sym}${n.toFixed(2)}`);
    else doSend();
  };

  return (
    <Sheet open={open} onClose={close} title="Send Money">
      {step === 1 && (
        <div>
          <div style={{ fontSize: 12, color: S, marginBottom: 8 }}>Choose recipient</div>
          {state.contacts.map((c) => (
            <T key={c.id} onClick={() => { setChosen(c); setStep(2); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: 14, marginBottom: 8, textAlign: 'left' }}>
              <Av ini={c.ini} g={c.g} sz={40} />
              <div style={{ flex: 1, color: W, fontSize: 14, fontWeight: 600 }}>{c.name}</div>
              <Ic n="ChevronRight" s={16} c={S as any} />
            </T>
          ))}
        </div>
      )}
      {step === 2 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 14, marginBottom: 14 }}>
            <Av ini={chosen?.ini ?? 'U'} g={chosen?.g} sz={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: S }}>To</div>
              <div style={{ color: W, fontSize: 14, fontWeight: 700 }}>{chosen?.name}</div>
            </div>
            {!fromChat && <T onClick={() => setStep(1)} style={{ fontSize: 11, color: AC, background: 'none', border: 'none', fontWeight: 700 }}>Change</T>}
          </div>
          <div style={{ fontSize: 12, color: S, marginBottom: 8 }}>Payment method</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
            {PAY_METHODS.map((m) => (
              <T key={m.id} onClick={() => setMethod(m)} style={{ padding: 12, borderRadius: 14, background: method?.id === m.id ? m.color : 'rgba(255,255,255,0.04)', border: method?.id === m.id ? `1px solid ${m.ic}55` : '1px solid transparent', textAlign: 'left' }}>
                <Ic n={m.icon} s={18} c={m.ic} />
                <div style={{ color: W, fontSize: 12, fontWeight: 700, marginTop: 6 }}>{m.name}</div>
                <div style={{ color: S, fontSize: 10, marginTop: 2 }}>{m.sub}</div>
              </T>
            ))}
          </div>
          {method && (
            <>
              <Field label={`Amount (${method.cur})`}>
                <input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" style={{ ...inp, fontSize: 22, fontWeight: 700 }} />
              </Field>
              <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's it for?" style={inp} /></Field>
              <T onClick={confirm} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#5eead4,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800, marginTop: 14 }}>Send {method.sym}{amt || '0'}</T>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

/* ── Find People ── */
export function FindPeopleScreen({ onBack }: any) {
  const { state, set } = useHazelStore();
  const [q, setQ] = useState('');
  const ci = new Set(state.contacts.map((c) => c.id));
  const filtered = q ? SEARCH_USERS.filter((u) => !ci.has(u.id) && (u.name + u.email + u.ph + u.uid).toLowerCase().includes(q.toLowerCase())) : [];
  const sendReq = (u: typeof SEARCH_USERS[0]) => {
    set((s) => { s.pendingReqs = [...s.pendingReqs, { id: Date.now(), name: u.name, ini: u.ini, dir: 'sent' as const, g: u.g }]; });
    showToast(`Request sent to ${u.name}`);
  };
  const accept = (name: string) => {
    set((s) => {
      s.pendingReqs = s.pendingReqs.filter((r) => r.name !== name);
      const gs = Object.keys(GRAD_MAP);
      const rg = gs[Math.floor(Math.random() * gs.length)];
      s.contacts = [...s.contacts, { id: Date.now() + Math.random(), name, ini: name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(), ph: 'Added via request', g: rg, on: false }];
    });
    showToast(`${name} added`);
  };
  return (
    <div className="afi" style={{ padding: '14px 20px 140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <T onClick={onBack} style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: 'none', color: W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="ChevronLeft" s={20} /></T>
        <h1 style={{ color: W, fontSize: 20, fontWeight: 800 }}>Find People</h1>
      </div>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: S2 }}><Ic n="Search" s={16} /></div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, phone, @username" style={{ width: '100%', padding: '12px 16px 12px 40px', ...gl(), color: W, fontSize: 13, outline: 'none', minHeight: 48 }} />
      </div>
      {state.pendingReqs.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: S, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pending Requests</div>
          {state.pendingReqs.map((r) => (
            <div key={r.id} style={{ ...gl('rgba(255,255,255,0.04)', 14, { boxShadow: 'none' }), padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Av ini={r.ini} g={r.g} sz={40} />
              <div style={{ flex: 1 }}>
                <div style={{ color: W, fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                <div style={{ color: S, fontSize: 11 }}>{r.dir === 'sent' ? 'Request sent' : 'Wants to connect'}</div>
              </div>
              {r.dir === 'received' && <T onClick={() => accept(r.name)} style={{ padding: '6px 12px', borderRadius: 10, background: AC, color: '#001535', fontSize: 11, fontWeight: 700, border: 'none' }}>Accept</T>}
            </div>
          ))}
        </div>
      )}
      {q && (
        <div>
          <div style={{ fontSize: 12, color: S, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Results</div>
          {filtered.length === 0 ? (
            <div style={{ ...gl(), padding: 20, textAlign: 'center', color: S }}>No results</div>
          ) : filtered.map((u) => (
            <div key={u.id} style={{ ...gl('rgba(255,255,255,0.04)', 14, { boxShadow: 'none' }), padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Av ini={u.ini} g={u.g} sz={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: W, fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                <div style={{ color: S, fontSize: 11 }}>{u.uid}</div>
              </div>
              <T onClick={() => sendReq(u)} style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(94,234,212,0.15)', color: AC, fontSize: 11, fontWeight: 700, border: '1px solid rgba(94,234,212,0.3)' }}>Connect</T>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Edit Profile ── */
export function EditProfileScreen({ onBack }: any) {
  const { state, set } = useHazelStore();
  const p = state.profile;
  const [name, setName] = useState(p.name);
  const [email, setEmail] = useState(p.email);
  const [username, setUsername] = useState(p.username);
  const [phone, setPhone] = useState(p.phone);
  const [dob, setDob] = useState(p.dob);
  const [avatar, setAvatar] = useState(p.avatar || '');
  const [cover, setCover] = useState(p.cover || '');
  const avRef = useRef<HTMLInputElement>(null);
  const cvRef = useRef<HTMLInputElement>(null);

  const pickFile = (ref: React.RefObject<HTMLInputElement | null>, setter: (v: string) => void) => {
    const f = ref.current?.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return showToast('Image too large (max 5MB)');
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(f);
  };

  const save = () => {
    if (!name.trim() || !email.trim()) return showToast('Name and email required');
    set((s) => { s.profile = { name: name.trim(), email: email.trim(), username, phone, dob, avatar, cover }; });
    onBack(); showToast('Profile updated');
  };

  return (
    <div className="afi" style={{ padding: '0 0 140px' }}>
      {/* Cover with edit */}
      <div style={{ height: 160, background: cover ? `url(${cover}) center/cover` : 'linear-gradient(135deg,#0a2858,#143a82,#2563eb)', position: 'relative' }}>
        <T onClick={onBack} style={{ position: 'absolute', top: 14, left: 14, width: 40, height: 40, borderRadius: 14, background: 'rgba(0,0,0,0.4)', color: W, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}><Ic n="ChevronLeft" s={20} /></T>
        <T onClick={() => cvRef.current?.click()} style={{ position: 'absolute', top: 14, right: 14, padding: '8px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.4)', color: W, border: 'none', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(8px)' }}><Ic n="Camera" s={14} /> Cover</T>
        <input ref={cvRef} type="file" accept="image/*" hidden onChange={() => pickFile(cvRef, setCover)} />
      </div>
      <div style={{ padding: '0 20px' }}>
        <div style={{ marginTop: -48, display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Av ini={name.split(' ').map((w) => w[0]).join('').slice(0, 2)} src={avatar} sz={96} />
            <T onClick={() => avRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, background: AC, color: '#001535', border: '3px solid #001535', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic n="Camera" s={14} />
            </T>
            <input ref={avRef} type="file" accept="image/*" hidden onChange={() => pickFile(avRef, setAvatar)} />
          </div>
          <div style={{ flex: 1, paddingBottom: 8 }}>
            <h1 style={{ color: W, fontSize: 22, fontWeight: 800 }}>Edit Profile</h1>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <Field label="Full Name"><input value={name} onChange={(e) => setName(e.target.value)} style={inp} /></Field>
          <Field label="Username"><input value={username} onChange={(e) => setUsername(e.target.value)} style={inp} /></Field>
          <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} /></Field>
          <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} style={inp} /></Field>
          <Field label="Date of Birth (year is private)"><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={inp} /></Field>
          <T onClick={save} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#5eead4,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800, marginTop: 14 }}>Save Changes</T>
        </div>
      </div>
    </div>
  );
}

/* shared field + input style */
export function Field({ label, children }: any) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: S, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  );
}
export const inp: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: 14, outline: 'none', minHeight: 46,
};