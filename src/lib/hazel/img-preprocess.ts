/**
 * Pre-process a receipt photo before sending it to the OCR model.
 *
 * Steps: downscale (max 1600px) → grayscale → contrast boost → light
 * threshold. The output is a high-contrast B&W JPEG data URL that
 * typically improves OCR accuracy on phone snapshots of receipts.
 */
export async function toBWReceipt(dataUrl: string, maxDim = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, w, h);
        const id = ctx.getImageData(0, 0, w, h);
        const d = id.data;
        // Grayscale + contrast boost.
        const c = 1.35; // contrast factor
        const intercept = 128 * (1 - c);
        for (let i = 0; i < d.length; i += 4) {
          const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          let v = c * g + intercept;
          if (v < 0) v = 0; else if (v > 255) v = 255;
          d[i] = d[i + 1] = d[i + 2] = v;
        }
        ctx.putImageData(id, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** Approximate on-the-wire size of a data URL, in bytes. */
export function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(',');
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.round((b64.length * 3) / 4);
}

/** Load a data URL into an <img>, resolving null on failure. */
function loadImage(dataUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * CamScanner-style document scan: grayscale → local (adaptive) threshold so
 * the page turns pure white and the ink pure black, whatever the lighting.
 * Returns a bilevel PNG data URL at the requested width.
 */
function scanAtWidth(img: HTMLImageElement, targetW: number): string | null {
  const scale = Math.min(1, targetW / Math.max(1, img.width));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true } as any);
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;

  // Grayscale into a flat array + integral image for fast local means.
  const g = new Float64Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    g[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }
  const sum = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += g[y * w + x];
      sum[(y + 1) * (w + 1) + (x + 1)] = sum[y * (w + 1) + (x + 1)] + rowSum;
    }
  }
  // Window ~ 1/16 of the longest side (classic adaptive-mean document binarise).
  const r = Math.max(6, Math.round(Math.max(w, h) / 32));
  const T = 0.90; // keep ink that is >10% darker than its neighbourhood
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const s =
        sum[(y1 + 1) * (w + 1) + (x1 + 1)] -
        sum[y0 * (w + 1) + (x1 + 1)] -
        sum[(y1 + 1) * (w + 1) + x0] +
        sum[y0 * (w + 1) + x0];
      const mean = s / area;
      const v = g[y * w + x] < mean * T ? 0 : 255;
      const o = (y * w + x) * 4;
      d[o] = d[o + 1] = d[o + 2] = v;
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  // Two-colour images compress far better as PNG than as JPEG.
  return canvas.toDataURL('image/png');
}

/**
 * Turn a receipt photo into a tiny, clean, black-and-white scan before it is
 * stored with the record.
 *
 * Raw phone photos are 2–4 MB each, which bloats the database and slows every
 * history sync. We scan the page (adaptive threshold, no colour) and step the
 * width down until the result fits in `maxBytes` — 5 KB by default.
 */
export async function compressReceipt(dataUrl: string, maxDim = 1000, maxBytes = 5 * 1024): Promise<string> {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return dataUrl;
  const img = await loadImage(dataUrl);
  if (!img) return dataUrl;
  let best: string | null = null;
  for (const wid of [maxDim, 820, 680, 560, 460, 380, 300, 240]) {
    if (wid > maxDim) continue;
    let out: string | null = null;
    try { out = scanAtWidth(img, wid); } catch { out = null; }
    if (!out) break;
    best = out;
    if (dataUrlBytes(out) <= maxBytes) break;
  }
  if (!best) return dataUrl;
  // Never hand back something larger than the original.
  return dataUrlBytes(best) < dataUrlBytes(dataUrl) ? best : dataUrl;
}