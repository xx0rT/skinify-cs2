/*
  steam-item — fetch full item details for a listing DIRECTLY from Steam.

  No CSFloat. Given a seller's steamid64 + asset id (or a market_hash_name),
  we hit Steam's public inventory endpoint

      https://steamcommunity.com/inventory/{steamid64}/730/2?l=english&count=5000

  and pull everything Steam ships in the item's `description`:
    - exterior / wear (e.g. "Minimal Wear")
    - rarity, type, collection, finish
    - stickers (name + image + slot), parsed from the sticker_info HTML
    - inspect link (resolved from the action link)
    - float value + paint seed IF Steam included them in the description
      text (some inspected items carry "Float Value:" / "Paint Seed:")

  Steam's PUBLIC inventory does not expose numeric float / paint-seed for
  most items (only the in-game inspect coordinator does), so those come
  back null when Steam doesn't provide them — the client keeps its
  deterministic fallback in that case.

  Cache: 10 min public, since inventory contents move around.
*/

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(status: number, body: unknown, cache = false) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json',
      ...(cache ? { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=86400' } : {}),
    },
  });
}

const STEAM_IMG = 'https://community.fastly.steamstatic.com/economy/image/';

/* Parse stickers out of a description that contains the sticker_info block:
   <img ... title="Sticker: X, Y"> with <img src="...sticker png..."> */
function parseStickers(descriptions: any[]): Array<{ slot: number; name: string; image: string }> {
  if (!Array.isArray(descriptions)) return [];
  const info = descriptions.find((d) => d && d.name === 'sticker_info');
  if (!info?.value) return [];
  const html: string = info.value;
  const out: Array<{ slot: number; name: string; image: string }> = [];

  // Names from title="Sticker: a, b, c"
  let names: string[] = [];
  const titleMatch = html.match(/title="Sticker:\s*([^"]+)"/i);
  if (titleMatch) names = titleMatch[1].split(',').map((s) => s.trim()).filter(Boolean);

  // Image srcs
  const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]);

  const count = Math.max(names.length, imgs.length);
  for (let i = 0; i < count; i++) {
    let image = imgs[i] || '';
    if (image && !image.startsWith('http')) image = STEAM_IMG + image;
    out.push({ slot: i, name: names[i] || `Sticker ${i + 1}`, image });
  }
  return out;
}

function tag(descTags: any[], category: string): string | null {
  const t = (descTags || []).find((x) => x.category === category);
  return t?.localized_tag_name || t?.name || null;
}

function extractNumber(descriptions: any[], label: RegExp): number | null {
  for (const d of descriptions || []) {
    const v = typeof d?.value === 'string' ? d.value : '';
    const m = v.match(label);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function resolveInspect(actions: any[], steamId: string, assetId: string): string | null {
  const a = (actions || []).find((x) => x?.link?.includes('csgo_econ_action_preview'));
  if (!a) return null;
  let link: string = a.link;
  link = link.replace(/%owner_steamid%/g, steamId).replace(/%assetid%/g, assetId);
  return link;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });

  const url = new URL(req.url);
  const steamId = (url.searchParams.get('steamId') || '').trim();
  const assetId = (url.searchParams.get('assetId') || '').trim();
  const marketHashName = (url.searchParams.get('name') || '').trim();

  if (!/^\d{17}$/.test(steamId)) {
    return json(400, { error: 'A valid steamId is required.' });
  }

  try {
    const invUrl = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000`;
    const res = await fetch(invUrl, {
      headers: {
        // A browser-ish UA avoids some of Steam's bot throttling.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      // 403 = private inventory, 429 = rate limited, etc.
      return json(200, { found: false, reason: `steam_${res.status}` }, true);
    }
    const inv = await res.json().catch(() => null);
    if (!inv?.assets || !inv?.descriptions) {
      return json(200, { found: false, reason: 'empty' }, true);
    }

    // Index descriptions by classid_instanceid for asset → description lookup.
    const descByKey = new Map<string, any>();
    for (const d of inv.descriptions) {
      descByKey.set(`${d.classid}_${d.instanceid}`, d);
    }

    // Find the target asset: by assetId if given, else the first asset whose
    // description market_hash_name matches.
    let desc: any = null;
    let resolvedAsset = assetId;
    if (assetId) {
      const asset = inv.assets.find((a: any) => String(a.assetid) === assetId);
      if (asset) desc = descByKey.get(`${asset.classid}_${asset.instanceid}`);
    }
    if (!desc && marketHashName) {
      for (const a of inv.assets) {
        const d = descByKey.get(`${a.classid}_${a.instanceid}`);
        if (d?.market_hash_name === marketHashName) {
          desc = d;
          resolvedAsset = String(a.assetid);
          break;
        }
      }
    }
    if (!desc) return json(200, { found: false, reason: 'asset_not_found' }, true);

    const descriptions = desc.descriptions || [];
    const stickers = parseStickers(descriptions);

    // Wear text like "Exterior: Minimal Wear".
    const wearDesc = descriptions.find((d: any) => d?.name === 'exterior_wear');
    let exterior: string | null = null;
    if (wearDesc?.value) {
      const m = wearDesc.value.match(/Exterior:\s*(.+)/);
      exterior = m ? m[1].trim() : null;
    }
    if (!exterior) exterior = tag(desc.tags, 'Exterior');

    // Float / paint seed only if Steam put them in the description text.
    const floatValue = extractNumber(descriptions, /Float Value:\s*([0-9.]+)/i);
    const paintSeed = extractNumber(descriptions, /Paint Seed:\s*([0-9]+)/i);
    const paintIndex = extractNumber(descriptions, /Paint Index:\s*([0-9]+)/i);

    return json(
      200,
      {
        found: true,
        asset_id: resolvedAsset,
        market_hash_name: desc.market_hash_name,
        name: desc.name,
        type: desc.type,
        exterior,
        rarity: tag(desc.tags, 'Rarity'),
        weapon: tag(desc.tags, 'Weapon'),
        collection: tag(desc.tags, 'Collection') || tag(desc.tags, 'ItemSet'),
        quality: tag(desc.tags, 'Quality'),
        tradable: desc.tradable === 1,
        marketable: desc.marketable === 1,
        icon_url: desc.icon_url ? STEAM_IMG + desc.icon_url : null,
        inspect_link: resolveInspect(desc.actions || desc.market_actions, steamId, resolvedAsset),
        float: floatValue,
        paint_seed: paintSeed,
        paint_index: paintIndex,
        stickers,
      },
      true,
    );
  } catch (e) {
    return json(200, { found: false, reason: 'error', message: (e as Error)?.message }, true);
  }
});
