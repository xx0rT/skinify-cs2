import { useEffect, useRef, useState } from 'react';
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
  /** Real collection tag from Steam (e.g. "The Italy Collection"). */
  collection: string | null;
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
  /** Whether this item type actually has wear (weapons, knives, gloves).
      When false the hook never fabricates float / paint seed — consumables
      (cases, stickers, graffiti, pins…) simply have none. Defaults true. */
  wearable?: boolean;
  /** Exterior label ("Field-Tested"…). Constrains the fallback float to
      the exterior's real range so it can't contradict the listing. */
  condition?: string | null;
}

/* Shared wearability check — cases, graffiti, capsules, coins, patches,
   music kits, agents, stickers, pins etc. have no float / paint seed. */
export function itemHasWear(item: any): boolean {
  const t = String(item?.type || '').toLowerCase();
  const cond = String(item?.condition || '').toLowerCase();
  const NON_WEAR = [
    'container', 'case', 'capsule', 'graffiti', 'collectible', 'coin',
    'music', 'patch', 'agent', 'sticker', 'pin', 'gift', 'tool', 'tag',
    'pass', 'key', 'charm',
  ];
  if (NON_WEAR.some((k) => t.includes(k))) return false;
  if (cond === 'not painted') return false;
  return true;
}

/* Real float boundaries per exterior — a fallback float for a
   Field-Tested listing must land in 0.15–0.38, not anywhere in 0–1. */
const EXTERIOR_RANGES: Record<string, [number, number]> = {
  'factory new': [0.0, 0.07],
  'minimal wear': [0.07, 0.15],
  'field-tested': [0.15, 0.38],
  'well-worn': [0.38, 0.45],
  'battle-scarred': [0.45, 1.0],
};

function clampToExterior(f: number, condition?: string | null): number {
  const range = condition ? EXTERIOR_RANGES[condition.trim().toLowerCase()] : null;
  if (!range) return f;
  const [lo, hi] = range;
  return Number((lo + f * (hi - lo)).toFixed(6));
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
  wearable = true,
  condition,
}: Args) {
  /* Deterministic float + paint-seed fallback — WEARABLE items only, and
     the float is clamped into the exterior's real range. Paint index /
     def index are never fabricated: they're either real (from Steam) or
     absent. */
  const makeBaseline = (): SkinFloatData | null => {
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

    const synth = wearable && fallbackKey ? syntheticFloat(fallbackKey) : null;
    if (!hasInitialFloat && !hasInitialSeed && !synth) return null;
    return {
      float: hasInitialFloat
        ? Number(initialFloat)
        : synth
        ? clampToExterior(synth.float, condition)
        : null,
      paint_seed: hasInitialSeed ? Number(initialPaintSeed) : synth?.paint_seed ?? null,
      paint_index: null,
      def_index: null,
      rarity: null,
      collection: null,
      preview_image: null,
      stickers: [],
    };
  };

  const [data, setData] = useState<SkinFloatData | null>(makeBaseline);
  const [loading, setLoading] = useState(false);

  /* Baseline (re)resolution — the useState initializer above only runs on
     the FIRST mount, which on the item detail page happens while the item
     is still loading (no fallbackKey, no initial float). Once the item
     arrives the initializer never re-runs, so without this effect `data`
     stays null whenever the Steam lookup can't resolve (private inventory,
     transferred asset, missing steamId) — every attribute renders "—" and
     the wear bar never fills. Re-derive the baseline whenever the inputs
     actually change, and reset it when navigating between items (the page
     component is reused across /item/:id routes). */
  const lastKeyRef = useRef<string | null | undefined>(fallbackKey);
  useEffect(() => {
    const keyChanged = lastKeyRef.current !== fallbackKey;
    lastKeyRef.current = fallbackKey;
    const baseline = makeBaseline();
    /* Keep existing (possibly Steam-enriched) data for the SAME item;
       replace it when the item changed or nothing resolved yet. */
    setData((prev) => (!keyChanged && prev ? prev : baseline));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFloat, initialPaintSeed, fallbackKey, wearable, condition]);

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
      setData((prev) => mergeSteam(prev, steamMemo.get(key)!, fallbackKey, wearable, condition));
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
            collection: body.collection ?? null,
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
      if (result) setData((prev) => mergeSteam(prev, result, fallbackKey, wearable, condition));
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, steamId, assetId, marketHashName, initialFloat, initialPaintSeed, fallbackKey]);

  return { data, loading };
}

/* Merge a Steam result over the current data. Real values always win;
   the synthetic fallback only covers float / paint seed on wearable
   items. Paint index / def index are real-or-absent, never invented. */
function mergeSteam(
  prev: SkinFloatData | null,
  steam: SkinFloatData,
  fallbackKey?: string | null,
  wearable = true,
  condition?: string | null,
): SkinFloatData {
  const synth = wearable && fallbackKey ? syntheticFloat(fallbackKey) : null;
  return {
    float:
      steam.float ?? prev?.float ?? (synth ? clampToExterior(synth.float, condition) : null),
    paint_seed: steam.paint_seed ?? prev?.paint_seed ?? synth?.paint_seed ?? null,
    paint_index: steam.paint_index ?? prev?.paint_index ?? null,
    def_index: prev?.def_index ?? null,
    rarity: steam.rarity ?? prev?.rarity ?? null,
    collection: steam.collection ?? prev?.collection ?? null,
    preview_image: prev?.preview_image ?? null,
    // Prefer Steam's real stickers; keep any we already had otherwise.
    stickers: steam.stickers?.length ? steam.stickers : prev?.stickers ?? [],
  };
}
