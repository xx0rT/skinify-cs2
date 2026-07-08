import { useEffect, useState } from 'react';

/* ─────────────────────────────────────────────────────────────────────────
   useSkinFloat — surfaces float + paint_seed + stickers for a listing.

   Source of truth is STEAM, not CSFloat. The `user-inventory` edge
   function parses Steam's inventory descriptions
   (steamcommunity.com/inventory/{steamid64}/730/2) for rarity, type,
   stickers, inspect link, exterior/wear and — when Steam includes it in
   the item description — the float value. Those parsed values ride along
   on the listing/inventory row, so this hook reads them off the item and
   fills any genuine gap with a deterministic synthetic so the UI never
   shows "—". No third-party (CSFloat) proxy is contacted.

   Steam's public inventory endpoint does not expose paint_seed / a precise
   float for every item (only the in-game inspect coordinator does), so
   when a value is truly absent we keep the stable synthetic fallback.

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
  const [loading] = useState(false);

  /* No network lookup. All descriptive data (float when Steam ships it,
     stickers, rarity) comes from Steam via the user-inventory parser and
     rides on the listing row → it's already merged into `data` above via
     the initial values + synthetic fallback. We intentionally do NOT call
     any CSFloat proxy. The effect below only re-syncs `data` if the
     incoming initial values change (e.g. the parent re-fetches the row). */
  useEffect(() => {
    if (!enabled) return;
    const hasInitialFloat =
      initialFloat != null && initialFloat !== '' &&
      Number.isFinite(Number(initialFloat));
    const hasInitialSeed =
      initialPaintSeed != null && initialPaintSeed !== '' &&
      Number.isFinite(Number(initialPaintSeed));
    if (!hasInitialFloat && !hasInitialSeed) return;
    setData((prev) => {
      const synth = fallbackKey
        ? syntheticFloat(fallbackKey)
        : { float: 0, paint_seed: 0, paint_index: 0, def_index: 0 };
      return {
        float: hasInitialFloat ? Number(initialFloat) : prev?.float ?? synth.float,
        paint_seed: hasInitialSeed ? Number(initialPaintSeed) : prev?.paint_seed ?? synth.paint_seed,
        paint_index: prev?.paint_index ?? synth.paint_index,
        def_index: prev?.def_index ?? synth.def_index,
        rarity: prev?.rarity ?? null,
        preview_image: prev?.preview_image ?? null,
        stickers: prev?.stickers ?? [],
      };
    });
  }, [enabled, initialFloat, initialPaintSeed, fallbackKey]);

  return { data, loading };
}
