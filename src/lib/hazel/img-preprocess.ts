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

/**
 * Shrink a receipt photo before it is stored with the record.
 *
 * Raw phone photos are 2–4 MB of base64 each, which bloats the database and
 * makes every history sync slow. We downscale to `maxDim` and step the JPEG
 * quality down until the data URL fits under `maxBytes` (~180 KB), which is
 * still perfectly legible for an attached receipt.
 */
export async function compressReceipt(dataUrl: string, maxDim = 1200, maxBytes = 180_000): Promise<string> {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return dataUrl;
  if (dataUrl.length <= maxBytes) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.width, h = img.height;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, w, h);
        let out = canvas.toDataURL('image/jpeg', 0.7);
        for (const q of [0.55, 0.42, 0.3]) {
          if (out.length <= maxBytes) break;
          out = canvas.toDataURL('image/jpeg', q);
        }
        // Still too big? halve the dimensions once and re-encode.
        if (out.length > maxBytes) {
          const c2 = document.createElement('canvas');
          c2.width = Math.max(1, Math.round(w / 2));
          c2.height = Math.max(1, Math.round(h / 2));
          const x2 = c2.getContext('2d');
          if (x2) {
            x2.drawImage(canvas, 0, 0, c2.width, c2.height);
            out = c2.toDataURL('image/jpeg', 0.6);
          }
        }
        resolve(out.length < dataUrl.length ? out : dataUrl);
      } catch { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}