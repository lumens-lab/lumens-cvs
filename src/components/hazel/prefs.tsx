import { Ic, T, gl, COLORS, PageHeader, showToast } from './ui';
import { useHazelStore } from '@/lib/hazel/store';

const { W, S, AC, BLUE_BRIGHT } = COLORS;

export function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const { state, set } = useHazelStore();
  const n = state.settings.notifications;
  const toggle = (k: keyof typeof n) => set((s) => { (s.settings.notifications as any)[k] = !s.settings.notifications[k]; });

  const groups: { label: string; items: { k: keyof typeof n; icon: string; label: string; desc: string }[] }[] = [
    { label: 'Money', items: [
      { k: 'transactions', icon: 'ArrowLeftRight', label: 'Transactions', desc: 'When money is sent or received' },
      { k: 'budgetAlerts', icon: 'AlertCircle', label: 'Budget alerts', desc: "When you're approaching a limit" },
    ]},
    { label: 'Activity', items: [
      { k: 'chat', icon: 'MessageCircle', label: 'Chat messages', desc: 'New messages from contacts' },
      { k: 'security', icon: 'Shield', label: 'Security alerts', desc: 'Sign-ins, new devices, PIN changes' },
      { k: 'promotions', icon: 'Sparkles', label: 'News & offers', desc: 'Product updates and tips' },
    ]},
    { label: 'Sound', items: [
      { k: 'sound', icon: 'Volume2', label: 'Sounds', desc: 'Play a sound on notification' },
    ]},
  ];

  return (
    <div className="afi" style={{ padding: '0 20px 140px' }}>
      <PageHeader title="Notifications" onBack={onBack} />
      {groups.map((g) => (
        <div key={g.label} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: S, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{g.label}</div>
          {g.items.map((it) => {
            const active = n[it.k];
            return (
              <T key={String(it.k)} onClick={() => { toggle(it.k); showToast(`${it.label} ${active ? 'off' : 'on'}`); }} style={{ width: '100%', ...gl('rgba(255,255,255,0.04)', 14, { boxShadow: 'none' }), padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, color: W, border: 'none', textAlign: 'left' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: active ? 'rgba(37,99,235,0.18)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic n={it.icon} s={18} c={active ? BLUE_BRIGHT : (S as any)} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{it.label}</div>
                  <div style={{ fontSize: 11, color: S, marginTop: 2 }}>{it.desc}</div>
                </div>
                <div style={{ width: 40, height: 24, borderRadius: 12, background: active ? BLUE_BRIGHT : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background .2s' }}>
                  <div style={{ position: 'absolute', top: 2, left: active ? 18 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left .2s' }} />
                </div>
              </T>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function AppearanceScreen({ onBack }: { onBack: () => void }) {
  const { state, set } = useHazelStore();
  const theme = state.settings.theme;
  type Theme = 'dark' | 'light' | 'hazel' | 'peach' | 'graphite' | 'deepnavy';
  const setTheme = (t: Theme) => {
    set((s) => { s.settings.theme = t; });
    showToast(`${t.charAt(0).toUpperCase() + t.slice(1)} theme`);
  };

  const options: { id: Theme; label: string; desc: string; bg: string; ic: string; lightTxt?: boolean }[] = [
    { id: 'dark', label: 'Navy & Blue', desc: 'Deep navy with brilliant blue', bg: 'linear-gradient(135deg,#001535,#052250)', ic: 'Moon' },
    { id: 'light', label: 'White & Blue', desc: 'Crisp white with brilliant blue', bg: 'linear-gradient(135deg,#ffffff,#dceaff)', ic: 'Sun', lightTxt: true },
    { id: 'hazel', label: 'Hazel & Teal', desc: '70% black with hazel + teal', bg: 'linear-gradient(135deg,#0a0a0a,#1a1a1a 60%,#2d1f17)', ic: 'Coffee' },
    { id: 'peach', label: 'Peach & White', desc: 'Soft gray with peach accents', bg: 'linear-gradient(135deg,#f5f5f5,#ffd2be)', ic: 'Sunrise', lightTxt: true },
    { id: 'graphite', label: 'Graphite', desc: 'Premium charcoal with amber', bg: 'linear-gradient(135deg,#16181d,#1f2228 60%,#2a2418)', ic: 'Square' },
    { id: 'deepnavy', label: 'Deep Navy', desc: 'Midnight blue with crystal cyan', bg: 'linear-gradient(135deg,#050b1f,#07142e 60%,#0a3a7a)', ic: 'Anchor' },
  ];

  return (
    <div className="afi" style={{ padding: '0 20px 140px' }}>
      <PageHeader title="Appearance" onBack={onBack} />
      <div style={{ fontSize: 11, color: S, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Themes</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        {options.map((o) => {
          const active = theme === o.id;
          return (
            <T key={o.id} onClick={() => setTheme(o.id)} style={{ padding: 14, borderRadius: 18, background: o.bg, border: active ? '2px solid #2563eb' : '2px solid rgba(255,255,255,0.1)', minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', boxShadow: active ? '0 10px 30px rgba(37,99,235,0.35)' : '0 6px 18px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: o.lightTxt ? 'rgba(37,99,235,0.85)' : 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic n={o.ic} s={18} c={o.lightTxt ? '#fff' : '#fff'} />
                </div>
                {active && <Ic n="CheckCircle2" s={20} c={BLUE_BRIGHT} />}
              </div>
              <div>
                <div style={{ color: o.lightTxt ? '#0b1f44' : '#fff', fontSize: 15, fontWeight: 800, textAlign: 'left' }}>{o.label}</div>
                <div style={{ color: o.lightTxt ? 'rgba(11,31,68,0.65)' : 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 4, textAlign: 'left' }}>{o.desc}</div>
              </div>
            </T>
          );
        })}
      </div>
    </div>
  );
}