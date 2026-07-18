/* Shared resolver for Steam in-game inspect links.
 *
 * Listing rows ship links in several shapes:
 *   - steam://rungame/730/…/+csgo_econ_action_preview S<owner>A<asset>D<dcode>
 *   - steam://run/730//+csgo_econ_action_preview%20<hex-blob>   (new CS2 format;
 *     the %20 is a legit encoded space, NOT an unresolved placeholder)
 *   - templates with Steam's %owner_steamid% / %assetid% / %propid:N%
 *     placeholders that were never substituted at capture time
 *
 * The old check `link.includes('%')` threw away every valid link that used
 * %20 — this resolver only rejects links with real leftover placeholders.
 */

/** True when the link still contains an unresolved %…% template token.
 *  A link whose only percent signs are valid escapes (%20 etc.) decodes
 *  cleanly to a string without '%'; unresolved templates either survive
 *  decoding ("%owner_steamid%" → throws or keeps '%') or throw URIError
 *  ("%pr…" is not a valid escape). */
export function hasUnresolvedPlaceholder(link: string): boolean {
  try {
    return decodeURIComponent(link).includes('%');
  } catch {
    return true;
  }
}

/** Resolve a working steam:// inspect link for a listing row, substituting
 *  known values into placeholder templates and falling back to building one
 *  from S/A/D parts. Returns null when no valid link can be produced. */
export function resolveInspectLink(item: any): string | null {
  let link: string | null =
    item?.inspect_link || item?.inspectLink || item?.inspect_url || null;
  if (link) {
    const owner =
      item?.seller?.steamId ?? item?.owner_steam_id ?? item?.steam_id ?? '';
    const assetId = item?.asset_id ?? item?.assetId ?? item?.assetid ?? '';
    if (owner) link = link.replace(/%owner_steamid%/g, String(owner));
    if (assetId) link = link.replace(/%assetid%/g, String(assetId));
    if (!hasUnresolvedPlaceholder(link)) return link;
    /* fall through to S/A/D reconstruction */
  }
  const s = item?.s ?? item?.owner_steamid ?? item?.owner_steam_id ?? item?.seller?.steamId;
  const a = item?.a ?? item?.asset_id ?? item?.assetId ?? item?.assetid;
  const d = item?.d ?? item?.d_code ?? item?.dcode ?? item?.inspect_d;
  if (s && a && d) {
    return `steam://rungame/730/76561202255233023/+csgo_econ_action_preview S${s}A${a}D${d}`;
  }
  return null;
}
