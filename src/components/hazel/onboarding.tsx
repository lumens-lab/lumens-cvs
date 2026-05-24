import { useEffect, useState } from 'react';
import { Ic, T, COLORS, showToast } from './ui';
import logo from '@/assets/lumens-logo.png';
import { useHazelStore } from '@/lib/hazel/store';

const { W, S, AC, BLUE_BRIGHT } = COLORS;

/** Splash → onboarding slides → PIN setup. Calls onDone() when complete. */
export function WelcomeFlow({ onDone }: { onDone: () => void }) {
  const { set } = useHazelStore();
  const [stage, setStage] = useState<'splash' | 'intro' | 'pin'>('splash');
  const [slide, setSlide] = useState(0);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (stage !== 'splash') return;
    const t = setTimeout(() => setStage('intro'), 1900);
    return () => clearTimeout(t);
  }, [stage]);

  const slides = [
    { ic: 'Wallet', title: 'One wallet,\nzero friction', body: 'Hold fiat and crypto side by side. Send, receive and swap in a tap.', color: '#2563eb' },
    { ic: 'PieChart', title: 'Budget that\nactually works', body: 'Set monthly limits per category. We track spending automatically.', color: '#5eead4' },
    { ic: 'ScanLine', title: 'Scan to pay,\nscan to track', body: 'Scan a QR to pay anyone. Snap a receipt and log the expense instantly.', color: '#60a5fa' },
    { ic: 'MessageCircle', title: 'Chat &\nsend money', body: 'Pay friends straight from chat. Encrypted, fast, and friendly.', color: '#c084fc' },
  ];

  const enterPin = (d: string) => {
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
          set((s) => { s.pin = pin; s.onboarded = true; });
          showToast('Welcome to Lumens ✨');
          setTimeout(onDone, 300);
        } else {
          showToast("PINs don't match — try again");
          setTimeout(() => { setPin(''); setConfirm(''); setConfirming(false); }, 250);
        }
      }
    }
  };

  // Splash
  if (stage === 'splash') {
    return (
      <Cover>
        <div className="logo-anim" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
          <div className="logo-glow" style={{ background: 'rgba(255,255,255,0.96)', padding: '30px 44px', borderRadius: 28, backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)' }}>
            <img src={logo} alt="Lumens" style={{ height: 128, display: 'block' }} />
          </div>
          <div style={{ color: '#fff', opacity: 0.7, fontSize: 13, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 600 }}>illuminate your money</div>
        </div>
      </Cover>
    );
  }

  // Intro slides
  if (stage === 'intro') {
    const s = slides[slide];
    const isLast = slide === slides.length - 1;
    return (
      <Cover>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', maxWidth: 420, padding: '60px 28px 36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <img src={logo} alt="Lumens" style={{ height: 44, filter: 'brightness(0) invert(1)' }} />
            <T onClick={() => setStage('pin')} style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', fontSize: 13, fontWeight: 600 }}>Skip</T>
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
            <T onClick={() => (isLast ? setStage('pin') : setSlide(slide + 1))} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 22px', borderRadius: 28, background: '#2563eb', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, boxShadow: '0 12px 30px rgba(37,99,235,0.5)' }}>
              {isLast ? 'Get started' : 'Next'} <Ic n="ArrowRight" s={16} />
            </T>
          </div>
        </div>
      </Cover>
    );
  }

  // PIN setup
  const active = confirming ? confirm : pin;
  return (
    <Cover>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '40px 28px', maxWidth: 420, width: '100%' }}>
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
export function PinLock({ onUnlock, onCancel }: { onUnlock: () => void; onCancel?: () => void }) {
  const { state } = useHazelStore();
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  const handle = (d: string) => {
    if (d === 'back') return setPin((p) => p.slice(0, -1));
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === state.pin) onUnlock();
        else { setShake(true); showToast('Wrong PIN'); setTimeout(() => { setPin(''); setShake(false); }, 350); }
      }, 150);
    }
  };

  return (
    <Cover>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '40px 28px', maxWidth: 420, width: '100%' }}>
        {onCancel && (
          <T onClick={onCancel} style={{ position: 'absolute', top: 22, left: 22, width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic n="ChevronLeft" s={20} />
          </T>
        )}
        <img src={logo} alt="Lumens" style={{ height: 64, filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>Enter your PIN</h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 6 }}>Unlock to view your wallet</p>
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

function Keypad({ onTap }: { onTap: (d: string) => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, width: '100%', maxWidth: 280 }}>
      {keys.map((k, i) => k === '' ? <div key={i} /> : (
        <T key={i} onClick={() => onTap(k)} style={{
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