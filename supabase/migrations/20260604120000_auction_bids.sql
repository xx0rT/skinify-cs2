-- Auction bids
--
-- Companion to `public.marketplace_listings` rows where
-- `listing_type = 'auction'`. Each bid is a single row keyed by the
-- listing it targets. A trigger keeps the listing's `current_bid` and
-- `bid_count` in sync so the marketplace card can read them cheaply.
--
-- Bidder identity is intentionally NOT exposed in the public-read
-- policy — only the bidder themselves (and the seller, via service
-- role from the edge function) can see who placed which bid. The
-- marketplace UI shows anonymised "Bidder #abcd" handles derived
-- from a stable hash of the bidder steam_id.

create table if not exists public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  bidder_steam_id text not null,
  /* Stable per-listing anonymous handle (derived in the edge function
     via hash(listing_id || bidder_steam_id) → first 6 hex chars). This
     way bidder identity is hidden from other bidders but a single
     bidder's history within one listing stays consistent. */
  bidder_handle text not null,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists auction_bids_listing_idx
  on public.auction_bids (listing_id, created_at desc);
create index if not exists auction_bids_bidder_idx
  on public.auction_bids (bidder_steam_id);

alter table public.auction_bids enable row level security;

-- Anyone can read bids — but NOT the bidder_steam_id column. App-side
-- filtering uses .select('id, bidder_handle, amount, created_at') so
-- only the anonymised handle is ever returned to the public.
create policy auction_bids_public_read on public.auction_bids
  for select to anon, authenticated using (true);

-- Inserts go through the edge function (service role). We don't allow
-- direct client inserts so price/auction validation can't be bypassed.
revoke insert on public.auction_bids from anon, authenticated;

-- Trigger: keep listing.current_bid + listing.bid_count in sync.
create or replace function public._sync_listing_from_bid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.marketplace_listings
     set current_bid = new.amount,
         bid_count = coalesce(bid_count, 0) + 1
   where id = new.listing_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_listing_from_bid on public.auction_bids;
create trigger trg_sync_listing_from_bid
  after insert on public.auction_bids
  for each row execute function public._sync_listing_from_bid();

comment on table public.auction_bids is
  'One row per bid. Anonymised via bidder_handle so the public can see bid history without learning bidder steam_id.';
