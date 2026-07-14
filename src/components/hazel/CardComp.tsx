import { CARD_THEMES, fmtCard } from '@/lib/hazel/data';
import type { Card as CardT } from '@/lib/hazel/store';

const LOGO_URL =
  'https://storage.googleapis.com/gpt-engineer-file-uploads/zYPpD5bNEXhp5A6FtvNXkWcJ8fC3/social-images/social-1780929728582-lumens_icon-_blue-1.webp';

/** Premium card v2 — Montserrat, ash bezel, teal→sapphire / violet→magenta gradient,
 *  gold EMV chip, lumens wordmark, contactless glyph. Matches uploaded design spec. */
export function CardComp({ card, visible, preview, previewData, w = 340 }: {
  card?: CardT;
  visible?: boolean;
  preview?: boolean;
  previewData?: { num: string; holder: string; exp: string; theme: number };
  w?: number;
}) {
  const themeIdx = preview ? (previewData?.theme ?? 0) : (card?.theme ?? 0);
  // Two flagship gradients from the spec; other CARD_THEMES fall back to their bg.
  const flagship = [
    'linear-gradient(135deg,#0b3d47 0%,#0a6e6e 22%,#0b9080 42%,#5a3d8a 64%,#221560 84%,#0a0a22 100%)',
    'linear-gradient(135deg,#12082e 0%,#260f5a 22%,#58329a 44%,#8a2460 62%,#b81440 80%,#700820 100%)',
  ];
  const bg = themeIdx < flagship.length ? flagship[themeIdx] : (CARD_THEMES[themeIdx]?.bg ?? flagship[0]);
  const isMc = themeIdx === 1;
  const num = preview
    ? (previewData?.num ? fmtCard(previewData.num) : '•••• •••• •••• ••••')
    : (visible ? '•••• •••• •••• ' + card!.num.slice(-4) : '•••• •••• •••• ••••');
  const holder = (preview ? (previewData?.holder || 'YOUR NAME') : card!.holder).toUpperCase();
  const exp = preview ? (previewData?.exp || 'MM/YY') : card!.exp;
  const scale = w / 340;
  return (
    <div style={{
      width: w, maxWidth: '100%', borderRadius: 22, padding: 1.5,
      background: 'linear-gradient(160deg,#8a8a8a 0%,#5a5a5a 30%,#2e2e2e 70%,#1a1a1a 100%)',
      boxShadow: '0 14px 36px rgba(0,0,0,0.45)',
    }}>
      <div style={{
        width: '100%', aspectRatio: '340 / 210', borderRadius: 21,
        padding: `${22 * scale}px ${24 * scale}px`, position: 'relative', overflow: 'hidden',
        background: bg, fontFamily: "'Montserrat', system-ui, sans-serif", color: '#fff',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Sheen + orb */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 21, background: 'linear-gradient(140deg,rgba(255,255,255,0.11) 0%,rgba(255,255,255,0.03) 50%,transparent 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '42%', borderRadius: '21px 21px 55% 55%', background: 'linear-gradient(180deg,rgba(255,255,255,0.07) 0%,transparent 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        {/* Top: logo + contactless */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 * scale, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 26 * scale, height: 26 * scale, borderRadius: 7, overflow: 'hidden' }}>
              <img src={LOGO_URL} alt="Lumens" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <span style={{ fontSize: 13 * scale, fontWeight: 700, color: 'rgba(255,255,255,0.88)', letterSpacing: '0.04em' }}>lumens</span>
          </div>
          <svg width={20 * scale} height={20 * scale} viewBox="0 0 20 20" fill="none" style={{ opacity: 0.5 }}>
            <path d="M10 17C10 17 4 13.5 4 10C4 6.5 10 3 10 3" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M10 17C10 17 16 13.5 16 10C16 6.5 10 3 10 3" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M10 14C10 14 6.5 12 6.5 10C6.5 8 10 6 10 6" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M10 14C10 14 13.5 12 13.5 10C13.5 8 10 6 10 6" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            <circle cx="10" cy="10" r="1.5" fill="white"/>
          </svg>
        </div>

        {/* EMV chip */}
        <div style={{ width: 44 * scale, height: 34 * scale, borderRadius: 7, marginBottom: 14 * scale, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#c8a200 0%,#f0d060 28%,#a87800 50%,#e4c040 72%,#b89000 100%)' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: '30%', background: 'linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.14),rgba(0,0,0,0.06))' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '28%', background: 'linear-gradient(90deg,rgba(0,0,0,0.06),rgba(0,0,0,0.14),rgba(0,0,0,0.06))' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '36%', height: '44%', borderRadius: 3, background: 'linear-gradient(135deg,#e8c840 0%,#c8a010 60%,#f0d060 100%)', border: '0.5px solid rgba(0,0,0,0.18)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg,rgba(255,255,255,0.18),transparent)', borderRadius: '7px 7px 0 0' }} />
        </div>

        {/* PAN */}
        <div style={{ fontSize: 14 * scale, fontWeight: 600, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.9)', marginBottom: 14 * scale, fontVariantNumeric: 'tabular-nums', position: 'relative' }}>{num}</div>

        {/* Bottom row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', marginTop: 'auto' }}>
          <div>
            <div style={{ fontSize: 8 * scale, color: 'rgba(255,255,255,0.36)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>Card holder</div>
            <div style={{ fontSize: 12 * scale, fontWeight: 600, color: 'rgba(255,255,255,0.88)', letterSpacing: '0.06em' }}>{holder}</div>
          </div>
          <div>
            <div style={{ fontSize: 8 * scale, color: 'rgba(255,255,255,0.36)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>Expires</div>
            <div style={{ fontSize: 12 * scale, fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>{exp}</div>
          </div>
          {isMc ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 30 * scale, height: 30 * scale, borderRadius: '50%', background: 'rgba(210,50,20,0.86)', border: '0.5px solid rgba(255,255,255,0.12)' }} />
                <div style={{ width: 30 * scale, height: 30 * scale, borderRadius: '50%', background: 'rgba(255,150,0,0.86)', border: '0.5px solid rgba(255,255,255,0.12)', marginLeft: -11 * scale }} />
              </div>
              <div style={{ fontSize: 8 * scale, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em' }}>mastercard</div>
            </div>
          ) : (
            <div style={{ fontSize: 24 * scale, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.5px', fontStyle: 'italic', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>VISA</div>
          )}
        </div>
      </div>
    </div>
  );
}