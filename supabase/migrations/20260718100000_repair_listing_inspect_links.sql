/*
  # Repair broken inspect links on marketplace listings

  Live data audit found three failure classes on marketplace_listings:
    1. inspect_link with unresolved `%propid:6%` template (Steam's new
       inventory API references the hex inspect blob via asset property;
       the old parser never substituted it) — the Steam client rejects
       these outright.
    2. inspect_link NULL on older listings created before capture existed.
    3. Valid hex-blob links (`…preview%20<hex>`) — these are fine and
       must NOT be touched (%20 is an encoded space, not a template).

  Repair strategy: copy the cached, already-resolved link from
  user_inventories (same steam_id + asset_id) wherever the listing's link
  is NULL or still contains a template token. A link is considered
  templated when it matches %<token>% where token has at least one
  non-hex-escape character (e.g. %propid:6%, %owner_steamid%, %assetid%).
  Cached links that are themselves templated are ignored.

  Anything still templated after the copy is nulled — "no inspect button"
  beats a button that errors in Steam.
*/

-- 1) Copy resolved links from the inventory cache.
UPDATE marketplace_listings ml
SET inspect_link = ui.inspect_link
FROM user_inventories ui
WHERE ui.steam_id = ml.steam_id
  AND ui.asset_id = ml.asset_id
  AND ui.inspect_link IS NOT NULL
  AND ui.inspect_link !~ '%[a-z_][a-z_0-9:]*%'
  AND (
    ml.inspect_link IS NULL
    OR ml.inspect_link ~ '%[a-z_][a-z_0-9:]*%'
  );

-- 2) Null out whatever is still templated so the API stops serving it.
UPDATE marketplace_listings
SET inspect_link = NULL
WHERE inspect_link ~ '%[a-z_][a-z_0-9:]*%';
