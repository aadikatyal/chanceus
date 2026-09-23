# System Architecture

Production architecture for 100,000 concurrent users, millions of historical matches, thousands of concurrent tournament matches, and regional realtime play. The prototype (Next.js writing Supabase from the browser) is not the deployment model.

`SERVICE_CONTRACTS.md` is the stricter ownership map. Where this file says "Wallet writes the ledger," read that as Wallet decides and Ledger posts. Where it says "Matchmaking," the service name is Queue. Match owns the match row. Game owns inputs and emits `MATCH_FINISHED`.

## Topology

```
Web client
  → CDN
    → Edge (TLS, WAF, region pin, IP rate limit)
      → API gateway (HTTP) ─────────────┐
      → Realtime gateway (WebSocket) ───┤
                                        ▼
                         Internal mesh (mTLS, service identity)
                                        │
     Auth  Profiles  Social  Presence  Chat  Matchmaking
     Game  Ranking  Wallet  Payments  Tournament  Venue
     Notification  Moderation  Admin  Media  Search  Club
                                        │
                     Postgres primary + replicas
                     Redis per region
                     NATS (or equivalent) message bus per region + global bridge
                     Object storage
                     Workers
```

Service calls are synchronous only when the caller needs a decision to continue (authorize, hold tokens, accept input). Everything else is a domain event.

## Frontend

The web app is a client. It holds no authority. It may cache public reads for a session. It submits inputs with a monotonic `client_seq`. It paints from `match.state` snapshots. It never posts `winner_id`, `tokens`, or `rating`.

A later mobile client uses the same HTTP and websocket contracts. No screen-specific backend.

## API layer

- Public base: `https://api.chanceus.com/v1`.
- JSON. Timestamps are UTC ISO-8601. Ids are UUIDv7 (time-ordered).
- Timeouts: 5 seconds for reads, 10 seconds for wallet mutations. Game inputs are not this path except as a retry; the socket is primary.
- Idempotency-Key required on every POST that moves money, creates a match, joins a queue, registers for a tournament, or applies a sanction. Server stores the key for 24 hours and replays the same response.
- Pagination: cursor, not offset, on every list. Default page size 25, max 100.

## Authentication

- Identity provider issues signed access tokens (15 minutes) and refresh tokens (30 days, rotating, family-revocable).
- Access token claims: `sub`, `session_id`, `region`, `roles[]`, `status`.
- Email verification is a claim `email_verified`.
- Service-to-service auth is workload identity, separate from user tokens. The gateway strips inbound service credentials.
- Sessions are revocable. Ban checks on refresh and on websocket connect.
- Prototype Supabase Auth may remain the issuer during migration if domain services verify its JWT and the browser loses direct table access. The issuer is replaceable. Table grants are not.

## Gateway

HTTP gateway responsibilities: authenticate, resolve region, enforce coarse rate limits, route to the service, propagate `trace_id`. It does not contain game or wallet rules.

Per-user limits (token bucket):

| Route class | Limit |
| --- | --- |
| Auth | 10 / minute / IP |
| Queue join | 6 / minute / user |
| Chat send | 30 / 10 seconds / user |
| Match input (REST retry) | 20 / second / match |
| Reports | 10 / hour / user |
| Friend requests | 20 / hour / user |

Over limit returns `429 rate_limited` with `retry_after_ms`.

## Realtime

One gateway fleet per region. Connections are sticky by `user_id` for a session. Reconnect uses the same access token and `Last-Event-Id` for at-least-once personal events.

Channels and authorization:

| Channel | Who |
| --- | --- |
| `user:{id}` | That user only |
| `party:{id}` | Members |
| `match:{id}` | Players |
| `match:{id}:spectate` | Anyone allowed to spectate, delayed 15 seconds |
| `club:{id}` | Members |
| `tournament:{id}` | Public if the tournament is public |
| `venue:{id}` | Checked-in users and staff during an event; public board is a separate read model |
| `leaderboard:{game}:{region}` | Public, snapshot every 5 seconds |

The socket is not the system of record. After `match.ended` the client refetches `GET /matches/{id}`.

Fan-out uses Redis pub/sub inside a region. Cross-region personal events (friend online) cross the bus bridge.

## Presence

Redis only. Key `presence:{user_id}` JSON: `{ status, match_id, party_id, region, updated_at }` with TTL 30 seconds. Heartbeat every 10 seconds from the socket. Status values: `online`, `idle` (no heartbeat activity 5 minutes), `queue`, `match`, `invisible`.

`invisible` still heartbeats so the platform can route match found. Friends see `offline`.

Postgres does not store "online now." A daily rollup may store last_seen for profiles.

## Matchmaking

Stateless API plus one active worker per pool key. Pool key: `region|game|mode|party_size|stake`.

Tickets live in Redis sorted sets scored by enqueue time, with MMR in the payload. Postgres stores the ticket only after a proposal is accepted, as history (`queue_tickets`).

The worker owns proposals and ready deadlines. It does not simulate games. On both ready, it calls Wallet.hold. On hold success, it emits `MATCH_CREATED` and hands the match to Game Service. On hold failure, it cancels the proposal and requeues the solvent player with priority.

Normative windows, dodges, and bot backfill: `MATCHMAKING_SPEC.md`.

## Game Service

Authoritative rooms in the match's region. Process model: many replicas, one room owned by one replica via a Redis lock `match:{id}:owner` with a 5-second lease.

Room responsibilities: generate the seed and problem set, validate inputs, advance clocks, detect AFK, snapshot state to Redis every input or every 1 second, append `match_events`, emit the terminal fact exactly once.

Crash recovery: another replica takes the lock and loads the snapshot. If the snapshot is older than the reconnect budget, it voids the match.

Bots are in-process opponents with a fixed id and a difficulty. They are labeled in the player list. They never receive a wallet hold.

## Wallet and ledger

Wallet is the only writer of `wallet_entries` and the balance cache. Each user has a row lock on `wallets` for the duration of a mutation. Game input paths never take that lock. Holds happen before `live`.

A mutation is one database transaction: insert ledger rows, update cache, insert `outbox`. The outbox publisher emits the domain event. If the process dies after commit and before publish, the publisher retries. Consumers are idempotent.

Accounts: `available`, `bonus`, `escrow`, `pending_withdrawal`, plus a platform `rake` account (a system user). Spend order and rake: `ECONOMY_SPEC.md`.

Payments service talks to Stripe and calls Wallet with the Stripe event id as the idempotency key. It does not update balances itself.

## Rating

Ranking consumes `MATCH_FINISHED` and writes `ratings` and `rank_snapshots` in one transaction, then emits `RATING_UPDATED` and, when the visible division changes, `LEAGUE_PROMOTED` or `LEAGUE_DEMOTED`.

It ignores bot matches for ranked, ignores `void` and `cancelled`, and no-ops if `match_id + user_id + queue` was already applied (`rating_applications` unique key).

Decay and season reset are workers, not request paths.

## Tournament

Tournament service owns registration, check-in, seeds, and nodes. It creates matches by calling Matchmaking/Game with `source = tournament` so those matches skip the public queue and still use Game Service. It advances nodes only from `MATCH_FINISHED`. It calls Wallet for check-in holds and final prize payouts.

## Notification

Consumes domain events, applies preferences, writes an inbox row, and enqueues push/email. Delivery is at-least-once. Inbox insert is idempotent on `(user_id, event_id)`.

## Analytics

A separate consumer group on the bus. Events land in a warehouse. Analytics never writes wallet, rating, or match rows. Loss of the warehouse must not block matches.

## Moderation

Cases, sanctions, appeals, trust score. A sanction is a row that Auth, Matchmaking, and Chat read. Moderation does not delete matches. It can request Admin to void a match.

Trust score is derived from completed games, report rate, dodge rate, account age, and shared-device signals. It gates paid entry and prize tournaments. It is rebuildable.

## Admin

Staff tools call the same services as the product, with `actor_id` on every mutation and an `audit_logs` row. There is no admin SQL console in the product. Economy adjustments above 1,000 tokens require a second admin approver.

## Storage

Postgres is the transactional store. One primary region for identity, social, wallet, and tournament metadata. Regional read replicas for profile and history reads. Live match state is not queried from Postgres by players.

Migrations are expand-then-contract. No destructive change ships in the same release as the code that stops reading the old shape.

## Media

Object storage buckets: `avatars`, `replays`, `venue-assets`. The API returns signed URLs that expire in 10 minutes. Clients cannot list buckets. Replay objects are written by Game Service at match end from `match_events`.

## Background workers

| Worker | Trigger | Duty |
| --- | --- | --- |
| Outbox publisher | 100 ms poll and notify | Publish committed events |
| Matchmaking | Continuous per pool | Propose and expire |
| Ready timeout | Delayed message | Fail the proposal |
| Reconnect timeout | Delayed message | Forfeit or void |
| Rating applier | `MATCH_FINISHED` | Glicko-2 |
| Reward applier | `MATCH_FINISHED`, claims | Quests, streaks, club points |
| Payout | `MATCH_FINISHED`, tournament complete | Release escrow |
| Season closer | Cron | Snapshot, rewards, reset |
| Decay | Daily 00:10 UTC | Top-league decay |
| Notification sender | Queue | Push and email |
| Cleanup | Hourly | Expired tickets, closed lobbies, stale locks |
| Trust recompute | Hourly | Rebuild scores from facts |
| Leaderboard projector | 5 seconds | Redis sorted sets from snapshots |
| Replay archiver | `MATCH_FINISHED` | Write blob |

Workers checkpoint by event id. A crash restarts at the last acked id. Side effects that must not duplicate are guarded by unique keys in Postgres.

## Cron jobs

| Job | Schedule | Region |
| --- | --- | --- |
| Season boundary check | Every minute | Primary |
| Decay | Daily 00:10 UTC | Primary |
| Quest rotation | Daily 00:00 in each region local, stored as UTC | Primary |
| Dodge counter decay | Hourly | Each region |
| Presence last_seen rollup | Every 15 minutes | Each region |
| Ledger balance reconciliation | Hourly | Primary |
| Audit export | Daily | Primary |

Reconciliation compares `wallets` cache to `sum(wallet_entries)` and pages on-call if they differ. It does not auto-rewrite the cache.

## Caching

| Key | TTL | Invalidation |
| --- | --- | --- |
| Profile by username | 60 s | `PROFILE_UPDATED` |
| Catalog | 5 min | Deploy or `GAME_UPDATED` |
| Leaderboard page | 5 s | Projector overwrite |
| Season standings | 30 s | Rating write |
| Public tournament | 5 s | Tournament event |

Wallet balances are not cached outside the `wallets` row. Rank for matchmaking is read from Redis, updated on `RATING_UPDATED`, and repaired from Postgres on miss.

## Message bus

Subject hierarchy: `cu.{region}.{aggregate}.{event}`. Global subjects: `cu.global.user.*`, `cu.global.wallet.*`, `cu.global.social.*`.

At-least-once delivery. Ordering is guaranteed per `aggregate_id` (match id, user id, tournament id). Consumers use a durable queue per service.

Payload envelope:

```
{
  "event_id": "uuidv7",
  "type": "MATCH_FINISHED",
  "occurred_at": "timestamp",
  "producer": "game",
  "aggregate_id": "uuid",
  "region": "us-east",
  "payload": {}
}
```

`event_id` is the idempotency key for every consumer.

## Regional deployment

Launch regions: `us-east`, `us-west`, `eu-west`.

Each region runs: edge, gateways, matchmaking, game, presence Redis, regional bus, replay writes.

Primary region runs: Postgres primary, wallet, payments, ranking, tournament metadata, moderation, admin.

A user has a home region for writes of their profile and wallet. They may queue in another region; the match runs there; the result event is consumed in the primary for wallet and rating.

Do not merge queues across regions unless both pools are `thin` and estimated RTT is under 80 ms. Never merge across the ocean.

## Scaling strategy

- Gateways and HTTP services scale on CPU and connection count. Target 20k websocket connections per realtime node, then shard.
- Matchmaking shards by pool key. One leader per pool via a lock. Pools are small.
- Game rooms: about 500 live matches per node as a starting budget, autoscale on room count. No shared in-process lock with Wallet.
- Postgres: connection pooler in front. Wallet is the hot row-lock path and is isolated from match inputs. Partition `match_events` and `messages` by month. Partition `wallet_entries` by month once volume requires it. Archive completed `match_events` to object storage after the replay blob exists, keep an index row.
- Leaderboards and presence never scan Postgres on the request path.
- 100k concurrent is mostly idle sockets plus a few thousand live matches. Size the socket tier and Redis first, not the match database.

## Failure handling

| Failure | Behavior |
| --- | --- |
| Wallet timeout before live | Proposal cancelled, no match, players requeued |
| Wallet success, Game never starts within 10s | Void, refund, alert |
| Game node crash | Lock takeover from snapshot, else void and refund |
| Bus unavailable | Outbox retains events, producers keep serving if the user path does not need the event |
| Primary Postgres down | Queues and live matches continue from Redis; new holds fail closed; in-flight matches void at reconnect expiry if the result cannot commit |
| Redis down in a region | That region refuses new queues and fails health checks. Other regions stay up |
| Double delivery | Consumer unique key no-ops the second |
| Clock skew | Server clocks only. Client timestamps are ignored for rules |

Fail closed on money and rating. Fail open only on presence, typing, and analytics.

## Recovery

- A void always writes `end_reason = void`, refund ledger rows, and a reversal rating row if a rating application exists.
- Season close is resumable: each step records `season_jobs (season_id, step, status)`.
- RPO for Postgres: 5 minutes via continuous backup. RTO target: 60 minutes for the primary. Regional gameplay can stay down independently.
- There is no manual "edit the winner" without `POST /admin/matches/{id}/void` or a dispute resolution, both audited.

## What this replaces

Browser access to `matches`, `transactions`, `matchmaking_queue`, and tournament updates. Those writes move to services before any new feature is added on top of them.
