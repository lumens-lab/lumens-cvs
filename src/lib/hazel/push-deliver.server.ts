/**
 * Trusted internal push-delivery helper. Performs NO authorization — callers
 * (the user-facing `sendPushToUser` serverFn after its relationship check,
 * and the HMAC-verified `/api/public/push-on-message` webhook route) must
 * verify the right to send before invoking this.
 *
 * Server-only: never import from client code.
 */
export async function deliverPush(input: {
  recipientUserId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<{ sent: number; skipped?: boolean }> {
  // VAPID keys MUST come from the secrets store. No hardcoded fallback —
  // a deployment without configured keys disables push (loud no-op) rather
  // than shipping a public key whose private counterpart might be guessable.
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:notifications@lumens.app';
  if (!vapidPublic || !vapidPrivate) {
    console.warn('[push] VAPID keys not configured — push disabled');
    return { sent: 0, skipped: true };
  }

  const [{ supabaseAdmin }, webpush] = await Promise.all([
    import('@/integrations/supabase/client.server'),
    import('web-push'),
  ]);
  const wp = (webpush as any).default ?? webpush;
  try { wp.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate); } catch {}

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', input.recipientUserId);
  if (!subs || subs.length === 0) return { sent: 0 };

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.url || '/',
    tag: input.tag || 'lumens',
  });

  const dead: string[] = [];
  let sent = 0;
  await Promise.all(subs.map(async (row: any) => {
    try {
      await wp.sendNotification(row.subscription, payload, { TTL: 60 });
      sent++;
    } catch (err: any) {
      const code = err?.statusCode;
      if (code === 404 || code === 410) dead.push(row.id);
    }
  }));
  if (dead.length) {
    await supabaseAdmin.from('push_subscriptions').delete().in('id', dead);
  }
  return { sent };
}