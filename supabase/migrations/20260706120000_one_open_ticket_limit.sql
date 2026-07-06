-- One open support ticket per user.
--
-- The client blocks the "New ticket" button when an open/in_progress
-- ticket exists, but inserts go through the anon key so the rule must
-- also hold at the database level.

CREATE OR REPLACE FUNCTION enforce_one_open_ticket()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM support_tickets
    WHERE user_id = NEW.user_id
      AND status IN ('open', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'You already have an open ticket — reply there or wait until it is resolved.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_one_open_ticket ON support_tickets;
CREATE TRIGGER trg_one_open_ticket
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION enforce_one_open_ticket();
