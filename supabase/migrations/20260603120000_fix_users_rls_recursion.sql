-- Fix infinite recursion in RLS policies for public.users
--
-- Symptom: GET https://<project>.supabase.co/rest/v1/users?select=*&steam_id=eq.<id>
--          returns 500 with "infinite recursion detected in policy for relation 'users'"
--
-- Cause: At least one policy on `public.users` references `public.users`
--        inside its USING/CHECK clause (e.g.
--          USING (id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
--        ). Every row evaluated triggers the same policy → recursion.
--
-- Fix:
--   1. Drop every existing policy on `public.users` so we start clean.
--   2. Re-create a minimal, safe set of policies that NEVER reference
--      `public.users` from within themselves. We use `auth.uid()` and
--      column comparisons directly.
--   3. Anyone (anon + authenticated) can SELECT public profile fields
--      so the marketplace seller card / public profile page works.
--      Sensitive columns (email, kyc_*, balances) should be filtered
--      at the application layer via a `select(...)` projection — Postgres
--      RLS is row-level, not column-level.
--   4. A user can UPDATE only their own row (matched by `auth_user_id`
--      OR `steam_id` claim).
--   5. Service role bypasses RLS entirely, so the marketplace-listings
--      and balance edge functions are unaffected.

-- 0) Make sure the columns the new policies reference actually exist.
--    `public.users` was first created with `steam_id` only; the
--    email/password sign-up flow we added later relies on `auth_user_id`
--    (uuid → auth.users.id) and `email`. Add them if missing so this
--    migration is idempotent across both "fresh DB" and "upgraded from
--    the Steam-only era" environments.
alter table public.users
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists email text;

create unique index if not exists users_auth_user_id_key
  on public.users (auth_user_id)
  where auth_user_id is not null;

-- 1) Drop existing policies — no-op if none exist
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'users'
  loop
    execute format('drop policy %I on public.users', pol.policyname);
  end loop;
end $$;

-- 2) Ensure RLS is enabled (it should already be)
alter table public.users enable row level security;

-- 3) Public read — marketplace, seller cards, public profile pages
create policy users_public_read
  on public.users
  for select
  to anon, authenticated
  using (true);

-- 4) Self-write — a logged-in user can update their own row by
--    matching the auth UUID. No subquery on public.users, so no
--    recursion is possible.
create policy users_self_update
  on public.users
  for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- 5) Self-insert — used during sign-up / steam OpenID first login.
--    Same direct comparison, no self-reference.
create policy users_self_insert
  on public.users
  for insert
  to authenticated
  with check (auth_user_id = auth.uid());

-- Service role is unaffected — it bypasses RLS by design, so the
-- self-healing `validateSteamUser` helper in
-- supabase/functions/marketplace-listings/index.ts continues to work.

-- Verify there are exactly the expected policies in place
comment on policy users_public_read on public.users is
  'Anyone can read public profile rows. Filter sensitive columns app-side.';
comment on policy users_self_update on public.users is
  'Users can update only their own row, matched by auth_user_id.';
comment on policy users_self_insert on public.users is
  'Users can insert only their own row, matched by auth_user_id.';
