
This is a large multi-area change. Before I touch code I want to confirm scope and a few unknowns. Nothing outside these items will be touched.

## 1. Welcome animation
- Port the `logoReveal` (bounce-in scale 0.3→1.0 over 2.2s) + `logoPulse` (4s gentle pulse) keyframes from the uploaded HTML into the first onboarding screen only.

## 2. Replace auth/signup with the HTML flow (after PIN)
- Today: new user creates PIN → `AuthScreen` (email/password + Google/Apple).
- New: new user creates PIN → multi-step signup from the HTML (name → username → phone → DOB → email → password → confirm).
- Returning users (no local PIN, but Supabase session) still get straight in.
- **Question:** keep Google/Apple OAuth available as a button on the new flow, or strictly email/password as in the HTML?
- Supabase user is still created at the end via `supabase.auth.signUp`; profile fields (username, phone, dob, full_name) are written to `profiles` after sign-up.

## 3. Logo +50% everywhere
- One source of truth: bump every `<img src={logo}>` size by 1.5×. Touches: auth screen, onboarding, settings header, any splash, side menu. I'll grep for the import and update each size.

## 4. Restore from backup — accept `.mmbak`, `.json`, `.xls/.xlsx`, `.csv`, `.pdf`
- `.mmbak` = our own format (JSON + a magic header `LUMENS-MMBAK-v1`, base64-wrapped). Reuses the existing `importState` sanitizer.
- `.json` = existing path.
- `.csv` / `.xls(x)` = import **transactions only** (columns: date, name, category, amount, note). Other backup fields (profile/settings) not present in spreadsheets are ignored.
- `.pdf` = extract a table of transactions via `pdfjs-dist` text extraction with the same column heuristics as CSV. Best-effort; if no rows parse, show "no transactions found".
- **Question:** confirm CSV/XLS/PDF restore is **transactions only** (not profile/categories/settings). That's the only thing those formats can carry reliably.

## 5. Backup — write `.mmbak` and `.json`
- Existing `exportState()` already produces JSON. Add a `.mmbak` writer = same JSON wrapped with the magic header + base64 (so it's clearly "ours" and not casually editable). Two buttons in Settings → Backup.

## 6. Expenses page
- Convert the single "Spent this month" hero card into a horizontal snap slider with 2 cards: **Spent this month** (existing) + **Earned this month** (sum of income-category txs, current month).
- Add button: action sheet → "Add expense" or "Add income". Income form mirrors expense form but pulls categories from `state.incomeCats` (already exists in store) and stores tx with positive amount + income category id (same `Tx` shape — already supports it; expenses are negative, income positive — I'll keep current sign convention; please confirm if you want explicit `kind` field instead).
- **Question:** sign convention — do you currently store income as positive `amt` and expense as negative, or both positive distinguished by category? I'll match whatever `expenses.tsx` already does.

## 7. Receipt OCR fix
- Current flow auto-fills wrong fields. I'll inspect the OCR/parse path in `expenses.tsx` and fix field mapping (merchant → name, total → amt, date → date, line items → items). If the OCR is calling Lovable AI Gateway, I'll tighten the prompt to return a strict JSON schema and validate with zod before populating.

## 8. Budget page — last-7-days slider
- Existing "Last 7 days" expense card → wrap in horizontal snap slider with a second "Income — last 7 days (net liquidity)" card.
- Net liquidity per day = running balance: `net[d] = net[d-1] + income[d] - expense[d]`, seeded at `net[d-7] = 0` (i.e., the chart shows daily delta to cumulative net over the window, matching your "earn 1000 Mon, spend 10 Mon → 990" example).
- **Question:** seed the running balance at 0 at the start of the 7-day window (relative delta) or at the user's actual wallet balance 7 days ago (true liquidity)? Your example reads like the first; please confirm.

## Out of scope (will not touch)
E2EE, groups, wallet, chat, security regression suite, migrations, server functions — none of these are modified.

---

Please answer the four **Questions** inline (OAuth on signup? CSV/XLS/PDF = tx only? income sign convention? budget net seed?) and I'll execute everything in one pass.
