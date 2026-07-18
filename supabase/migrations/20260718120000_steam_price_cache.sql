/*
  # Cache Steam Community Market prices

  The steam-market-price proxy had no persistence — every request hit
  steamcommunity.com, which aggressively 429s datacenter IPs, so the
  "Compare Steam price" feature failed most of the time. Cache each
  (item, currency) result; fresh hits skip Steam entirely and a stale
  row is served when Steam rate-limits, mirroring the user-inventory
  stale-cache strategy.
*/

CREATE TABLE IF NOT EXISTS steam_price_cache (
  market_hash_name text NOT NULL,
  currency text NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (market_hash_name, currency)
);

/* Service-role only — the edge function is the sole reader/writer. */
ALTER TABLE steam_price_cache ENABLE ROW LEVEL SECURITY;
