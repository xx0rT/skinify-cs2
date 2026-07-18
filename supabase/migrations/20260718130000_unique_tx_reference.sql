/*
  # Unique payment reference on user_transactions

  Deposit crediting (PayU webhook, now Stripe confirm) is idempotent on
  reference_id via check-then-insert — which races without a unique
  constraint: two parallel confirms could both pass the check and credit
  twice. Partial unique index (deposits only, non-null refs) makes the
  second insert fail with 23505, which the functions treat as
  "already credited".

  Deduplicate first so the index can build even if a double-credit
  already slipped through historically.
*/

DELETE FROM user_transactions a
USING user_transactions b
WHERE a.reference_id IS NOT NULL
  AND a.reference_id = b.reference_id
  AND a.type = 'deposit'
  AND b.type = 'deposit'
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS user_transactions_deposit_ref_uniq
  ON user_transactions (reference_id)
  WHERE reference_id IS NOT NULL AND type = 'deposit';
