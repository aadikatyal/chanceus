# Event System

Domain events are the only way services learn about another service's commits. The producer writes the event to `outbox` in the same database transaction as the state change, then the publisher sends the envelope in `SYSTEM_ARCHITECTURE.md`.

## Global rules

- **Delivery:** at-least-once. Order is guaranteed per `aggregate_id` only.
- **Idempotency:** every consumer stores `event_id` in its own `consumer_inbox (consumer, event_id)` primary key before side effects, or uses a natural unique key (`rating_applications`, `wallet_operations`, `notifications`). A duplicate is an ack.
- **Retry:** consumer nack with backoff 1s, 5s, 30s, 2m, 10m, then a dead-letter subject `cu.dlq.{consumer}`. 10 attempts. Alerts on dead-letter depth.
- **Failure behavior:** a consumer crash never rolls back the producer. Money and rating consumers fail closed (no partial apply; the transaction includes the inbox row). Notification and analytics may lag.
- **Payload limits:** under 32 KB. Large state stays in Postgres; the event carries ids.
- **PII:** no passwords, no payment PAN, no raw QR secrets. Email is not on the bus.

Producers below are service names. "Required" consumers must ack for the match to leave `finalizing`. Others are asynchronous.

## Identity and profile

### USER_CREATED
Producer: Authentication. Aggregate: user id.
Payload: `{ user_id, region, created_at }`.
Consumers: Profiles (create row), Wallet (empty wallet), Account (level 1), Notification (verify email), Analytics.
Retry: standard. Failure: signup HTTP already committed; consumers must catch up. Wallet creation is required before the first claim; the claim endpoint repairs a missing wallet once.

### PROFILE_UPDATED
Producer: Profiles. Payload: `{ user_id, fields[] }`.
Consumers: Search index, cache bust, Analytics.
Failure: stale search is acceptable for minutes.

## Queue and match

### QUEUE_JOINED
Producer: Matchmaking. Aggregate: ticket id.
Payload: `{ ticket_id, user_id, party_id, pool_key, enqueued_at }`.
Consumers: Presence (`queue`), Analytics.
Not required for the match. Failure: presence may show online until the next heartbeat. Matcher state is Redis, not this event.

### QUEUE_LEFT
Producer: Matchmaking. Payload: `{ ticket_id, user_id, reason: "cancel"|"matched"|"expired"|"dodge" }`.
Consumers: Presence, Moderation (dodge counter if reason is dodge), Analytics.

### MATCH_FOUND
Alias of the proposal, emitted when two tickets are paired. Producer: Matchmaking.
Payload: `{ proposal_id, match_preview_id, pool_key, players: [{ user_id, slot }], ready_deadline }`.
Consumers: Notification (match found), Realtime (`queue.proposal`).
Failure: players can still `GET /queue`. Retry until deadline, then stop. Do not create a match row yet.

### READY_CONFIRMED
Producer: Matchmaking. Payload: `{ proposal_id, user_id, all_ready: bool }`.
Consumers: Realtime.
When `all_ready`, Matchmaking calls Wallet synchronously. The event itself does not move tokens.

### MATCH_CREATED
Producer: Game, after Wallet hold returns. Aggregate: match id.
Payload: `{ match_id, game_id, rules_version, region, mode, stake, player_ids[], seed_id }`. The seed value is not on the bus. It is in the match row.
Consumers: Realtime, Tournament (if source set), Analytics.
Required before countdown. If publish fails, outbox retries. The room already exists.

### TOKENS_ESCROWED
Producer: Wallet. Aggregate: wallet operation id.
Payload: `{ operation_id, match_id|tournament_id, holds: [{ user_id, from_account, amount }] }`.
Consumers: Game (may start countdown only after this if it did not already get the sync response), Audit, Analytics.
Idempotency: `operation_id`. Failure: Game's synchronous hold response is the authority to start. This event is the audit copy. If the sync call succeeded and the event lags, the match still proceeds.

### MATCH_STARTED
Producer: Game. Payload: `{ match_id, started_at }`.
Consumers: Presence (`match`), Realtime (`match.countdown` then state), Analytics.

### PLAYER_DISCONNECTED
Producer: Realtime gateway via Game. Payload: `{ match_id, user_id, deadline }`.
Consumers: Game (start reconnect timer), Realtime (opponent banner).
Failure: Game also runs its own heartbeat. The timer starts from the first signal, not twice. Idempotency key `(match_id, user_id, deadline)`.

### PLAYER_RECONNECTED
Producer: Game. Payload: `{ match_id, user_id }`.
Consumers: Realtime. Cancels the forfeit timer. Idempotent.

### MATCH_FINISHED
Producer: Game, exactly once, in the transaction that writes `match_results` and sets `finalizing`.
Payload: `{ match_id, end_reason, results: [{ user_id|bot_id, slot, result }], duration_ms, mode, game_id, region, source_id }`.
Required consumers: Wallet (payout or refund), Ranking, Tournament if `source_id` is a tournament, Venue if mode is venue.
Async consumers: Quests, Clubs, XP, Achievements, Notification, Replay archiver, Analytics, Leaderboard projector.
Failure: match stays `finalizing` until required consumers ack by writing their application rows. A reconciler scans `finalizing` older than 1 minute and re-emits the same `event_id`.

### MATCH_CANCELLED
Producer: Matchmaking or Game. Payload: `{ match_id, reason }`.
Consumers: Wallet (release hold if any), Realtime, Analytics.
No rating consumer. Idempotent release: Wallet no-ops if no hold.

### TOKENS_RELEASED
Producer: Wallet. Payload: `{ operation_id, reference_type, reference_id, entries: [{ user_id, account, amount, type }] }`.
Consumers: Realtime (`wallet.updated`), Notification if the amount is a prize, Audit, Analytics.
Covers payout, refund, rake, and reward. Idempotency: `operation_id`.

## Rating and progression

### RATING_UPDATED
Producer: Ranking. Payload: `{ user_id, game_id, queue, match_id, rating_before, rating_after, league, division }`.
Consumers: Realtime (`rank.updated`), Leaderboard projector, Search, Analytics.
Idempotency: `(match_id, user_id, queue)`.

### LEAGUE_PROMOTED
Producer: Ranking, only when visible division or league increases.
Payload: `{ user_id, game_id, from, to, match_id }`.
Consumers: Notification, Achievements, Analytics.
A demotion emits **LEAGUE_DEMOTED** with the same shape. Consumers must not grant rewards on demotion.

### ACHIEVEMENT_UNLOCKED
Producer: Progression worker. Payload: `{ user_id, achievement_id, match_id }`.
Consumers: Wallet if `reward_tokens > 0` (bonus grant, idempotency `ach:{user}:{achievement}`), Notification, Analytics.
Failure: retry. The unique `user_achievements` key prevents double unlock.

### XP_GRANTED
Producer: Progression. Payload: `{ user_id, match_id, amount, level, prestige }`.
Consumers: Realtime, Analytics. Idempotency `(match_id, user_id)`.

## Tournament

### TOURNAMENT_PUBLISHED
Producer: Tournament. Payload: `{ tournament_id, starts_at, region }`.
Consumers: Search, Notification (followers later), Analytics.

### TOURNAMENT_CHECKED_IN
Producer: Tournament. Payload: `{ tournament_id, user_id }`.
Consumers: Realtime. Hold is a separate `TOKENS_ESCROWED`.

### TOURNAMENT_STARTED
Producer: Tournament. Payload: `{ tournament_id, node_count }`.
Consumers: Realtime, Notification (entrants), Analytics.
Failure: retry. Start is already committed. Notification lag is acceptable. Bracket reads come from Postgres.

### TOURNAMENT_MATCH_ADVANCED
Producer: Tournament after consuming `MATCH_FINISHED`. Payload: `{ tournament_id, node_id, winner_id, next_match_id }`.
Consumers: Realtime (`tournament.updated`), Notification (next opponent).
Idempotency: `(match_id)` in `bracket_advance_applied`.

### TOURNAMENT_COMPLETED
Producer: Tournament. Payload: `{ tournament_id, placements: [{ user_id, place }] }`.
Consumers: Wallet (prize payout), Notification, Analytics.
Wallet idempotency: `tprize:{tournament_id}:{user_id}`.

## Social and chat

### FRIEND_REQUESTED
Producer: Social. Payload: `{ actor_id, recipient_id }`.
Consumers: Notification.

### FRIEND_ACCEPTED
Producer: Social. Payload: `{ user_a, user_b }`.
Consumers: Notification, Analytics.

### FRIEND_ONLINE
Producer: Presence, on transition to `online` from `offline`, at most once per 5 minutes per friend fan-out.
Payload: `{ user_id, status }`.
Consumers: Notification (respects prefs), Realtime (`friend.presence`).
Failure: drop after 3 retries. Presence is ephemeral. Do not dead-letter storms. If Redis presence is lost, do not emit a mass offline event; let TTL expire quietly and emit on the next heartbeat only.

### MESSAGE_SENT
Producer: Chat, after the message row commits. Payload: `{ conversation_id, seq, sender_id, kind }` and not the body if the conversation is a DM. Body is fetched by the gateway from Postgres for members. For match and club chat the payload may include `body` because those members are already authorized on the channel.
Consumers: Realtime, Notification (DM only, if recipient offline), Moderation keyword worker, Analytics.
Idempotency: `(conversation_id, seq)`.

### VOICE_JOINED
Producer: Voice token issuer. Payload: `{ room_id, user_id, kind, target_id }`.
Consumers: Realtime, Analytics. Failure: drop. Voice presence is not durable.

## Venue and moderation

### VENUE_CHECKIN
Producer: Venue. Payload: `{ event_id, venue_id, user_id }`.
Consumers: Realtime (host dashboard), Analytics.
Idempotency: primary key `(event_id, user_id)`.

### VENUE_EVENT_STARTED
Producer: Venue. Payload: `{ event_id, venue_id }`.
Consumers: Game (create venue sessions), Notification (checked-in users).

### REPORT_FILED
Producer: Moderation. Payload: `{ report_id, target_user_id, match_id }`.
Consumers: Trust recompute queue, Admin inbox. No automatic ban.

### SANCTION_APPLIED
Producer: Moderation. Payload: `{ sanction_id, user_id, type, expires_at }`.
Consumers: Auth (revoke sessions if permanent or game ban), Matchmaking (drop ticket), Chat, Notification.
Failure: retry until applied. Matchmaking treats a missing sanction read as "ask Moderation" on the next queue join, so a missed event does not leave a banned user queued after the next action.

### MATCH_VOIDED
Producer: Admin or dispute resolver, through Game. Payload: same as `MATCH_CANCELLED` plus `{ actor_id, note_present: true }`.
Consumers: Wallet reversal, Ranking reversal, Tournament, Audit.
Idempotency: one void per match. A second void no-ops.

## Season

### SEASON_CLOSING
Producer: Season worker. Payload: `{ season_id }`.
Consumers: Matchmaking (reject new ranked tickets for that game and region).

### SEASON_ARCHIVED
Producer: Season worker. Payload: `{ season_id, reset_applied: true }`.
Consumers: Wallet (reward grants, idempotency `season:{season_id}:{user_id}`), Notification, Leaderboard (swap key), Analytics.
Failure: `season_jobs` remains incomplete and cron retries the step. Rewards are not sent twice.

## Consumer matrix

| Event | Must succeed for correctness | Can lag or drop |
| --- | --- | --- |
| MATCH_FINISHED | Wallet, Ranking, Tournament or Venue | Notification, Analytics |
| TOKENS_ESCROWED | None beyond the sync hold | Audit |
| RATING_UPDATED | None | Leaderboard, realtime |
| SANCTION_APPLIED | Auth revoke, Matchmaking drop | Notification |
| FRIEND_ONLINE | None | All |
| USER_CREATED | Wallet, Profile | Analytics |
