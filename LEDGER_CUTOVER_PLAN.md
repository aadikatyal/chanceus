# Ledger cutover plan

`users.tokens` and `transactions` were the balance system. Application writes to both are removed. The database freeze is `scripts/27-ledger.sql` plus `scripts/28-ledger-cutover.sql`. That SQL is not applied: this environment has no Postgres connection string, only the Supabase API keys, which cannot run DDL.

## Writes that were on the legacy path

| Location | What it did | Now |
| --- | --- | --- |
| `lib/wallet-actions.ts` | Inserted a purchase or a transfer | Purchase calls `walletGrant`. Transfers return disabled |
| `lib/transferTokens.ts` | Called `transfer_tokens` | Throws. No player-to-player gifts |
| `lib/supabase/functions/buy_tokens` | Called `increment_tokens_and_log` | Returns 410 before the RPC |
| `app/api/fulfill-checkout` and `fulfill-payment-intent` | Updated `users.tokens` and inserted `transactions` | `walletGrant` with the Stripe id as the idempotency key |
| `lib/game-actions.ts` | Deducted and refunded bets on the column | `walletHold` and `walletRelease` |
| `lib/deduct-match-tokens.ts` | Updated both players, rolled back the column | Two holds. The second failure releases the first |
| `lib/complete-match-action.ts` | Inserted a win row for a trigger | `walletSettle` |
| `lib/matchmaking-actions.ts` | Deducted and paid on the column | Hold and settle |
| `lib/tournament-actions.ts` | Deducted entry and added the prize to the column | Hold, then capture each entrant escrow, then grant the prize |
| `lib/cleanup-actions.ts`, `lib/debug-actions.ts` | Refunded by adding to the column | `walletRelease` |
| `components/games/create-match-form.tsx` | Browser updated `users.tokens` | `refundMatchStake` server action |
| `components/games/enhanced-match-interface.tsx` | Browser inserted a win transaction | `settleMatchStake` server action |
| `scripts/*cleanup*.js`, `manual-cleanup.js`, `direct-cleanup.js` | Refunded by updating the column | Throw on start |

## Reads that were trusting the column

| Location | Now |
| --- | --- |
| Header | Polls `GET /api/v1/wallet` and does not seed from `user.tokens` |
| Wallet, profile, dashboard, tournament detail | Overwrite the in-memory `tokens` field with the ledger spendable balance before render |
| Join, create, rematch, queue, friend ready | `spendable()` from `wallet_entries` |

## Still legacy

- `app/wallet/page.tsx` still lists rows from `transactions` as history. The balance figure above that list is the ledger sum.
- `users.tokens` still exists. Profile updates can change it until the freeze trigger is applied.
- `transfer_tokens` and `increment_tokens_and_log` may still exist in the database. The app no longer calls them.
- Venue drink rewards do not use the token column. They stay out of the ledger.
- Stake labels (`bet_amount`) are match fields, not balances.

## Apply order

1. Run `scripts/27-ledger.sql`.
2. Run `scripts/28-ledger-cutover.sql`.
3. Confirm `select account, sum(amount) from wallet_entries group by account` nets to zero except the platform mint.
4. Confirm `update users set tokens = tokens + 1` raises `users.tokens is not authoritative`.
