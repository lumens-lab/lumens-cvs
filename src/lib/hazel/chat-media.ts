import { supabase } from '@/integrations/supabase/client';
import imageCompression from 'browser-image-compression';

const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 10;
const MAX_AUDIO_MB = 5;
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

function extOf(file: { name?: string; type?: string }, fallback: string): string {
  const fromName = file.name?.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  const fromMime = file.type?.split('/').pop()?.split(';')[0];
  return (fromMime || fallback).toLowerCase();
}

/**
 * Compress (images only) + upload media to the chat-media bucket and return a
 * long-lived signed URL plus the storage path. The path is embedded in the
 * E2EE message payload so only conversation participants ever learn it.
 */
export async function uploadChatMedia(
  file: File | Blob,
  kind: 'image' | 'video' | 'voice',
  meta?: { name?: string; type?: string },
): Promise<{ url: string; path: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not authenticated');

  let toUpload: Blob = file;
  if (kind === 'image' && file instanceof File) {
    try {
      toUpload = await imageCompression(file, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: 'image/jpeg',
      });
    } catch (e) {
      console.warn('[chat-media] compression failed, uploading original', e);
    }
  }

  const sizeMb = toUpload.size / (1024 * 1024);
  const cap = kind === 'image' ? MAX_IMAGE_MB : kind === 'video' ? MAX_VIDEO_MB : MAX_AUDIO_MB;
  if (sizeMb > cap) throw new Error(`${kind} too large (max ${cap} MB)`);

  const ext =
    kind === 'image' ? 'jpg' :
    kind === 'video' ? extOf(meta || (file as any), 'mp4') :
    extOf(meta || (file as any), 'webm');
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('chat-media')
    .upload(path, toUpload, {
      contentType: (file as any).type || (kind === 'image' ? 'image/jpeg' : kind === 'video' ? 'video/mp4' : 'audio/webm'),
      upsert: false,
    });
  if (upErr) throw upErr;

  const { data: signed, error: sErr } = await supabase.storage
    .from('chat-media')
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (sErr || !signed?.signedUrl) throw sErr || new Error('failed to sign url');

  return { url: signed.signedUrl, path };
}

/** Re-issue a signed URL for a stored chat-media path (used when an old URL expires). */
export async function refreshChatMediaUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('chat-media').createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}