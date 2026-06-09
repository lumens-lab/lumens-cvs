# Lumens — Feature Roadmap (6 phases)

Tackled in the order you asked: **3 → 4 → 5 → 6 → 1 → 2**. Each phase is a single, reviewable change set. Wait for each to ship and pass review before the next.

---

## Phase 3 — Disappearing messages

**What you'll see**
- A per-conversation menu: *Off / 24 hours / 7 days / 30 days*.
- Sent messages auto-delete server-side after the chosen TTL.
- Small "⏱ 7d" badge next to the conversation title when enabled.

**Technical**
- Migration:
  - `conversations.disappearing_seconds int` (null = off).
  - `messages.expires_at timestamptz` (computed at insert from the conversation setting via trigger).
  - RPC `set_disappearing(conversation_id, seconds)` — only participants.
- `pg_cron` job every minute: `DELETE FROM messages WHERE expires_at < now()`.
- UI: dropdown in chat header (`screens.tsx`), badge in conversation list.

---

## Phase 4 — Friend-request rate limiting & abuse protection

**What you'll see**
- Toast: "You've sent too many requests, try again in X minutes" after 20/hour.
- Repeated decline from same sender → soft block (24h cooldown to that user).

**Technical**
- Modify `send_contact_request()` RPC:
  - Count `contact_requests` from caller in last 1h; raise if ≥ 20.
  - If recipient declined caller ≥ 3 times in 7d, raise "user not accepting requests".
- No new tables needed — uses existing `contact_requests` history.
- Client surfaces the error with a friendly message.

---

## Phase 5 — Media messages + voice/video calls

Split into two sub-phases because of size.

### 5a — Media messages (images, voice notes, short video)
- Storage bucket `chat-media` (private), RLS: sender uploads, conversation participants read.
- `messages` already has `attachment_url` etc.; add `attachment_kind` ('image'|'audio'|'video') and `attachment_duration_ms`.
- Client:
  - Image: `browser-image-compression` → upload → signed URL → send message.
  - Voice: `MediaRecorder` → opus/webm → 10 MB cap → upload.
  - Video: file picker, 10 MB cap, no transcode.
  - Inline render in chat bubble (img / audio player / video tag).

### 5b — Voice & video calls (WebRTC via LiveKit)
- Use LiveKit Cloud free tier (10k participant-min/mo).
- New secrets: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `VITE_LIVEKIT_URL`.
- Server fn `mintCallToken(callId)` — checks call participants, returns JWT.
- Replace placeholder `CallScreen` with `@livekit/components-react` Room.
- Existing `calls` table + signalling already in place; we layer LiveKit on top.

Will pause after 5a for approval before doing 5b.

---

## Phase 6 — PWA offline + push polish

**What you'll see**
- App opens instantly on flaky network, shows last known data.
- "Install Lumens" prompt on Android/desktop.

**Technical**
- Add `vite-plugin-pwa` with Workbox.
  - Precache app shell.
  - `NetworkFirst` for Supabase REST.
  - `StaleWhileRevalidate` for avatars/icons.
- Merge existing `public/sw.js` push handler into Workbox SW (`injectManifest` strategy so we keep the push listener).
- `manifest.json` already exists; add maskable icon + screenshots field for richer install UI.

---

## Phase 1 — Stellar wallet (non-custodial)

Largest phase. Split.

### 1a — Key generation + secure on-device storage
- `npm i stellar-sdk`.
- On first wallet open: generate keypair, derive AES-GCM key from PIN via PBKDF2 (250k iters), store encrypted secret in IndexedDB. Public address goes to a new `wallets` table (`user_id, stellar_address, network`).
- "Reveal secret key" gated by PIN; never sent to server.
- Show address + QR.

### 1b — Read-only: balances & history via Horizon
- Use public Horizon endpoint (`horizon.stellar.org`).
- `useWalletBalances(address)` and `useWalletTxs(address)` via TanStack Query.
- Filters: sent/received, date range, currency. CSV export.

### 1c — Send XLM / assets
- `sendPayment(destination, amount, asset, memo)` — sign locally with decrypted secret, submit via Horizon.
- Confirm sheet with network fee + memo field.
- QR scan for destination (use `@zxing/browser`).

### 1d — Swap via SDEX
- `pathPaymentStrictSend` with on-chain best path.
- Show path + slippage before confirm.

### 1e — On/off ramp (deferred to user)
- Yellow Card and Stellar Anchor integrations require business agreements/KYC API keys I cannot get. I'll wire the UI screens and stub the provider call so you can drop credentials in later. Will not block the rest of the wallet.

---

## Phase 2 — Request-money in chat

**What you'll see**
- "+" menu in chat → *Request money* sheet → enter amount/asset/note.
- A bubble appears in the thread with "Accept & Pay" / "Decline" buttons.
- Accepting opens the wallet send flow pre-filled.

**Technical**
- New message kind: `payment_request` with payload `{ amount, asset, note, status }`.
- RPC `respond_payment_request(message_id, action)` — only recipient.
- Bubble component in `screens.tsx` with status pill (Pending/Paid/Declined/Expired).
- Expiry: 24h (cron updates status).

---

## Order of execution & checkpoints

```
Phase 3  ──► review ──►
Phase 4  ──► review ──►
Phase 5a ──► review ──►
Phase 5b ──► review ──► (requires LiveKit secrets)
Phase 6  ──► review ──►
Phase 1a ──► review ──►
Phase 1b ──► review ──►
Phase 1c ──► review ──►
Phase 1d ──► review ──►
Phase 2  ──► review ──► done
```

I'll start with **Phase 3 (disappearing messages)** the moment you approve this plan. Each phase ships as its own migration + code change so you can roll back individually.

## Things I'll need from you along the way
- **Before Phase 5b**: LiveKit Cloud account + API key/secret/URL.
- **Before Phase 1e** (optional): Yellow Card or Stellar Anchor credentials.

Everything else uses what's already provisioned.
