# Implementation Plan

Each milestone ships to production behind the service boundary and leaves the site usable. The prototype UI may keep its screens. It must stop writing the tables that the milestone takes over. No milestone requires a visual redesign.

"Files affected" means the future backend locations and the prototype call sites that must lose direct database writes. Do not add those files in this phase.

## Milestone 1 — Wallet and Ledger

- **Goal.** Balances move only through Ledger. The prototype cannot insert `transactions` or update `users.tokens`.
- **Files.** New `services/ledger`, `services/wallet`. Migration `wallet_entries`, `wallet_operations`, `wallets`, `daily_claims`. Revoke browser grants on `transactions` and `users.tokens`. Stripe webhook in `services/payment` calling Wallet. Prototype wallet page reads `GET /wallet`.
- **Migrations.** Create ledger tables. Backfill each `users.tokens` balance as a single bonus grant keyed `backfill:{user_id}`. Freeze the old column with a trigger that rejects updates.
- **Risk.** Backfill double-counts if the trigger is late. A bug in the post transaction mints tokens.
- **Rollback.** Keep the frozen column. If the new API fails, a feature flag points reads back at the frozen column and disables spends. Do not delete the new lines. Fix forward with reversal operations.
- **Success.** Reconciliation drift is zero on the backfill sample. A replayed webhook does not change the balance. A client insert into `transactions` fails.

## Milestone 2 — Match and Game

- **Goal.** Connect Four, then Math Blitz, run as server rooms. Clients send inputs. They do not set winners.
- **Files.** `services/match`, `services/game`, rules modules `connect-four` and `math-blitz`. Prototype match screen posts inputs only. Migration `matches` new shape, `match_players`, `match_events`, `match_results`.
- **Migrations.** New tables beside the old match table. New matches use the new id space. Old rows stay readable through a view.
- **Risk.** A rules bug voids a large share of matches. Escrow from Milestone 1 can stick if void does not release.
- **Rollback.** Flag new games back to "unavailable." In-flight rooms void and refund. Do not return winner writes to the client.
- **Success.** A scripted game completes with a result the client never sent. A killed game node either resumes from the snapshot or voids once. Replay of the same input seq does not double-apply.

## Milestone 3 — Queue

- **Goal.** Casual tickets live in Redis. The browser cannot read or pair the queue.
- **Files.** `services/queue`. Remove writes to `matchmaking_queue` from `app/games`. Drop cash stake values from the client request. The API accepts only `free` for this milestone.
- **Migrations.** `queue_tickets`, `dodge_counters`. No import of old waiting rows. Expire them.
- **Risk.** Empty regions produce long waits. A lock bug leaks tickets.
- **Rollback.** Disable the queue route and show "matches paused." Release any holds. Do not restore client pairing.
- **Success.** Two test users in one region get one proposal. A third ticket cannot join for a user who already holds one. Median wait is measurable. Bots, if used, are labeled and unranked.

## Milestone 4 — Rating

- **Goal.** Casual hidden ratings update from `MATCH_FINISHED`. Public league badges can wait, but the number must be real before ranked stakes.
- **Files.** `services/rating`. Queue reads the rating API.
- **Migrations.** `ratings`, `rating_applications`, `rank_snapshots`, `seasons` in `scheduled` only.
- **Risk.** A bad formula assigns extreme ratings and empties the match window.
- **Rollback.** Queue falls back to a flat 1500 with a wide window, still server-side. Stop applying new results. Do not let the client send a rating.
- **Success.** The same match id does not change a rating twice. A bot match does not write ranked rows. A void reverses one application.

## Milestone 5 — Presence and realtime

- **Goal.** Match found, match state, and presence move over the regional socket. REST remains correct if the socket drops.
- **Files.** `services/realtime`, `services/presence`. Prototype subscribes instead of polling Supabase for matches.
- **Migrations.** `presence_rollups` only.
- **Risk.** Event storms. A socket bug that becomes a second source of truth.
- **Rollback.** Clients poll `GET /queue` and `GET /matches/{id}`. Presence returns offline. Gameplay through REST inputs still works.
- **Success.** Killing the socket mid-match still allows reconnect within the budget. `Last-Event-Id` does not duplicate a ready prompt into two matches.

## Milestone 6 — Notifications

- **Goal.** Inbox for match found, friend request, and rank events that already exist.
- **Files.** `services/notification`.
- **Migrations.** `notifications`, `notification_deliveries`.
- **Risk.** Duplicate pushes. Consumer lag blocking payouts if sharing a queue.
- **Rollback.** Stop the consumer. Inbox can be empty. Matches still complete.
- **Success.** One source event produces one inbox row under a duplicated delivery. A paused notification consumer does not increase `finalizing` age.

## Milestone 7 — Tournaments

- **Goal.** Single elimination on the new match pipeline, with check-in holds and a placement payout.
- **Files.** `services/tournament`. Prototype tournament pages call the API. Disable client updates of tournament rows.
- **Migrations.** New tournament tables. Leave old tournament rows read-only.
- **Risk.** Double advance. Prize sum that does not match escrow.
- **Rollback.** Cancel new tournaments, refund holds, leave old completed events untouched.
- **Success.** A scripted 4-player bracket pays 50/25/15/10 once. A replayed `MATCH_FINISHED` does not create a second semifinal. Wallet has no branch on format.

## Milestone 8 — Clubs

- **Goal.** Create, join, officer roles, weekly points from ranked or casual results.
- **Files.** `services/club`. Ranked can ship in this milestone if Milestone 4 is stable: placements, ready checks, league view.
- **Migrations.** `clubs`, `club_members`, `club_scores`, `club_point_applications`.
- **Risk.** Point double-count. Owner lock bugs.
- **Rollback.** Hide club routes. Stop the point consumer. Do not delete clubs in a rollback. Fix forward.
- **Success.** One match credits club points once. A second service has no grant on `club_members`.

## Milestone 9 — Venues

- **Goal.** Venues, staff, QR check-in, and a live event that uses Game Service and writes venue points only.
- **Files.** `services/venue`. Prototype bar pages stop using the old tables for new events.
- **Migrations.** `venues` and related tables. Copy `bars` into `venues` as `pending_review` for an admin to reopen. Do not copy drink rewards into the ledger.
- **Risk.** Re-enabling broken RLS. A check-in code logged in plaintext.
- **Rollback.** Suspend new events. Old sessions stay on the legacy read path until they end.
- **Success.** A bad code does not check in. A venue match does not change `ratings` or `wallets`. Codes in the database are hashes.

## Milestone 10 — Achievements and quests

- **Goal.** A small catalog, progress from match events, claims that pay bonus tokens once.
- **Files.** `services/achievement`, `services/quest`.
- **Migrations.** Achievement, quest, XP tables.
- **Risk.** A generous rule mints an unbounded bonus. A void does not reverse progress.
- **Rollback.** Disable claims. Leave unlock rows. Stop consumers.
- **Success.** Claim replay does not pay twice. `QUEST_COMPLETED` alone does not pay. A void reverses unspent bonus progress.

## Order constraints

Milestone 2 needs Milestone 1 before any staked match. Free matches may start as soon as the void path can call a no-op Wallet, but do not ship stakes in between. Milestone 3 needs Milestone 2. Milestone 4 needs real `MATCH_FINISHED` events. Milestone 7 needs 1, 2, and 3. Clubs, venues, and quests need `MATCH_FINISHED` and, if they pay, Milestone 1.

Social services (Friend, Chat) can land beside Milestone 5 and 6 without blocking 1 through 4. They are not a reason to delay the ledger.

## Deploy rule

Every milestone: expand the schema, deploy the writer, switch the client, revoke the old grant, then drop nothing until the next season. Feature flags live in Admin config, not in client-side checks.
