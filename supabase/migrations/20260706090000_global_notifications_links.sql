-- Global notifications: link support + fix admin writes.
--
-- 1) The admin panel signs admins in via Steam OpenID, so there is no
--    Supabase auth session — writes arrive under the `anon` role. The
--    existing policies only allowed `authenticated` to write, which is
--    why creating a system notification failed with an RLS violation.
-- 2) Add optional link columns so a notification can redirect users
--    (e.g. "Open marketplace", "Claim bonus").

ALTER TABLE global_notifications ADD COLUMN IF NOT EXISTS link_url text;
ALTER TABLE global_notifications ADD COLUMN IF NOT EXISTS link_label text;

DROP POLICY IF EXISTS "Allow write for anon" ON global_notifications;
CREATE POLICY "Allow write for anon"
  ON global_notifications FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
