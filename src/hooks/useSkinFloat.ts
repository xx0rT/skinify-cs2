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
    return null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (data?.float != null && data?.paint_seed != null) return;

    /* Build the cache key. Same shape the edge function uses. */
    const key =
      inspectLink ||
      (a && d ? `${s || m}:${a}:${d}` : null);
    if (!key) return;

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
