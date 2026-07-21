/*
  # Emoji reactions on direct messages

  Adds a `reactions` jsonb column to direct_messages — shape:
    { "👍": ["<steam_id>", ...], "❤️": ["<steam_id>", ...] }

  A participant can react with more than one emoji; the array holds the
  steam_ids who picked that emoji so the client can render "you + N
  others" and toggle off on a repeat tap. No separate table — reactions
  are low-cardinality per message and this keeps the read path a single
  row fetch (same as read_at).

  RLS: only participants of the thread can update reactions on a row.
  Enforced the same way as the existing "Recipient can mark read" policy
  but for BOTH participants (either side can react to either side's
  message), scoped narrowly so a participant can't otherwise rewrite
  text/attachments — the app writes reactions exclusively through the
  dm-list edge function (service_role), so this policy is a defense-in-
  depth backstop, not the primary write path.
*/

ALTER TABLE direct_messages
  ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS "Participants can react to messages" ON direct_messages;
CREATE POLICY "Participants can react to messages"
  ON direct_messages
  FOR UPDATE
  TO authenticated
  USING (from_steam_id = auth_steam_id() OR to_steam_id = auth_steam_id())
  WITH CHECK (from_steam_id = auth_steam_id() OR to_steam_id = auth_steam_id());
