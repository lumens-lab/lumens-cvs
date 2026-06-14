import { useState, type ReactNode, type CSSProperties, type ButtonHTMLAttributes } from 'react';
import * as Lucide from 'lucide-react';
import { GRAD_MAP } from '@/lib/hazel/data';

export const COLORS = {
  W: 'var(--lm-w, #fff)',
  S: 'var(--lm-s, rgba(255,255,255,0.5))',
  S2: 'var(--lm-s2, rgba(255,255,255,0.3))',
  AC: '#2563eb',
  GN: '#34d399',
  RD: '#f87171',
  BL: '#60a5fa',
  PP: '#c084fc',
  AM: '#fbbf24',
  BLUE_BRIGHT: '#2563eb',
};

export const gl = (bg = 'rgba(255,255,255,0.08)', rad = 18, x: CSSProperties = {}): CSSProperties => ({
  background: bg,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: rad,
  boxShadow: '0 2px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
  ...x,
});

type IcProps = { n: string; s?: number; c?: string; st?: CSSProperties };
export const Ic = ({ n, s = 20, c = 'currentColor', st }: IcProps) => {
  const Cmp = (Lucide as any)[n] as React.ComponentType<any> | undefined;
  if (!Cmp) return null;
  return <Cmp size={s} color={c} strokeWidth={2} style={{ display: 'inline-block', flexShrink: 0, ...st }} />;
};

type TProps = ButtonHTMLAttributes<HTMLButtonElement> & { active?: string };
export const T = ({ children, onClick, style, active, ...rest }: TProps) => {
  const [p, setP] = useState(false);
  return (
    <button
      {...rest}
      onClick={onClick}
      onTouchStart={() => setP(true)}
      onTouchEnd={() => setP(false)}
      onMouseDown={() => setP(true)}
      onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)}
      style={{
        cursor: 'pointer',
        transition: 'background .12s, transform .12s, opacity .12s',
        transform: p ? 'scale(0.97)' : 'scale(1)',
        opacity: p ? 0.85 : 1,
        background: p && active ? active : (style?.background as any),
        ...style,
      }}
    >
      {children}
    </button>
  );
};

type AvProps = { ini: string; g?: string; sz?: number; on?: boolean; src?: string };
export const Av = ({ ini, g = 'from-teal-400 to-cyan-500', sz = 46, on, src }: AvProps) => (
  <div style={{ position: 'relative', width: sz, height: sz, flexShrink: 0 }}>
    <div
      style={{
        width: sz,
        height: sz,
        borderRadius: '50%',
        background: src ? `url(${src}) center/cover` : (GRAD_MAP[g] || 'linear-gradient(135deg,#2dd4bf,#06b6d4)'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: Math.max(11, sz * 0.34),
        boxShadow: '0 4px 14px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
      }}
    >
      {!src && ini}
    </div>
    {on && (
      <div style={{
        position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%',
        background: '#22c55e', border: '2px solid #001535',
      }} />
    )}
  </div>
);

let toastT: ReturnType<typeof setTimeout> | null = null;
export function showToast(msg: string) {
  const el = document.getElementById('hazel-toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show';
  if (toastT) clearTimeout(toastT);
  toastT = setTimeout(() => { el.className = 'hide'; }, 2200);
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="afi" style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
      <div className="asu no-scrollbar" style={{
        position: 'relative', width: '100%', maxWidth: 480, maxHeight: '92vh', overflow: 'auto',
        background: '#001a44', borderTop: '1px solid rgba(255,255,255,0.12)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 32,
      }}>
        <div style={{ position: 'sticky', top: 0, background: 'linear-gradient(180deg,#001a44,#001a44 70%,transparent)', zIndex: 2, padding: '14px 20px 8px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 14px' }} />
          {title && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{title}</h2>
            <T onClick={onClose} style={{ ...gl('rgba(255,255,255,0.07)', '50%' as any, { boxShadow: 'none' }), width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)' }}>
              <Ic n="X" s={18} />
            </T>
          </div>}
        </div>
        <div style={{ padding: '4px 20px 0' }}>{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({ title, right, onBack }: { title: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onBack && (
          <T onClick={onBack} active="rgba(255,255,255,0.1)" style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic n="ChevronLeft" s={20} />
          </T>
        )}
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</h1>
      </div>
      <div>{right}</div>
    </div>
  );
}