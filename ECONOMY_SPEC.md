# Economy Specification

ChanceUS has one platform currency: **tokens**. Tokens measure entry, rewards, and club activity. They are not a hidden score. Real-money purchase and withdrawal are a separate, gated rail and stay off until legal review, KYC, and a skill-contest opinion exist for the target country. The `cash5` / `cash10` queue types in the current schema are not part of this design.

## Ledger, not a balance column

`users.tokens` is a cache. The source of truth is `wallet_entries`, append-only, idempotency-keyed. Every credit and debit is a row: account, amount, type, reference, created by service. The cache updates in the same transaction as the insert. Clients cannot insert ledger rows.

Account types on a user:

- `available`
- `escrow`
- `bonus` (non-withdrawable, from grants and daily rewards)
- `pending_withdrawal` (future cash-out only)

Spend order: bonus first, then available. Winnings from a match funded only by bonus land in bonus. Winnings from a match that used any available tokens land in available. This stops a free grant from becoming a cash-out.

## Entry fees

Ranked stake is fixed by league (see ranking spec). Casual is free. Private lobbies may set a stake on the discrete ladder. Tournament entry is set by the host inside admin-approved bounds.

At ready-accept (or tournament check-in), Wallet moves `available/bonus → escrow` on the match or tournament id. Game Service does not see balances. It asks Wallet to capture.

## Escrow and payout

1v1: both stakes sit in escrow. On a clean result, winner receives `2 * stake * (1 - rake)`. Rake is 0% below Gold, 5% from Gold up. Rake funds season rewards and tournament overlays, and is recorded as a platform account credit.

Draws (if a game allows them): full refund, no rake.

Forfeit after the rated threshold: winner paid as a normal win. Forfeit before that, or mutual cancel during countdown: full refund.

Server crash or an unresolvable match: full refund, no rating change, incident id on the ledger.

## Refund rules

| Case | Tokens | Rating |
| --- | --- | --- |
| Queue cancel | Nothing was taken | None |
| Ready decline | Nothing taken | None |
| Opponent dodge | Refund if already captured; otherwise no capture | None |
| Disconnect forfeit inside the window | Normal payout | Normal |
| Proven client desync / server fault | Refund both | Revert if a rating write happened |
| Player report still open | Payout held up to 24h if fraud score is high | Write held |

Refunds are new ledger rows, not deletes.

## Rewards

- **Starter grant:** 200 bonus tokens, once.
- **Daily first win:** 15 bonus, once per regional day, casual or ranked.
- **Daily login:** 5 bonus, claimed, not automatic, so it is a session.
- **Win streak:** at 3 ranked wins, 10 bonus; at 5, a quest token. Resets on a loss. Not MMR.
- **Season rewards:** paid from the snapshot. Bronze: badge only. Silver: 50. Gold: 150. Platinum: 400. Diamond: 800. Master: 1,500. Grandmaster: 3,000. Legend: 5,000 plus a title. All bonus unless the player has played 40 ranked games, in which case half is available.
- **Tournament prizes:** paid from the escrowed pool plus an optional platform overlay. Default split for a 16-player event: 50% / 25% / 15% / 10% to places 1–4. Hosts pick a published template, not a custom curve.
- **Venue prizes:** drink rewards stay inside the venue product and never touch the global wallet.

## Anti-fraud

- Idempotency key on every wallet mutation.
- Velocity caps: token purchases (when enabled) per day, entries per hour, withdrawals per week.
- New accounts cannot enter stakes above 25 tokens for 7 days.
- Same-device or same-payment-method pairs flagged for win trading if they exchange stakes beyond a threshold.
- Bonus tokens cannot be transferred between users. There is no player-to-player gift.
- Ledger writes require the Wallet service role. Admin adjustments require two-person approval above 1,000 tokens and always write `audit_logs`.

## Withdrawals (future, not v1)

When enabled: KYC, available balance only, minimum, hold window of 72 hours, reversal if a match in the hold is voided. Bonus never withdraws. Until that rail exists, the purchase API can sell tokens but the product should not advertise cash-out.

## What is wrong today

Balance and transactions are writable by the user through RLS. A bet is an integer on the match. There is no escrow, no rake account, no bonus separation, and no idempotency. Payment fulfillment routes must become the only way purchased tokens appear, and only after a verified Stripe event.
