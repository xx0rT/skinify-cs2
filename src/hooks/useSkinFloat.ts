import { useEffect, useState } from 'react';
import { getSupabaseCredentials } from '../utils/supabaseHelpers';

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
  /** Steam-direct lookup keys. When present (and float/seed aren't already
      on the listing), the hook fetches full item details from the seller's
      Steam inventory via the `steam-item` edge function — stickers,
      exterior, and float/paint-seed when Steam ships them. */
  steamId?: string | null;
  assetId?: string | null;
  marketHashName?: string | null;
  /** Stable identifier used to derive a deterministic fallback float +
      paint seed when nothing better is available (so the UI never shows
      "—"). Real Steam values override as soon as they resolve. */
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

/* Module-level caches so many cards asking for the same seller inventory
   share one request and a resolved result persists across mounts. */
const steamMemo = new Map<string, SkinFloatData>();
const steamInflight = new Map<string, Promise<SkinFloatData | null>>();

export function useSkinFloat({
  enabled = true,
  initialFloat,
  initialPaintSeed,
  inspectLink,
  s,
  a,
  d,
  m,
  steamId,
  assetId,
  marketHashName,
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

  /* Steam-direct enrichment. When we have a seller steamId + (assetId or
     market_hash_name), fetch full item details (stickers, exterior, and
     float/paint-seed when Steam ships them) from the `steam-item` edge
     function, which reads the seller's public Steam inventory. No CSFloat.
     Results are cached per (steamId, asset/name). */
  useEffect(() => {
    if (!enabled) return;

    const hasInitialFloat =
      initialFloat != null && initialFloat !== '' && Number.isFinite(Number(initialFloat));
    const hasInitialSeed =
      initialPaintSeed != null && initialPaintSeed !== '' && Number.isFinite(Number(initialPaintSeed));

    // Nothing to look up with, or we already have both values locally.
    const canLookup = !!steamId && (!!assetId || !!marketHashName);
    if (!canLookup) return;

    const key = `${steamId}:${assetId || marketHashName}`;
    if (steamMemo.has(key)) {
      setData((prev) => mergeSteam(prev, steamMemo.get(key)!, fallbackKey));
      return;
    }

    let cancelled = false;
    setLoading(true);

    const run =
      steamInflight.get(key) ||
      (async (): Promise<SkinFloatData | null> => {
        try {
          const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
          const params = new URLSearchParams({ steamId: String(steamId) });
          if (assetId) params.set('assetId', String(assetId));
          if (marketHashName) params.set('name', String(marketHashName));
          const res = await fetch(`${supabaseUrl}/functions/v1/steam-item?${params}`, {
            headers: { Authorization: `Bearer ${supabaseKey}` },
          });
          if (!res.ok) return null;
          const body = await res.json();
          if (!body?.found) return null;
          const resolved: SkinFloatData = {
            float: body.float ?? null,
            paint_seed: body.paint_seed ?? null,
            paint_index: body.paint_index ?? null,
            def_index: null,
            rarity: body.rarity ?? null,
            preview_image: null,
            stickers: Array.isArray(body.stickers)
              ? body.stickers.map((st: any, i: number) => ({
                  slot: st.slot ?? i,
                  sticker_id: 0,
                  name: st.name || '',
                  image: st.image || '',
                  wear: 0,
                }))
              : [],
          };
          steamMemo.set(key, resolved);
          return resolved;
        } catch {
          return null;
        } finally {
          steamInflight.delete(key);
        }
      })();
    steamInflight.set(key, run);

    run.then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result) setData((prev) => mergeSteam(prev, result, fallbackKey));
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, steamId, assetId, marketHashName, initialFloat, initialPaintSeed, fallbackKey]);

  return { data, loading };
}

/* Merge a Steam result over the current data, preferring real values and
   falling back to synthetic only for what Steam didn't provide. */
function mergeSteam(
  prev: SkinFloatData | null,
  steam: SkinFloatData,
  fallbackKey?: string | null,
): SkinFloatData {
  const synth = fallbackKey
    ? syntheticFloat(fallbackKey)
    : { float: 0, paint_seed: 0, paint_index: 0, def_index: 0 };
  return {
    float: steam.float ?? prev?.float ?? synth.float,
    paint_seed: steam.paint_seed ?? prev?.paint_seed ?? synth.paint_seed,
    paint_index: steam.paint_index ?? prev?.paint_index ?? synth.paint_index,
    def_index: prev?.def_index ?? synth.def_index,
    rarity: steam.rarity ?? prev?.rarity ?? null,
    preview_image: prev?.preview_image ?? null,
    // Prefer Steam's real stickers; keep any we already had otherwise.
    stickers: steam.stickers?.length ? steam.stickers : prev?.stickers ?? [],
  };
}
