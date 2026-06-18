import { useEffect, useMemo, useState } from 'react';

/* ─────────────────────────────────────────────────────────────────────────
   useSkinGallery — assemble a 2-5 image gallery for the item detail hero.

   Sources, in priority order:
     1. CSFloat preview_image — per-listing render with real float/seed
        burns + pattern. Different per item even when market_hash_name
        matches. Falls through silently when CSFloat returned nothing.
     2. Steam thumbnail — the image that ships with every listing.
        Always present, always the same per market_hash_name.
     3. scmm.app stock screenshots — community-curated multi-angle
        photos keyed by market_hash_name. Lazy-fetched; missing keys
        (404) are cached so we don't hammer the API.

   We dedupe identical URLs (CSFloat sometimes returns the Steam CDN
   image when it doesn't have its own render). Output is stable across
   renders so the consumer can use it as the React key set for a
   thumbnail strip without flicker.

   Network failures degrade gracefully — the gallery just ends up
   shorter, never empty (Steam thumbnail is always present).
   ───────────────────────────────────────────────────────────────────────── */

interface Args {
  /** Always-present primary image (Steam thumbnail). */
  steamImage?: string | null;
  /** CSFloat-rendered preview for this exact float/seed, if available. */
  previewImage?: string | null;
  /** market_hash_name to pivot the stock-photo lookup on. */
  marketHashName?: string | null;
}

interface SkinGalleryResult {
  /** Deduplicated ordered list of image URLs ready for the carousel. */
  images: string[];
  /** True while we're still waiting on the scmm.app fetch. The Steam
      + CSFloat slots fill in immediately; only the stock-photo tail
      depends on this. */
  loading: boolean;
}

/* Cache scmm.app responses for the session. The endpoint sometimes
   404s for skin names that aren't in their DB — we cache that as an
   empty array so we don't refetch. */
const scmmCache = new Map<string, string[]>();
const scmmInflight = new Map<string, Promise<string[]>>();

async function fetchScmmImages(marketHashName: string): Promise<string[]> {
  if (scmmCache.has(marketHashName)) return scmmCache.get(marketHashName)!;
  const existing = scmmInflight.get(marketHashName);
  if (existing) return existing;

  const promise = (async () => {
    try {
      /* scmm.app's search endpoint returns the item plus a list of
         image URLs. We hit the search-by-name route because it tolerates
         the StatTrak™/★ prefixes Steam ships with. */
      const url = `https://api.scmm.app/api/item?name=${encodeURIComponent(marketHashName)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        scmmCache.set(marketHashName, []);
        return [];
      }
      const data = await res.json();
      /* Response shape (as of 2026-06): item.images = [{url, ...}]. We
         try a couple of likely fields so we're resilient to shape
         changes. */
      const fromArray = (arr: any[]) =>
        arr.map((x) => (typeof x === 'string' ? x : x?.url || x?.image)).filter(Boolean);
      const candidate =
        (Array.isArray(data?.item?.images) && fromArray(data.item.images)) ||
        (Array.isArray(data?.images) && fromArray(data.images)) ||
        [];
      const out = candidate.slice(0, 4);
      scmmCache.set(marketHashName, out);
      return out;
    } catch {
      scmmCache.set(marketHashName, []);
      return [];
    } finally {
      scmmInflight.delete(marketHashName);
    }
  })();

  scmmInflight.set(marketHashName, promise);
  return promise;
}

export function useSkinGallery({
  steamImage,
  previewImage,
  marketHashName,
}: Args): SkinGalleryResult {
  const [scmmImages, setScmmImages] = useState<string[] | null>(() =>
    marketHashName && scmmCache.has(marketHashName)
      ? scmmCache.get(marketHashName)!
      : null,
  );

  useEffect(() => {
    if (!marketHashName) return;
    if (scmmCache.has(marketHashName)) {
      setScmmImages(scmmCache.get(marketHashName)!);
      return;
    }
    let cancelled = false;
    fetchScmmImages(marketHashName).then((arr) => {
      if (!cancelled) setScmmImages(arr);
    });
    return () => {
      cancelled = true;
    };
  }, [marketHashName]);

  const images = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (u?: string | null) => {
      if (!u) return;
      const norm = String(u).trim();
      if (!norm) return;
      if (seen.has(norm)) return;
      seen.add(norm);
      out.push(norm);
    };
    /* Order: CSFloat preview first (the most accurate visual of THIS
       listing), then Steam thumbnail, then community stock photos. */
    push(previewImage);
    push(steamImage);
    (scmmImages || []).forEach(push);
    return out;
  }, [previewImage, steamImage, scmmImages]);

  return { images, loading: marketHashName != null && scmmImages == null };
}
