-- One-off admin credit: +100,000 Kč for the two admin accounts, with a
-- matching admin_adjustment row in the ledger so the Balance tab shows
-- where the money came from. Runs once via `supabase db push`.
--
-- NOTE: no explicit UPDATE on users — the trigger_update_user_balance
-- trigger on user_transactions credits current_balance for completed
-- admin_adjustment inserts. An extra UPDATE would double-credit.

INSERT INTO user_transactions
  (user_id, steam_id, type, amount, balance_before,
   description, reference_id, status, completed_at)
SELECT
  u.id,
  u.steam_id,
  'admin_adjustment',
  100000,
  COALESCE(u.current_balance, 0),
  'Admin credit',
  'admin_credit_20260707_' || u.steam_id,
  'completed',
  now()
FROM users u
WHERE u.steam_id IN ('76561198021723640', '76561198156985354');
