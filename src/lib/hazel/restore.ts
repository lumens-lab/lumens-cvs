import * as XLSX from "xlsx";
import type { Tx } from "./store";
import { importState, importStateDetailed, getStateSnapshot } from "./store";

/** ─── Backup formats ─────────────────────────────────────────────── */

const MMBAK_MAGIC = "LUMENS-MMBAK-v1\n";

/** Wrap a JSON snapshot in the .mmbak envelope (magic header + base64). */
export function encodeMmbak(json: string): string {
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(json, "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(json)));
  return MMBAK_MAGIC + b64;
}

/** Decode a .mmbak file back to its JSON snapshot. Returns null if invalid. */
export function decodeMmbak(raw: string): string | null {
  const trimmed = raw.trimStart();
  // Legacy / portable backups may have been saved as plain JSON with a
  // .mmbak extension — accept those too.
  if (trimmed.startsWith("{")) return trimmed;
  if (!raw.startsWith(MMBAK_MAGIC)) return null;
  const b64 = raw.slice(MMBAK_MAGIC.length).trim();
  try {
    if (typeof window === "undefined") return Buffer.from(b64, "base64").toString("utf8");
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return null;
  }
}

/** ─── Transaction parsers (CSV / XLSX / PDF) ─────────────────────── */

type RowLike = Record<string, unknown>;

function normaliseHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[\s_\-]+/g, "");
}

function pickField(row: RowLike, keys: string[]): unknown {
  for (const want of keys) {
    for (const k of Object.keys(row)) {
      if (normaliseHeader(k) === want) return row[k];
    }
  }
  return undefined;
}

function parseDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    // Excel date serial
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseAmt(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  let raw = String(v).trim();
  if (!raw) return null;
  // Parentheses = negative accounting convention.
  let neg = false;
  if (/^\(.*\)$/.test(raw)) { neg = true; raw = raw.slice(1, -1); }
  if (/-\s*$/.test(raw)) { neg = true; raw = raw.replace(/-\s*$/, ""); }
  // Strip currency symbols, spaces, thousands separators.
  let cleaned = raw.replace(/[A-Za-z€$£¥₹R\s]/g, "");
  // Handle EU-style "1.234,56" by swapping if needed.
  if (/,\d{1,2}$/.test(cleaned) && /\.\d{3}/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    cleaned = cleaned.replace(/,/g, "");
  }
  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  return neg ? -Math.abs(n) : n;
}

function rowsToTxs(rows: RowLike[]): Tx[] {
  const txs: Tx[] = [];
  for (const r of rows) {
    const name = pickField(r, ["name","description","desc","merchant","details","memo","narration","payee","reference","transaction"]);
    let amt = parseAmt(pickField(r, ["amount","amt","value","total"]));
    const debit = parseAmt(pickField(r, ["debit","spent","out","withdrawal","withdrawals"]));
    const credit = parseAmt(pickField(r, ["credit","earned","in","deposit","deposits"]));
    if ((amt == null) && (debit != null || credit != null)) {
      amt = (credit ?? 0) - (debit ?? 0);
    }
    const date = parseDate(pickField(r, ["date","datetime","when","day","posted","transactiondate","bookingdate","valuedate"]));
    const cat = pickField(r, ["category","cat","type"]);
    const note = pickField(r, ["note","notes","comments","comment"]);
    if (amt == null || !date) continue;
    const nameStr = name ? String(name).slice(0, 200) : "Imported";
    txs.push({
      id: Date.now() + Math.floor(Math.random() * 100000) + txs.length,
      name: nameStr,
      cat: cat ? String(cat).slice(0, 80) : "other",
      icon: "Receipt",
      ibg: "rgba(96,165,250,0.15)",
      ic: "#60a5fa",
      date,
      amt,
      note: note ? String(note).slice(0, 1000) : undefined,
    });
  }
  return txs;
}

/** Parse a CSV string into transactions. */
export function parseCsvTxs(text: string): Tx[] {
  // Detect the dominant delimiter from the first non-empty line.
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length) ?? "";
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0, "|": 0 };
  for (const ch of firstLine) if (ch in counts) counts[ch]++;
  const delim = (Object.entries(counts).sort((a,b) => b[1]-a[1])[0]?.[0]) || ",";
  const wb = XLSX.read(text, { type: "string", FS: delim });
  const all: Tx[] = [];
  for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn];
    const rows = XLSX.utils.sheet_to_json<RowLike>(ws, { defval: "", raw: true });
    all.push(...rowsToTxs(rows));
  }
  return all;
}

/** Parse an XLS/XLSX binary into transactions. */
export function parseXlsxTxs(buf: ArrayBuffer): Tx[] {
  const wb = XLSX.read(buf, { type: "array" });
  const all: Tx[] = [];
  for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn];
    const rows = XLSX.utils.sheet_to_json<RowLike>(ws, { defval: "" });
    all.push(...rowsToTxs(rows));
  }
  return all;
}

/** Best-effort transaction extraction from a PDF (uses pdfjs text layer). */
export async function parsePdfTxs(buf: ArrayBuffer): Promise<Tx[]> {
  // Dynamic import keeps the heavy worker out of the initial bundle.
  const pdfjs: any = await import("pdfjs-dist");
  // Disable the worker — runs on main thread; fine for one-shot imports.
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = "";
  } catch {}
  const loadingTask = pdfjs.getDocument({ data: buf, disableWorker: true, isEvalSupported: false });
  const doc = await loadingTask.promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Group items into lines using their y coordinates.
    const byY = new Map<number, { x: number; s: string }[]>();
    for (const it of content.items as any[]) {
      const y = Math.round(it.transform[5]);
      const x = it.transform[4];
      const list = byY.get(y) ?? [];
      list.push({ x, s: it.str });
      byY.set(y, list);
    }
    const ys = Array.from(byY.keys()).sort((a, b) => b - a);
    for (const y of ys) {
      const parts = byY.get(y)!.sort((a, b) => a.x - b.x);
      lines.push(parts.map((p) => p.s).join(" ").replace(/\s+/g, " ").trim());
    }
  }

  // Detect header row; if found, parse the rest as columns.
  const headerIdx = lines.findIndex((l) =>
    /date/i.test(l) && /(amount|amt|total|value)/i.test(l)
  );
  if (headerIdx === -1) {
    // Fall back to free-form: "YYYY-MM-DD ... <amount>"
    const out: Tx[] = [];
    const dateRe = /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/;
    const amtRe = /(-?\d+[.,]\d{2})\s*$/;
    for (const l of lines) {
      const dm = l.match(dateRe);
      const am = l.match(amtRe);
      if (!dm || !am) continue;
      const date = parseDate(dm[1]);
      const amt = parseAmt(am[1]);
      if (!date || amt == null) continue;
      const name = l.replace(dm[0], "").replace(am[0], "").trim().slice(0, 200) || "Imported";
      out.push({
        id: Date.now() + Math.floor(Math.random() * 100000) + out.length,
        name,
        cat: "other",
        icon: "Receipt",
        ibg: "rgba(96,165,250,0.15)",
        ic: "#60a5fa",
        date,
        amt,
      });
    }
    return out;
  }

  const headers = lines[headerIdx].split(/\s{2,}|\t|\|/).map((s) => s.trim()).filter(Boolean);
  const rows: RowLike[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = lines[i].split(/\s{2,}|\t|\|/).map((s) => s.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const row: RowLike = {};
    headers.forEach((h, j) => (row[h] = cells[j] ?? ""));
    rows.push(row);
  }
  return rowsToTxs(rows);
}

/** ─── Top-level dispatcher ───────────────────────────────────────── */

export type RestoreResult =
  | { kind: "full"; ok: boolean; errors?: string[]; added?: { txs: number; cats: number } }
  | { kind: "txs"; count: number; errors?: string[] };

export async function restoreFromFile(file: File): Promise<RestoreResult> {
  const name = file.name.toLowerCase();

  // .mmbak — text envelope (or legacy plain JSON)
  if (name.endsWith(".mmbak")) {
    const raw = await file.text();
    const json = decodeMmbak(raw);
    if (!json) return { kind: "full", ok: false, errors: ["File is not a recognisable .mmbak backup."] };
    const r = importStateDetailed(json);
    return { kind: "full", ok: r.ok, errors: r.errors, added: r.added };
  }

  // .json — direct snapshot
  if (name.endsWith(".json")) {
    const raw = await file.text();
    const r = importStateDetailed(raw);
    return { kind: "full", ok: r.ok, errors: r.errors, added: r.added };
  }

  // .csv — transactions
  if (name.endsWith(".csv")) {
    const text = await file.text();
    const txs = parseCsvTxs(text);
    importTxs(txs);
    return { kind: "txs", count: txs.length };
  }

  // .xls / .xlsx — transactions
  if (name.endsWith(".xls") || name.endsWith(".xlsx")) {
    const buf = await file.arrayBuffer();
    const txs = parseXlsxTxs(buf);
    importTxs(txs);
    return { kind: "txs", count: txs.length };
  }

  // .pdf — transactions (best effort)
  if (name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const txs = await parsePdfTxs(buf);
    importTxs(txs);
    return { kind: "txs", count: txs.length };
  }

  return { kind: "full", ok: false };
}

function importTxs(txs: Tx[]) {
  if (!txs.length) return;
  const snap = getStateSnapshot();
  const merged = [...txs, ...snap.txs];
  // Re-serialise through importState so all values go through the sanitiser.
  importState(JSON.stringify({ ...snap, txs: merged }));
}