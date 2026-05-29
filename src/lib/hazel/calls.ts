import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export type CallMode = 'audio' | 'video';
export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'in-call' | 'ended';

export type IncomingCall = {
  callId: string;
  fromUser: string;
  mode: CallMode;
};

export type CallState = {
  status: CallStatus;
  mode: CallMode;
  callId: string | null;
  peerId: string | null;     // other user id
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startedAt: number | null;
  error?: string;
};

const initial: CallState = {
  status: 'idle', mode: 'audio', callId: null, peerId: null,
  localStream: null, remoteStream: null, startedAt: null,
};

export function useCalls(userId: string | null) {
  const [state, setState] = useState<CallState>(initial);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);

  // Cleanup helper
  const cleanup = () => {
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    callIdRef.current = null;
    pendingIce.current = [];
    setState((s) => {
      s.localStream?.getTracks().forEach((t) => t.stop());
      return { ...initial };
    });
  };

  // Subscribe to incoming calls + signals
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`calls:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls', filter: `callee_id=eq.${userId}` }, (p) => {
        const row: any = p.new;
        if (row.status !== 'ringing') return;
        setState((s) => s.status === 'idle' ? { ...initial, status: 'incoming', callId: row.id, peerId: row.caller_id, mode: 'audio' } : s);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls' }, (p) => {
        const row: any = p.new;
        if (row.id !== callIdRef.current) return;
        if (row.status === 'ended' || row.status === 'declined') {
          cleanup();
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_signals', filter: `to_user=eq.${userId}` }, async (p) => {
        const row: any = p.new;
        await handleSignal(row);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function ensurePeer(remoteUserId: string, callId: string): Promise<RTCPeerConnection> {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        sendSignal(callId, remoteUserId, 'ice', ev.candidate.toJSON());
      }
    };
    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      setState((s) => ({ ...s, remoteStream: stream }));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setState((s) => ({ ...s, status: 'in-call', startedAt: s.startedAt ?? Date.now() }));
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        endCall();
      }
    };
    return pc;
  }

  async function getLocalStream(mode: CallMode): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === 'video' ? { width: 640, height: 480 } : false,
    });
    return stream;
  }

  async function handleSignal(row: { id: string; call_id: string; from_user: string; kind: string; payload: any }) {
    if (!callIdRef.current && row.kind === 'offer') {
      // Incoming call signal arrived before user accepted — handled via 'calls' INSERT above.
    }
    if (row.call_id !== callIdRef.current) return;
    const pc = pcRef.current;
    if (!pc) return;
    try {
      if (row.kind === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(row.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal(row.call_id, row.from_user, 'answer', { type: answer.type, sdp: answer.sdp });
        // Flush pending ICE
        for (const c of pendingIce.current) await pc.addIceCandidate(c);
        pendingIce.current = [];
      } else if (row.kind === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(row.payload));
        for (const c of pendingIce.current) await pc.addIceCandidate(c);
        pendingIce.current = [];
      } else if (row.kind === 'ice') {
        if (pc.remoteDescription) await pc.addIceCandidate(row.payload);
        else pendingIce.current.push(row.payload);
      } else if (row.kind === 'bye') {
        endCall();
      }
    } catch (e) {
      console.error('signal error', e);
    }
  }

  async function sendSignal(callId: string, toUser: string, kind: string, payload: any) {
    if (!userId) return;
    await supabase.from('call_signals').insert({ call_id: callId, from_user: userId, to_user: toUser, kind, payload });
  }

  async function startCall(calleeId: string, mode: CallMode) {
    if (!userId) return;
    setState({ ...initial, status: 'outgoing', mode, peerId: calleeId });
    const { data: callRow, error } = await supabase
      .from('calls').insert({ caller_id: userId, callee_id: calleeId, status: 'ringing' })
      .select('id').single();
    if (error || !callRow) { setState({ ...initial, status: 'ended', error: error?.message }); return; }
    const callId = callRow.id as string;
    callIdRef.current = callId;
    setState((s) => ({ ...s, callId }));
    const local = await getLocalStream(mode).catch((e) => { setState((s) => ({ ...s, status: 'ended', error: e?.message })); return null; });
    if (!local) return;
    setState((s) => ({ ...s, localStream: local }));
    const pc = await ensurePeer(calleeId, callId);
    local.getTracks().forEach((t) => pc.addTrack(t, local));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal(callId, calleeId, 'offer', { type: offer.type, sdp: offer.sdp });
  }

  async function acceptCall() {
    if (!userId || state.status !== 'incoming' || !state.callId || !state.peerId) return;
    const callId = state.callId;
    const peerId = state.peerId;
    callIdRef.current = callId;
    setState((s) => ({ ...s, status: 'connecting' }));
    await supabase.from('calls').update({ status: 'accepted' }).eq('id', callId);
    const local = await getLocalStream(state.mode).catch((e) => { setState((s) => ({ ...s, status: 'ended', error: e?.message })); return null; });
    if (!local) return;
    setState((s) => ({ ...s, localStream: local }));
    const pc = await ensurePeer(peerId, callId);
    local.getTracks().forEach((t) => pc.addTrack(t, local));
    // Pull any offer signal that may have already landed
    const { data: sigs } = await supabase.from('call_signals').select('*').eq('call_id', callId).eq('to_user', userId).order('created_at', { ascending: true });
    for (const s of (sigs ?? [])) await handleSignal(s as any);
  }

  async function declineCall() {
    if (!state.callId) { cleanup(); return; }
    await supabase.from('calls').update({ status: 'declined', ended_at: new Date().toISOString() }).eq('id', state.callId);
    if (state.peerId) await sendSignal(state.callId, state.peerId, 'bye', {});
    cleanup();
  }

  async function endCall() {
    if (state.callId) {
      const dur = state.startedAt ? Math.round((Date.now() - state.startedAt) / 1000) : 0;
      await supabase.from('calls').update({ status: 'ended', ended_at: new Date().toISOString(), duration_seconds: dur }).eq('id', state.callId);
      if (state.peerId) await sendSignal(state.callId, state.peerId, 'bye', {});
    }
    cleanup();
  }

  return { state, startCall, acceptCall, declineCall, endCall };
}