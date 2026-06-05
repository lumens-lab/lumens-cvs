import { useEffect, useMemo, useRef, useState } from 'react';
import { Ic, T, Av, gl, COLORS, showToast } from './ui';
import { useHazelStore } from '@/lib/hazel/store';
import { sendGroupMessage, createGroup } from '@/lib/hazel/chat-sync';
import { haptic } from '@/lib/hazel/haptics';

const { W, S, S2, AC } = COLORS;

/* ── CREATE GROUP SCREEN ── */
export function CreateGroupScreen({ onBack, onCreated }: { onBack: () => void; onCreated: (groupId: string) => void }) {
  const { state } = useHazelStore();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const confirmed = useMemo(() => state.contacts.filter((c) => c.confirmed), [state.contacts]);
  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) { showToast('Group name required'); return; }
    if (selected.size === 0) { showToast('Pick at least one member'); return; }
    setBusy(true);
    try {
      const id = await createGroup(trimmed, Array.from(selected));
      haptic('success');
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

/* ── GROUP CHAT VIEW ── */
export function GroupChatView({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const { state, set } = useHazelStore();
  const group = state.groups.find((g) => g.id === groupId);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  // Swipe-to-go-back
  const swipeRef = useRef<number | null>(null);
  const [swipeDx, setSwipeDx] = useState(0);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0].clientX < 30) swipeRef.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (swipeRef.current == null) return;
    const dx = e.touches[0].clientX - swipeRef.current;
    if (dx > 0) setSwipeDx(Math.min(200, dx));
  };
  const onTouchEnd = () => {
    if (swipeDx > 80) { onBack(); }
    setSwipeDx(0);
    swipeRef.current = null;
  };

  useEffect(() => {
    // Clear unread on open
    if (group && group.unread > 0) {
      set((s) => { const g = s.groups.find((x) => x.id === groupId); if (g) g.unread = 0; });
    }
    // Scroll to bottom on new messages
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupId, group?.msgs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!group) {
    return (
      <div className="afu" style={{ padding: 20 }}>
        <T onClick={onBack} style={{ color: S }}><Ic n="ArrowLeft" s={20} /> Back</T>
        <div style={{ color: S, marginTop: 40, textAlign: 'center' }}>Group not found.</div>
      </div>
    );
  }

  const send = async () => {
    const t = msg.trim();
    if (!t || sending) return;
    setSending(true);
    setMsg('');
    haptic('light');
    try {
      await sendGroupMessage(groupId, { text: t });
    } catch (e: any) {
      showToast(e?.message || 'Could not send');
      setMsg(t);
    } finally { setSending(false); }
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
        <Av ini={group.name.slice(0, 2).toUpperCase()} g="purple" on={false} sz={40} src={group.avatar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: W, fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</div>
          <div style={{ color: S, fontSize: 11 }}>{group.memberCount} member{group.memberCount === 1 ? '' : 's'}</div>
        </div>
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
              fontSize: 14,
              lineHeight: 1.35,
              wordBreak: 'break-word',
            }}>
              {m.text}
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>{m.time}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="safe-bottom" style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message group…"
          rows={1}
          style={{ flex: 1, padding: '12px 14px', ...gl(), color: W, fontSize: 14, outline: 'none', resize: 'none', maxHeight: 120, minHeight: 44 }}
        />
        <T onClick={send} disabled={!msg.trim() || sending} style={{ width: 44, height: 44, borderRadius: 22, background: msg.trim() ? AC : 'rgba(255,255,255,0.08)', color: msg.trim() ? '#001535' : S, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
          <Ic n="Send" s={18} />
        </T>
      </div>
    </div>
  );
}