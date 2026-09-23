# Product Architecture

Source of truth for what ChanceUS is. Implementation specs defer to this document when they conflict. The running application is a prototype and is not a constraint.

## Product philosophy

ChanceUS is the competitive layer for short skill games. The games are content. The product is identity, matchmaking, rating, a closed token economy, clubs, tournaments, and real-world venues.

A player should be able to explain the product in one sentence: play a two-minute game, get a fair opponent, see a rank move, and do it with people you know.

Chess.com is the model for daily habit and a believable ladder. FACEIT is the model for server authority and penalties. Supercell is the model for seasons and collection of status. Discord is the model for presence and parties. Steam is the model for a stable identity across games.

ChanceUS is not a casino, not a single title, and not a user-generated rules engine.

## Core principles

1. The server is the referee. Clients render state and submit inputs. They never set winners, balances, ratings, seeds, or bracket advancement.
2. Visible rank lags hidden skill. Matchmaking uses per-game Glicko-2. Leagues are a view of that rating.
3. A completed match changes at least one of: casual rating, ranked rating, wallet, quest progress, club score. A match that changes nothing is a defect.
4. Fairness outranks generosity. Refunds, decay, dodge penalties, and payout holds exist so the ladder stays believable.
5. Regions are first-class. Queues and live matches are regional. Global leaderboards are aggregated views.
6. Money moves only through the ledger, only by the Wallet service, only with an idempotency key.
7. Social systems do not fork. One friend graph, one block list, one club object. "Guild" is not a second product.
8. Prototype tables and client writes are legacy. They are migrated or retired. They are not extended.

## Product boundaries

In scope: accounts, profiles, casual and ranked 1v1, parties up to 2 in Phase 2 and up to 4 later, private lobbies, rematches, seasons, clubs, communities, chat, presence, voice tokens, tournaments, venues, moderation, notifications, replays, token purchases.

Out of scope until a later explicit decision: real-money withdrawal, player-created rules, cross-game MMR, async ghost matches, native apps as a requirement for launch, a season pass that gates the ladder.

## Non-goals

- Optimizing the current Next.js plus client-side Supabase design.
- Letting the browser pair queue rows.
- Supporting arbitrary bet amounts. Stakes are a discrete ladder.
- Shipping `cash5` / `cash10` queues.
- A public "report the winner" API.
- Two ladder systems (global MMR plus per-game MMR). Rating is per game, per queue (`casual` or `ranked`).

## User lifecycle

States: `anonymous → registered → provisional → active → limited → banned`. `limited` is a sanction overlay, not a deletion. `banned` blocks login.

1. **Visitor.** May read the catalog, public profiles marked public, public leaderboards, public tournaments, and public venue boards. May not queue, chat, or see private profiles.
2. **Signup.** Email or OAuth. Username is unique, 3–20 characters, `[a-z0-9_]`, reserved words rejected. Account is `provisional`.
3. **Verify.** Email verification is required before ranked placement, paid entry, hosting, or withdrawal (withdrawal itself is disabled). Unverified users may play casual.
4. **Onboarding.** Required fields before the first human match: starter game, home region (default from a latency probe), optional friend code. Grant 200 bonus tokens once.
5. **Tutorial.** One match against `opponent_type = bot` on the real Game Service. Labeled bot. Writes no ranked rating and no token win.
6. **First matches.** Casual, free, widened band. Bot backfill only after 20 seconds, always labeled. After 5 completed casual games against humans or labeled bots, the ranked unlock is offered.
7. **Placements.** 5 ranked-rules games, no fee, public rank `Unranked` until the fifth result commits. Abandon counts as a loss and consumes a placement.
8. **Active.** Full casual, ranked, social, and free tournaments. Paid tournaments and stakes above 25 tokens require account age of 7 days and `active` status.
9. **Social.** After match 3, offer "recently played" add if both allow it. After match 8, offer club join. Parties unlock when the friend graph has one accepted friend or a club mate.
10. **Long-term.** Seasons, club weeks, venue nights, decay warnings. No manual rank reset.

Deletion: soft-delete the profile, revoke sessions, retain ledger and match facts for 7 years, anonymize username to `deleted_{id}`.

## Game lifecycle

A game is a versioned ruleset in the catalog, not a React component.

States: `draft → active → deprecated → retired`.

- `active` games accept new matches on `rules_version`.
- `deprecated` games finish in-flight matches and refuse new queues.
- `retired` games remain in history and replays.
- Rules changes bump `rules_version`. In-flight matches keep the version they started with.
- Launch catalog: `connect-four`, `math-blitz`, `trivia`. Each defines clock, input schema, draw policy, AFK timeout, and whether a bot implementation exists.
- Trivia questions come from one bank. Venue mode and casual mode are two presentations of that bank.

## Match lifecycle

```
proposed → escrow_held → countdown → live → finalizing → completed
                 ↓            ↓         ↓
              cancelled     void      void
```

Private lobbies use `lobby → escrow_held → …` instead of `proposed`.

| State | Entry condition | Exit |
| --- | --- | --- |
| `proposed` | Matcher built a proposal, or a rematch was accepted | Both ready, or 15s timeout |
| `lobby` | Host created a private match | All invited slots ready, or host cancels, or 10 minutes |
| `escrow_held` | Wallet hold succeeded for every human stake. Free matches hold zero and still pass through this state | Countdown starts |
| `countdown` | 3 seconds | First input window opens, or a player drops |
| `live` | Server accepted the start | Terminal result, forfeit, or void |
| `finalizing` | Result fact is durable | Rating, wallet, quests, and club jobs acked |
| `completed` | All required consumers acked or scheduled for retry | Immutable |
| `cancelled` | Ready failure, lobby cancel, mutual cancel in countdown | Refunds if a hold existed. No rating |
| `void` | Server fault, desync past recovery, integrity hold | Refunds. Rating write reversed if it happened |

Clock rules:

- Ranked and tournament ready check: 15 seconds.
- Casual ready check: none for the first 20 account games, then 12 seconds.
- Reconnect budget: 60 seconds casual, 90 seconds ranked and tournament. One pause of the turn clock per player, capped at that budget.
- AFK: 20 seconds without a legal input. Warning 10 seconds, then forfeit.
- Forfeit before 30 seconds of `live` play is a dodge, not a rated loss, and refunds. Forfeit after that is a rated loss and a normal payout.
- Rematch: both accept within 30 seconds. New match id. Maximum 3 ranked rematches per opponent per hour.

Participants live in `match_players`, not `player1_id` / `player2_id`. v1 matches have exactly two slots. Bots occupy a slot with `user_id` null and `bot_id` set.

## Season lifecycle

- Length: 8 weeks. One season row per game per region.
- States: `scheduled → active → closing → archived`.
- `closing` lasts 2 hours: queues reject new ranked tickets, in-flight matches finish, snapshot job runs, rewards are enqueued, soft reset writes new ratings.
- Soft reset: `new = 1500 + (old - 1500) * 0.5`, RD = 200, Legend cleared.
- Next season opens in `calibration`: public badge reads `Calibrating` for 3 games. Those games use the reset rating. They are not a climb from Bronze.
- Mid-season resets do not exist. An integrity reset is an admin action with an audit row and a player-visible notice.
- Casual rating does not reset.

League display, promotion buffer, decay, and placement caps are defined in `RANKING_SYSTEM.md` and are normative.

## Tournament lifecycle

States: `draft → registration → check_in → seeding → live → completed`, plus `cancelled` from any pre-`live` state. Cancellation during `live` voids unfinished matches and pays finished results.

1. Host creates `draft` with game, region, format, capacity, entry fee, schedule, prize template.
2. Host publishes to `registration`. Wallet is not charged yet.
3. Players register. Entry fee is held at check-in, not at register. Withdrawal before check-in is free. Withdrawal after check-in and before `live` refunds the hold and may be closed by the host 15 minutes before start.
4. `check_in` opens at the scheduled time and lasts 15 minutes. Unchecked players are dropped and not charged.
5. `seeding` is automatic: ranked rating descending, ties broken by account age then random. Host may lock seeds. Late join is allowed only in `registration`, or by a host placing a checked-in player into an empty seed before the first round starts.
6. `live` generates `bracket_nodes` and matches. Advancement is consumed from `MATCH_FINISHED` only.
7. Disputes freeze that match's payout and rating for 24 hours. A referee resolves `uphold`, `reverse`, or `void`.
8. `completed` pays the prize template from escrow plus optional overlay. Default 16-player split: 50 / 25 / 15 / 10.

Formats in the model from day one: `single_elim`, `double_elim`, `swiss`, `round_robin`. Implementation order is in `ARCHITECTURE_REVIEW.md`. The schema does not assume single elimination.

## Venue lifecycle

A venue is a real place with an owner, staff, and local rewards that never enter the global wallet.

States: `pending_review → active → suspended → closed`.

Event states: `scheduled → check_in → live → completed → cancelled`.

1. Owner creates a venue. Super Admin or Admin approves it.
2. Staff with `host` or `owner` schedule an event and a question set.
3. Patrons check in with a rotating QR code bound to the event. Check-in is single-use per user per event.
4. Live trivia uses Game Service with `mode = venue`. Results write `venue_standings` only.
5. Drink and local rewards are `venue_rewards`. They are not tokens.
6. A venue season is 8 weeks inside that venue and does not affect global leagues.

## Player progression

Two tracks that do not share points.

**Competitive:** per-game casual MMR (hidden) and ranked MMR (hidden) plus league, division, peak, season badge. Legend is the top 500 per game per region per season at or above rating 2300. Initial placement cannot exceed Diamond II.

**Account:** XP from completed matches only. Not from purchases. Level curve is `xp_to_next = 100 * level`. Prestige is optional at level 50: level returns to 1, prestige increments, equipped title may show the prestige. Prestige grants no rating and no token multiplier.

Quests, achievements, badges, and titles are cosmetic or bonus-token rewards. They never change MMR.

Streaks pay bonus tokens at 3 and credit a quest at 5. They do not multiply rating.

## Success metrics

| Metric | Target |
| --- | --- |
| Median casual queue time in a staffed region | < 20 seconds |
| Ranked ready-check failure | < 8% of proposals |
| Matches voided for server fault | < 0.1% |
| Client-originated wallet or result writes | 0 |
| Result disputes | < 0.5% of ranked matches |
| Payout idempotency conflicts that double-credit | 0 |
| Day-7 return among players with one friend or club | measured before any cash-out work |
| p95 match input ack in-region | < 80 ms |

## Normative companions

`RANKING_SYSTEM.md`, `ECONOMY_SPEC.md`, and `MATCHMAKING_SPEC.md` remain normative for math, stakes, and queue windows. This document owns lifecycles and boundaries. If a companion conflicts with a lifecycle state name here, this document wins and the companion must be updated.
