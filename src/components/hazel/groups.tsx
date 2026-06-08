import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Ic, T, Av, gl, COLORS, showToast } from './ui';
import { useHazelStore } from '@/lib/hazel/store';
import {
  sendGroupMessage,
  createGroup,
  addGroupMember,
  removeGroupMember,
  renameGroup,
  leaveGroup,
} from '@/lib/hazel/chat-sync';
import { supabase } from '@/integrations/supabase/client';
import { hapticTap, hapticSuccess } from '@/lib/hazel/haptics';

const { W, S, AC, GN } = COLORS;

/* ── helpers ── */
const fileToDataURL = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

/* ── CREATE GROUP SCREEN ── */
export function CreateGroupScreen({ onBack, onCreated }: { onBack: () => void; onCreated: (groupId: string) => void }) {
  const { state } = useHazelStore();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const confirmed = useMemo(() => state.contacts.filter((c) => c.confirmed), [state.contacts]);
  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return showToast('Group name required');
    if (selected.size === 0) return showToast('Pick at least one member');
    setBusy(true);
    try {
      const id = await createGroup(trimmed, Array.from(selected));
      hapticSuccess();
      showToast('Group created');
      onCreated(id);
    } catch (e: any) {
      showToast(e?.message || 'Could not create group');
    } finally { setBusy(false); }
  };
  return (
    <div className="afu" style={{ padding: '14px 20px 140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <T onClick={onBack} style={{ ...gl('rgba(255,255,255,0.07)', 12, { boxShadow: 'none' }), width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S }}>
          <Ic n="ArrowLeft" s={18} />
        </T>
        <h1 style={{ color: W, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>New Group</h1>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 80))}
        placeholder="Group name"
        style={{ width: '100%', padding: '14px 16px', ...gl(), color: W, fontSize: 14, outline: 'none', marginBottom: 16 }}
      />
      <div style={{ fontSize: 11, color: S, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
        Members ({selected.size} selected)
      </div>
      {confirmed.length === 0 ? (
        <div style={{ ...gl(), padding: 24, textAlign: 'center', color: S }}>
          No confirmed contacts yet. Add some from Find People first.
        </div>
      ) : confirmed.map((ct) => {
        const on = selected.has(ct.id);
        return (
          <T key={ct.id} onClick={() => toggle(ct.id)} active="rgba(255,255,255,0.06)" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'left' }}>
            <Av ini={ct.ini} g={ct.g} on={ct.on} sz={42} src={ct.avatar} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: W, fontSize: 14, fontWeight: 600 }}>{ct.name}</div>
              <div style={{ color: S, fontSize: 11 }}>{ct.ph}</div>
            </div>
            <div style={{ width: 24, height: 24, borderRadius: 12, border: `2px solid ${on ? AC : 'rgba(255,255,255,0.2)'}`, background: on ? AC : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {on && <Ic n="Check" s={14} c={'#001535' as any} />}
            </div>
          </T>
        );
      })}
      <T
        onClick={create}
        disabled={busy}
        style={{ width: '100%', marginTop: 20, padding: '14px', borderRadius: 14, background: AC, color: '#001535', fontSize: 14, fontWeight: 800, border: 'none', minHeight: 50, opacity: busy ? 0.6 : 1 }}
      >
        {busy ? 'Creating…' : 'Create Group'}
      </T>
    </div>
  );
}

/* ── ATTACHMENT RENDERERS ── */
function MessageBody({ m, mine }: { m: any; mine: boolean }) {
  const onTone = mine ? '#001535' : W;
  if (m.type === 'image' && m.media) {
    return <img src={m.media} alt="attachment" style={{ display: 'block', maxWidth: 240, maxHeight: 300, borderRadius: 14, objectFit: 'cover' }} />;
  }
  if (m.type === 'video' && m.media) {
    return <video src={m.media} controls style={{ display: 'block', maxWidth: 240, maxHeight: 300, borderRadius: 14, background: '#000' }} />;
  }
  if (m.type === 'voice' && m.media) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Ic n="Mic" s={16} c={onTone as any} />
        <audio src={m.media} controls style={{ height: 32 }} />
        {m.dur && <span style={{ fontSize: 11, opacity: 0.7 }}>{m.dur}s</span>}
      </div>
    );
  }
  if (m.type === 'money') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
        <Ic n="DollarSign" s={18} c={onTone as any} />
        <div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{mine ? 'You sent' : 'Received'}</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{m.cur || ''} {m.amt}</div>
        </div>
      </div>
    );
  }
  return <span>{m.text}</span>;
}

/* ── GROUP CHAT VIEW ── */
export function GroupChatView({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const { state, set } = useHazelStore();
  const group = state.groups.find((g) => g.id === groupId);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileImgRef = useRef<HTMLInputElement>(null);
  const fileVidRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<{ rec: MediaRecorder; chunks: Blob[]; start: number } | null>(null);

  // Swipe-to-go-back
  const swipeRef = useRef<number | null>(null);
  const [swipeDx, setSwipeDx] = useState(0);
  const onTouchStart = (e: React.TouchEvent) => { if (e.touches[0].clientX < 30) swipeRef.current = e.touches[0].clientX; };
  const onTouchMove = (e: React.TouchEvent) => {
    if (swipeRef.current == null) return;
    const dx = e.touches[0].clientX - swipeRef.current;
    if (dx > 0) setSwipeDx(Math.min(200, dx));
  };
  const onTouchEnd = () => { if (swipeDx > 80) onBack(); setSwipeDx(0); swipeRef.current = null; };

  useEffect(() => {
    if (group && group.unread > 0) {
      set((s) => { const g = s.groups.find((x) => x.id === groupId); if (g) g.unread = 0; });
    }
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, group?.msgs.length]);

  if (!group) {
    return (
      <div className="afu" style={{ padding: 20 }}>
        <T onClick={onBack} style={{ color: S }}><Ic n="ArrowLeft" s={20} /> Back</T>
        <div style={{ color: S, marginTop: 40, textAlign: 'center' }}>Group not found.</div>
      </div>
    );
  }

  const pushOptimistic = (m: { type?: 'image' | 'video' | 'voice' | 'money'; text?: string; media?: string; dur?: number; amt?: number; cur?: string }) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const preview = m.type === 'image' ? '📷 Photo' : m.type === 'video' ? '🎬 Video' : m.type === 'voice' ? '🎙️ Voice note' : m.type === 'money' ? `💸 ${m.cur || ''}${m.amt ?? ''}` : (m.text ?? '');
    const tmpId = `tmp-${Date.now()}`;
    set((s) => {
      const g = s.groups.find((x) => x.id === groupId);
      if (!g) return;
      g.msgs.push({ ...(m as any), id: tmpId, sent: true, time: ts, pending: true });
      g.last = preview;
      g.time = 'Just now';
    });
    hapticTap();
    sendGroupMessage(groupId, m).catch((e) => {
      showToast(e?.message || 'Failed to send');
      set((s) => {
        const g = s.groups.find((x) => x.id === groupId);
        if (g) g.msgs = g.msgs.filter((mm) => mm.id !== tmpId);
      });
    });
  };

  const send = async () => {
    const t = msg.trim();
    if (!t || sending) return;
    setSending(true);
    setMsg('');
    pushOptimistic({ text: t });
    setSending(false);
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 8_000_000) return showToast('File too large (max 8MB)');
    const media = await fileToDataURL(f);
    pushOptimistic({ type, media });
  };

  const toggleRecord = async () => {
    if (recording && recRef.current) { recRef.current.rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const start = Date.now();
      rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        const media = await fileToDataURL(new File([blob], 'voice.webm', { type: blob.type }));
        const dur = Math.max(1, Math.round((Date.now() - start) / 1000));
        pushOptimistic({ type: 'voice', media, dur });
        recRef.current = null;
        setRecording(false);
      };
      recRef.current = { rec, chunks, start };
      rec.start();
      setRecording(true);
    } catch {
      showToast('Microphone permission denied');
    }
  };

  return (
    <div
      className="afu"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', transform: swipeDx ? `translateX(${swipeDx}px)` : undefined, transition: swipeDx ? 'none' : 'transform .2s' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <T onClick={onBack} style={{ ...gl('rgba(255,255,255,0.07)', 12, { boxShadow: 'none' }), width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S }}>
          <Ic n="ArrowLeft" s={18} />
        </T>
        <T onClick={() => setInfoOpen(true)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>
          <Av ini={initials(group.name)} g="purple" on={false} sz={40} src={group.avatar} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: W, fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</div>
            <div style={{ color: S, fontSize: 11 }}>{group.memberCount} member{group.memberCount === 1 ? '' : 's'} · tap for info</div>
          </div>
        </T>
        <T onClick={() => setInfoOpen(true)} aria-label="Group info" style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.07)', border: 'none', color: W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic n="Info" s={16} />
        </T>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {group.msgs.length === 0 && (
          <div style={{ color: S, fontSize: 13, textAlign: 'center', marginTop: 60 }}>No messages yet. Say hi 👋</div>
        )}
        {group.msgs.map((m) => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.sent ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '78%',
              padding: '10px 14px',
              borderRadius: 16,
              background: m.sent ? AC : 'rgba(255,255,255,0.08)',
              color: m.sent ? '#001535' : W,
              fontSize: 14, lineHeight: 1.35, wordBreak: 'break-word',
              opacity: m.pending ? 0.7 : 1,
            }}>
              <MessageBody m={m} mine={!!m.sent} />
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>{m.time}{m.pending ? ' · sending…' : ''}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="safe-bottom" style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <input ref={fileImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e, 'image')} />
        <input ref={fileVidRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleFile(e, 'video')} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px 4px 16px', ...gl('rgba(255,255,255,0.07)', 24, { boxShadow: 'none' }), minHeight: 46, minWidth: 0 }}>
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Message group…"
              style={{ flex: 1, background: 'transparent', border: 'none', color: W, fontSize: 15, outline: 'none', minWidth: 0 }}
            />
            <T onClick={() => setAttachOpen((v) => !v)} aria-label="Attach" style={{ width: 34, height: 34, borderRadius: 17, background: 'rgba(255,255,255,0.10)', border: 'none', color: W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic n="Paperclip" s={15} />
            </T>
          </div>
          {attachOpen && (
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: 60, right: 60, zIndex: 30, minWidth: 170, ...gl('rgba(8,28,68,0.96)', 14), padding: 6 }}>
              {[
                { icon: 'ImagePlus', label: 'Photo', fn: () => { setAttachOpen(false); fileImgRef.current?.click(); } },
                { icon: 'Film', label: 'Video', fn: () => { setAttachOpen(false); fileVidRef.current?.click(); } },
              ].map((it) => (
                <T key={it.label} onClick={it.fn} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'none', border: 'none', color: W, fontSize: 13, fontWeight: 600, textAlign: 'left', borderRadius: 10 }}>
                  <Ic n={it.icon} s={16} c={AC as any} />
                  {it.label}
                </T>
              ))}
            </div>
          )}
          {msg.trim() ? (
            <T onClick={send} aria-label="Send" style={{ width: 44, height: 44, borderRadius: 22, background: AC, border: 'none', color: '#001535', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic n="ArrowUp" s={18} />
            </T>
          ) : (
            <T onClick={toggleRecord} aria-label={recording ? 'Stop recording' : 'Record voice note'} style={{ width: 44, height: 44, borderRadius: 22, background: recording ? '#ef4444' : AC, border: 'none', color: '#001535', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: recording ? '0 0 0 4px rgba(239,68,68,0.25)' : 'none' }}>
              <Ic n={recording ? 'Square' : 'Mic'} s={18} />
            </T>
          )}
        </div>
        {recording && <div style={{ marginTop: 8, fontSize: 11, color: '#ef4444' }}>● Recording…</div>}
      </div>

      {infoOpen && <GroupInfoSheet groupId={groupId} onClose={() => setInfoOpen(false)} onLeft={onBack} />}
    </div>
  );
}

/* ── GROUP INFO SHEET ── */
function GroupInfoSheet({ groupId, onClose, onLeft }: { groupId: string; onClose: () => void; onLeft: () => void }) {
  const { state } = useHazelStore();
  const group = state.groups.find((g) => g.id === groupId);
  const [me, setMe] = useState<string | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, { name: string; avatar?: string; username?: string }>>({});
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(group?.name || '');
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id || null));
  }, []);

  useEffect(() => {
    if (!group?.members?.length) return;
    const ids = group.members.map((m) => m.user_id);
    supabase
      .from('profiles_public')
      .select('id, display_name, username, avatar_url')
      .in('id', ids)
      .then(({ data }) => {
        const map: Record<string, any> = {};
        (data || []).forEach((p: any) => {
          map[p.id] = { name: p.display_name || p.username || 'Member', avatar: p.avatar_url || undefined, username: p.username || undefined };
        });
        setMemberProfiles(map);
      });
  }, [group?.members?.length, groupId]);

  if (!group) return null;
  const myRow = group.members?.find((m) => m.user_id === me);
  const isAdmin = myRow?.role === 'owner' || myRow?.role === 'admin';

  const doRename = async () => {
    const n = newName.trim();
    if (!n || n === group.name) { setEditingName(false); return; }
    setBusy(true);
    try {
      await renameGroup(groupId, n);
      hapticSuccess();
      showToast('Group renamed');
      setEditingName(false);
    } catch (e: any) {
      showToast(e?.message || 'Failed to rename');
    } finally { setBusy(false); }
  };

  const doRemove = async (uid: string) => {
    if (!confirm('Remove this member?')) return;
    setBusy(true);
    try { await removeGroupMember(groupId, uid); showToast('Removed'); }
    catch (e: any) { showToast(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const doLeave = async () => {
    if (!confirm('Leave this group?')) return;
    setBusy(true);
    try {
      await leaveGroup(groupId);
      showToast('Left group');
      onClose();
      onLeft();
    } catch (e: any) { showToast(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} className="afu" style={{ width: '100%', maxHeight: '88vh', overflowY: 'auto', background: '#031436', borderRadius: '24px 24px 0 0', padding: '14px 18px 32px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', margin: '4px auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <Av ini={initials(group.name)} g="purple" on={false} sz={60} src={group.avatar} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.slice(0, 80))}
                  autoFocus
                  style={{ flex: 1, padding: '8px 10px', ...gl('rgba(255,255,255,0.08)', 10, { boxShadow: 'none' }), color: W, fontSize: 14, outline: 'none' }}
                />
                <T onClick={doRename} disabled={busy} style={{ padding: '0 14px', borderRadius: 10, background: AC, color: '#001535', border: 'none', fontSize: 12, fontWeight: 700 }}>Save</T>
              </div>
            ) : (
              <>
                <div style={{ color: W, fontSize: 19, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</div>
                <div style={{ color: S, fontSize: 12 }}>{group.memberCount} member{group.memberCount === 1 ? '' : 's'}</div>
              </>
            )}
          </div>
          {isAdmin && !editingName && (
            <T onClick={() => { setNewName(group.name); setEditingName(true); }} aria-label="Rename group" style={{ width: 34, height: 34, borderRadius: 17, background: 'rgba(255,255,255,0.08)', border: 'none', color: W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic n="Pencil" s={14} />
            </T>
          )}
        </div>

        <div style={{ fontSize: 11, color: S, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Members</span>
          {isAdmin && (
            <T onClick={() => setPicking(true)} style={{ background: 'rgba(37,99,235,0.18)', border: '1px solid rgba(37,99,235,0.35)', color: AC, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 12 }}>
              + Add
            </T>
          )}
        </div>

        {(group.members || []).map((m) => {
          const p = memberProfiles[m.user_id] || { name: 'Member' };
          const isMe = m.user_id === me;
          return (
            <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <Av ini={initials(p.name)} g="blue" on={false} sz={38} src={p.avatar} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: W, fontSize: 14, fontWeight: 600 }}>
                  {p.name}{isMe ? ' (you)' : ''}
                </div>
                <div style={{ color: m.role === 'owner' ? GN : S, fontSize: 11, textTransform: 'capitalize' }}>{m.role}</div>
              </div>
              {isAdmin && !isMe && m.role !== 'owner' && (
                <T onClick={() => doRemove(m.user_id)} disabled={busy} aria-label="Remove member" style={{ width: 30, height: 30, borderRadius: 15, background: 'rgba(239,68,68,0.15)', border: 'none', color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic n="UserMinus" s={14} />
                </T>
              )}
            </div>
          );
        })}

        <T onClick={doLeave} disabled={busy} style={{ width: '100%', marginTop: 22, padding: '14px', borderRadius: 14, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 14, fontWeight: 700 }}>
          <Ic n="LogOut" s={15} /> Leave Group
        </T>
      </div>

      {picking && (
        <AddMemberPicker
          groupId={groupId}
          existingIds={new Set((group.members || []).map((m) => m.user_id))}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}

/* ── ADD MEMBER PICKER ── */
function AddMemberPicker({ groupId, existingIds, onClose }: { groupId: string; existingIds: Set<string>; onClose: () => void }) {
  const { state } = useHazelStore();
  const available = state.contacts.filter((c) => c.confirmed && !existingIds.has(c.id));
  const [busy, setBusy] = useState<string | null>(null);
  const add = async (uid: string) => {
    setBusy(uid);
    try {
      await addGroupMember(groupId, uid);
      hapticSuccess();
      showToast('Added');
      onClose();
    } catch (e: any) {
      showToast(e?.message || 'Failed to add');
    } finally { setBusy(null); }
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 80, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} className="afu" style={{ width: '100%', maxHeight: '80vh', overflowY: 'auto', background: '#041a44', borderRadius: '24px 24px 0 0', padding: '14px 18px 32px' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', margin: '4px auto 14px' }} />
        <h2 style={{ color: W, fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Add member</h2>
        {available.length === 0 ? (
          <div style={{ color: S, fontSize: 13, padding: '24px 0', textAlign: 'center' }}>No more contacts to add.</div>
        ) : available.map((ct) => (
          <T key={ct.id} onClick={() => add(ct.id)} disabled={busy === ct.id} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'left' }}>
            <Av ini={ct.ini} g={ct.g} on={ct.on} sz={40} src={ct.avatar} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: W, fontSize: 14, fontWeight: 600 }}>{ct.name}</div>
              <div style={{ color: S, fontSize: 11 }}>{ct.ph}</div>
            </div>
            <Ic n="Plus" s={18} c={AC as any} />
          </T>
        ))}
      </div>
    </div>
  );
}