/*
  # DM RLS: belt-and-braces fallback

  Users are still getting "policy denied" when sending DMs even after
  the auth function was updated to stamp steam_id into app_metadata.
  The remaining failure mode: their current session was issued BEFORE
  the app_metadata write took effect, so their JWT has no claim to
  read.

  Rather than force every existing user to log out + log back in, this
  migration teaches `auth_steam_id()` to fall back to the users-table
  lookup more aggressively:

    1. First try app_metadata.steam_id (present on future logins).
    2. Then user_metadata.steam_id (backwards compat).
    3. Then the users-row lookup by auth_user_id.
    4. Finally, a lookup by email — for Steam-minted users whose
       email is `{steamid}@steam.skinify.gg`, we can extract the
       steamid from `auth.jwt() -> 'email'`.

  Fallback #4 is what fixes the current 401: the session's JWT ALWAYS
  carries the user's email (that's a mandatory JWT claim), and Steam-
  minted emails encode the steam_id in the local-part.
*/

CREATE OR REPLACE FUNCTION auth_steam_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result text;
  v_email  text;
BEGIN
  /* 1) app_metadata (canonical location — auto-copied to JWT). */
  v_result := auth.jwt() -> 'app_metadata' ->> 'steam_id';
  IF v_result IS NOT NULL AND v_result <> '' THEN
    RETURN v_result;
  END IF;

  /* 2) user_metadata (older sessions may have this instead). */
  v_result := auth.jwt() -> 'user_metadata' ->> 'steam_id';
  IF v_result IS NOT NULL AND v_result <> '' THEN
    RETURN v_result;
  END IF;

  /* 3) public.users lookup via auth.uid(). */
  SELECT steam_id INTO v_result
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  IF v_result IS NOT NULL AND v_result <> '' THEN
    RETURN v_result;
  END IF;

  /* 4) Extract from the JWT email if it matches the Steam convention
     `{steamid}@steam.skinify.gg`. The email claim is always present
     in a valid Supabase session token — this is the reliable
     fallback for legacy sessions. */
  v_email := auth.jwt() ->> 'email';
  IF v_email IS NOT NULL AND v_email LIKE '%@steam.skinify.gg' THEN
    v_result := split_part(v_email, '@', 1);
    /* Sanity check: Steam IDs are numeric 17-digit strings. */
    IF v_result ~ '^[0-9]{17}$' THEN
      /* Auto-heal: stamp auth_user_id onto the public.users row so
         subsequent RLS calls use fallback #3 (faster than string
         parsing every time). */
      BEGIN
        UPDATE public.users
        SET auth_user_id = auth.uid()
        WHERE steam_id = v_result AND auth_user_id IS NULL;
      EXCEPTION WHEN OTHERS THEN
        NULL; /* auto-heal is best-effort */
      END;
      RETURN v_result;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION auth_steam_id() TO authenticated, anon, service_role;

/* Force policies to re-plan so they pick up the new function body. */
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
