import { useMemo, useState } from 'react';
import { Ic, T, gl, COLORS, Sheet, showToast } from './ui';
import { CRYPTO } from '@/lib/hazel/data';
import { useHazelStore } from '@/lib/hazel/store';
import { getCurrencySym } from './screens';
import { CryptoIcon } from './CryptoIcon';

const { W, S, S2, AC, GN } = COLORS;

/* ── SWAP SHEET ── */
export function SwapSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useHazelStore();
  const fiat = state.settings.currency;
  const FIAT = { sym: fiat, name: fiat, price: 1, bal: 25430, clr: '#2563eb' };
  const assets = [FIAT, ...CRYPTO] as any[];
  const [fromId, setFromId] = useState<string>(CRYPTO[0].sym);
  const [toId, setToId] = useState<string>(fiat);
  const [amt, setAmt] = useState('');
  const [picking, setPicking] = useState<null | 'from' | 'to'>(null);

  const from = assets.find((a) => (a.sym ?? a.name) === fromId) ?? assets[0];
  const to = assets.find((a) => (a.sym ?? a.name) === toId) ?? assets[1];

  const fromPrice = from.price ?? 1;
  const toPrice = to.price ?? 1;
  const inN = parseFloat(amt) || 0;
  const outN = (inN * fromPrice) / toPrice;
  const rate = fromPrice / toPrice;

  const swap = () => {
    if (!inN || inN <= 0) return showToast('Enter an amount');
    if (fromId === toId) return showToast('Pick a different asset');
    showToast(`Swapped ${inN} ${from.sym ?? from.name} → ${outN.toFixed(4)} ${to.sym ?? to.name}`);
    setAmt('');
    onClose();
  };

  const flip = () => { setFromId(toId); setToId(fromId); };

  if (picking) {
    return (
      <Sheet open={open} onClose={() => setPicking(null)} title={`Choose ${picking === 'from' ? 'from' : 'to'} asset`}>
        {assets.map((a) => {
          const key = a.sym ?? a.name;
          return (
            <T key={key} onClick={() => { picking === 'from' ? setFromId(key) : setToId(key); setPicking(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: 14, marginBottom: 8, textAlign: 'left' }}>
              {a.sym && a.sym !== a.name ? (
                <CryptoIcon sym={a.sym} size={36} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 18, background: a.clr, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{(a.sym ?? a.name)[0]}</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ color: W, fontSize: 14, fontWeight: 700 }}>{a.name}</div>
                <div style={{ color: S, fontSize: 11 }}>Balance: {a.bal} {a.sym ?? ''}</div>
              </div>
            </T>
          );
        })}
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Swap">
      {/* FROM */}
      <div style={{ ...gl('rgba(255,255,255,0.05)', 18), padding: 16, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: S, fontSize: 11 }}>You pay</span>
          <span style={{ color: S, fontSize: 11 }}>Balance: {from.bal} {from.sym ?? ''}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" style={{ flex: 1, background: 'transparent', border: 'none', color: W, fontSize: 26, fontWeight: 800, outline: 'none', minWidth: 0 }} />
          <T onClick={() => setPicking('from')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: 'none', color: W, fontWeight: 700, fontSize: 13 }}>
            {from.sym && from.sym !== from.name ? <CryptoIcon sym={from.sym} size={22} /> : <div style={{ width: 22, height: 22, borderRadius: 11, background: from.clr, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{(from.sym ?? from.name)[0]}</div>}
            {from.sym ?? from.name}
            <Ic n="ChevronDown" s={14} />
          </T>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '-6px 0' }}>
        <T onClick={flip} style={{ width: 36, height: 36, borderRadius: 18, background: '#001535', border: '2px solid rgba(37,99,235,0.4)', color: AC, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <Ic n="ArrowDownUp" s={16} />
        </T>
      </div>

      {/* TO */}
      <div style={{ ...gl('rgba(37,99,235,0.06)', 18, { border: '1px solid rgba(37,99,235,0.15)' }), padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: S, fontSize: 11 }}>You receive</span>
          <span style={{ color: S, fontSize: 11 }}>~ estimate</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, color: W, fontSize: 26, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis' }}>{outN > 0 ? outN.toFixed(4) : '0.00'}</div>
          <T onClick={() => setPicking('to')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: 'none', color: W, fontWeight: 700, fontSize: 13 }}>
            {to.sym && to.sym !== to.name ? <CryptoIcon sym={to.sym} size={22} /> : <div style={{ width: 22, height: 22, borderRadius: 11, background: to.clr, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{(to.sym ?? to.name)[0]}</div>}
            {to.sym ?? to.name}
            <Ic n="ChevronDown" s={14} />
          </T>
        </div>
      </div>

      <div style={{ ...gl('rgba(255,255,255,0.04)', 14), padding: 12, marginBottom: 16, fontSize: 12, color: S, display: 'flex', justifyContent: 'space-between' }}>
        <span>Rate</span>
        <span style={{ color: W, fontWeight: 600 }}>1 {from.sym ?? from.name} ≈ {rate.toFixed(4)} {to.sym ?? to.name}</span>
      </div>

      <T onClick={swap} style={{ width: '100%', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,#2563eb,#34d399)', border: 'none', color: '#001535', fontSize: 15, fontWeight: 800 }}>
        Confirm Swap
      </T>
    </Sheet>
  );
}

/* ── RECEIVE SHEET ── */
export function ReceiveSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useHazelStore();
  const fiat = state.settings.currency;

  const ADDRESSES = useMemo(
    () => [
      { id: fiat, name: `${fiat} Account`, sym: getCurrencySym(fiat), addr: 'IBAN ZA12 0000 0000 4829 0011', type: 'fiat' },
      { id: 'BTC', name: 'Bitcoin', sym: '₿', addr: 'bc1qlumensmoney9x0u3kt7v8g6n2zk5q8e4r5t6y7u8', type: 'crypto' },
      { id: 'ETH', name: 'Ethereum', sym: 'Ξ', addr: '0xHazel1234abcd5678ef901234567890abcdef1234', type: 'crypto' },
      { id: 'XLM', name: 'Stellar', sym: 'XLM', addr: 'GLUMENS7K2X3M4N5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8CDE', type: 'crypto' },
    ],
    [fiat],
  );
  const [sel, setSel] = useState(ADDRESSES[0].id);
  const cur = ADDRESSES.find((a) => a.id === sel)!;

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&bgcolor=001a44&color=2563eb&margin=8&data=${encodeURIComponent(cur.addr)}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(cur.addr); showToast('Address copied'); }
    catch { showToast('Could not copy'); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Receive">
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14 }} className="no-scrollbar">
        {ADDRESSES.map((a) => (
          <T key={a.id} onClick={() => setSel(a.id)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 12, background: sel === a.id ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.05)', border: sel === a.id ? '1px solid rgba(37,99,235,0.3)' : '1px solid transparent', color: sel === a.id ? AC : W, fontSize: 12, fontWeight: 700 }}>
            {a.sym} {a.id}
          </T>
        ))}
      </div>

      <div style={{ ...gl('rgba(255,255,255,0.06)', 20), padding: 18, textAlign: 'center', marginBottom: 14 }}>
        <div style={{ background: '#fff', padding: 12, borderRadius: 16, display: 'inline-block' }}>
          <img src={qrSrc} alt="QR code" width={220} height={220} style={{ display: 'block', borderRadius: 8 }} />
        </div>
        <div style={{ color: W, fontSize: 14, fontWeight: 700, marginTop: 14 }}>{cur.name}</div>
        <div style={{ color: S, fontSize: 11, marginTop: 4 }}>{cur.type === 'fiat' ? 'Scan or share to receive money' : `Send only ${cur.id} to this address`}</div>
      </div>

      <div style={{ ...gl('rgba(255,255,255,0.05)', 14), padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: S, marginBottom: 6 }}>{cur.type === 'fiat' ? 'Account' : 'Wallet address'}</div>
        <div style={{ color: W, fontSize: 13, fontWeight: 600, wordBreak: 'break-all', fontFamily: 'monospace' }}>{cur.addr}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <T onClick={copy} style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: 'none', color: W, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Ic n="Copy" s={16} /> Copy
        </T>
        <T onClick={async () => {
          if ((navigator as any).share) {
            try { await (navigator as any).share({ title: cur.name, text: cur.addr }); }
            catch { /* user cancelled */ }
          } else { copy(); }
        }} style={{ padding: 14, borderRadius: 14, background: 'linear-gradient(135deg,#2563eb,#34d399)', border: 'none', color: '#001535', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Ic n="Share2" s={16} /> Share
        </T>
      </div>
    </Sheet>
  );
}