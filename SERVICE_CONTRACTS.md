# Service Contracts

These contracts amend `SYSTEM_ARCHITECTURE.md` where they are stricter. The amendment is the Wallet/Ledger split and the Queue/Match/Game split. Those three are the only ownership changes. Math, stakes, and permissions still come from `ECONOMY_SPEC.md`, `MATCHMAKING_SPEC.md`, `RANKING_SYSTEM.md`, and `PERMISSION_MODEL.md`.

## Platform rules (every service)

- One writer per table. Callers use the owner's API. Cross-service reads of owned tables are forbidden on the request path. Read models are fed by events.
- Synchronous calls are allowed only when the caller cannot proceed without the answer: authenticate, authorize, post a ledger transaction, accept or reject an input, create a match row.
- Every state change that other services need is an outbox event in the same database transaction as the write.
- Idempotency-Key on every mutating public API, stored 24 hours. Duplicate key and same body returns the original response. Same key and different body returns `409 idempotency_conflict`.
- Retry on the bus: 1s, 5s, 30s, 2m, 10m, then dead-letter, max 10. Retry only when the handler returned a transient error after rolling back its own transaction.
- Clocks are server clocks. Client timestamps are display-only.
- Each service has its own database role. Grants are limited to owned tables plus no direct grant on another service's tables.

## Authentication Service

- **Purpose.** Prove who the caller is and issue revocable sessions.
- **Owns.** Credentials, sessions, devices, email verification, ban enforcement at login.
- **Does.** Signup, login, refresh rotation, logout, OAuth code exchange, session revoke on `SANCTION_APPLIED` when the sanction is `game_ban` or `permanent`.
- **Does not.** Profiles, roles beyond copying them into token claims, wallets, sanctions policy.
- **Public API.** `POST /auth/signup|login|refresh|logout|verify-email|oauth/{provider}`, `GET /auth/sessions`, `DELETE /auth/sessions/{id}`.
- **Produces.** `USER_CREATED`.
- **Consumes.** `SANCTION_APPLIED`.
- **Tables owned.** `users` (status, email, region), `sessions`, `devices`.
- **Read-only.** `roles`, `sanctions` (via Moderation API, cached 5 seconds).
- **Cache.** None of business state. Revocation list in Redis, TTL = access-token lifetime.
- **Permissions.** Public for signup and login. Self for session list.
- **Failure.** Fail closed. Issuer down means no new sessions. Existing access tokens work until they expire (15 minutes). Refresh fails closed.
- **Retry.** No retry of login. Clients retry refresh once.
- **Idempotency.** Signup key is email. A second signup returns `409`.
- **Scaling.** Stateless, horizontal. Target 1k logins/s per region burst.
- **Metrics.** Login success ratio, refresh reuse detection (stolen token), issuer latency.
- **SLO.** Availability 99.95% monthly. p99 login under 300 ms excluding the identity provider.
- **Extends.** Additional OAuth issuers without touching other services. Claims mapper keeps Supabase replaceable.

## User / Profile Service

- **Purpose.** Public identity and settings.
- **Owns.** Username, display, privacy, titles equipped, settings, username history.
- **Does not.** Auth credentials, presence, ratings, wallet.
- **Public API.** `GET /me`, `PATCH /me`, `POST /me/username`, `GET /players/{username}`, `GET /players/{id}/matches` (assembled from Match read API), `GET /players/{id}/ranks` (from Leaderboard/Rating read API).
- **Produces.** `PROFILE_UPDATED`.
- **Consumes.** `USER_CREATED`, `LEAGUE_PROMOTED` (only to validate an equipped title still exists; it does not grant titles).
- **Tables.** Owns `profiles`, `user_settings`, `username_history`. Read-only none of the write path.
- **Cache.** `profile:{username}` 60s, invalidated by `PROFILE_UPDATED`.
- **Permissions.** `Player` self-write. Public read depends on privacy.
- **Failure.** Fail closed on write. Reads may serve cache for 60s.
- **Retry.** `USER_CREATED` consumer retries until the profile row exists.
- **Idempotency.** Username change key. Profile create key = `user_id`.
- **Scaling.** Stateless. Read-heavy, cache in front.
- **Metrics.** Username conflict rate, profile read p99, cache hit rate.
- **SLO.** p99 read 80 ms cached, 200 ms uncached. Availability 99.9%.
- **Extends.** New profile fields are additive JSON or nullable columns. No other service parses the profile row.

## Presence Service

- **Purpose.** Ephemeral online state.
- **Owns.** Redis `presence:{user}`.
- **Does not.** Friend graph, last_seen history except a rollup it writes to `users.last_seen_at` every 15 minutes (column owned here; add it in the Presence migration, not on the auth row's writer).
- **Public API.** `GET /presence`, `POST /presence/heartbeat`. Socket heartbeats hit this service.
- **Produces.** `FRIEND_ONLINE` at most once per 5 minutes per transition to online.
- **Consumes.** `QUEUE_JOINED`, `QUEUE_LEFT`, `MATCH_STARTED`, `MATCH_FINISHED`, `MATCH_CANCELLED` to set status. It does not decide those facts.
- **Tables.** Owns `presence_rollups` (`user_id`, `last_seen_at`) only.
- **Cache.** The presence key is the source of truth, TTL 30s.
- **Permissions.** Read filtered to self, friends, club mates. `invisible` is stored but returned as `offline` to everyone except self.
- **Failure.** Fail open. If Redis is down, the region reports presence unknown and does not emit a mass offline storm.
- **Retry.** Drop `FRIEND_ONLINE` after 3 tries. Do not dead-letter.
- **Idempotency.** Transition id `(user_id, status, minute bucket)`.
- **Scaling.** Redis cluster per region. Horizontal API.
- **Metrics.** Heartbeat loss, keys, emit rate of `FRIEND_ONLINE`.
- **SLO.** Freshness under 15 seconds while the socket is healthy. No durability SLA.
- **Extends.** New statuses are an enum change in this service only.

## Friend Service

- **Purpose.** Friend graph and blocks.
- **Owns.** Requests, acceptance, recents.
- **Does not.** Presence, chat delivery, matchmaking.
- **Public API.** `/friends`, `/friends/requests`, `/blocks`, `/recents`.
- **Produces.** `FRIEND_REQUESTED`, `FRIEND_ACCEPTED`, `USER_BLOCKED`.
- **Consumes.** `MATCH_FINISHED` to upsert recents. `SANCTION_APPLIED` does not delete friends.
- **Tables.** `friendships`, `blocks`, `recents`.
- **Cache.** None required. Optional block-pair cache, 60s, for Chat and Queue.
- **Permissions.** `social.friend`.
- **Failure.** Fail closed.
- **Retry.** Standard on `MATCH_FINISHED`. Recents are not required for match completion.
- **Idempotency.** Pair primary key. Recent upsert key `(user_id, other_id)`.
- **Scaling.** Stateless. The pair table is the hot constraint.
- **Metrics.** Request accept latency, block-check p99.
- **SLO.** p99 write 150 ms. Availability 99.9%.
- **Extends.** Follows, if ever added, are a new table in this service, not a new product.

## Party Service

- **Purpose.** Short-lived groups that queue as one ticket.
- **Owns.** Party membership and leader.
- **Does not.** Matchmaking math, voice media, chat logs.
- **Public API.** `POST /parties`, invites, join, leave, kick.
- **Produces.** `PARTY_UPDATED`.
- **Consumes.** `MATCH_FINISHED`, `MATCH_CANCELLED` to return the party to `open`.
- **Tables.** `parties`, `party_members`.
- **Cache.** `party:{id}` for the queue worker, invalidated on `PARTY_UPDATED`.
- **Permissions.** Leader for kick and invite. Members for leave.
- **Failure.** Fail closed. If Party is down, Queue rejects party tickets and still accepts solo tickets.
- **Retry.** Standard.
- **Idempotency.** One active party per user, partial unique index.
- **Scaling.** Stateless. Parties are tiny.
- **Metrics.** Party size distribution, desync between party status and queue.
- **SLO.** p99 150 ms. Availability 99.9%.
- **Extends.** Party size 4 is a config change plus a Queue spread check. No schema break.

## Voice Service

- **Purpose.** Issue short-lived tokens for a third-party SFU.
- **Owns.** Token minting policy and durable club room ids.
- **Does not.** Audio routing, match rules, chat history.
- **Public API.** `POST /voice/rooms`.
- **Produces.** `VOICE_JOINED`.
- **Consumes.** None required. Reads Party, Match, and Club via their APIs to authorize.
- **Tables.** `voice_rooms` for club rooms only.
- **Cache.** None.
- **Permissions.** `voice.join` and membership of the target.
- **Failure.** Fail closed on token mint. Gameplay does not depend on voice.
- **Retry.** Client retries the token call. Do not retry `VOICE_JOINED` past 3.
- **Idempotency.** One active token per user per room. Reissue returns the same token until it expires (5 minutes).
- **Scaling.** Stateless.
- **Metrics.** Mint latency, SFU error rate.
- **SLO.** p99 mint 200 ms. Availability 99.5%. Game SLO does not include voice.
- **Extends.** Swap SFU vendor behind this API.

## Chat Service

- **Purpose.** Durable text for DM, party, match, club, and community.
- **Owns.** Conversations, messages, reactions, read cursors, mutes.
- **Does not.** Notification push, moderation cases, presence.
- **Public API.** `/conversations` and message routes in `API_SPEC.md`.
- **Produces.** `MESSAGE_SENT`.
- **Consumes.** `SANCTION_APPLIED` to enforce mute. `USER_BLOCKED` to reject DMs.
- **Tables.** `conversations`, `conversation_members`, `messages`, `message_reactions`.
- **Cache.** None of history. Realtime fan-out is the gateway's Redis pub/sub, not a second log.
- **Permissions.** Members, plus Moderator soft-delete.
- **Failure.** Fail closed on send. History reads fail closed.
- **Retry.** Standard for consumers. Send is not retried by the server without the client idempotency key.
- **Idempotency.** `(conversation_id, client_id)` unique. Seq allocated by a per-conversation counter in the same transaction.
- **Scaling.** Partition messages by month. Send path locks one conversation row.
- **Metrics.** Send p99, seq gaps (must be zero), mute bypass attempts.
- **SLO.** p99 send 200 ms in-region. Availability 99.9%.
- **Extends.** New conversation kinds are an enum and an authorizer function in this service.

## Notification Service

- **Purpose.** Inbox plus push and email delivery.
- **Owns.** Inbox rows and delivery attempts.
- **Does not.** Deciding that a match finished or a friend came online. It only renders events it is subscribed to.
- **Public API.** `GET /notifications`, read, read-all, settings via Profile `notification_prefs` (read through Profile API).
- **Produces.** `NOTIFICATION_DELIVERED` (analytics only).
- **Consumes.** `MATCH_FOUND`, `FRIEND_REQUESTED`, `FRIEND_ACCEPTED`, `FRIEND_ONLINE`, `LEAGUE_PROMOTED`, `ACHIEVEMENT_UNLOCKED`, `TOURNAMENT_STARTED`, `TOURNAMENT_MATCH_ADVANCED`, `TOURNAMENT_COMPLETED`, `MESSAGE_SENT` (DM, recipient offline), `SANCTION_APPLIED`, `SEASON_ARCHIVED`, prize `TOKENS_RELEASED`.
- **Tables.** `notifications`, `notification_deliveries`.
- **Cache.** Unread count, 30s, invalidated on insert.
- **Permissions.** Self.
- **Failure.** Fail open relative to gameplay. Inbox insert retries. Push failure does not roll back the inbox row.
- **Retry.** Inbox: standard, idempotent on `(user_id, event_id)`. Push: 3 tries then stop. No infinite push retry.
- **Idempotency.** Unique `(user_id, event_id)`.
- **Scaling.** Consumer group, partitioned by user id.
- **Metrics.** Ingest lag, duplicate suppression count, push failure ratio.
- **SLO.** Inbox visible within 5 seconds p95 of the source event. Push is best effort within 30 seconds. Availability of the inbox API 99.9%.
- **Extends.** New event types are a template map. Unknown types are acked and ignored.

## Queue Service

This is the matchmaking service. There is not a second matcher.

- **Purpose.** Tickets, pools, proposals, ready checks, dodge memory.
- **Owns.** Who is waiting and who is proposed.
- **Does not.** Simulate games, write match rows, move tokens, compute Glicko. It asks Rating for a number and Wallet, via Match, for a hold.
- **Public API.** `POST /queue`, `DELETE /queue`, `GET /queue`, `POST /proposals/{id}/ready|decline`.
- **Produces.** `QUEUE_JOINED`, `QUEUE_LEFT`, `MATCH_FOUND`, `READY_CONFIRMED`.
- **Consumes.** `RATING_UPDATED` (refresh Redis MMR), `SANCTION_APPLIED`, `SEASON_CLOSING`, `PARTY_UPDATED`.
- **Tables.** `queue_tickets` (history only), `dodge_counters`.
- **Cache.** Redis pools, tickets, ready sets. This cache is the live source of truth. Postgres is history.
- **Permissions.** `queue.casual`, `queue.ranked`, `queue.party`.
- **Failure.** If Redis in the region is down, refuse new tickets in that region. Do not fall back to Postgres matching.
- **Retry.** Proposal timeout is a delayed message, not a poll loop. Re-emit `MATCH_FOUND` until the deadline, same `event_id`.
- **Idempotency.** One live ticket per user, Redis lock `ticket:{user}`. Ready is idempotent per user per proposal.
- **Scaling.** One leader per pool key. Pools are the shard.
- **Metrics.** Median wait, ready-fail rate, pool health, ticket leaks (ticket without a heartbeat).
- **SLO.** Time from both players being inside the window to `MATCH_FOUND` under 1 second p95. Availability 99.9% per healthy region.
- **Extends.** A new game is a new `game_id` on the pool key. No matcher rewrite. A new mode is a new pool dimension.

## Match Service

- **Purpose.** The match aggregate: lifecycle, seats, result fact, orchestration.
- **Owns.** When a match exists, its status, its seats, and the terminal result row.
- **Does not.** Validate moves, hold tokens itself, or rate players. It calls Wallet and Game. It accepts a terminal fact only from Game or from Admin void.
- **Public API.** `POST /matches`, invites, join, lobby ready, leave, `GET /matches/{id}`, forfeit, rematch, spectate authorization. Inputs are proxied to Game, not handled here.
- **Produces.** `MATCH_CREATED`, `MATCH_CANCELLED`, `MATCH_VOIDED`. It does not produce `MATCH_FINISHED`. Game does, and Match consumes it to set `finalizing` then `completed`.
- **Consumes.** `MATCH_FINISHED` (from Game), `TOKENS_ESCROWED`, `TOKENS_RELEASED` (ack), `RATING_UPDATED` (ack for ranked). Required acks are recorded in `match_consumer_acks`.
- **Tables.** `matches`, `match_players`, `match_results`, `spectators`, `match_consumer_acks`.
- **Read-only.** None.
- **Cache.** `match:{id}:summary` 5s for GET. Live snapshot is Game's key.
- **Permissions.** Host for lobby control. Seated players for forfeit. Admin for void.
- **Failure.** If Wallet hold fails, status stays `proposed` or `lobby` and the match is `cancelled`. If Game does not start within 10 seconds of escrow, Match voids and calls Wallet release.
- **Retry.** Reconciler every minute for `finalizing` older than 60 seconds, same event ids.
- **Idempotency.** Create key. One open match per user, partial unique index.
- **Scaling.** Stateless API. Status writes are rare compared with inputs.
- **Metrics.** Time in `finalizing`, void rate, hold-to-start latency.
- **SLO.** p99 create 250 ms excluding Wallet. Void-on-fault under 15 seconds. Availability 99.95%.
- **Extends.** New modes are an enum. Seat count above 2 is a check change, not a new service.

## Game Service

- **Purpose.** Rules, clocks, inputs, seeds, authoritative snapshots.
- **Owns.** Whether a move is legal and what the live state is.
- **Does not.** Money, rating, bracket advancement, match row status. It emits facts. Match Service is the only writer of `matches.status`.
- **Public API.** `POST /matches/{id}/inputs`, `POST /matches/{id}/reconnect`. Socket `match.input`. Internal `POST /internal/games/{id}/start`.
- **Produces.** `MATCH_STARTED`, `PLAYER_DISCONNECTED`, `PLAYER_RECONNECTED`, `MATCH_FINISHED`.
- **Consumes.** `MATCH_CREATED` to spawn the room. `MATCH_CANCELLED` and `MATCH_VOIDED` to stop the room.
- **Tables.** `match_events`. Owns `games` catalog together with no other writer.
- **Cache.** Redis `match:{id}:state` and owner lock. Source of truth during `live`. Postgres event log is the durable copy, appended before ack.
- **Permissions.** Seated player, seq must be the next expected seq.
- **Failure.** Lock takeover from snapshot. If the snapshot is older than the reconnect budget, emit `MATCH_FINISHED` with `end_reason = void`. Never guess a winner.
- **Retry.** Clients resend the same seq. Server returns the prior ack if the payload matches, `409` if it does not.
- **Idempotency.** `(match_id, seq)` primary key. `MATCH_FINISHED` once, guarded by a unique constraint on `match_results` which Game asks Match to insert. If Match already has a result, Game acks and stops.
- **Scaling.** Shard by match id. About 500 live rooms per node as the starting budget.
- **Metrics.** Input ack p95, void rate, desync resyncs, room count.
- **SLO.** In-region input ack p95 under 80 ms. Availability 99.9% per region.
- **Extends.** A new game is a rules module registered in the catalog. Queue, Match, Wallet, and Rating do not change.

## Rating Service

- **Purpose.** Glicko-2, placements, seasons, decay, promotion and demotion decisions.
- **Owns.** The rating number and the visible division for a user and game.
- **Does not.** Leaderboard transport, payouts, match truth.
- **Public API.** Internal `GET /internal/ratings/{user}?game&queue`. Player-facing rank fields are served by Leaderboard Service. `GET /me/ranks` is this service.
- **Produces.** `RATING_UPDATED`, `LEAGUE_PROMOTED`, `LEAGUE_DEMOTED`, `SEASON_CLOSING`, `SEASON_ARCHIVED`.
- **Consumes.** `MATCH_FINISHED`, `MATCH_VOIDED`.
- **Tables.** `ratings`, `rating_applications`, `seasons`, `rank_snapshots`, `season_results`, `placement_progress`, `season_jobs`.
- **Cache.** Redis copy of ranked rating for Queue, updated on write, repaired from Postgres on miss.
- **Permissions.** Self can read own RD. Public cannot.
- **Failure.** Fail closed. A match stays `finalizing` until the application row exists or the mode is unrated (tutorial, bot, private, void).
- **Retry.** Standard. Unique `(match_id, user_id, queue)`.
- **Idempotency.** That primary key. Voids write a reversal row keyed `void:{match_id}`.
- **Scaling.** Consumer partitioned by `user_id`. Season close is a single worker with `season_jobs`.
- **Metrics.** Apply lag, reversal count, decay runs, RD distribution.
- **SLO.** Rating applied within 5 seconds p95 of `MATCH_FINISHED`. Availability 99.9%.
- **Extends.** A new game uses the same formula with a new `game_id`. No second rating service.

## Leaderboard Service

- **Purpose.** Read models of standing.
- **Owns.** Redis sorted sets and the public board API.
- **Does not.** Compute Glicko or change divisions.
- **Public API.** `GET /leaderboards/{game}`, `GET /seasons/current` (read-only view of Rating's season row via an internal read API).
- **Produces.** None that other domains depend on.
- **Consumes.** `RATING_UPDATED`, `SEASON_ARCHIVED`.
- **Tables.** None. It does not own `rank_snapshots`.
- **Cache.** `lb:{game}:{region}:{season}` overwritten every 5 seconds from a stream of rating events, with a periodic rebuild from Rating's read API.
- **Permissions.** Public.
- **Failure.** Fail open. A stale board is acceptable. Rebuild on startup.
- **Retry.** Drop and rebuild. Do not block Rating.
- **Idempotency.** Last write wins per user. Events older than the stored version are ignored using `event_id` order (UUIDv7).
- **Scaling.** One projector per game per region.
- **Metrics.** Projector lag, rebuild duration.
- **SLO.** Board freshness under 10 seconds p95. Availability 99.9%. Stale data is not an outage.
- **Extends.** New board types (club, venue) are new projectors, new keys.

## Achievement Service

- **Purpose.** Unlock catalog items from facts.
- **Owns.** Achievement definitions and unlock rows.
- **Does not.** Quest progress, XP, wallet policy. It calls Wallet to grant bonus tokens.
- **Public API.** `GET /achievements`.
- **Produces.** `ACHIEVEMENT_UNLOCKED`.
- **Consumes.** `MATCH_FINISHED`, `LEAGUE_PROMOTED`, `FRIEND_ACCEPTED`.
- **Tables.** `achievements`, `user_achievements`.
- **Cache.** Catalog, 5 minutes.
- **Permissions.** Public catalog. Unlocks are public. Progress that is incomplete is self-only.
- **Failure.** Fail open relative to the match. Retry until the unique unlock row exists.
- **Retry.** Standard.
- **Idempotency.** `(user_id, achievement_id)` and Wallet key `ach:{user}:{achievement}`.
- **Scaling.** Consumer group.
- **Metrics.** Unlock rate, grant failures.
- **SLO.** Unlock within 30 seconds p95. Availability 99.5%.
- **Extends.** New achievements are catalog rows, not code, unless a new signal requires a new consumer.

## Quest Service

- **Purpose.** Period-scoped objectives and claims.
- **Owns.** Quest catalog, progress, claim markers.
- **Does not.** Achievements or rating.
- **Public API.** `GET /quests`, `POST /quests/{id}/claim`.
- **Produces.** `QUEST_COMPLETED` when progress hits the target. Claim calls Wallet synchronously.
- **Consumes.** `MATCH_FINISHED`, `LEAGUE_PROMOTED`.
- **Tables.** `quests`, `quest_progress`. Also owns `account_levels` and `xp_grants` (account progression lives here, one owner).
- **Cache.** Active quest list per region-day, 60s.
- **Permissions.** Self.
- **Failure.** Progress retries. Claim fails closed if Wallet fails and does not set `claimed_at`.
- **Retry.** Standard for progress. Claim is client-retried with the same idempotency key.
- **Idempotency.** Progress key `(user_id, quest_id, period_key, match_id)` in `quest_applications`. Claim key = that progress key.
- **Scaling.** Partition consumers by user id.
- **Metrics.** Claim errors, double-apply attempts.
- **SLO.** Progress within 30 seconds p95. Claim p99 300 ms. Availability 99.9%.
- **Extends.** New quest rules are catalog data evaluated by a fixed set of signals.

## Wallet Service

- **Purpose.** Product money policy.
- **Owns.** The decision to hold, release, rake, grant, or reject. Spend order. Stake tables. Daily claim rules.
- **Does not.** Store balances or ledger lines. It is the only product caller of Ledger, besides Ledger's own reconciler.
- **Public API.** `GET /wallet`, `GET /wallet/entries` (proxied from Ledger), `POST /wallet/daily-claim`, internal `POST /internal/wallet/hold|release|grant`.
- **Produces.** None of its own beyond what Ledger emits. Wallet returns the Ledger operation to the caller.
- **Consumes.** `MATCH_FINISHED` and `TOURNAMENT_COMPLETED` and `SEASON_ARCHIVED` and `ACHIEVEMENT_UNLOCKED` only as the policy worker that turns them into Ledger posts. It does not consume them inside Ledger.
- **Tables.** `stake_policies`, `daily_claims`. No balance columns.
- **Cache.** None of balances.
- **Permissions.** Self for reads and claims. Match, Tournament, Quest, Achievement, Payment, Admin (economy) for internal posts. The caller is authenticated as a service, and the user id is an argument, not the caller.
- **Failure.** Fail closed. If Ledger is down, holds fail and matches do not start.
- **Retry.** Callers retry with the same idempotency key. Wallet forwards that key to Ledger unchanged.
- **Idempotency.** Wallet stores nothing duplicate. Ledger does.
- **Scaling.** Stateless. Concurrency is Ledger's row lock.
- **Metrics.** Hold failure reasons, policy rejects, claim rate.
- **SLO.** p99 policy decision 50 ms on top of Ledger. Availability 99.95% tied to Ledger.
- **Extends.** New reward types are new policy functions that post through the same Ledger API. Tournament formats do not.

## Ledger Service

- **Purpose.** Append-only double-entry and the balance cache.
- **Owns.** Balances and the audit of every unit that moved.
- **Does not.** Know what a match, rake policy, or season is. It posts balanced operations.
- **Public API.** Internal only: `POST /internal/ledger/operations`, `GET /internal/ledger/balances/{user}`, `GET /internal/ledger/entries/{user}`. The only callers are Wallet and the reconciler. Admin adjustments go Wallet → Ledger so policy and audit stay in one path. Super Admin does not get a direct Ledger route.
- **Produces.** `TOKENS_ESCROWED`, `TOKENS_RELEASED`.
- **Consumes.** Nothing.
- **Tables.** `wallets`, `wallet_entries`, `wallet_operations`, `ledger_reconciliations`.
- **Cache.** The `wallets` row is the cache. No Redis balance.
- **Permissions.** Service identity `wallet` only.
- **Failure.** Fail closed. A post is one transaction: lines, cache update, outbox, operation row.
- **Retry.** Safe to retry the same idempotency key.
- **Idempotency.** `wallet_operations.idempotency_key`.
- **Scaling.** Vertical on the hot user row plus horizontal reads from replicas. Partition entries by month.
- **Metrics.** Post latency, lock wait, reconciliation drift, idempotent replay count.
- **SLO.** p99 post 150 ms. Availability 99.95%. Drift discovered within 1 hour. Correctness target: zero unexplained drift.
- **Extends.** New accounts are an enum migration. Callers do not gain write access.

## Payment Service

- **Purpose.** Stripe checkout and webhook verification.
- **Owns.** Provider references and purchase status.
- **Does not.** Credit tokens itself. A paid webhook calls Wallet `grant` with the provider ref as the idempotency key.
- **Public API.** `POST /payments/checkout`, `POST /payments/webhook`.
- **Produces.** `PURCHASE_PAID`.
- **Consumes.** None.
- **Tables.** `purchases`.
- **Cache.** None.
- **Permissions.** Verified player for checkout. Provider signature for webhook.
- **Failure.** Fail closed. Unknown signature is 401 and is not retried by us. Stripe retries the webhook.
- **Retry.** Wallet grant uses the Stripe event id. Duplicate webhooks no-op.
- **Idempotency.** Unique `(provider, provider_ref)`.
- **Scaling.** Stateless. Low QPS.
- **Metrics.** Webhook signature failures, grant failures, amount mismatches.
- **SLO.** Webhook handled within 30 seconds p95. Availability 99.9%.
- **Extends.** A second provider is a new adapter behind the same grant call.

## Tournament Service

- **Purpose.** Registration, check-in, seeds, bracket nodes, disputes, prize intent.
- **Owns.** Who is in the event and which node advances.
- **Does not.** Simulate the match, compute rating, or post ledger lines. It calls Match to create matches and Wallet to hold and pay using a placement list.
- **Public API.** Tournament routes in `API_SPEC.md`.
- **Produces.** `TOURNAMENT_PUBLISHED`, `TOURNAMENT_CHECKED_IN`, `TOURNAMENT_STARTED`, `TOURNAMENT_MATCH_ADVANCED`, `TOURNAMENT_COMPLETED`.
- **Consumes.** `MATCH_FINISHED`, `MATCH_VOIDED`.
- **Tables.** `tournaments`, `tournament_staff`, `tournament_entries`, `bracket_nodes`, `tournament_disputes`, `bracket_advance_applied`.
- **Cache.** Public tournament document, 5 seconds.
- **Permissions.** Host, tournament admin, referee, as in `PERMISSION_MODEL.md`.
- **Failure.** Fail closed on check-in if Wallet fails. Advancement retries. A missing `MATCH_FINISHED` leaves the node `playing`.
- **Retry.** Standard. Advance key is `match_id`.
- **Idempotency.** One entry per user. One advance per match. Prize request key `tprize:{tournament}:{user}`.
- **Scaling.** One active worker per live tournament for advancement, API horizontal.
- **Metrics.** Stuck nodes, check-in hold failures, dispute age.
- **SLO.** Advance within 5 seconds p95 of the match result. Availability 99.9%.
- **Extends.** A new format is a bracket generator inside this service. Wallet still receives a list of placements and amounts. Wallet does not learn the format.

## Venue Service

- **Purpose.** Places, staff, events, QR check-in, local rewards, local standings.
- **Owns.** Venue lifecycle and venue points.
- **Does not.** Global wallet, global rating, or trivia rules. It starts venue matches through Match Service.
- **Public API.** Venue routes in `API_SPEC.md`.
- **Produces.** `VENUE_CHECKIN`, `VENUE_EVENT_STARTED`.
- **Consumes.** `MATCH_FINISHED` where `mode = venue` to add standings points.
- **Tables.** `venues`, `venue_staff`, `venue_events`, `venue_checkins`, `venue_codes`, `venue_standings`, `venue_rewards`.
- **Cache.** Active event check-in count, 2 seconds, for the host dashboard.
- **Permissions.** Owner, host, staff.
- **Failure.** Fail closed on check-in. Standings retry.
- **Retry.** Standard.
- **Idempotency.** `(event_id, user_id)` check-in. Standing increment key `(match_id, user_id)`.
- **Scaling.** Stateless. A single event is one hot row for check-in counts; use a counter row, not a scan.
- **Metrics.** Check-in failures, code expiry, standing lag.
- **SLO.** Check-in p99 200 ms. Availability 99.9%.
- **Extends.** New local reward kinds are `venue_rewards.kind`. They never become tokens.

## Club Service

- **Purpose.** Membership, roles, weekly contribution.
- **Owns.** The club and its score.
- **Does not.** Chat, matchmaking, or payments.
- **Public API.** `POST /clubs`, join, member role patch, `GET /clubs/{id}`.
- **Produces.** `CLUB_UPDATED`.
- **Consumes.** `MATCH_FINISHED` for ranked games to add weekly points. `SANCTION_APPLIED` does not auto-remove members.
- **Tables.** `clubs`, `club_members`, `club_scores`, `club_point_applications`.
- **Cache.** Member role, 30s, for Chat authorization via API.
- **Permissions.** Owner and officer as specified.
- **Failure.** Fail open for points (retry). Fail closed for membership changes.
- **Retry.** Standard. Point key `(match_id, user_id)`.
- **Idempotency.** That key. One owner partial unique index.
- **Scaling.** Stateless.
- **Metrics.** Point lag, membership write conflicts.
- **SLO.** p99 membership write 200 ms. Points within 1 minute p95. Availability 99.9%.
- **Extends.** Community spaces stay in `communities`, owned here as well, same service, different tables. They have no score.

## Replay Service

- **Purpose.** Durable replay objects and share links.
- **Owns.** Replay metadata and the blob pointer.
- **Does not.** The live event log. It reads `match_events` through Game's internal export API once, at archive time.
- **Public API.** `GET /replays/{matchId}`, `POST /replays/{matchId}/share`, `GET /replays/share/{token}`.
- **Produces.** `REPLAY_ARCHIVED`.
- **Consumes.** `MATCH_FINISHED`.
- **Tables.** `replays`.
- **Cache.** Signed URL cache is forbidden. Mint per request.
- **Permissions.** Visibility on the row. Participants may share.
- **Failure.** Fail open. Archive retries. Gameplay does not wait for it.
- **Retry.** Standard, then dead-letter for manual replay rebuild.
- **Idempotency.** `match_id` primary key.
- **Scaling.** Worker pool. Object storage is the capacity limit.
- **Metrics.** Archive lag, missing blob count.
- **SLO.** Replay available within 2 minutes p95. Availability of reads 99.9%.
- **Extends.** New games archive if they write `match_events`. No per-game replayer in other services.

## Moderation Service

- **Purpose.** Reports, cases, sanctions, appeals, trust score.
- **Owns.** Whether a user is currently restricted.
- **Does not.** Void matches or move money. It asks Admin or Match for a void through the admin API, which is still audited.
- **Public API.** `/reports`, `/appeals`, `/moderation/*`.
- **Produces.** `REPORT_FILED`, `SANCTION_APPLIED`, `SANCTION_REVOKED`.
- **Consumes.** `MATCH_FINISHED`, `QUEUE_LEFT` (dodge) for trust inputs.
- **Tables.** `reports`, `cases`, `sanctions`, `appeals`, `trust_scores`.
- **Cache.** Active sanctions per user, Redis, TTL 5s, filled on write and on read-through.
- **Permissions.** See `PERMISSION_MODEL.md`. Moderators cannot sanction admins.
- **Failure.** Fail closed on sanction write. Queue treats a Moderation timeout as "deny ranked" for paid actions and "allow casual" only if the cache says no active ban. If the cache is cold and Moderation is down, paid and ranked fail closed, casual fails closed too. Simpler rule: any sanction lookup failure fails the competitive action closed.
- **Retry.** Trust recompute is hourly and idempotent.
- **Idempotency.** Sanction create key. Trust rebuild replaces the row.
- **Scaling.** Low QPS. Case reads are the bulk.
- **Metrics.** Open case age, sanction lookup failures, false-deny rate.
- **SLO.** Sanction visible to Queue within 5 seconds p95. Availability 99.9%.
- **Extends.** New sanction types remove capability keys. Services check keys, not a new integration each time.

## Admin Service

- **Purpose.** Staff actions that cross domains, with an audit row first.
- **Owns.** Audit log and admin notes.
- **Does not.** Bypass Wallet, Match, or Moderation. It calls them.
- **Public API.** `/admin/*` as in `API_SPEC.md`.
- **Produces.** `ADMIN_ACTION` (the audit envelope). Domain services still emit `MATCH_VOIDED` and ledger events.
- **Consumes.** None.
- **Tables.** `audit_logs`.
- **Cache.** None.
- **Permissions.** Moderator, Admin, economy admin, Super Admin, split by route.
- **Failure.** Fail closed. If the downstream call fails, the audit row records `failed` and no second hidden path runs.
- **Retry.** Client retries with the same idempotency key. Downstream services no-op.
- **Idempotency.** Required on void and adjustment.
- **Scaling.** Low QPS.
- **Metrics.** Adjustment volume, void volume, dual-control rejections.
- **SLO.** p99 500 ms plus downstream. Availability 99.5%.
- **Extends.** New admin tools are new routes that call existing services. No direct SQL.

## Analytics Service

- **Purpose.** Warehouse intake.
- **Owns.** The warehouse and funnels.
- **Does not.** Any product table.
- **Public API.** None on the product domain. Internal ingest only.
- **Produces.** None back into the product bus.
- **Consumes.** Every domain event, on a separate consumer group.
- **Tables.** Warehouse tables, not in the product schema.
- **Cache.** Dashboard caches, irrelevant to product correctness.
- **Permissions.** Internal.
- **Failure.** Fail open. Lag does not block producers. The consumer acks only after the warehouse write, so a warehouse outage grows the consumer lag, not data loss, until retention expires. Retention on the bus is 7 days. Alert at 1 hour lag.
- **Retry.** Standard, then skip-to-dead-letter so one poison event cannot block the group. The dead letter keeps the payload.
- **Idempotency.** Warehouse unique `event_id`.
- **Scaling.** Separate consumer, partitioned by aggregate id.
- **Metrics.** Lag, dead-letter depth.
- **SLO.** No product SLO. Dashboard freshness target 15 minutes.
- **Extends.** New events are new columns or a JSON payload. Producers do not import this service.

## Search Service

- **Purpose.** Find players, clubs, tournaments, and venues.
- **Owns.** The search index.
- **Does not.** The source rows.
- **Public API.** `GET /search`.
- **Produces.** None.
- **Consumes.** `PROFILE_UPDATED`, `USER_CREATED`, `CLUB_UPDATED`, `TOURNAMENT_PUBLISHED`, venue updates (`VENUE_PUBLISHED`, emitted by Venue when status becomes `active`).
- **Tables.** Index only.
- **Cache.** Query cache 15 seconds for identical public queries.
- **Permissions.** Public results respect profile privacy. The index stores a visibility flag copied from the event.
- **Failure.** Fail open to an empty result with `503` rather than a stale private hit. On consumer lag, a user can be missing from search. They are not visible if their last indexed privacy was private.
- **Retry.** Standard.
- **Idempotency.** Document id = entity id. Last UUIDv7 wins.
- **Scaling.** The index is its own cluster.
- **Metrics.** Index lag, zero-result rate.
- **SLO.** Search p99 200 ms. Index lag under 60 seconds p95. Availability 99.5%.
- **Extends.** New entity types are new indexes and new events. No product service queries another service's tables for search.

## Media Service

- **Purpose.** Avatars and venue images.
- **Owns.** Upload policy and object keys for those buckets. Replay blobs stay with Replay Service so a media outage cannot block archives. Two buckets, two owners.
- **Does not.** Replay archives, match events.
- **Public API.** `POST /media/uploads` → signed upload URL. `GET` is a signed download URL.
- **Produces.** `MEDIA_ATTACHED`.
- **Consumes.** None. Profile stores the URL it gets back.
- **Tables.** `media_objects` (`id`, `owner_id`, `kind`, `storage_key`).
- **Cache.** None.
- **Permissions.** Authenticated owner. Size and content-type allowlist.
- **Failure.** Fail closed on upload. Profiles keep the previous avatar.
- **Retry.** Client retries the upload. Confirm is idempotent on object id.
- **Idempotency.** Object id.
- **Scaling.** Stateless signer. Storage is the capacity.
- **Metrics.** Rejected uploads, sign latency.
- **SLO.** p99 sign 100 ms. Availability 99.9%.
- **Extends.** New kinds are an allowlist change.

## Ownership check

| Concern | Single owner |
| --- | --- |
| Balances and ledger lines | Ledger |
| Stake and reward policy | Wallet |
| Tickets and proposals | Queue |
| Match status and result row | Match |
| Rules and inputs | Game |
| Rating math | Rating |
| Board projection | Leaderboard |
| Inbox | Notification |
| Sanctions | Moderation |
| Audit log | Admin |
| Replay blob | Replay |
| Avatar blob | Media |

No service in this list writes a table it does not own.
