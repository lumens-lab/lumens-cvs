import { useEffect, useState } from 'react';
import { Ic, T, COLORS, showToast } from './ui';

const { W, AC } = COLORS;

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

/** Bottom banner offering "Install Lumens" on supported browsers. Dismissible. */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem('lumens.install.dismissed') === '1';
  });

  useEffect(() => {
    const onBip = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener('beforeinstallprompt', onBip as any);
    return () => window.removeEventListener('beforeinstallprompt', onBip as any);
  }, []);

  if (!evt || hidden) return null;

  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, bottom: 90, zIndex: 60,
      background: 'rgba(8,28,68,0.95)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 12,
      display: 'flex', alignItems: 'center', gap: 10, color: W, fontSize: 13,
      boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    }}>
      <Ic n="Download" s={18} c={AC as any} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>Install Lumens</div>
        <div style={{ fontSize: 11, opacity: 0.7 }}>Faster launch, offline support, push notifications.</div>
      </div>
      <T onClick={async () => {
        try { await evt.prompt(); const c = await evt.userChoice; if (c.outcome === 'accepted') showToast('Installing…'); } catch {}
        setEvt(null);
      }} style={{ background: AC, color: '#001535', border: 'none', borderRadius: 10, padding: '8px 12px', fontWeight: 800, fontSize: 12 }}>
        Install
      </T>
      <T onClick={() => { setHidden(true); sessionStorage.setItem('lumens.install.dismissed', '1'); }} aria-label="Dismiss" style={{ background: 'transparent', color: W, border: 'none', padding: 6 }}>
        <Ic n="X" s={16} />
      </T>
    </div>
  );
}