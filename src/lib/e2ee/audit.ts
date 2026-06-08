import { supabase } from '@/integrations/supabase/client';

/**
 * Fire-and-forget audit logger for E2EE message events. Records metadata
 * only — never plaintext or ciphertext bodies. Failures are swallowed
 * so the chat path is never blocked by audit issues.
 */
export function auditMessage(args: {
  event: 'encrypt' | 'decrypt';
  scope: 'dm' | 'group';
  envelope: 'signal' | 'groupfan' | 'legacy';
  peerId?: string | null;
  groupId?: string | null;
  messageId?: string | null;
  ctLen: number;
  success: boolean;
}): void {
  try {
    const params = {
      p_event: args.event,
      p_scope: args.scope,
      p_envelope: args.envelope,
      p_peer_id: args.peerId ?? null,
      p_group_id: args.groupId ?? null,
      p_message_id: args.messageId ?? null,
      p_ct_len: Math.min(args.ctLen | 0, 10_000_000),
      p_success: args.success,
    } as never; // generated types mark uuid args non-null; runtime accepts null
    void supabase.rpc('audit_log_message', params).then(({ error }) => {
      if (error) console.warn('[audit] message log failed', error.message);
    });
  } catch (err) {
    console.warn('[audit] message log threw', err);
  }
}