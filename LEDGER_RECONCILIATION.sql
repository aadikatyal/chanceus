-- Read-only checks. Each statement should return zero rows unless the comment says otherwise.
-- Run as a privileged role. Do not expose these queries through the anon key.

-- 1. Every wallet: derived accounts for every user who has entries.
SELECT user_id, account, SUM(amount) AS balance
FROM public.wallet_entries
GROUP BY user_id, account
ORDER BY user_id, account;

-- 2. Every user compared with the frozen column.
-- Before Phase E, spendable bonus+available+escrow+pending should equal users.tokens
-- for users who have not received a ledger-only grant. After Phase E this query
-- is informational. Investigate only rows where ledger_spendable < 0.
SELECT u.id,
       u.tokens AS column_tokens,
       COALESCE(SUM(e.amount) FILTER (WHERE e.account IN ('available', 'bonus', 'escrow', 'pending_withdrawal')), 0) AS ledger_spendable_plus_escrow
FROM public.users u
LEFT JOIN public.wallet_entries e ON e.user_id = u.id
GROUP BY u.id, u.tokens
HAVING u.tokens IS DISTINCT FROM COALESCE(SUM(e.amount) FILTER (WHERE e.account IN ('available', 'bonus')), 0);

-- 3. Total token supply. Player credits plus platform debits must be zero.
-- Expected: one row, supply = 0.
SELECT COALESCE(SUM(amount), 0) AS supply
FROM public.wallet_entries;

-- 4. Escrow still held, by user and reference.
SELECT user_id, reference_type, reference_id, SUM(amount) AS escrow
FROM public.wallet_entries
WHERE account = 'escrow'
GROUP BY user_id, reference_type, reference_id
HAVING SUM(amount) <> 0
ORDER BY escrow DESC;

-- 5. Negative balances. Expected: no rows. Platform mint is excluded.
SELECT user_id, account, SUM(amount) AS balance
FROM public.wallet_entries
WHERE user_id <> '00000000-0000-0000-0000-000000000001'
GROUP BY user_id, account
HAVING SUM(amount) < 0;

-- 6. Orphan ledger entries: a line whose operation row is missing. Expected: no rows.
SELECT e.id, e.operation_id, e.idempotency_key
FROM public.wallet_entries e
LEFT JOIN public.wallet_operations o ON o.id = e.operation_id
WHERE o.id IS NULL;

-- 7. Duplicate idempotency keys. Expected: no rows.
-- The unique constraint should make this impossible. This is the belt check.
SELECT idempotency_key, COUNT(*)
FROM public.wallet_entries
GROUP BY idempotency_key
HAVING COUNT(*) > 1;

SELECT idempotency_key, COUNT(*)
FROM public.wallet_operations
GROUP BY idempotency_key
HAVING COUNT(*) > 1;

-- 8. Zero-sum validation. Every operation must sum to zero. Expected: no rows.
SELECT operation_id, SUM(amount) AS signed_sum
FROM public.wallet_entries
GROUP BY operation_id
HAVING SUM(amount) <> 0;
