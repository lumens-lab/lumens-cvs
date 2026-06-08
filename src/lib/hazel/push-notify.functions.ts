import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const Input = z.object({
  recipientUserId: z.string().uuid(),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  url: z.string().max(500).regex(/^\/[a-zA-Z0-9/_\-?&=.%#]*$/, 'url must be a same-origin path').optional(),
  tag: z.string().max(80).optional(),
});

/**
 * Server-side Web Push delivery.
 *
 * Authorization: the caller MUST be a confirmed contact of the recipient
 * OR share at least one group with them. This prevents any signed-in user
 * from spamming arbitrary push notifications to any other user (push
 * phishing / harassment / notification DoS).
 *
 * The `url` field is constrained to a same-origin path by the validator,
 * so a malicious caller cannot point a notification at an external
 * phishing URL.
 */
export const sendPushToUser = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const callerId = context.userId;
    if (!callerId) throw new Error('unauthenticated');
    if (callerId === data.recipientUserId) return { sent: 0, skipped: true };

    // Relationship check: confirmed contact OR shared group membership.
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { count: contactCount } = await supabaseAdmin.from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', callerId)
      .eq('contact_user_id', data.recipientUserId)
      .eq('confirmed', true);
    let sharesGroup = false;
    if (!contactCount) {
      const { data: myGroups } = await supabaseAdmin.from('group_members')
        .select('group_id').eq('user_id', callerId);
      const ids = (myGroups ?? []).map((r: any) => r.group_id as string);
      if (ids.length) {
        const { count: sharedCount } = await supabaseAdmin.from('group_members')
          .select('group_id', { count: 'exact', head: true })
          .eq('user_id', data.recipientUserId)
          .in('group_id', ids);
        sharesGroup = (sharedCount ?? 0) > 0;
      }
    }
    if (!contactCount && !sharesGroup) {
      return { sent: 0, skipped: true, reason: 'no relationship' as const };
    }

    const { deliverPush } = await import('./push-deliver.server');
    return deliverPush({
      recipientUserId: data.recipientUserId,
      title: data.title,
      body: data.body,
      url: data.url,
      tag: data.tag,
    });
  });