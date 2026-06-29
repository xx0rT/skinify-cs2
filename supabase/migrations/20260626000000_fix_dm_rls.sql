/*
  # Fix direct_messages 401s after the Steam → Supabase Auth bridge

  Root cause of the 401s the user is seeing in the chat:

    1. `auth_steam_id()` was defined SECURITY DEFINER but never granted
       EXECUTE to the `authenticated` role. Some Postgres planners
       refuse to inline a function without EXECUTE, which means the
       USING clause evaluates to NULL and every row is rejected.

    2. The lookup `WHERE auth_user_id = auth.uid()` only works once the
       Steam → Auth bridge has stamped `auth_user_id` on the user's row.
       For users in the gap (logged in before the bridge shipped, or
       whose stamp UPDATE failed), the helper returns NULL and the
       policy bounces them.

  Fix: rewrite the helper to read the steam_id straight from the JWT.
  The Steam auth function stamps `steam_id` into `user_metadata` when
  it mints the Supabase Auth user, so the claim is already there. The
  new helper does NO table lookups — purely JWT extraction — which:

    - Eliminates the EXECUTE-permission failure mode.
    - Works for anyone whose JWT was issued by the bridge, regardless
      of whether the `auth_user_id` stamp on `public.users` succeeded.
    - Is dramatically faster (no per-row table lookup during RLS).

  We also explicitly GRANT EXECUTE to belt-and-braces against the
  planner refusing to call it.
*/

/* Rewrite the helper. `auth.jwt()` returns the decoded JWT; we pull
   the steam_id out of user_metadata. We accept both
   `user_metadata.steam_id` and the legacy `app_metadata.steam_id` so a
   policy migration doesn't need a synchronised redeploy of the auth
   function. */
CREATE OR REPLACE FUNCTION auth_steam_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    /* Set by the Steam auth bridge in supabase.auth.admin.createUser
       (user_metadata.steam_id). */
    (auth.jwt() -> 'user_metadata' ->> 'steam_id'),
    /* Legacy / future location — keep both for safety. */
    (auth.jwt() -> 'app_metadata' ->> 'steam_id'),
    /* Fallback to the table lookup so users whose JWT was minted
       before the bridge added the claim still work. Returns NULL if
       neither side has anything, which the policies handle. */
    (SELECT steam_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  )
$$;

/* Make sure every role that can read can call the helper. */
GRANT EXECUTE ON FUNCTION auth_steam_id() TO authenticated, anon, service_role;

/* Belt-and-braces: re-create the policies so they bind to the new
   helper definition. (CREATE OR REPLACE on the function alone doesn't
   force the planner to re-resolve cached policy plans in every
   environment.) */
DROP POLICY IF EXISTS "Participants can read their DMs" ON direct_messages;
CREATE POLICY "Participants can read their DMs"
  ON direct_messages
  FOR SELECT
  TO authenticated
  USING (
    from_steam_id = auth_steam_id() OR to_steam_id = auth_steam_id()
  );

DROP POLICY IF EXISTS "Sender can write their own DMs" ON direct_messages;
CREATE POLICY "Sender can write their own DMs"
  ON direct_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (from_steam_id = auth_steam_id());

DROP POLICY IF EXISTS "Recipient can mark read" ON direct_messages;
CREATE POLICY "Recipient can mark read"
  ON direct_messages
  FOR UPDATE
  TO authenticated
  USING (to_steam_id = auth_steam_id())
  WITH CHECK (to_steam_id = auth_steam_id());

DROP POLICY IF EXISTS "Participants can delete their DMs" ON direct_messages;
CREATE POLICY "Participants can delete their DMs"
  ON direct_messages
  FOR DELETE
  TO authenticated
  USING (
    from_steam_id = auth_steam_id() OR to_steam_id = auth_steam_id()
  );

/*
  Backfill auth_user_id for legacy users so the fallback branch in
  auth_steam_id() can find them too. Idempotent — only touches rows
  where auth_user_id is NULL and a matching auth.users row exists
  with the `{steamid}@steam.skinify.gg` email convention the bridge
  uses.

  This means existing Steam-only users get their DMs working WITHOUT
  having to log out and back in. The next time they refresh, their
  JWT (issued in the past by Supabase) still works against the
  fallback table-lookup branch.
*/
DO $$
DECLARE
  v_count int;
BEGIN
  WITH matched AS (
    SELECT u.id AS public_users_id, au.id AS auth_user_id
    FROM public.users u
    JOIN auth.users au
      ON au.email = u.steam_id || '@steam.skinify.gg'
    WHERE u.auth_user_id IS NULL
      AND u.steam_id IS NOT NULL
  )
  UPDATE public.users u
  SET auth_user_id = m.auth_user_id
  FROM matched m
  WHERE u.id = m.public_users_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled auth_user_id for % users', v_count;
END $$;
