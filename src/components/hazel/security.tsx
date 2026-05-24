import { useState } from 'react';
import { Ic, T, gl, COLORS, PageHeader, showToast } from './ui';
import { useHazelStore } from '@/lib/hazel/store';

const { W, S, AC, GN, RD, BL } = COLORS;

export function SecurityScreen({ onBack, onChangePin }: { onBack: () => void; onChangePin: () => void }) {
  const { state, set } = useHazelStore();
  const sec = state.settings.security;

  const toggle = (k: 'twoFA' | 'biometrics') =>
    set((s) => { s.settings.security[k] = !s.settings.security[k]; });

  return (
    <div className="afi" style={{ padding: '0 20px 140px' }}>
      <PageHeader title="Security" onBack={onBack} />

      <Section label="Authentication">
        <Toggle icon="Shield" label="Two-factor authentication" desc="Add an extra layer at sign-in" active={sec.twoFA} onClick={() => { toggle('twoFA'); showToast(sec.twoFA ? '2FA disabled' : '2FA enabled'); }} />
        <Toggle icon="Fingerprint" label="Biometrics" desc="Use Face ID / fingerprint to unlock" active={sec.biometrics} onClick={() => { toggle('biometrics'); showToast(sec.biometrics ? 'Biometrics off' : 'Biometrics on'); }} />
        <Row icon="Lock" label="Change PIN" desc="Update your 4-digit wallet PIN" onClick={onChangePin} />
      </Section>

      <Section label="Devices">
        {state.settings.devices.map((d) => (
          <div key={d.id} style={{ ...gl('rgba(255,255,255,0.05)', 14, { boxShadow: 'none' }), padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic n={d.name.toLowerCase().includes('iphone') || d.name.toLowerCase().includes('phone') ? 'Smartphone' : 'Laptop'} s={18} c={COLORS.BLUE_BRIGHT} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: W, fontSize: 14, fontWeight: 700 }}>{d.name}{d.current && <span style={{ color: GN, fontSize: 10, fontWeight: 700, marginLeft: 8 }}>• THIS DEVICE</span>}</div>
              <div style={{ color: S, fontSize: 11 }}>{d.lastActive}</div>
            </div>
            {!d.current && (
              <T onClick={() => { set((s) => { s.settings.devices = s.settings.devices.filter((x) => x.id !== d.id); }); showToast('Device signed out'); }} style={{ padding: '6px 10px', borderRadius: 10, background: 'rgba(248,113,113,0.12)', color: RD, fontSize: 11, fontWeight: 700, border: 'none' }}>Sign out</T>
            )}
          </div>
        ))}
      </Section>
    </div>
  );
}

const FAQ_WALLET = [
  { q: 'How do I add a new card?', a: 'Open Wallet → Assets and tap "Add New Card". Enter your card number, name, expiry and pick a theme.' },
  { q: 'How do I set a monthly budget?', a: 'Go to Budget → Edit on the Monthly Budget card, choose a period and amount.' },
  { q: 'Can I scan a receipt to log an expense?', a: 'Yes. Expenses → + Add → Scan receipt. Your camera opens and the image attaches automatically.' },
  { q: 'How do I swap between crypto and fiat?', a: 'Wallet → Swap. Pick the asset you have and the one you want, enter an amount, and confirm.' },
  { q: 'How do I receive crypto?', a: 'Wallet → Receive. Select the asset; share the QR code or wallet address.' },
];
const FAQ_CHAT = [
  { q: 'How do I find friends on Lumens?', a: 'Chat phase → Find. Search by name, email, phone or @username, then tap Connect.' },
  { q: 'How do I send money inside a chat?', a: 'Open a conversation and tap the blue send button or the + icon, then enter the amount.' },
  { q: 'Are chats encrypted?', a: 'Yes — messages are end-to-end encrypted and never leave your device unencrypted.' },
  { q: 'How do I block someone?', a: 'Open the conversation, tap their name, then "Block contact".' },
];

export function HelpScreen({ onBack }: { onBack: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<'wallet' | 'chat' | 'contact'>('wallet');
  const list = tab === 'wallet' ? FAQ_WALLET : tab === 'chat' ? FAQ_CHAT : [];

  return (
    <div className="afi" style={{ padding: '0 20px 140px' }}>
      <PageHeader title="Help & Support" onBack={onBack} />
      <div style={{ display: 'flex', gap: 6, padding: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 14, marginBottom: 16 }}>
        {[
          { id: 'wallet', label: 'Wallet FAQ' },
          { id: 'chat', label: 'Chat FAQ' },
          { id: 'contact', label: 'Contact us' },
        ].map((t) => (
          <T key={t.id} onClick={() => setTab(t.id as any)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: tab === t.id ? 'rgba(37,99,235,0.2)' : 'transparent', color: tab === t.id ? COLORS.BLUE_BRIGHT : S, fontSize: 12, fontWeight: 700, border: 'none' }}>{t.label}</T>
        ))}
      </div>

      {tab !== 'contact' ? (
        list.map((f) => {
          const id = tab + f.q;
          const open = openId === id;
          return (
            <T key={id} onClick={() => setOpenId(open ? null : id)} style={{ width: '100%', textAlign: 'left', ...gl('rgba(255,255,255,0.04)', 14, { boxShadow: 'none' }), padding: 14, marginBottom: 8, border: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, color: W, fontSize: 13, fontWeight: 700 }}>{f.q}</div>
                <Ic n={open ? 'ChevronUp' : 'ChevronDown'} s={16} c={S as any} />
              </div>
              {open && <div style={{ color: S, fontSize: 12, lineHeight: 1.6, marginTop: 10 }}>{f.a}</div>}
            </T>
          );
        })
      ) : (
        <ContactForm />
      )}
    </div>
  );
}

function ContactForm() {
  const [subject, setSubject] = useState('');
  const [msg, setMsg] = useState('');
  const submit = () => {
    if (!subject.trim() || !msg.trim()) return showToast('Fill in both fields');
    showToast('Message sent — we\'ll reply within 24h');
    setSubject(''); setMsg('');
  };
  return (
    <div>
      <div style={{ ...gl('rgba(37,99,235,0.08)', 16, { border: '1px solid rgba(37,99,235,0.2)' }), padding: 14, marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Ic n="Mail" s={20} c={COLORS.BLUE_BRIGHT} />
        <div style={{ flex: 1 }}>
          <div style={{ color: W, fontSize: 13, fontWeight: 700 }}>support@lumens.app</div>
          <div style={{ color: S, fontSize: 11 }}>Average reply: under 24 hours</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: S, marginBottom: 6, fontWeight: 600 }}>Subject</div>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What can we help with?" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: W, fontSize: 14, outline: 'none', marginBottom: 12, fontFamily: 'inherit' }} />
      <div style={{ fontSize: 11, color: S, marginBottom: 6, fontWeight: 600 }}>Message</div>
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Tell us what's going on..." rows={5} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: W, fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
      <T onClick={submit} style={{ width: '100%', padding: 14, borderRadius: 16, background: '#2563eb', border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, marginTop: 14 }}>Send message</T>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, color: S, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</div>
      {children}
    </div>
  );
}

function Toggle({ icon, label, desc, active, onClick }: any) {
  return (
    <T onClick={onClick} active="rgba(255,255,255,0.06)" style={{ width: '100%', ...gl('rgba(255,255,255,0.04)', 14, { boxShadow: 'none' }), padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, color: W, border: 'none', textAlign: 'left' }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: active ? 'rgba(37,99,235,0.18)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Ic n={icon} s={18} c={active ? COLORS.BLUE_BRIGHT : (S as any)} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 11, color: S, marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ width: 40, height: 24, borderRadius: 12, background: active ? COLORS.BLUE_BRIGHT : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background .2s' }}>
        <div style={{ position: 'absolute', top: 2, left: active ? 18 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left .2s' }} />
      </div>
    </T>
  );
}

function Row({ icon, label, desc, onClick }: any) {
  return (
    <T onClick={onClick} active="rgba(255,255,255,0.06)" style={{ width: '100%', ...gl('rgba(255,255,255,0.04)', 14, { boxShadow: 'none' }), padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, color: W, border: 'none', textAlign: 'left' }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Ic n={icon} s={18} c={AC} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 11, color: S, marginTop: 2 }}>{desc}</div>
      </div>
      <Ic n="ChevronRight" s={16} c={S as any} />
    </T>
  );
}