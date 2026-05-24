import btc from '@/assets/crypto/btc.svg';
import eth from '@/assets/crypto/eth.svg';
import xlm from '@/assets/crypto/xlm.svg';
import xrp from '@/assets/crypto/xrp.svg';
import usdc from '@/assets/crypto/usdc.svg';
import usdt from '@/assets/crypto/usdt.svg';
import ada from '@/assets/crypto/ada.svg';
import hbar from '@/assets/crypto/hbar.svg';
import xvg from '@/assets/crypto/xvg.svg';
import qnt from '@/assets/crypto/qnt.svg';

const MAP: Record<string, string> = { btc, eth, xlm, xrp, usdc, usdt, ada, hbar, xvg, qnt };

export function CryptoIcon({ sym, size = 28 }: { sym: string; size?: number }) {
  const src = MAP[sym.toLowerCase()];
  if (!src) return null;
  return <img src={src} width={size} height={size} alt={sym} style={{ display: 'block', borderRadius: '50%' }} />;
}
