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
  /** CSFloat's rendered preview of this exact float+seed combination.
      Differs from the Steam thumbnail in that it shows the real pattern
      and wear on this specific listing. Null when the edge function
      falls back to synthetic data. */
  preview_image: string | null;
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
   earlier simple-modulo version clustered short keys near zero.
   Returns the full attribute set the details panel cares about so no
   row in the All-Attributes grid renders empty when the inspect link
   is missing. */
function syntheticFloat(key: string): {
  float: number;
  paint_seed: number;
  paint_index: number;
  def_index: number;
} {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  /* Four independent draws — xorshift the hash so each attribute isn't
     correlated to the same input bits. */
  const draw = (seed: number) => {
    let r = seed >>> 0;
    r ^= r << 13; r >>>= 0;
    r ^= r >>> 17; r >>>= 0;
    r ^= r << 5;  r >>>= 0;
    return r;
  };
  const r1 = draw(h);
  const r2 = draw(Math.imul(h, 2654435761));
  const r3 = draw(Math.imul(h, 374761393));
  const r4 = draw(Math.imul(h, 1597334677));
  const float = Number((r1 / 4294967295).toFixed(6));
  const paint_seed = r2 % 1000;
  const paint_index = r3 % 1024;
  const def_index = r4 % 4096;
  return { float, paint_seed, paint_index, def_index };
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
    /* Treat empty strings and NaN as "no value" — some listings ship
       float_value: '' from older inserts and that used to pass the
       != null check, leaving the panel stuck on a non-numeric value. */
    const hasInitialFloat =
      initialFloat != null &&
      initialFloat !== '' &&
      Number.isFinite(Number(initialFloat));
    const hasInitialSeed =
      initialPaintSeed != null &&
      initialPaintSeed !== '' &&
      Number.isFinite(Number(initialPaintSeed));

    /* Always synthesize first so we have a full attribute set to merge
       any real values into. Even when initialFloat is present we still
       want a synthetic paint_index / def_index / paint_seed so the
       details grid never renders empty rows. */
    const synth = fallbackKey
      ? syntheticFloat(fallbackKey)
      : { float: 0, paint_seed: 0, paint_index: 0, def_index: 0 };

    if (hasInitialFloat || hasInitialSeed || fallbackKey) {
      return {
        float: hasInitialFloat ? Number(initialFloat) : synth.float,
        paint_seed: hasInitialSeed ? Number(initialPaintSeed) : synth.paint_seed,
        paint_index: synth.paint_index,
        def_index: synth.def_index,
        rarity: null,
        preview_image: null,
        stickers: [],
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    /* If we already have real (non-synthetic) float AND seed locally,
       skip the network round-trip — the synthetic paint_index /
       def_index set above stay as the deterministic fallback. */
    const hasInitialFloat =
      initialFloat != null && initialFloat !== '' &&
      Number.isFinite(Number(initialFloat));
    const hasInitialSeed =
      initialPaintSeed != null && initialPaintSeed !== '' &&
      Number.isFinite(Number(initialPaintSeed));
    if (hasInitialFloat && hasInitialSeed) return;

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
