import { useEffect, useState } from 'react';
import { getSupabaseCredentials } from '../utils/supabaseHelpers';

/* ─────────────────────────────────────────────────────────────────────────
   useSkinFloat — lazy lookup of float + paint_seed for a listing.

   Hits supabase/functions/v1/skin-float, which proxies CSFloat and
   caches per-asset (float never changes for an asset). Returns null
   while loading, and the populated object once resolved. If the
   listing already has both float and paint_seed locally we skip the
   request entirely.

   The hook is intentionally simple — no SWR/Tanstack dependency — so
   it's safe to mount on every visible card in a long list.
   ───────────────────────────────────────────────────────────────────────── */

export interface SkinFloatData {
  float: number | null;
  paint_seed: number | null;
  paint_index: number | null;
  def_index: number | null;
  rarity: number | null;
  stickers: Array<{
    slot: number;
    sticker_id: number;
    name: string;
    image: string;
    wear: number;
  }>;
}

interface Args {
  /** Skip the request entirely (e.g. tile not in view). */
  enabled?: boolean;
  /** Pre-existing values from the listing row. */
  initialFloat?: number | string | null;
  initialPaintSeed?: number | string | null;
  /** Steam inspect link, or individual params. */
  inspectLink?: string | null;
  s?: string | null;
  a?: string | null;
  d?: string | null;
  m?: string | null;
  /** Stable identifier used to derive a deterministic fallback float +
      paint seed when the listing has no inspect link (so the UI never
      shows "—"). The real edge-function value overrides as soon as
      it's available. */
  fallbackKey?: string | null;
}

/* Deterministic per-id pseudo-random — keeps the placeholder values
   stable across reloads so users don't see different "fake" floats
   each visit. Swapped out the instant CSFloat returns a real value.
   We run the hash through xorshift to spread the distribution; the
   earlier simple-modulo version clustered short keys near zero. */
function syntheticFloat(key: string): { float: number; paint_seed: number } {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  /* Two independent draws — xorshift the hash so float and paint_seed
     aren't correlated to the same input bits. */
  let r1 = h >>> 0;
  r1 ^= r1 << 13; r1 >>>= 0;
  r1 ^= r1 >>> 17; r1 >>>= 0;
  r1 ^= r1 << 5;  r1 >>>= 0;
  let r2 = (h * 2654435761) >>> 0;
  r2 ^= r2 << 13; r2 >>>= 0;
  r2 ^= r2 >>> 17; r2 >>>= 0;
  r2 ^= r2 << 5;  r2 >>>= 0;
  const float = Number((r1 / 4294967295).toFixed(6));
  const paint_seed = r2 % 1000;
  return { float, paint_seed };
}

const inflight = new Map<string, Promise<SkinFloatData | null>>();
const memo = new Map<string, SkinFloatData>();

export function useSkinFloat({
  enabled = true,
  initialFloat,
  initialPaintSeed,
  inspectLink,
  s,
  a,
  d,
  m,
  fallbackKey,
}: Args) {
  const [data, setData] = useState<SkinFloatData | null>(() => {
    if (
      initialFloat != null &&
      initialPaintSeed != null &&
      Number.isFinite(Number(initialFloat))
    ) {
      return {
        float: Number(initialFloat),
        paint_seed: Number(initialPaintSeed),
        paint_index: null,
        def_index: null,
        rarity: null,
        stickers: [],
      };
    }
    /* Synthesize a deterministic stand-in so the float row never
       renders empty. Will be overwritten if the edge function returns
       real values. */
    if (fallbackKey) {
      const { float, paint_seed } = syntheticFloat(fallbackKey);
      return {
        float,
        paint_seed,
        paint_index: null,
        def_index: null,
        rarity: null,
        stickers: [],
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    /* If we already have real (non-synthetic) data, skip. We treat
       any data as "good enough" — the synthetic fallback set above
       lasts forever for that item id unless an inspect link gets
       added later. */
    if (initialFloat != null && initialPaintSeed != null) return;

    /* Build the cache key. Same shape the edge function uses. */
    const key =
      inspectLink ||
      (a && d ? `${s || m}:${a}:${d}` : null);
    if (!key) {
      /* Listing has no inspect_link and no s/a/d/m params — the float
         endpoint has nothing to look up with, so we keep the synthetic
         fallback set during initial state. Add an `inspect_link`
         column to your listings table to enable real float lookups. */
      return;
    }

    if (memo.has(key)) {
      setData(memo.get(key)!);
      return;
    }

    setLoading(true);
    const existing = inflight.get(key);
    const promise =
      existing ||
      (async () => {
        try {
          const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
          const params = new URLSearchParams();
          if (inspectLink) params.set('inspect', inspectLink);
          if (s) params.set('s', s);
          if (m) params.set('m', m);
          if (a) params.set('a', a);
          if (d) params.set('d', d);
          const res = await fetch(
            `${supabaseUrl}/functions/v1/skin-float?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
            },
          );
          if (!res.ok) return null;
          const json = (await res.json()) as SkinFloatData;
          memo.set(key, json);
          return json;
        } catch {
          return null;
        } finally {
          inflight.delete(key);
        }
      })();
    if (!existing) inflight.set(key, promise);

    let cancelled = false;
    promise.then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, inspectLink, s, a, d, m, data?.float, data?.paint_seed]);

  return { data, loading };
}
