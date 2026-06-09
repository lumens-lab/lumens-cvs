import { useState, useRef, useEffect, useCallback } from 'react';
import { Ic, T, Av, gl, COLORS, Sheet, showToast } from './ui';
import { CardComp } from './CardComp';
import { CARD_THEMES, MONTHS, PAY_METHODS, GRAD_MAP } from '@/lib/hazel/data';
import { useHazelStore } from '@/lib/hazel/store';
import { ICON_LIBRARY, ICON_COLORS } from '@/lib/hazel/icons';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { createDebitOrder, updateDebitOrder, deleteDebitOrder, type DebitOrder } from '@/lib/hazel/debit-orders';

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
    // Store only the last 4 digits — full PAN is never persisted to localStorage or backups.
    set((s) => { s.cards = [...s.cards, { id: Date.now(), num: n.slice(-4), holder: name.trim().toUpperCase(), exp, theme }]; });
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
            <T key={i} onClick={() => setTheme(i)} style={{ minWidth: 70, height: 50, borderRadius: 12, background: t.bg, border: theme === i ? '2px solid #2563eb' : '2px solid transparent', flexShrink: 0 }} aria-label={t.label} />
          ))}
        </div>
      </div>
      <T onClick={save} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#2563eb,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800, marginTop: 18, marginBottom: 8 }}>Add Card</T>
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
            <T key={p} onClick={() => setPeriod(p)} style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: period === p ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.05)', border: period === p ? '1px solid rgba(37,99,235,0.3)' : '1px solid transparent', color: period === p ? AC : S, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{p}</T>
          ))}
        </div>
        <Field label="Budget amount">
          <input inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" style={inp} />
        </Field>
        <T onClick={() => { const n = parseFloat(val); if (!n || n <= 0) return showToast('Enter a valid amount'); onSave(n); onClose(); showToast('Budget updated'); }} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#2563eb,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800, marginTop: 14 }}>Save Budget</T>
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
          <T key={mn} onClick={() => setMo(i)} style={{ padding: '12px 0', borderRadius: 12, background: mo === i ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.04)', border: mo === i ? '1px solid rgba(37,99,235,0.3)' : '1px solid transparent', color: mo === i ? AC : W, fontSize: 12, fontWeight: 600 }}>{mn.slice(0, 3)}</T>
        ))}
      </div>
      <T onClick={() => { onPick(`${yr}-${String(mo + 1).padStart(2, '0')}`); onClose(); }} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#2563eb,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800 }}>Apply</T>
    </Sheet>
  );
}

/* ── Add expense category ── */
export function AddCatSheet({ open, onClose, kind = 'expense' }: { open: boolean; onClose: () => void; kind?: 'income'|'expense' }) {
  const { set } = useHazelStore();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState('#2563eb');
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
      <T onClick={save} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#2563eb,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800, marginTop: 18 }}>Save</T>
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
              <T onClick={confirm} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#2563eb,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800, marginTop: 14 }}>Send {method.sym}{amt || '0'}</T>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

/* ── Find People ── */
export function FindPeopleScreen({ onBack, onOpenChat }: any) {
  const { state, set } = useHazelStore();
  const [q, setQ] = useState('');
  type Found = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
  type Req = { id: string; from_user: string; to_user: string; name: string; ini: string; g: string; dir: 'sent'|'received'; avatar?: string | null };
  const [results, setResults] = useState<Found[]>([]);
  const [searching, setSearching] = useState(false);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const gs = Object.keys(GRAD_MAP);
  const pickG = (seed: string) => gs[Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % gs.length];
  const initials = (n: string) => n.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const loadReqs = useCallback(async () => {
    const { data, error } = await supabase.rpc('list_contact_requests');
    if (error || !data) return;
    setReqs((data as any[]).map((r) => {
      const name = r.display_name || r.username || 'User';
      const other = r.direction === 'sent' ? r.to_user : r.from_user;
      return { id: r.id, from_user: r.from_user, to_user: r.to_user, name, ini: initials(name), g: pickG(other), dir: r.direction, avatar: r.avatar_url };
    }));
  }, []);

  useEffect(() => { loadReqs(); }, [loadReqs]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('search_profiles', { q: term });
      setSearching(false);
      if (error) { showToast(error.message); return; }
      setResults((data || []) as Found[]);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const sendReq = async (u: Found) => {
    setBusy(u.id);
    const { error } = await supabase.rpc('send_contact_request', { to_user_id: u.id });
    setBusy(null);
    if (error) return showToast(error.message);
    showToast(`Request sent to ${u.display_name || u.username || 'user'}`);
    setResults((r) => r.filter((x) => x.id !== u.id));
    loadReqs();
  };
  const accept = async (r: Req) => {
    setBusy(r.id);
    const { error } = await supabase.rpc('accept_contact_request', { request_id: r.id });
    setBusy(null);
    if (error) return showToast(error.message);
    showToast(`${r.name} added to contacts`);
    // chat-sync subscription on `contacts` will refresh the local list.
    loadReqs();
  };
  const decline = async (r: Req) => {
    setBusy(r.id);
    const { error } = await supabase.rpc('decline_contact_request', { request_id: r.id });
    setBusy(null);
    if (error) return showToast(error.message);
    loadReqs();
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
      {reqs.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: S, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pending Requests</div>
          {reqs.map((r) => (
            <div key={r.id} style={{ ...gl('rgba(255,255,255,0.04)', 14, { boxShadow: 'none' }), padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Av ini={r.ini} g={r.g} sz={40} />
              <div style={{ flex: 1 }}>
                <div style={{ color: W, fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                <div style={{ color: S, fontSize: 11 }}>{r.dir === 'sent' ? 'Request sent' : 'Wants to connect'}</div>
              </div>
              {r.dir === 'received' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <T onClick={() => accept(r)} disabled={busy === r.id} style={{ padding: '6px 12px', borderRadius: 10, background: AC, color: '#001535', fontSize: 11, fontWeight: 700, border: 'none' }}>Accept</T>
                  <T onClick={() => decline(r)} disabled={busy === r.id} style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: W, fontSize: 11, fontWeight: 700, border: 'none' }}>Decline</T>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {q.trim().length >= 2 && (
        <div>
          <div style={{ fontSize: 12, color: S, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Results</div>
          {searching ? (
            <div style={{ ...gl(), padding: 20, textAlign: 'center', color: S }}>Searching…</div>
          ) : results.length === 0 ? (
            <div style={{ ...gl(), padding: 20, textAlign: 'center', color: S }}>No users found</div>
          ) : results.map((u) => {
            const name = u.display_name || u.username || 'User';
            return (
              <div key={u.id} style={{ ...gl('rgba(255,255,255,0.04)', 14, { boxShadow: 'none' }), padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Av ini={initials(name)} g={pickG(u.id)} sz={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: W, fontSize: 13, fontWeight: 600 }}>{name}</div>
                  <div style={{ color: S, fontSize: 11 }}>{u.username ? '@' + u.username : ''}</div>
                </div>
                <T onClick={() => sendReq(u)} disabled={busy === u.id} style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(37,99,235,0.15)', color: AC, fontSize: 11, fontWeight: 700, border: '1px solid rgba(37,99,235,0.3)' }}>{busy === u.id ? '…' : 'Connect'}</T>
              </div>
            );
          })}
        </div>
      )}
      {(() => {
        const confirmed = state.contacts.filter((c) => c.confirmed);
        if (q.trim().length >= 2) return null;
        return (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: S, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Contacts</div>
            {confirmed.length === 0 ? (
              <div style={{ ...gl(), padding: 20, textAlign: 'center', color: S, fontSize: 12 }}>No confirmed contacts yet. Search above to connect.</div>
            ) : confirmed.map((c) => (
              <T key={c.id} onClick={() => onOpenChat?.(c.id)} style={{ width: '100%', textAlign: 'left', ...gl('rgba(255,255,255,0.04)', 14, { boxShadow: 'none' }), padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, border: 'none' }}>
                <Av ini={c.ini} g={c.g} on={c.on} sz={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: W, fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ color: S, fontSize: 11 }}>Tap to chat</div>
                </div>
                <Ic n="MessageCircle" s={16} c={AC as any} />
              </T>
            ))}
          </div>
        );
      })()}
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

  const save = async () => {
    if (!name.trim() || !email.trim()) return showToast('Name and email required');
    set((s) => { s.profile = { name: name.trim(), email: email.trim(), username, phone, dob, avatar, cover }; });
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Upload data-URL images to the public avatars bucket so other users can see them.
        const uploadDataUrl = async (dataUrl: string, kind: 'avatar' | 'cover'): Promise<string> => {
          if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const ext = (blob.type.split('/')[1] || 'png').replace('+xml', '');
          const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
          const up = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: blob.type });
          if (up.error) throw up.error;
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          return data.publicUrl;
        };
        const avatarUrl = await uploadDataUrl(avatar, 'avatar');
        const coverUrl = await uploadDataUrl(cover, 'cover');
        const payload: any = {
          id: user.id,
          display_name: name.trim(),
          username: username || null,
          phone: phone || null,
          dob: dob || null,
          avatar_url: avatarUrl || null,
          cover_url: coverUrl || null,
        };
        const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
        if (error) throw error;
        if (avatarUrl !== avatar) set((s) => { s.profile = { ...s.profile, avatar: avatarUrl }; });
        if (coverUrl !== cover) set((s) => { s.profile = { ...s.profile, cover: coverUrl }; });
      }
      onBack(); showToast('Profile updated');
    } catch (e: any) {
      showToast(e?.message ?? 'Saved locally — sync failed');
      onBack();
    }
  };

  return (
    <div className="afi" style={{ padding: '0 0 140px' }}>
      {/* Cover with edit */}
      <div style={{ height: 160, background: cover ? `url(${cover}) center/cover` : 'linear-gradient(135deg,#0a2858,#143a82,#2563eb)', position: 'relative' }}>
        <T onClick={onBack} style={{ position: 'absolute', top: 14, left: 14, width: 40, height: 40, borderRadius: 14, background: 'rgba(0,0,0,0.4)', color: W, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}><Ic n="ChevronLeft" s={20} /></T>
        <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 8 }}>
          <T onClick={() => cvRef.current?.click()} style={{ padding: '8px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.4)', color: W, border: 'none', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(8px)' }}><Ic n="Camera" s={14} /> {cover ? 'Change' : 'Cover'}</T>
          {cover && (
            <T onClick={() => setCover('')} aria-label="Remove cover" style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(0,0,0,0.4)', color: '#fecaca', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}><Ic n="Trash2" s={14} /></T>
          )}
        </div>
        <input ref={cvRef} type="file" accept="image/*" hidden onChange={() => pickFile(cvRef, setCover)} />
      </div>
      <div style={{ padding: '0 20px' }}>
        <div style={{ marginTop: -48, display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Av ini={name.split(' ').map((w) => w[0]).join('').slice(0, 2)} src={avatar} sz={96} />
            <T onClick={() => avRef.current?.click()} aria-label="Change avatar" style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, background: AC, color: '#001535', border: '3px solid #001535', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic n="Camera" s={14} />
            </T>
            {avatar && (
              <T onClick={() => setAvatar('')} aria-label="Remove avatar" style={{ position: 'absolute', top: 0, right: 0, width: 28, height: 28, borderRadius: 14, background: '#001535', color: '#fecaca', border: '2px solid #001535', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic n="X" s={12} />
              </T>
            )}
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
          <T onClick={save} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#2563eb,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800, marginTop: 14 }}>Save Changes</T>
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

/* ── Add / Edit Debit Order ── */
export function AddDebitOrderSheet({ open, onClose, order }: { open: boolean; onClose: () => void; order?: DebitOrder }) {
  const { user } = useAuth();
  const { state } = useHazelStore();
  const editing = !!order;
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(order?.name ?? '');
  const [amount, setAmount] = useState(order ? String(order.amount) : '');
  const [period, setPeriod] = useState<DebitOrder['period']>(order?.period ?? 'monthly');
  const [categorySlug, setCategorySlug] = useState<string>(order?.category_slug ?? '');
  const [accountId, setAccountId] = useState<string>(order?.account_id ?? '');
  const [nextDate, setNextDate] = useState(order?.next_date ?? today);
  const [remind, setRemind] = useState(order?.remind_days_before ?? 1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(order?.name ?? '');
    setAmount(order ? String(order.amount) : '');
    setPeriod(order?.period ?? 'monthly');
    setCategorySlug(order?.category_slug ?? '');
    setAccountId(order?.account_id ?? '');
    setNextDate(order?.next_date ?? today);
    setRemind(order?.remind_days_before ?? 1);
  }, [open, order, today]);

  const save = async () => {
    if (!user) return showToast('Sign in first');
    const n = parseFloat(amount);
    if (!name.trim()) return showToast('Name required');
    if (!n || n <= 0) return showToast('Enter a valid amount');
    if (!nextDate) return showToast('Pick a date');
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        amount: n,
        period,
        category_slug: categorySlug || null,
        account_id: accountId || null,
        next_date: nextDate,
        remind_days_before: Math.max(0, Math.min(30, Number(remind) || 0)),
        active: true,
      };
      if (editing && order) await updateDebitOrder(order.id, payload);
      else await createDebitOrder(user.id, payload);
      showToast(editing ? 'Debit order updated' : 'Debit order added');
      onClose();
    } catch (e: any) {
      showToast(e?.message || 'Failed to save');
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!order || !confirm('Delete this debit order?')) return;
    setBusy(true);
    try { await deleteDebitOrder(order.id); showToast('Removed'); onClose(); }
    catch (e: any) { showToast(e?.message || 'Failed to delete'); }
    finally { setBusy(false); }
  };

  const periods: DebitOrder['period'][] = ['weekly', 'monthly', 'quarterly', 'yearly'];

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Edit Debit Order' : 'New Debit Order'}>
      <div style={{ marginTop: 4 }}>
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Netflix" style={inp} />
        </Field>
        <Field label="Amount">
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" style={inp} />
        </Field>
        <Field label="Period">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {periods.map((p) => (
              <T key={p} onClick={() => setPeriod(p)} style={{ padding: '10px 0', borderRadius: 12, background: period === p ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.05)', border: period === p ? '1px solid rgba(37,99,235,0.3)' : '1px solid transparent', color: period === p ? AC : S, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{p}</T>
            ))}
          </div>
        </Field>
        <Field label="Next debit date">
          <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} style={inp} />
        </Field>
        <Field label="Category">
          <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} style={{ ...inp, appearance: 'none' }}>
            <option value="" style={{ color: '#000' }}>None</option>
            {state.expenseCats.map((c) => (
              <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Account">
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={{ ...inp, appearance: 'none' }}>
            <option value="" style={{ color: '#000' }}>Default</option>
            {state.accounts.map((a) => (
              <option key={a.id} value={String(a.id)} style={{ color: '#000' }}>{a.name}{a.number ? ` · ${a.number}` : ''}</option>
            ))}
          </select>
        </Field>
        <Field label={`Remind me (${remind} day${remind === 1 ? '' : 's'} before)`}>
          <input type="range" min={0} max={14} value={remind} onChange={(e) => setRemind(Number(e.target.value))} style={{ width: '100%' }} />
        </Field>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {editing && (
            <T disabled={busy} onClick={remove} style={{ flex: 0, padding: '14px 18px', borderRadius: 16, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: RD, fontSize: 14, fontWeight: 700 }}>
              <Ic n="Trash2" s={16} />
            </T>
          )}
          <T disabled={busy} onClick={save} style={{ flex: 1, padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#2563eb,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800 }}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add Debit Order'}
          </T>
        </div>
      </div>
    </Sheet>
  );
}