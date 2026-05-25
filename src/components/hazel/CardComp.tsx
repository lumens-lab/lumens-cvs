import { CARD_THEMES, fmtCard } from '@/lib/hazel/data';
import type { Card as CardT } from '@/lib/hazel/store';

export function CardComp({ card, visible, preview, previewData, w = 320 }: {
  card?: CardT;
  visible?: boolean;
  preview?: boolean;
  previewData?: { num: string; holder: string; exp: string; theme: number };
  w?: number;
}) {
  const theme = CARD_THEMES[preview ? (previewData?.theme ?? 0) : (card?.theme ?? 0)];
  const num = preview
    ? (previewData?.num ? fmtCard(previewData.num) : '•••• •••• •••• ••••')
    : (visible ? '•••• •••• •••• ' + card!.num.slice(-4) : '•••• •••• •••• ••••');
  const holder = preview ? (previewData?.holder || 'YOUR NAME') : card!.holder;
  const exp = preview ? (previewData?.exp || 'MM/YY') : card!.exp;
  return (
    <div
      className="afu"
      style={{
        width: w, maxWidth: '100%', aspectRatio: '1.586 / 1', borderRadius: 22,
        background: theme.bg, padding: 22, color: '#fff', position: 'relative',
        overflow: 'hidden', boxShadow: '0 14px 36px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}
    >
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 180, height: 180,
        borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(2px)',
      }} />
      <div style={{
        position: 'absolute', bottom: -60, left: -30, width: 140, height: 140,
        borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', opacity: 0.85 }}>HAZELPAY</div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', opacity: 0.7 }}>CARD</div>
      </div>
      <div style={{ fontSize: 19, letterSpacing: '0.12em', fontWeight: 600, fontVariantNumeric: 'tabular-nums', position: 'relative' }}>
        {num}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative' }}>
        <div>
          <div style={{ fontSize: 9, opacity: 0.6, letterSpacing: '0.1em' }}>CARD HOLDER</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{holder}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, opacity: 0.6, letterSpacing: '0.1em' }}>EXPIRES</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{exp}</div>
        </div>
      </div>
    </div>
  );
}