import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHazelStore, type Contact, type Conv, type Group, type GroupMember } from './store';
import { GRAD_MAP } from './data';
import { sendPushToUser } from './push-notify.functions';

const GRADS = Object.keys(GRAD_MAP);
const pickG = (seed: string) => GRADS[Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % GRADS.length];
const initials = (n: string) => n.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

/**
 * Wire-format obfuscation. The schema requires ciphertext+nonce. This is a
 * placeholder for true E2EE — payloads are base64-encoded JSON, NOT encrypted.
 * Replace with libsodium box() once a key-exchange story is added.
 */
export function encodePayload(payload: Record<string, unknown>): { ciphertext: string; nonce: string } {
  const json = JSON.stringify(payload);
  const ct = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, 'utf8').toString('base64');
  const nonce = Math.random().toString(36).slice(2, 14);
  return { ciphertext: ct, nonce };
}
export function decodePayload(ciphertext: string): Record<string, any> | null {
  try {
    const json = typeof window !== 'undefined' ? decodeURIComponent(escape(atob(ciphertext))) : Buffer.from(ciphertext, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch { return null; }
}

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); }
  catch { return ''; }
}
function fmtRel(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

type ProfileRow = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

function toContact(p: ProfileRow): Contact {
  const name = p.display_name || p.username || 'Contact';
  return { id: p.id, name, ini: initials(name), ph: p.username ? '@' + p.username : 'Confirmed contact', g: pickG(p.id), on: false, confirmed: true, avatar: p.avatar_url || undefined };
}

/**
 * Sync confirmed contacts + conversations + recent messages from Supabase,
 * then subscribe to realtime so two-way chat works.
 */
export function useChatSync(userId: string | null) {
  const { set } = useHazelStore();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const loadAll = async () => {
      // 1) confirmed contacts (+profile lookup for display name/avatar)
      const { data: cRows } = await supabase
        .from('contacts')
        .select('contact_user_id, name, confirmed')
        .eq('user_id', userId)
        .eq('confirmed', true);
      const contactIds = (cRows ?? []).map((r) => r.contact_user_id).filter(Boolean) as string[];
      const { data: profs } = contactIds.length
        ? await supabase.from('profiles_public').select('id, display_name, username, avatar_url').in('id', contactIds)
        : { data: [] as ProfileRow[] };
      const profMap = new Map<string, ProfileRow>();
      (profs ?? []).forEach((p) => { if (p.id) profMap.set(p.id, p as ProfileRow); });
      const contacts: Contact[] = (cRows ?? []).map((r) => {
        const p = profMap.get(r.contact_user_id as string);
        if (p) return toContact(p);
        const name = r.name || 'Contact';
        return { id: r.contact_user_id as string, name, ini: initials(name), ph: 'Confirmed contact', g: pickG(r.contact_user_id as string), on: false, confirmed: true };
      });

      // 2) conversations
      const { data: convRows } = await supabase
        .from('conversations')
        .select('id, user_a, user_b, last_preview, last_at')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order('last_at', { ascending: false });
      const convs: Conv[] = (convRows ?? []).map((c) => {
        const other = c.user_a === userId ? c.user_b : c.user_a;
        return { cid: other as string, convId: c.id as string, last: c.last_preview || '', time: fmtRel(c.last_at as string), unread: 0, msgs: [] };
      });
      const convByOther = new Map(convs.map((c) => [c.cid, c]));
      const convIds = convs.map((c) => c.convId!).filter(Boolean);

      // 3) recent messages
      if (convIds.length) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, recipient_id, ciphertext, kind, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: true })
          .limit(500);
        (msgs ?? []).forEach((m) => {
          const other = m.sender_id === userId ? m.recipient_id : m.sender_id;
          const c = convByOther.get(other as string);
          if (!c) return;
          const payload = decodePayload(m.ciphertext as string) || {};
          c.msgs.push({
            id: m.id as string,
            text: payload.text,
            type: payload.type,
            amt: payload.amt,
            cur: payload.cur,
            media: payload.media,
            dur: payload.dur,
            sent: m.sender_id === userId,
            time: fmtTime(m.created_at as string),
          });
        });
      }

      if (cancelled) return;

      // 5) groups
      const { data: grpRows } = await supabase.rpc('list_my_groups');
      const groupList = (grpRows ?? []) as Array<{ id: string; name: string; avatar_url: string | null; owner_id: string; last_preview: string | null; last_at: string; member_count: number }>;
      const groupIds = groupList.map((g) => g.id);
      const existingGroups = new Map<string, Group>();
      // preserve existing msgs to avoid scroll flicker
      try {
        const cur = (set as any) as never;
        void cur;
      } catch {}
      const groups: Group[] = groupList.map((g) => ({
        id: g.id,
        name: g.name,
        avatar: g.avatar_url || undefined,
        ownerId: g.owner_id,
        memberCount: Number(g.member_count) || 0,
        last: g.last_preview || '',
        time: fmtRel(g.last_at),
        unread: 0,
        msgs: [],
      }));

      // group messages
      if (groupIds.length) {
        const { data: gmsgs } = await supabase
          .from('messages')
          .select('id, group_id, sender_id, ciphertext, kind, created_at')
          .in('group_id', groupIds)
          .order('created_at', { ascending: true })
          .limit(1000);
        const byGroup = new Map(groups.map((g) => [g.id, g]));
        (gmsgs ?? []).forEach((m) => {
          const g = byGroup.get(m.group_id as string);
          if (!g) return;
          const payload = decodePayload(m.ciphertext as string) || {};
          g.msgs.push({
            id: m.id as string,
            text: payload.text,
            type: payload.type,
            amt: payload.amt,
            cur: payload.cur,
            media: payload.media,
            dur: payload.dur,
            sent: m.sender_id === userId,
            time: fmtTime(m.created_at as string),
          });
        });

        // members
        const { data: gmRows } = await supabase
          .from('group_members')
          .select('group_id, user_id, role')
          .in('group_id', groupIds);
        const memMap = new Map<string, GroupMember[]>();
        (gmRows ?? []).forEach((r) => {
          const arr = memMap.get(r.group_id as string) || [];
          arr.push({ user_id: r.user_id as string, role: (r.role as any) || 'member' });
          memMap.set(r.group_id as string, arr);
        });
        groups.forEach((g) => { g.members = memMap.get(g.id) || []; });
      }

      set((s) => {
        s.contacts = contacts;
        s.conversations = convs;
        // preserve unread counts from previous state where possible
        const prevUnread = new Map(s.groups.map((g) => [g.id, g.unread]));
        s.groups = groups.map((g) => ({ ...g, unread: prevUnread.get(g.id) ?? 0 }));
      });
    };

    loadAll();

    // Pull-to-refresh hook
    const onRefresh = () => { loadAll(); };
    if (typeof window !== 'undefined') window.addEventListener('lumens:refresh-chats', onRefresh);

    // 4) realtime: messages for me (either side)
    const channel = supabase
      .channel(`chat:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` }, (payload) => {
        applyIncoming(payload.new as any, userId, set);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` }, (payload) => {
        applyIncoming(payload.new as any, userId, set);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        const old: any = payload.old || {};
        // Only act if this user is a party
        if (old.sender_id !== userId && old.recipient_id !== userId) return;
        set((s) => {
          for (const cv of s.conversations) {
            const before = cv.msgs.length;
            cv.msgs = cv.msgs.filter((m) => m.id !== old.id);
            if (cv.msgs.length !== before) {
              const last = cv.msgs[cv.msgs.length - 1];
              if (last) cv.last = last.text || (last.type === 'image' ? '📷 Photo' : last.type === 'video' ? '🎬 Video' : last.type === 'voice' ? '🎙️ Voice note' : last.type === 'money' ? '💸 Money' : '');
              else cv.last = '';
            }
          }
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts', filter: `user_id=eq.${userId}` }, () => { loadAll(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const row: any = payload.new || {};
        if (!row.group_id) return;
        applyIncomingGroup(row, userId, set);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${userId}` }, () => { loadAll(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'groups' }, () => { loadAll(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        const p = payload.new as any;
        if (!p?.id) return;
        set((s) => {
          const c = s.contacts.find((x) => x.id === p.id);
          if (c) {
            const name = p.display_name || p.username || c.name;
            const changed = c.name !== name || c.avatar !== (p.avatar_url || undefined);
            c.name = name;
            c.ini = name.split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
            c.avatar = p.avatar_url || undefined;
            c.ph = p.username ? '@' + p.username : c.ph;
            if (changed && typeof window !== 'undefined') {
              import('@/components/hazel/ui').then(({ showToast }) => showToast(`${name} updated their profile`)).catch(() => {});
            }
          }
        });
      })
      .subscribe();

    // 5) presence: broadcast my online state and track others
    const presence = supabase.channel('presence:lumens', {
      config: { presence: { key: userId } },
    });
    const applyPresence = () => {
      const st = presence.presenceState() as Record<string, unknown[]>;
      const onlineIds = new Set(Object.keys(st));
      set((s) => {
        s.contacts.forEach((c) => { c.on = onlineIds.has(c.id); });
      });
    };
    presence
      .on('presence', { event: 'sync' }, applyPresence)
      .on('presence', { event: 'join' }, applyPresence)
      .on('presence', { event: 'leave' }, applyPresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presence.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      supabase.removeChannel(presence);
      if (typeof window !== 'undefined') window.removeEventListener('lumens:refresh-chats', onRefresh);
    };
  }, [userId, set]);
}

/** Fetch a single contact's public profile (display_name, username, avatar, cover, dob, phone). */
export async function fetchContactProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url, cover_url, dob, phone')
    .eq('id', userId)
    .maybeSingle();
  return data as null | {
    id: string; display_name: string | null; username: string | null;
    avatar_url: string | null; cover_url: string | null;
    dob: string | null; phone: string | null;
  };
}

function applyIncoming(row: any, userId: string, set: ReturnType<typeof useHazelStore>['set']) {
  const other: string = row.sender_id === userId ? row.recipient_id : row.sender_id;
  const isSent = row.sender_id === userId;
  const payload = decodePayload(row.ciphertext) || {};
  const preview = payload.type === 'image' ? '📷 Photo' : payload.type === 'video' ? '🎬 Video' : payload.type === 'voice' ? '🎙️ Voice note' : payload.type === 'money' ? `💸 ${payload.cur || ''}${payload.amt ?? ''}` : (payload.text ?? '');
  set((s) => {
    let cv = s.conversations.find((c) => c.convId === row.conversation_id || c.cid === other);
    if (!cv) {
      cv = { cid: other, convId: row.conversation_id, last: preview, time: 'Just now', unread: isSent ? 0 : 1, msgs: [] };
      s.conversations = [cv, ...s.conversations];
    } else {
      cv.convId = row.conversation_id;
      cv.last = preview;
      cv.time = 'Just now';
      if (!isSent) cv.unread = (cv.unread || 0) + 1;
      // bump to top
      s.conversations = [cv, ...s.conversations.filter((c) => c !== cv)];
    }
    // dedupe by id
    if (!cv.msgs.find((m) => m.id === row.id)) {
      // replace optimistic pending if any
      const pendIdx = cv.msgs.findIndex((m) => m.pending && m.sent === isSent && (m.text === payload.text || m.media === payload.media));
      if (pendIdx >= 0) cv.msgs.splice(pendIdx, 1);
      cv.msgs.push({
        id: row.id,
        text: payload.text,
        type: payload.type,
        amt: payload.amt,
        cur: payload.cur,
        media: payload.media,
        dur: payload.dur,
        sent: isSent,
        time: fmtTime(row.created_at),
      });
    }
  });
}

/** Send a message to a confirmed contact. Resolves with the conversation id. */
export async function sendChatMessage(otherUserId: string, payload: { text?: string; type?: 'image' | 'video' | 'voice' | 'money'; amt?: number; cur?: string; media?: string; dur?: number }) {
  const { data: convId, error: ce } = await supabase.rpc('get_or_create_conversation', { other_user_id: otherUserId });
  if (ce || !convId) throw ce || new Error('no conversation');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not authenticated');
  const { ciphertext, nonce } = encodePayload(payload);
  const kind = payload.type ?? 'text';
  const preview = payload.type === 'image' ? '📷 Photo' : payload.type === 'video' ? '🎬 Video' : payload.type === 'voice' ? '🎙️ Voice note' : payload.type === 'money' ? `💸 ${payload.cur || ''}${payload.amt ?? ''}` : (payload.text ?? '');
  const { error: me } = await supabase.from('messages').insert({
    conversation_id: convId as string,
    sender_id: user.id,
    recipient_id: otherUserId,
    ciphertext, nonce, kind,
  });
  if (me) throw me;
  await supabase.from('conversations').update({ last_preview: preview.slice(0, 200), last_at: new Date().toISOString() }).eq('id', convId as string);
  // Fire-and-forget server-side Web Push so the recipient gets notified even
  // when their tab is closed. Errors are swallowed — chat send must not fail.
  try {
    const { data: prof } = await supabase
      .from('profiles').select('display_name, username').eq('id', user.id).maybeSingle();
    const name = (prof?.display_name || prof?.username || 'New message') as string;
    void sendPushToUser({ data: {
      recipientUserId: otherUserId,
      title: name,
      body: preview.slice(0, 140) || 'New message',
      url: '/',
      tag: `msg:${convId}`,
    }}).catch(() => {});
  } catch {}
  return convId as string;
}

/** Delete one of your own messages. RLS allows only the sender to delete. */
export async function deleteChatMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from('messages').delete().eq('id', messageId);
  if (error) throw error;
}