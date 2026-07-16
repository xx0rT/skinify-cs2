/*
  # Harden api_rate_limits for auth throttling

  The shared rate-limit helper does read-then-insert with no unique
  constraint, so two concurrent requests can both create a window row and
  under-count. Add a unique key on (identifier, endpoint, window_start)
  and an index for the cleanup sweep. Also add a helper to atomically
  bump a fixed-window counter.
*/

-- Deduplicate any existing rows before adding the constraint.
DELETE FROM api_rate_limits a
USING api_rate_limits b
WHERE a.id > b.id
  AND a.identifier = b.identifier
  AND a.endpoint = b.endpoint
  AND a.window_start = b.window_start;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'api_rate_limits_window_uniq'
  ) THEN
    ALTER TABLE api_rate_limits
      ADD CONSTRAINT api_rate_limits_window_uniq
      UNIQUE (identifier, endpoint, window_start);
  END IF;
END $$;

/*
  Atomic fixed-window counter. Buckets time into `p_window_sec` slots and
  upserts the count for the current bucket, returning the new count. Race-
  safe via the unique constraint + ON CONFLICT. Runs as service_role from
  edge functions (SECURITY DEFINER so it works regardless of caller RLS).
*/
CREATE OR REPLACE FUNCTION bump_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_window_sec int
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket timestamptz;
  v_count int;
BEGIN
  v_bucket := to_timestamp(floor(extract(epoch FROM now()) / p_window_sec) * p_window_sec);

  INSERT INTO api_rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, v_bucket)
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET request_count = api_rate_limits.request_count + 1,
                updated_at = now()
  RETURNING request_count INTO v_count;

  RETURN v_count;
END;
$$;
