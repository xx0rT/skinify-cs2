import { supabase } from '../lib/supabaseClient';
import type { DMAttachment } from '../store/dmStore';

/* ─────────────────────────────────────────────────────────────────────────
   dmAttachments — uploads to the `dm-attachments` Supabase Storage bucket
   and returns DMAttachment objects the chat UI can render.

   Bucket setup (one-time, in Supabase SQL editor or dashboard):
     1. Create a public bucket named `dm-attachments`.
     2. Policy: authenticated users can INSERT objects into their own
        folder; SELECT is public (signed URLs aren't needed for a public
        bucket but feel free to swap to private + signed if you want).

   If the bucket / network is unavailable, this helper falls back to a
   local blob: URL so the message still sends — the file just won't
   survive a reload.
   ───────────────────────────────────────────────────────────────────────── */

const BUCKET = 'dm-attachments';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file

function randomId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

/** Upload one File and return a DMAttachment. Images only. */
export async function uploadAttachment(
  file: File,
  peerSteamId: string,
): Promise<DMAttachment> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only images can be sent in messages.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`);
  }

  const id = randomId();
  const objectPath = `${peerSteamId || 'shared'}/${id}-${sanitizeName(file.name)}`;

  /* No blob-URL fallback here: a blob: URL only exists inside the
     sender's browser session, so the recipient would receive an
     attachment that can never load (the "can't open it" bug). If the
     upload fails we throw and the composer surfaces the error instead
     of sending a broken message. */
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
  if (upErr) {
    throw new Error(`Upload failed: ${upErr.message || 'storage unavailable'}`);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return {
    id,
    name: file.name,
    url: pub.publicUrl,
    mimeType: file.type || 'image/png',
    size: file.size,
  };
}

/** Upload a list of files in parallel. */
export async function uploadAttachments(
  files: File[],
  peerSteamId: string,
): Promise<DMAttachment[]> {
  return Promise.all(files.map((f) => uploadAttachment(f, peerSteamId)));
}

/** Pretty byte count: "1.2 KB" / "3.4 MB". */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
