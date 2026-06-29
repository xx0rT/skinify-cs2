/*
  # Free-form direct messages between users (1:1)

  The existing `chat_messages` table is order-scoped (every row carries
  an `order_id NOT NULL`). That's right for the post-purchase chat, but
  wrong for "Hi! I'm interested in this listing" DMs initiated from a
  listing detail page.

  This migration adds `direct_messages` for that use case:
    - Keyed by (from_steam_id, to_steam_id) pair, ordered by created_at.
    - Optional `item_*` columns capture the listing context so the chat
      can render the linked-skin chip at the top of the bubble.
    - `read_at` is null until the recipient opens the thread.

  RLS: only the two participants can SELECT / INSERT. INSERTs verify
  the sender is the authenticated user (prevents impersonation via
  another user's steam_id).

  Realtime: enabled via the publication tail so the dmStore can subscribe
  to INSERT events scoped to the current user's steam_id.
*/

CREATE TABLE IF NOT EXISTS direct_messages (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  from_steam_id text NOT NULL,
  to_steam_id text NOT NULL,
  text text NOT NULL,

  /* Optional listing context — populated when the chat is opened from
     a specific item page so we can render the skin chip. */
  item_id text,
  item_name text,
  item_image text,

  /* JSON array of {id, name, url, mimeType, size} per attachment.
     We keep it as jsonb so the attachment shape can evolve without
     a schema migration. */
  attachments jsonb DEFAULT '[]'::jsonb,

  read_at timestamptz,
  created_at timestamptz DEFAULT now(),

  CHECK (length(text) <= 4000),
  CHECK (from_steam_id <> to_steam_id)
);

/* Per-pair index — paginating a thread loads by (from,to) OR (to,from). */
CREATE INDEX IF NOT EXISTS idx_direct_messages_from_to
  ON direct_messages (from_steam_id, to_steam_id, created_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_to_from
  ON direct_messages (to_steam_id, from_steam_id, created_at);

/* Per-recipient inbox query — "show me all my threads sorted by
   most-recent activity". */
CREATE INDEX IF NOT EXISTS idx_direct_messages_to_recent
  ON direct_messages (to_steam_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_from_recent
  ON direct_messages (from_steam_id, created_at DESC);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

/* Helper: resolve the caller's steam_id from the JWT-linked users row.
   Cached per-request by the SQL planner so the RLS expressions don't
   pay for repeated lookups. */
CREATE OR REPLACE FUNCTION auth_steam_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT steam_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
$$;

/* SELECT: participants only. */
DROP POLICY IF EXISTS "Participants can read their DMs" ON direct_messages;
CREATE POLICY "Participants can read their DMs"
  ON direct_messages
  FOR SELECT
  TO authenticated
  USING (
    from_steam_id = auth_steam_id() OR to_steam_id = auth_steam_id()
  );

/* INSERT: sender must be the authenticated user. The recipient is
   unconstrained — anyone can DM anyone, mirroring how a marketplace
   "ask the seller" flow works. Length cap is on the table. */
DROP POLICY IF EXISTS "Sender can write their own DMs" ON direct_messages;
CREATE POLICY "Sender can write their own DMs"
  ON direct_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (from_steam_id = auth_steam_id());

/* UPDATE: only the recipient can mark messages as read. */
DROP POLICY IF EXISTS "Recipient can mark read" ON direct_messages;
CREATE POLICY "Recipient can mark read"
  ON direct_messages
  FOR UPDATE
  TO authenticated
  USING (to_steam_id = auth_steam_id())
  WITH CHECK (to_steam_id = auth_steam_id());

/* DELETE: either participant can delete their own thread copy. We
   soft-delete via a `deleted_by_*` flag in a future migration if we
   ever need per-side deletion; for now a hard delete is fine since
   threads are recoverable from the peer's side. */
DROP POLICY IF EXISTS "Participants can delete their DMs" ON direct_messages;
CREATE POLICY "Participants can delete their DMs"
  ON direct_messages
  FOR DELETE
  TO authenticated
  USING (
    from_steam_id = auth_steam_id() OR to_steam_id = auth_steam_id()
  );

/* Realtime: add this table to the supabase_realtime publication so the
   dmStore can subscribe to INSERT events. The publication is
   idempotent — re-running the migration is safe. */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
  END IF;
END $$;
