import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const Input = z.object({
  recipientUserId: z.string().uuid(),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  url: z.string().max(500).optional(),
  tag: z.string().max(80).optional(),
});

/**
 * Server-side Web Push delivery. Looks up the recipient's push_subscriptions
 * (admin client, bypasses RLS) and fans out a notification to each device.
 * Removes dead subscriptions (404/410). Silently no-ops if VAPID is not
 * configured.
 */
export const sendPushToUser = createServerFn({ method: 'POST' })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const vapidPublic = process.env.VAPID_PUBLIC_KEY
      || 'BJ1enulq3UtdHBklrQqONpwHpFGXffIYtUTsQgpow_UkMH3bQ4-Sbe_ZrdhEObe00BX9PaCOlG07iLRfXmkfV7Q';
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:notifications@lumens.app';
    if (!vapidPrivate) return { sent: 0, skipped: true };

    const [{ supabaseAdmin }, webpush] = await Promise.all([
      import('@/integrations/supabase/client.server'),
      import('web-push'),
    ]);
    const wp = (webpush as any).default ?? webpush;
    try { wp.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate); } catch {}

    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', data.recipientUserId);
    if (!subs || subs.length === 0) return { sent: 0 };

    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      url: data.url || '/',
      tag: data.tag || 'lumens',
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
  });