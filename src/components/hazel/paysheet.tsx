import { useRef, useState } from 'react';
import { Ic, T, gl, COLORS, Sheet, showToast } from './ui';
import { useHazelStore, type Tx } from '@/lib/hazel/store';
import { getCurrencySym } from './screens';

const { W, S, AC, BLUE_BRIGHT, GN } = COLORS;

/** Scan-to-pay sheet — opens camera, captures QR/payee image, lets the
 *  user enter an amount and confirm. The capture is stored on the tx as a
 *  receipt; integrating a real QR decoder can swap the prefill block. */
export function PaySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, set } = useHazelStore();
  const sym = getCurrencySym(state.settings.currency);
  const [step, setStep] = useState<'scan' | 'confirm'>('scan');
  const [payee, setPayee] = useState('');
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [snap, setSnap] = useState<string>('');
  const camRef = useRef<HTMLInputElement>(null);

  const close = () => { setStep('scan'); setPayee(''); setAmt(''); setNote(''); setSnap(''); onClose(); };

  const onCapture = () => {
    const f = camRef.current?.files?.[0];
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) return showToast('Image too large');
    const r = new FileReader();
    r.onload = () => {
      setSnap(r.result as string);
      // Demo prefill — real QR decode would populate payee/address here.
      setPayee('Lumens merchant');
      setStep('confirm');
      showToast('QR captured — review payment');
    };
    r.readAsDataURL(f);
    if (camRef.current) camRef.current.value = '';
  };

  const pay = () => {
    const n = parseFloat(amt);
    if (!payee.trim()) return showToast('Enter payee');
    if (!n || n <= 0) return showToast('Enter an amount');
    const tx: Tx = {
      id: Date.now(),
      name: `Pay ${payee.trim()}`,
      cat: 'shopping',
      icon: 'QrCode',
      ibg: 'rgba(37,99,235,0.15)',
      ic: BLUE_BRIGHT,
      date: new Date().toISOString().slice(0, 10),
      amt: -Math.abs(n),
      merchant: payee.trim(),
      note: note.trim() || undefined,
      receipt: snap || undefined,
    };
    set((s) => { s.txs = [tx, ...s.txs]; });
    showToast(`${sym}${n.toFixed(2)} paid to ${payee}`);
    close();
  };

  return (
    <Sheet open={open} onClose={close} title="Pay">
      {step === 'scan' ? (
        <div>
          <div style={{ ...gl('rgba(37,99,235,0.08)', 22, { border: '1px solid rgba(37,99,235,0.25)' }), padding: '36px 18px', textAlign: 'center', marginTop: 6, marginBottom: 14 }}>
            <div style={{ display: 'inline-flex', width: 110, height: 110, borderRadius: 28, background: 'rgba(37,99,235,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 14, position: 'relative' }}>
              <Ic n="QrCode" s={56} c={BLUE_BRIGHT} />
              <div style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 30, border: '2px dashed rgba(37,99,235,0.4)' }} />
            </div>
            <div style={{ color: W, fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Scan to pay</div>
            <div style={{ color: S, fontSize: 12, maxWidth: 280, margin: '0 auto' }}>Point your camera at any Lumens or compatible payment QR code.</div>
          </div>
          <T onClick={() => camRef.current?.click()} style={{ width: '100%', padding: 16, borderRadius: 18, background: '#2563eb', border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 10px 30px rgba(37,99,235,0.45)' }}>
            <Ic n="Camera" s={18} /> Open camera
          </T>
          <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onCapture} hidden />
          <T onClick={() => { setSnap(''); setStep('confirm'); }} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: 'none', color: W, fontSize: 13, fontWeight: 700, marginTop: 10 }}>
            Enter manually instead
          </T>
        </div>
      ) : (
        <div>
          {snap && (
            <div style={{ marginBottom: 12 }}>
              <img src={snap} alt="Scanned QR" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 14 }} />
            </div>
          )}
          <div style={{ fontSize: 11, color: S, marginBottom: 6, fontWeight: 600 }}>Pay to</div>
          <input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Merchant or @username" style={field} />
          <div style={{ fontSize: 11, color: S, marginBottom: 6, fontWeight: 600, marginTop: 12 }}>Amount ({sym})</div>
          <input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" style={{ ...field, fontSize: 24, fontWeight: 800 }} />
          <div style={{ fontSize: 11, color: S, marginBottom: 6, fontWeight: 600, marginTop: 12 }}>Note (optional)</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's this for?" style={field} />
          <T onClick={pay} style={{ width: '100%', padding: 14, borderRadius: 16, background: '#2563eb', border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, marginTop: 16, boxShadow: '0 10px 30px rgba(37,99,235,0.45)' }}>
            Pay {sym}{amt || '0.00'}
          </T>
          <T onClick={() => setStep('scan')} style={{ width: '100%', padding: 12, borderRadius: 14, background: 'transparent', border: 'none', color: S, fontSize: 12, fontWeight: 600, marginTop: 8 }}>← Re-scan</T>
        </div>
      )}
    </Sheet>
  );
}

const field: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: 14, outline: 'none', minHeight: 46, fontFamily: 'inherit',
};