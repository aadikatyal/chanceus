# Architecture Review

The prototype is a Next.js application whose browser writes matches, token balances, and the matchmaking queue to Supabase. That is a valid demo and an invalid production core. The documents in this set replace it as the source of truth.

## Biggest weaknesses in the current implementation

1. **Clients decide money and winners.** `users.tokens` is a column. RLS lets a user insert `transactions`. Match rows accept participant updates to status and winner. No later ladder or prize pool is meaningful until those writes are gone.
2. **Matchmaking is a shared table.** Every client can read the queue and is expected to pair bets. There is no rating, ready check, region, or penalty. Expired rows depend on someone opening a page.
3. **Authorization is optional.** Tournament policies allow any logged-in user to update a tournament. Venue RLS was disabled to stop recursion. Debug routes and a debug token endpoint exist in the app.
4. **The data model is 1v1 and one-shot.** `player1_id` / `player2_id`, a friend status that also means blocked, and a single-elimination bracket cannot grow into parties, clubs, or Swiss without a break.
5. **There is no domain boundary.** The web app is the API, the referee, the wallet, and the admin tool. A failure in the client is a failure of integrity, not just of UX.
6. **Cash stake types sit on the same integer as free tokens.** That mixes a skill-game economy with an unregulated cash game.
7. **Realtime is table replication.** Presence, queue, and match state need rooms, ordering, and authorization. Database listen is not that.

## Biggest architectural improvements

- Server-owned match state machine and an append-only input log.
- A ledger with escrow, idempotency, and a balance cache that is not writable by clients.
- Hidden per-game Glicko-2, with leagues as a view, seasons as a job, and decay only at the top.
- Regional game and queue tiers, with wallet and rating in the primary and an outbox on the bus.
- Resource roles for host, club, and venue, separate from platform moderators and a distinct economy admin.
- One event contract so a finished match pays, rates, advances a bracket, and grants XP without those services calling each other in a chain that can half-finish.

## Migration risks

| Risk | Why it hurts | Mitigation |
| --- | --- | --- |
| Dual writes during the cut | A match could pay in both schemas | New matches write only the new ledger. Freeze `users.tokens` the same hour browser grants are revoked |
| Backfill mis-classifies tokens | Purchased and granted tokens are indistinguishable today | Backfill the entire balance as bonus. Communicate that. Do not invent a purchased balance |
| Historical matches lack a seed and event log | Replays and disputes for old matches are weak | Keep them read-only in a compatibility view. Do not rate them again |
| Supabase Auth coupling | Services assume JWT claims that the issuer does not send | Add a claim mapper. Do not block the split on replacing the issuer |
| Venue RLS history | Re-enabling policies can lock out real hosts | Port venues after the new `venue_staff` checks exist. Do not turn on the old policies as-is |
| Big-bang season or ranked launch | Empty queues and bad first ratings | Casual authoritative matches ship first. Ranked opens per game when a region's casual median wait is under 20 seconds |
| Outbox not actually in the same transaction | Lost events or double payouts | Reject any implementation that publishes to the bus before commit |

## Implementation priority

Do not build clubs, voice, or a season pass on the prototype write path.

1. **Stop client writes** to matches, transactions, queue, and tournaments. Remove debug and cash queue types from the public surface.
2. **Wallet service and ledger**, including the bonus backfill and Stripe idempotency.
3. **Game Service** for Connect Four, then Math Blitz, with forfeit and void.
4. **Casual matchmaking** with hidden MMR, labeled bots, and reconnect.
5. **Ranking read model** even before ranked stakes, so casual quality is measurable.
6. **Ranked, ready checks, escrow stakes, placements.**
7. **Friends, blocks, presence, parties** on the new social schema.
8. **Notifications from the bus.**
9. **Tournaments** on `bracket_nodes`, single elimination first, using the same match pipeline.
10. **Moderation cases and audit.**
11. **Venues** re-homed onto venue tables and venue-mode matches.
12. **Season job, decay, quests.**

## Recommended Phase 2 roadmap

Phase 1, as defined by the priority list above, ends when a casual match is created, played, finished, and settled without a client write, and the result is replayable from `match_events`.

Phase 2 is the competitive and social loop on that foundation:

- Ranked queue, placements, visible leagues, dodge penalties, rematch cap.
- Party of two in casual and ranked, with the 400 MMR spread rule.
- Profiles that show rank, recent matches, and privacy.
- Friend graph, blocks, recents, presence, and the match-found notification.
- Daily first-win and daily claim, paid as bonus through the ledger.
- Single-elimination tournament with check-in holds and a four-place prize template.
- Moderator report queue that can mute and queue-ban.
- One additional region only after `us-east` holds 1,000 concurrent casual players without voiding for Redis or lock loss.

Phase 2 is done when a new verified player can place, add the opponent, queue as a pair the next day, and enter a free tournament, and an operator can ban that player from the queue without opening a SQL console.

Leave Swiss, double elimination, clubs, voice, venue relaunch, and any cash withdrawal for Phase 3 and later, in the order in `FEATURE_ROADMAP.md`.

## Decision log

- Per-game rating, not one account MMR.
- Discrete stakes, not open bets.
- No cash-out in this architecture's first seasons.
- Clubs exist; guilds do not.
- Fail closed on wallet and rating; fail open on presence and analytics.
- Prototype schema is legacy and is migrated expand-then-contract.
