# Plan — Onboarding, Auth, Profile, Restore, Logo, Swipe-Back

Scoped to the six items in your message; no other changes will be made.

## 1. Backup / restore — fix and validate

**Problem:** `.mmbak/.json/.csv/.xls/.xlsx/.pdf` imports either silently flash the whole DB or report "no transactions in the file". Header detection, sheet detection and the .mmbak envelope are too strict.

**Fix in `src/lib/hazel/restore.ts`:**
- **Never wipe state.** Switch every import to merge-only: dedupe by `id`/`(date,name,amt)` and add to existing `txs` instead of replacing.
- **Robust header matching:** accept many synonyms — `description/desc/payee/details/memo/narration/transaction/reference` for name; `debit/credit/amount/amt/value/total/spent/in/out` for amount; `posted/transaction date/booking date/value date` for date; treat blank header rows by scanning the first 10 rows for the most header-like row.
- **Sign handling:** if `debit`/`credit` columns exist, compute `amt = credit − debit`; otherwise honour the sign on `amount`.
- **CSV:** detect delimiter (`,` `;` `\t` `|`) instead of relying on XLSX to guess.
- **XLSX:** scan every sheet, not just the first.
- **PDF:** widen amount regex to handle `R 1 234,56`, `$1,234.56`, `(123.45)` (parentheses = negative); fall back to line-by-line if no header row.
- **`.mmbak`:** allow legacy/no magic header — if the body parses as valid JSON snapshot, accept it.
- **Schema validation:** validate the parsed snapshot against a zod schema (`txs[]`, `cats[]`, `wallet`, etc.). On failure return `{ ok:false, error:"…" }` with the missing field listed.
- **UI feedback:** in `settings.tsx`, surface counts ("Imported 42 transactions, 3 skipped") and explicit errors ("Missing required field: date") via the toast.

## 2. Logo +50% — re-audit and animation

- **Audit every `<img>` of `lumens-logo.png` / wordmark across:** `onboarding.tsx`, `auth.tsx`, `screens.tsx` (wallet/chat headers, side menu), `settings.tsx`, splash, sheets. Bump each by 1.5× from its *original* (pre-attempted) size, then add `maxWidth: '70vw'` so it cannot overflow on narrow phones.
- **Welcome animation:** stretch `logoReveal` from 2.2s → **4s** with the same bezier, delay 0.2s, and render the splash logo at 480px with `image-rendering: -webkit-optimize-contrast` and a 2× DPR source so it stays crisp.
- Verify on a 360-wide mobile breakpoint via the preview.

## 3. Auth — keep the new flow, delete the old

- The new multi-step flow in `auth.tsx` becomes the **only** auth surface.
- Search for any remaining old `AuthScreen` reference, old email/password form duplicates, and the old "sign up" component — delete them.
- Ensure the entrypoint after PIN creation, the reset-password route, and the side-menu "Sign in" all route to this one flow.

## 4. Profile picture, cover picture, profile info — end-to-end

**Storage:**
- Add a public `covers` bucket (mirrors `avatars`) with RLS: owner can upload/update; everyone authenticated can read.
- Public read URLs for avatar + cover so they render in every contact card, chat header, and group member list.

**Schema (`profiles`):** add `cover_url text` (nullable). Existing `avatar_url`, `display_name`, `username`, `phone`, `email` stay.

**Privacy rules (this is the important bit):**
- `avatar_url`, `display_name`, `username` → visible to **anyone** signed in (so search and chat headers work for non-contacts too).
- `email`, `phone`, `birthday`, full `username` detail → visible **only to confirmed contacts in the chat phase**.
- Implement via a `profiles_public` view (avatar + display_name + username only) and an RPC `get_contact_profile(p_user_id uuid)` that returns the full record only if `contacts` has a confirmed row in either direction. Update `search_profiles` to return the public view shape.

**UI:**
- Add cover upload to the profile-edit sheet; show it as the banner behind the avatar on the wallet page and on contact profile sheets.
- When a contact opens another user's profile in chat, call `get_contact_profile`; if not confirmed, hide phone/email/birthday and show a "Add contact to see details" hint.
- Realtime/refetch profile after save so the new avatar appears immediately on wallet, chat list, side menu, and group members.

## 5. Wallet main-page avatar +50%

- In `screens.tsx` wallet header, bump the avatar size by 1.5× and keep the cover banner sized to match (height grows proportionally).

## 6. Swipe-back navigation (PWA-wide)

- Add a single `useSwipeBack()` hook plus a `<SwipeBackProvider>` mounted in `__root.tsx`.
- Horizontal pan from the **left 24px edge**, threshold 60px or velocity > 0.4 px/ms → `router.history.back()`.
- Skips when: the gesture starts inside a horizontally-scrollable element (carousels, the new income/expense slider, chat message lists), or when an input/sheet is open.
- Adds a subtle live-tracking page slide using `transform: translateX(...)` for tactile feel; cancels on release if threshold not met.
- Works for both real routes and the internal "screen stack" in `screens.tsx` (chat → conversation, wallet → send, etc.) by exposing a `pushScreen/popScreen` aware of the gesture.

## Technical notes

- Database changes go in a single new migration with `GRANT`s and RLS.
- No edits to `client.ts`, `types.ts` (regenerated automatically), or `client.server.ts`.
- Runtime error `Cannot read properties of null (reading 'split')` will be addressed only if it falls inside the files I'm already editing for the items above.

## Out of scope (will not touch)

E2EE, wallet/payment logic, OCR, budget slider, expenses slider, security regression suite, push notifications, group chat logic.

Reply "go" to execute, or tell me what to adjust.
