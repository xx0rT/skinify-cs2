-- Add the inspect_link column the listing code has been writing to.
--
-- marketplace-listings/index.ts stores `inspect_link` on create and
-- returns it on read so the detail page can resolve the "Inspect in
-- game" button and pull real float/paint-seed from CSFloat. The column
-- was never created, so those writes errored / were dropped and every
-- listing surfaced "inspect unavailable".

ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS inspect_link text;

-- Paint seed as a first-class column too (previously only pattern
-- template text existed) so CSFloat-enriched values can persist.
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS paint_seed integer;
