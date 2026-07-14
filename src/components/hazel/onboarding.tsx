import { useEffect, useState } from 'react';
import { Ic, T, COLORS, showToast } from './ui';
import logo from '@/assets/lumens-logo.png';
import { useHazelStore } from '@/lib/hazel/store';

const { W, S, AC, BLUE_BRIGHT } = COLORS;

/** Splash → onboarding slides → PIN setup. Calls onDone() when complete. */
export function WelcomeFlow({ onDone }: { onDone: () => void }) {
  const { set } = useHazelStore();
  const [stage, setStage] = useState<'splash' | 'intro' | 'allset'>('splash');
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (stage !== 'splash') return;
    const t = setTimeout(() => setStage('intro'), 5000);
    return () => clearTimeout(t);
  }, [stage]);

  const slides = [
    { ic: 'Wallet', title: 'One wallet,\nzero friction', body: 'Hold fiat and crypto side by side. Send, receive and swap in a tap.', color: '#2563eb' },
    { ic: 'PieChart', title: 'Budget that\nactually works', body: 'Set monthly limits per category. We track spending automatically.', color: '#2563eb' },
    { ic: 'ScanLine', title: 'Scan to pay,\nscan to track', body: 'Scan a QR to pay anyone. Snap a receipt and log the expense instantly.', color: '#60a5fa' },
    { ic: 'MessageCircle', title: 'Chat &\nsend money', body: 'Pay friends straight from chat. Encrypted, fast, and friendly.', color: '#c084fc' },
  ];

  const finishWelcome = () => {
    set((s) => { s.onboarded = true; });
    onDone();
  };

  // Splash
  if (stage === 'splash') {
    return (
      <Cover>
        <HaloLogo size={360} animate sharp />
        <style>{splashCss}</style>
      </Cover>
    );
  }

  // Intro slides
  if (stage === 'intro') {
    const s = slides[slide];
    const isLast = slide === slides.length - 1;
    return (
      <Cover>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', maxWidth: 420, padding: '60px 28px calc(72px + env(safe-area-inset-bottom))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <img src={logo} alt="Lumens" style={{ height: 126, maxWidth: '70vw', objectFit: 'contain' }} />
            <T onClick={() => setStage('allset')} style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', fontSize: 13, fontWeight: 600 }}>Skip</T>
          </div>
          <div key={slide} className="afu" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 24 }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: s.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${s.color}55` }}>
              <Ic n={s.ic} s={36} c={s.color} />
            </div>
            <h1 style={{ color: '#fff', fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', whiteSpace: 'pre-line' }}>{s.title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.6, maxWidth: 340 }}>{s.body}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {slides.map((_, i) => (
                <div key={i} style={{ width: i === slide ? 24 : 6, height: 6, borderRadius: 3, background: i === slide ? '#2563eb' : 'rgba(255,255,255,0.25)', transition: 'width .25s' }} />
              ))}
            </div>
            <T onClick={() => (isLast ? setStage('allset') : setSlide(slide + 1))} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 22px', borderRadius: 28, background: '#2563eb', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, boxShadow: '0 12px 30px rgba(37,99,235,0.5)' }}>
              {isLast ? 'Get started' : 'Next'} <Ic n="ArrowRight" s={16} />
            </T>
          </div>
        </div>
      </Cover>
    );
  }

  // All-set screen (last page before PIN creation)
  if (stage === 'allset') {
    const checks = [
      'Encrypted messaging enabled',
      'Non-custodial wallet ready',
      'Privacy protection active',
    ];
    return (
      <Cover>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', maxWidth: 420, padding: '32px 28px calc(72px + env(safe-area-inset-bottom))' }}>
          <div />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <HaloLogo size={220} sharp />
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', textAlign: 'center', marginTop: -40 }}>You're all set,<br/>welcome to lumens.</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'stretch', paddingLeft: 8 }}>
              {checks.map((c) => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 13, background: 'rgba(37,99,235,0.25)', border: '1px solid rgba(96,165,250,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ic n="Check" s={14} c="#60a5fa" />
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 500 }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
          <T onClick={finishWelcome} style={{ width: '100%', padding: '18px 22px', borderRadius: 22, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, boxShadow: '0 12px 30px rgba(37,99,235,0.5)' }}>
            Create account →
          </T>
        </div>
      </Cover>
    );
  }

  return null;
}

/** Post-signup PIN setup. Shown only after the user has signed up + verified. */
export function PinSetup({ onDone }: { onDone: () => void }) {
  const { set } = useHazelStore();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirming, setConfirming] = useState(false);

  const enterPin = async (d: string) => {
    if (d === 'back') {
      confirming ? setConfirm((c) => c.slice(0, -1)) : setPin((p) => p.slice(0, -1));
      return;
    }
    if (!confirming) {
      if (pin.length >= 4) return;
      const next = pin + d;
      setPin(next);
      if (next.length === 4) setTimeout(() => setConfirming(true), 200);
    } else {
      if (confirm.length >= 4) return;
      const next = confirm + d;
      setConfirm(next);
      if (next.length === 4) {
        if (next === pin) {
          const { hashPin } = await import('@/lib/hazel/pin');
          const hashed = await hashPin(pin);
          set((s) => { s.pin = hashed; s.onboarded = true; });
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            await supabase.rpc('set_my_pin_hash', { p_hash: hashed });
          } catch {}
          showToast('PIN saved ✨');
          setTimeout(onDone, 300);
        } else {
          showToast("PINs don't match — try again");
          setTimeout(() => { setPin(''); setConfirm(''); setConfirming(false); }, 250);
        }
      }
    }
  };

  const active = confirming ? confirm : pin;
  return (
    <Cover>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '40px 28px calc(80px + env(safe-area-inset-bottom))', maxWidth: 420, width: '100%' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(37,99,235,0.18)', border: '1px solid rgba(37,99,235,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic n="ShieldCheck" s={30} c={BLUE_BRIGHT} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>{confirming ? 'Confirm your PIN' : 'Create a 4-digit PIN'}</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 8 }}>Required to open your wallet</p>
        </div>
        <PinDots value={active} />
        <Keypad onTap={enterPin} />
      </div>
    </Cover>
  );
}

/** Lock screen — verifies user PIN before entering wallet phase. */
export function PinLock({ onUnlock, onCancel, title, subtitle }: { onUnlock: () => void; onCancel?: () => void; title?: string; subtitle?: string }) {
  const { state } = useHazelStore();
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  const handle = (d: string) => {
    if (d === 'back') return setPin((p) => p.slice(0, -1));
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      setTimeout(async () => {
        const { verifyPin } = await import('@/lib/hazel/pin');
        const ok = await verifyPin(next, state.pin);
        if (ok) onUnlock();
        else { setShake(true); showToast('Wrong PIN'); setTimeout(() => { setPin(''); setShake(false); }, 350); }
      }, 150);
    }
  };

  return (
    <Cover>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '40px 28px calc(80px + env(safe-area-inset-bottom))', maxWidth: 420, width: '100%' }}>
        {onCancel && (
          <T onClick={onCancel} style={{ position: 'absolute', top: 22, left: 22, width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic n="ChevronLeft" s={20} />
          </T>
        )}
        <img src={logo} alt="Lumens" style={{ height: 126, maxWidth: '70vw', objectFit: 'contain', opacity: 0.95 }} />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>{title ?? 'Enter your PIN'}</h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 6 }}>{subtitle ?? 'Unlock to view your wallet'}</p>
        </div>
        <div className={shake ? 'pin-shake' : ''}><PinDots value={pin} /></div>
        <Keypad onTap={handle} />
      </div>
    </Cover>
  );
}

/* shared bits */
function Cover({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'radial-gradient(ellipse at top, #0a2a6e 0%, #001535 55%, #00081a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -120, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.5), transparent 70%)', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.4), transparent 70%)', filter: 'blur(50px)' }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

function PinDots({ value }: { value: string }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{
          width: 16, height: 16, borderRadius: 8,
          background: i < value.length ? '#2563eb' : 'transparent',
          border: `2px solid ${i < value.length ? '#2563eb' : 'rgba(255,255,255,0.3)'}`,
          transition: 'background .15s',
        }} />
      ))}
    </div>
  );
}

/** White logo with a soft pulsing blue halo (from the design spec). */
function HaloLogo({ size = 220, animate = false, sharp = false }: { size?: number; animate?: boolean; sharp?: boolean }) {
  const halo = size * 1.6;
  return (
    <div style={{ position: 'relative', width: halo, height: halo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className={animate ? 'halo-breathe' : ''} style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, rgba(120,180,255,0.7) 0%, rgba(40,110,255,0.35) 30%, rgba(0,60,200,0.15) 55%, transparent 75%)', filter: 'blur(28px)' }} />
      <img
        src={logo}
        alt="Lumens"
        className={animate ? 'logo-reveal logo-pulse' : 'halo-pulse'}
        decoding="async"
        loading="eager"
        width={size * 2}
        height={size * 2}
        style={{
          width: size,
          height: 'auto',
          position: 'relative',
          zIndex: 1,
          // Crisp logo: minimal drop-shadow on the image itself; the soft halo
          // is rendered as a separate blurred radial behind it so the logo
          // edges stay razor-sharp.
          filter: sharp
            ? 'drop-shadow(0 0 2px rgba(255,255,255,0.45))'
            : 'drop-shadow(0 0 4px rgba(255,255,255,0.6)) drop-shadow(0 0 14px rgba(120,180,255,0.55))',
          imageRendering: 'auto',
          WebkitBackfaceVisibility: 'hidden',
          willChange: 'transform, filter',
          transform: 'translateZ(0)',
        }}
      />
    </div>
  );
}

function Keypad({ onTap }: { onTap: (d: string) => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, width: '100%', maxWidth: 280 }}>
      {keys.map((k, i) => k === '' ? <div key={i} /> : (
        <T key={i} onClick={() => { try { (navigator as any).vibrate?.(8); } catch {} ; onTap(k); }} style={{
          height: 60, borderRadius: 20,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#fff', fontSize: 22, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {k === 'back' ? <Ic n="Delete" s={20} c="#fff" /> : k}
        </T>
      ))}
    </div>
  );
}

const splashCss = `
  .logo-reveal { animation: logoReveal 1.8s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
  .logo-pulse  { animation: logoReveal 1.8s cubic-bezier(0.34,1.56,0.64,1) 0.1s both,
                            logoPulse 2.6s ease-in-out 1.9s infinite; }
  .halo-breathe { animation: haloBreathe 2.6s ease-in-out infinite; }
  @keyframes logoReveal {
    from { opacity: 0; transform: scale(0.6) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes logoPulse {
    0%,100% { transform: scale(1)    translateZ(0); }
    50%     { transform: scale(1.02) translateZ(0); }
  }
  @keyframes haloBreathe {
    0%,100% { opacity: 0.85; transform: scale(1); }
    50%     { opacity: 1;    transform: scale(1.06); }
  }
`;