# Architecture Stress Test

Each item assumes an attacker or a crash, not a happy path. Mitigations are mandatory parts of the contracts. A mitigation that lives only in a client is not a mitigation.

## Money

### Duplicate payout
- **Risk.** `MATCH_FINISHED` delivered twice credits the winner twice.
- **Likelihood.** High. At-least-once delivery.
- **Impact.** Token inflation.
- **Mitigation.** Ledger unique `idempotency_key` `match:{id}:settle`. Wallet does not generate a new key on retry. The whole post is one transaction.

### Double spend
- **Risk.** Two holds race on one balance.
- **Likelihood.** Medium. Double-ready, two devices, rematch plus queue.
- **Impact.** Negative balance or two matches funded by one balance.
- **Mitigation.** Ledger row lock on `wallets` for the user. Second hold sees the post-commit balance. One open match per user, partial unique index. Queue refuses a ticket if Match reports an open match.

### Hold succeeds, match never starts
- **Risk.** Tokens stuck in escrow.
- **Likelihood.** Medium during deploys.
- **Impact.** Locked funds.
- **Mitigation.** Match void timer at 10 seconds calls `release:{match}`. Release is idempotent if settle already happened: Ledger rejects a release after settle with `409`, and Match treats that as "already settled," not as a second credit.

### Cache drift
- **Risk.** `wallets` cache disagrees with the sum of lines.
- **Likelihood.** Low if both update in one transaction. Non-zero if someone later adds a second writer.
- **Impact.** Users see a balance they cannot spend, or the reverse.
- **Mitigation.** Only Ledger updates the cache, in the post transaction. Hourly reconciliation alerts and does not auto-fix. No Redis balance.

### Admin adjustment replay
- **Risk.** A retried admin request pays twice.
- **Likelihood.** High without keys.
- **Impact.** Silent mint.
- **Mitigation.** Idempotency-Key required. Dual control above 1,000 tokens. Audit row in the same transaction as the Ledger post, written by Wallet via the audit insert grant.

### Webhook replay
- **Risk.** Stripe retries `checkout.session.completed`.
- **Likelihood.** Certain.
- **Impact.** Double purchase credit.
- **Mitigation.** Unique `(provider, provider_ref)` and the same id as the Wallet grant key.

## Queue and matchmaking

### Queue dodge to protect rating
- **Risk.** Decline ready or leave in the last seconds to avoid a stronger opponent.
- **Likelihood.** High at the top of a ladder.
- **Impact.** Rating dishonesty, hostage queues.
- **Mitigation.** Decline and late leave do not change MMR. They increment dodge strikes. The readied opponent is requeued with priority. Rematch cap stops farming one account.

### Two tickets, one user
- **Risk.** Two devices enqueue.
- **Likelihood.** High.
- **Impact.** Self-match or double stake.
- **Mitigation.** Redis lock `ticket:{user}` and the one-open-match index. The second join returns `409`.

### Cross-region merge exploit
- **Risk.** A player VPNs into a thin region to dodge locals or to farm.
- **Likelihood.** Medium.
- **Impact.** Unfair matches, latency complaints used as void bait.
- **Mitigation.** Pin the ticket to the gateway region that accepted it. Do not let the client send a region. Merge only under the thin-pool rule. Voids require server fault, not "my ping was bad" after the fact.

### Bot laundering
- **Risk.** A client claims a win against a bot and asks for ranked points.
- **Likelihood.** High if the client picks the opponent.
- **Impact.** Rating inflation.
- **Mitigation.** Only Queue inserts a bot seat, and only in casual after 20 seconds. Ranked never requests a bot. Rating ignores `bot_id` seats for ranked and ignores `mode = tutorial`.

## Disconnect and reconnect

### Reconnect as a pause button
- **Risk.** Pull the cable on the opponent's turn to think.
- **Likelihood.** High in turn-based games.
- **Impact.** Unfair clock.
- **Mitigation.** One pause per player, capped at the reconnect budget. The turn clock belongs to Game. Extra disconnect events do not reset the deadline.

### Stolen reconnect
- **Risk.** Replay an old reconnect or input request.
- **Likelihood.** Medium.
- **Impact.** Inject a move, or resume as the opponent.
- **Mitigation.** Access token plus seated `user_id`. Input seq must equal the next seq. A replayed seq with the same body returns the old ack and does not reapply. A different body on that seq is `409`. Snapshots are not accepted from the client.

### Lost socket event
- **Risk.** `match.found` or `match.state` never arrives.
- **Likelihood.** High on mobile networks.
- **Impact.** Dodge they did not intend, or a stuck board.
- **Mitigation.** Socket events are hints. `GET /queue` and `GET /matches/{id}` are the record. The ready deadline is long enough to poll (15 seconds). Personal events carry `event_id` and `Last-Event-Id` for replay from the gateway buffer (60 seconds). After that, REST is the recovery.

### Both players disconnect
- **Risk.** Each side waits to win on forfeit.
- **Likelihood.** Medium in a bad region.
- **Impact.** Wrong winner or a stuck match.
- **Mitigation.** If both budgets expire with no input after start, `end_reason = void`, refund, no rating. If one player had the only legal inactivity, that player forfeits. Game records the last input time per seat.

## Rating

### Out-of-order results
- **Risk.** Match 2 applies before match 1 and the rating path depends on order.
- **Likelihood.** Medium under lag.
- **Impact.** A wrong intermediate rating. Final rating is path-dependent for Glicko.
- **Mitigation.** Rating partitions by `user_id` and processes in `occurred_at` order per user, buffering an event that is more than 2 seconds ahead of a gap. It does not apply a match dated before the last applied match. A late event past the buffer dead-letters for a human. The unique application key still blocks a true duplicate.

### Void after promotion
- **Risk.** Rewards and a badge stick after a reversed game.
- **Likelihood.** Low.
- **Impact.** False rank, false achievement.
- **Mitigation.** `MATCH_VOIDED` writes a reversal application. Achievement and Quest consumers also consume `MATCH_VOIDED` and reverse progress if the grant is still bonus and unspent. If the bonus was already spent, Wallet posts a negative bonus floored at zero and an audit row, and Moderation opens a case rather than driving the available balance negative.

### Smurf and win trade
- **Risk.** New accounts or two friends trade stakes and rating.
- **Likelihood.** High once tokens matter.
- **Impact.** Economy and ladder trust.
- **Mitigation.** No manual rank reset. Placement cap at Diamond II. Account age gate on stakes above 25. Rematch cap. Trust score gates paid tournaments. Shared-device signals are inputs to trust, not an automatic confiscation.

## Tournaments

### Double advance
- **Risk.** Two deliveries create two next-round matches.
- **Likelihood.** High without a key.
- **Impact.** Broken bracket, two prizes.
- **Mitigation.** `bracket_advance_applied` primary key `match_id`. Node update and next match create are one transaction.

### Host edits a live bracket
- **Risk.** A host rewrites a winner.
- **Likelihood.** Medium if the API is loose.
- **Impact.** Stolen prize.
- **Mitigation.** Seed route works only in `seeding`. No route updates `bracket_nodes.winner` from a client. Only the `MATCH_FINISHED` consumer does.

### Check-in without funds, then deposit
- **Risk.** A player checks in, fails the hold, and the slot is both taken and unpaid.
- **Likelihood.** Medium.
- **Impact.** Free entry or a stuck slot.
- **Mitigation.** The entry stays `registered` until the hold returns. The slot counts only `checked_in`. The unique key prevents a second concurrent check-in from double-holding.

### Format logic leaking into Wallet
- **Risk.** A Swiss payout special-case inside Ledger.
- **Likelihood.** Medium as features grow.
- **Impact.** Every format becomes a money migration.
- **Mitigation.** Tournament computes the amount list. Wallet only checks the sum equals escrow plus overlay. It rejects a payout that does not balance. It does not read `format`.

## Notifications and events

### Duplicate notifications
- **Risk.** Two inbox rows and two pushes.
- **Likelihood.** High.
- **Impact.** User distrust, push cost.
- **Mitigation.** Unique `(user_id, event_id)`. Delivery row in the same transaction. Push only if that insert happened.

### Event storm
- **Risk.** A presence bug emits `FRIEND_ONLINE` for every heartbeat.
- **Likelihood.** Medium.
- **Impact.** Notification backlog, bus saturation, match lag if they share a consumer.
- **Mitigation.** Presence caps emits. `FRIEND_ONLINE` is on its own consumer and is droppable. Game, Wallet, and Rating use separate consumer groups and separate subject queues. A slow notification consumer cannot nack a payout.

### Infinite retry
- **Risk.** A poison payload retries forever.
- **Likelihood.** Medium.
- **Impact.** Stuck partition.
- **Mitigation.** Ten attempts, then dead-letter. Alert on depth. Do not retry a `409` or a validation error. Those ack and log.

### Out-of-order wallet events
- **Risk.** `TOKENS_RELEASED` observed before `TOKENS_ESCROWED`.
- **Likelihood.** Low per aggregate, possible across aggregates.
- **Impact.** A UI that shows a credit without a hold. Not a balance bug if the UI reads the cache.
- **Mitigation.** Clients render `GET /wallet`, not a fold of events. Ledger's cache is the record. Events are notifications.

## Concurrency and dependencies

### Deadlock
- **Risk.** Match locks a match row and calls Wallet, while Wallet's worker locks the wallet and calls Match.
- **Likelihood.** Medium if that edge is added.
- **Impact.** Stuck finalizing.
- **Mitigation.** The allowed call graph is acyclic. Wallet never calls Match. Match never calls Rating. Rating never calls Wallet synchronously. Season pay is an event. Lock order inside Ledger is user id ascending when two users are in one operation.

### Circular service dependency
- **Risk.** Queue → Match → Queue on create.
- **Likelihood.** Medium.
- **Impact.** Deploy-time cycle and deadlocks.
- **Mitigation.** Match create does not call Queue. Queue calls Match. Party updates flow one way into Queue.

### Stale sanction cache
- **Risk.** A banned user queues for 5 seconds, or a lifted ban waits 5 seconds.
- **Likelihood.** High, by TTL.
- **Impact.** Short window.
- **Mitigation.** `SANCTION_APPLIED` deletes the Redis key and Queue drops the live ticket in the consumer. The 5-second TTL is only a backstop. Permanent bans also revoke sessions.

### Single points of failure
- **Risk.** One Postgres primary for wallet and rating.
- **Likelihood.** Low per year, certain eventually.
- **Impact.** No new holds, no new rating. In-region live games continue until they need to commit a result.
- **Mitigation.** Live state is regional Redis. Primary loss fails new money closed and voids matches that cannot commit before the reconnect budget. Replicas are not promoted by a service. Promotion is an operational runbook with a 60-minute RTO. There is no second writer in another region.

### Replay attack on the API
- **Risk.** Capture a hold or a claim and replay the HTTP request.
- **Likelihood.** High.
- **Impact.** Duplicate side effect if the key is not stored.
- **Mitigation.** Idempotency-Key stored with the body hash. TLS. Access tokens last 15 minutes. Refresh reuse revokes the family. Webhooks verify signatures. QR codes are stored as hashes and expire.

### Spectator spoiler as an exploit
- **Risk.** A friend in spectate relays the opponent's move with no delay.
- **Likelihood.** High in Connect Four if delay is zero.
- **Impact.** Competitive integrity.
- **Mitigation.** Spectator channel is a separate feed delayed 15 seconds, produced by Game. Players are not on that channel. Private matches can disable spectate.

## Residual risk (accepted)

- Glicko is path-dependent, so a dead-lettered out-of-order match needs a human. That is rarer than a wrong auto-apply.
- Primary region loss pauses settlement. That is chosen over a multi-master ledger.
- Casual fail-closed when Moderation is down will look like an outage. That is chosen over a banned user playing.

If a future change adds a second writer to `wallets`, `matches`, or `match_events`, this stress test fails and the change is rejected.
