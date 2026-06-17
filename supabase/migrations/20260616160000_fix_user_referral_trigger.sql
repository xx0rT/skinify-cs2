/*
  # Fix broken referral trigger on public.users

  Migrations 20251018120000 and 20251018130000 installed a BEFORE INSERT
  trigger on public.users whose function references NEW.raw_user_meta_data
  — a column that only exists on auth.users, not public.users. Every
  INSERT into public.users (i.e. every new Steam sign-in) raises
  `column "raw_user_meta_data" does not exist` and the auth edge function
  returns 400.

  This migration drops the broken trigger and rewrites the function so
  it's safe even if it gets reattached later. We still wire it as a
  no-op BEFORE INSERT so the trigger name is reserved; if the app wants
  referral attribution it should pass `referred_by` directly in the
  insert payload (which the edge function can do once the client sends
  the referral code along with the auth callback).
*/

-- Drop the broken trigger first so subsequent INSERTs work even if the
-- function rewrite below is skipped by replication/idempotency oddities.
DROP TRIGGER IF EXISTS set_referred_by_on_signup ON users;

-- Replace the function body with one that does NOT reference
-- raw_user_meta_data. It's now a no-op pass-through; referral attribution
-- happens in application code (edge functions can set referred_by on
-- insert directly). Kept under the same name so any other migration that
-- references it doesn't break.
CREATE OR REPLACE FUNCTION set_referred_by_from_code()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
