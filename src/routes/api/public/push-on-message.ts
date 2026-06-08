import { createFileRoute } from '@tanstack/react-router';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Edge-trigger Web Push endpoint. Designed to be called by a Postgres
 * `pg_net.http_post` trigger that fires after an INSERT on `public.messages`.
 * Requires `x-webhook-signature: hex(hmac_sha256(WEBHOOK_SECRET, raw_body))`.
 *
 * Body: { recipient_user_id: string, preview: string, sender_name?: string,
 *         conversation_id?: string }
 */
export const Route = createFileRoute('/api/public/push-on-message')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.WEBHOOK_SECRET;
        if (!secret) return new Response('Webhook not configured', { status: 503 });

        const sigHeader = request.headers.get('x-webhook-signature') || '';
        const raw = await request.text();
        try {
          const expected = createHmac('sha256', secret).update(raw).digest('hex');
          const a = Buffer.from(sigHeader);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response('Invalid signature', { status: 401 });
          }
        } catch {
          return new Response('Invalid signature', { status: 401 });
        }

        let payload: any = {};
        try { payload = JSON.parse(raw); } catch { return new Response('Bad JSON', { status: 400 }); }
        const recipient = String(payload.recipient_user_id || '');
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_RE.test(recipient)) {
          return new Response('Invalid recipient_user_id', { status: 400 });
        }
        const preview = String(payload.preview || 'New message').slice(0, 140);
        const sender = String(payload.sender_name || 'New message').slice(0, 80);
        const convId = payload.conversation_id ? String(payload.conversation_id) : '';

        // HMAC-verified webhook — call the trusted internal sender directly
        // (the user-facing serverFn enforces a relationship check that
        // doesn't apply to system-originated push from pg_net).
        const { deliverPush } = await import('@/lib/hazel/push-deliver.server');
        const res = await deliverPush({
          recipientUserId: recipient,
          title: sender,
          body: preview,
          url: '/',
          tag: convId ? `msg:${convId}` : 'lumens',
        });
        return Response.json({ ok: true, sent: (res as any)?.sent ?? 0 });
      },
    },
  },
});