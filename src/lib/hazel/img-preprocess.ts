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