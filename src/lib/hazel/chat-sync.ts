import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHazelStore, type Contact, type Conv, type Group, type GroupMember } from './store';
import { GRAD_MAP } from './data';
import { sendPushToUser } from './push-notify.functions';
import { encryptDmPayload, decryptDmCiphertext, isSignalEnvelope } from '@/lib/e2ee/cipher';
import { encryptGroupPayload, decryptGroupCiphertext, isGroupFanEnvelope } from '@/lib/e2ee/group-cipher';

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

/**
 * Local cache of plaintext payloads we sent ourselves, keyed by message id.
 * Needed because Signal ciphertext is encrypted to the peer's session — we
 * cannot decrypt our own outbound rows on reload from another tab/device.
 */
const MSG_CACHE_PREFIX = 'lumens-msg-cache:';
function cacheOwnPayload(id: string, payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(MSG_CACHE_PREFIX + id, JSON.stringify(payload)); } catch {}
}
function readOwnPayload(id: string): Record<string, any> | null {
  if (typeof window === 'undefined') return null;
  try { const v = localStorage.getItem(MSG_CACHE_PREFIX + id); return v ? JSON.parse(v) : null; } catch { return null; }
}

/**
 * Decode a 1-1 message row to its payload, transparently handling both
 * Signal-encrypted envelopes (preferred) and legacy base64-JSON rows.
 */
async function decodeDmRow(row: any, myUserId: string): Promise<Record<string, any>> {
  const ct = row.ciphertext as string;
  const isMine = row.sender_id === myUserId;
  if (isSignalEnvelope(ct)) {
    if (isMine) {
      return readOwnPayload(row.id) ?? { text: '[encrypted — sent from another device]' };
    }
    const peer = row.sender_id as string;
    const pt = await decryptDmCiphertext(myUserId, peer, ct);
    return pt ?? { text: '[unable to decrypt]' };
  }
  return decodePayload(ct) ?? {};
}

/**
 * Decode a group message row, transparently handling both the group
 * fan-out envelope and legacy base64-JSON rows.
 */
async function decodeGroupRow(row: any, myUserId: string): Promise<Record<string, any>> {
  const ct = row.ciphertext as string;
  const isMine = row.sender_id === myUserId;
  if (isGroupFanEnvelope(ct)) {
    if (isMine) {
      return readOwnPayload(row.id) ?? { text: '[encrypted — sent from another device]' };
    }
    const pt = await decryptGroupCiphertext(myUserId, row.sender_id as string, ct);
    return pt ?? { text: '[unable to decrypt]' };
  }
  return decodePayload(ct) ?? {};
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
        const decoded = await Promise.all((msgs ?? []).map(async (m) => ({ m, payload: await decodeDmRow(m, userId) })));
        decoded.forEach(({ m, payload }) => {
          const other = m.sender_id === userId ? m.recipient_id : m.sender_id;
          const c = convByOther.get(other as string);
          if (!c) return;
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
        for (const m of (gmsgs ?? [])) {
          const g = byGroup.get(m.group_id as string);
          if (!g) continue;
          const payload = await decodeGroupRow(m, userId);
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
        }

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
        void applyIncoming(payload.new as any, userId, set);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` }, (payload) => {
        void applyIncoming(payload.new as any, userId, set);
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
        void applyIncomingGroup(row, userId, set);
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

/** Fetch a single contact's public profile via the safe view. Never returns
 *  phone/dob — those are owner-only and must not leak between users. */
export async function fetchContactProfile(userId: string) {
  const { data } = await supabase
    .from('profiles_public')
    .select('id, display_name, username, avatar_url, cover_url')
    .eq('id', userId)
    .maybeSingle();
  return data as null | {
    id: string; display_name: string | null; username: string | null;
    avatar_url: string | null; cover_url: string | null;
  };
}

/**
 * Disconnect a confirmed contact: removes the contact row (so the user no
 * longer appears in our contact / chat / call lists), and clears any local
 * conversation cached for that contact. Conversation rows in the DB stay
 * intact for the other side — but without a matching contact, our UI hides
 * them everywhere.
 */
export async function removeContact(otherUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not authenticated');
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('user_id', user.id)
    .eq('contact_user_id', otherUserId);
  if (error) throw error;
  // Best-effort: also drop the reverse row so the other side's "Contacts"
  // section reflects the disconnect. RLS may block this, which is fine.
  await supabase
    .from('contacts')
    .delete()
    .eq('user_id', otherUserId)
    .eq('contact_user_id', user.id);
  const { getStateSnapshot } = await import('./store');
  const s = getStateSnapshot();
  const setter = (useHazelStore as any);
  // Update via a transient subscription-free path: mutate snapshot then notify
  s.contacts = s.contacts.filter((c) => c.id !== otherUserId);
  s.conversations = s.conversations.filter((c) => c.cid !== otherUserId);
  try { window.dispatchEvent(new CustomEvent('lumens:refresh-chats')); } catch {}
}

async function applyIncoming(row: any, userId: string, set: ReturnType<typeof useHazelStore>['set']) {
  const other: string = row.sender_id === userId ? row.recipient_id : row.sender_id;
  const isSent = row.sender_id === userId;
  const payload = await decodeDmRow(row, userId);
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
        mediaPath: payload.mediaPath,
        dur: payload.dur,
        sent: isSent,
        time: fmtTime(row.created_at),
      });
    }
  });
}

/** Send a message to a confirmed contact. Resolves with the conversation id. */
export async function sendChatMessage(otherUserId: string, payload: { text?: string; type?: 'image' | 'video' | 'voice' | 'money'; amt?: number; cur?: string; media?: string; mediaPath?: string; dur?: number }) {
  const { data: convId, error: ce } = await supabase.rpc('get_or_create_conversation', { other_user_id: otherUserId });
  if (ce || !convId) throw ce || new Error('no conversation');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not authenticated');
  // E2EE: encrypt with Signal (X3DH on first message, Double Ratchet after).
  // Fall back to base64-JSON only if encryption fails (peer has no bundle yet).
  let ciphertext: string;
  try {
    ciphertext = await encryptDmPayload(user.id, otherUserId, payload);
  } catch (e) {
    console.warn('[e2ee] encryption failed, falling back to legacy encoding', e);
    ciphertext = encodePayload(payload).ciphertext;
  }
  const nonce = Math.random().toString(36).slice(2, 14);
  const kind = payload.type ?? 'text';
  // Server-stored preview must NOT leak message contents — chat is E2EE.
  // Use neutral kind labels only; the real preview is rendered client-side
  // from the decrypted payload.
  const preview = payload.type === 'image' ? '📷 Photo'
    : payload.type === 'video' ? '🎬 Video'
    : payload.type === 'voice' ? '🎙️ Voice note'
    : payload.type === 'money' ? '💸 Payment'
    : '💬 Message';
  const { data: inserted, error: me } = await supabase.from('messages').insert({
    conversation_id: convId as string,
    sender_id: user.id,
    recipient_id: otherUserId,
    ciphertext, nonce, kind,
  }).select('id').single();
  if (me) throw me;
  // Cache our own plaintext locally so we can re-render on reload — we
  // cannot decrypt a Signal envelope we encrypted to a peer.
  if (inserted?.id) cacheOwnPayload(inserted.id as string, payload);
  await supabase.rpc('touch_conversation_preview', {
    p_conversation_id: convId as string,
    p_preview: preview.slice(0, 200),
  });
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

async function applyIncomingGroup(row: any, userId: string, set: ReturnType<typeof useHazelStore>['set']) {
  const isSent = row.sender_id === userId;
  const payload = await decodeGroupRow(row, userId);
  const preview = payload.type === 'image' ? '📷 Photo' : payload.type === 'video' ? '🎬 Video' : payload.type === 'voice' ? '🎙️ Voice note' : payload.type === 'money' ? `💸 ${payload.cur || ''}${payload.amt ?? ''}` : (payload.text ?? '');
  set((s) => {
    const g = s.groups.find((x) => x.id === row.group_id);
    if (!g) return;
    g.last = preview;
    g.time = 'Just now';
    if (!isSent) g.unread = (g.unread || 0) + 1;
    if (!g.msgs.find((m) => m.id === row.id)) {
      const pendIdx = g.msgs.findIndex((m) => m.pending && m.sent === isSent && (m.text === payload.text || m.media === payload.media));
      if (pendIdx >= 0) g.msgs.splice(pendIdx, 1);
      g.msgs.push({
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
    // bump to top
    s.groups = [g, ...s.groups.filter((x) => x !== g)];
  });
}

/** Send a message to a group. */
export async function sendGroupMessage(groupId: string, payload: { text?: string; type?: 'image' | 'video' | 'voice' | 'money'; amt?: number; cur?: string; media?: string; dur?: number }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not authenticated');
  let ciphertext: string;
  let nonce: string;
  try {
    ciphertext = await encryptGroupPayload(user.id, groupId, payload);
    nonce = Math.random().toString(36).slice(2, 14);
  } catch (err) {
    console.warn('[e2ee] group encrypt failed, falling back to legacy', err);
    const enc = encodePayload(payload);
    ciphertext = enc.ciphertext; nonce = enc.nonce;
  }
  const kind = payload.type ?? 'text';
  // Neutral preview only — group rows are visible to all members, so the
  // server-stored preview must not carry plaintext message content.
  const preview = payload.type === 'image' ? '📷 Photo'
    : payload.type === 'video' ? '🎬 Video'
    : payload.type === 'voice' ? '🎙️ Voice note'
    : payload.type === 'money' ? '💸 Payment'
    : '💬 Message';
  const { data: inserted, error } = await supabase.from('messages').insert({
    group_id: groupId,
    sender_id: user.id,
    ciphertext, nonce, kind,
  }).select('id').single();
  if (error) throw error;
  if (inserted?.id) cacheOwnPayload(inserted.id as string, payload);
  await supabase.rpc('touch_group_preview', {
    p_group_id: groupId,
    p_preview: preview.slice(0, 200),
  });
  // Push to all other group members
  try {
    const { data: members } = await supabase.from('group_members').select('user_id').eq('group_id', groupId);
    const { data: prof } = await supabase.from('profiles').select('display_name, username').eq('id', user.id).maybeSingle();
    const { data: grp } = await supabase.from('groups').select('name').eq('id', groupId).maybeSingle();
    const senderName = (prof?.display_name || prof?.username || 'New message') as string;
    const groupName = (grp?.name || 'Group') as string;
    (members ?? []).forEach((m: any) => {
      if (m.user_id === user.id) return;
      void sendPushToUser({ data: {
        recipientUserId: m.user_id,
        title: groupName,
        body: `${senderName}: ${preview.slice(0, 120) || 'New message'}`,
        url: '/',
        tag: `grp:${groupId}`,
      }}).catch(() => {});
    });
  } catch {}
}

/** Create a group. memberIds = confirmed contact user ids. Returns the group id. */
export async function createGroup(name: string, memberIds: string[]): Promise<string> {
  const { data, error } = await supabase.rpc('create_group', { p_name: name, p_member_ids: memberIds });
  if (error) throw error;
  return data as string;
}

/** Add a confirmed contact to a group (admin/owner only). */
export async function addGroupMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('add_group_member', { p_group_id: groupId, p_user_id: userId });
  if (error) throw error;
}

/** Remove a member from a group (admin/owner) or leave (self). */
export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_group_member', { p_group_id: groupId, p_user_id: userId });
  if (error) throw error;
}

/** Rename a group (admin/owner only). */
export async function renameGroup(groupId: string, name: string): Promise<void> {
  const { error } = await supabase.rpc('rename_group', { p_group_id: groupId, p_name: name });
  if (error) throw error;
}

/** Current user leaves a group. */
export async function leaveGroup(groupId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not authenticated');
  await removeGroupMember(groupId, user.id);
}
