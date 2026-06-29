/*
  # DM RLS hardening + debug RPC

  The previous fix migration (20260626000000_fix_dm_rls.sql) rewrote
  auth_steam_id() to read from the JWT, but users on existing
  sessions are still getting 401s because:

    a) Their auth.users row has no user_metadata.steam_id (created
       before the bridge stamped it).
    b) Their public.users.auth_user_id is null OR doesn't match their
       current auth.uid().

  Three changes here:

  1. dm_whoami() — a debug RPC the browser can call to dump exactly
     what auth.uid() and the JWT claims look like for the current
     session. Lets us prove which branch of auth_steam_id() is
     failing without server-side logs.

  2. Explicit GRANT on direct_messages — Supabase's REST gateway
     checks table-level grants BEFORE evaluating RLS. If the
     `authenticated` role wasn't granted SELECT/INSERT/UPDATE/DELETE
     the gateway returns 401 even when the policies would have
     allowed the row. We grant explicitly so RLS gets to run.

  3. Re-grant auth_steam_id() to all roles. The CREATE OR REPLACE in
     the previous migration may not have re-applied grants in every
     environment; we re-issue them here as a safety net.
*/

/* ─── Debug RPC ────────────────────────────────────────────────────── */
CREATE OR REPLACE FUNCTION dm_whoami()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'auth_uid',           auth.uid(),
    'auth_role',          auth.role(),
    'jwt_user_metadata',  auth.jwt() -> 'user_metadata',
    'jwt_app_metadata',   auth.jwt() -> 'app_metadata',
    'jwt_steam_id',       auth.jwt() -> 'user_metadata' ->> 'steam_id',
    'public_user_row',    (
      SELECT to_jsonb(u) - 'email' - 'trade_link'
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      LIMIT 1
    ),
    'auth_steam_id_resolves_to', auth_steam_id()
  );
$$;
GRANT EXECUTE ON FUNCTION dm_whoami() TO authenticated, anon, service_role;

/* ─── Table grants ─────────────────────────────────────────────────── */
/* Without these explicit grants the REST gateway can short-circuit
   to 401 before RLS evaluates. Idempotent — re-granting is a no-op. */
GRANT SELECT, INSERT, UPDATE, DELETE ON direct_messages TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE direct_messages_id_seq TO authenticated;

/* ─── Re-grant helper execute ──────────────────────────────────────── */
GRANT EXECUTE ON FUNCTION auth_steam_id() TO authenticated, anon, service_role;

/* ─── Backstop: re-create the policies so they pick up the latest
       auth_steam_id() body. Some Supabase environments cache policy
       plans across function replaces. */
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
