# API Specification

Base path `/v1`. JSON. Auth header `Authorization: Bearer <access_token>` unless the endpoint says public. Mutations that create or move value require `Idempotency-Key`. Unknown fields are rejected. Timestamps are UTC.

## Shared response and errors

Success lists: `{ "data": [], "next_cursor": null }`.

Success entity: `{ "data": {} }`.

Error:

```
{ "error": { "code": "insufficient_tokens", "message": "human readable", "details": {} } }
```

| HTTP | Code | When |
| --- | --- | --- |
| 400 | `invalid_body` | Schema failure |
| 401 | `unauthenticated` | Missing or bad token |
| 403 | `forbidden` | Authenticated but not allowed |
| 403 | `email_unverified` | Ranked, paid, or host action |
| 403 | `sanctioned` | Active sanction blocks the action. `details.sanction` |
| 404 | `not_found` | Missing or hidden by privacy |
| 409 | `conflict` | Stale state, duplicate friend, already in queue |
| 409 | `idempotency_conflict` | Same key, different body |
| 422 | `rule_violation` | Legal shape, illegal game action |
| 429 | `rate_limited` | `details.retry_after_ms` |

A replayed idempotency key with the same body returns the original status and body.

Permission names refer to `PERMISSION_MODEL.md`.

## Authentication

### POST /auth/signup
Public. Body `{ email, password, username, region }`. Response `201 { data: { user_id, status: "provisional" } }`. Errors: `invalid_body`, `conflict` username or email, `rate_limited`. Creates `USER_CREATED`.

### POST /auth/login
Public. Body `{ email, password }`. Response `{ data: { access_token, refresh_token, expires_in } }`. Errors: `unauthenticated`, `forbidden` if banned.

### POST /auth/refresh
Public. Body `{ refresh_token }`. Response same as login. Rotates refresh. Errors: `unauthenticated`.

### POST /auth/logout
Auth. Body `{ refresh_token }`. Response `204`. Revokes the family.

### POST /auth/verify-email
Public. Body `{ token }`. Response `{ data: { email_verified: true } }`. Errors: `invalid_body`.

### GET /auth/sessions
Auth, self. Response list of `{ id, device, created_at, last_seen_at }`.

### DELETE /auth/sessions/{id}
Auth, self. Response `204`. Errors: `not_found`.

### POST /auth/oauth/{provider}
Public. Body `{ code, redirect_uri, username?, region? }`. Response tokens, or `409 conflict` if a new account needs a username (`details.needs_username`).

## Users and profiles

### GET /me
Auth. Response user, profile, wallet summary, sanctions, roles. Self only.

### PATCH /me
Auth, self. Body `{ display_name?, bio?, privacy?, title_id?, region?, settings? }`. Response profile. Errors: `forbidden` if title not owned. Emits `PROFILE_UPDATED`.

### POST /me/username
Auth, self. Body `{ username }`. Response profile. Errors: `conflict`, `rule_violation` if changed within 30 days.

### GET /players/{username}
Public for `privacy=public`. Auth required to apply friends/private rules. Response public profile, ranks, level. Errors: `not_found` when private and not a friend (do not reveal that the user exists beyond 404).

### GET /players/{id}/matches
Same visibility as the profile. Query `cursor`, `game`. Response match summaries.

### GET /players/{id}/ranks
Same visibility. Response per-game snapshots.

## Friends and blocks

### GET /friends
Auth. Query `status=pending|accepted`. Response edges where the caller is a member.

### POST /friends/requests
Auth, `friend.request`. Body `{ username }`. Response friendship. Errors: `not_found`, `conflict`, `forbidden` if blocked either way, `rate_limited`.

### POST /friends/requests/{userId}/accept
Auth. Caller must be the recipient. Response friendship `accepted`. Errors: `forbidden`, `conflict`.

### POST /friends/requests/{userId}/decline
Auth, recipient. Response `204`.

### DELETE /friends/{userId}
Auth, either friend. Response `204`. Does not remove blocks.

### GET /blocks
Auth, self.

### POST /blocks
Auth. Body `{ user_id }`. Response `201`. Also deletes a friendship if one exists.

### DELETE /blocks/{userId}
Auth, blocker only. Response `204`.

### GET /recents
Auth, self. Response last 20 opponents.

## Presence

Presence is not edited over a general REST write.

### GET /presence?user_ids=
Auth. At most 50 ids. Caller receives status only for self, friends, and club mates. Others return `offline`. Response `{ data: [{ user_id, status }] }`.

### POST /presence/heartbeat
Auth. Used if the socket is down. Body `{ status }`. Response `{ data: { ok: true } }`. Cannot set another user's presence.

## Queue and matchmaking

### POST /queue
Auth, `queue.join`. Body `{ game, mode: "casual"|"ranked"|"placement", stake, party_id? }`. Response `{ data: { ticket_id, pool_key, estimated_wait_ms } }`. Errors: `email_unverified` for ranked, `sanctioned`, `conflict` already queued, `rule_violation` bad stake or party spread, `insufficient_tokens` is not returned here because hold happens at ready.

### DELETE /queue
Auth. Response `204`. Errors: `conflict` if a ready check is in the last 5 seconds (counts as a dodge attempt; still leaves, service records it).

### GET /queue
Auth. Response the caller's ticket or `{ data: null }`, plus `{ health }`.

### POST /proposals/{id}/ready
Auth, proposed player. Body empty. Response `{ data: { state } }`. Errors: `conflict` expired, `insufficient_tokens` if hold fails.

### POST /proposals/{id}/decline
Auth, proposed player. Response `204`.

## Matches and games

### GET /games
Public. Response active catalog.

### GET /games/{slug}
Public. Response rules summary and stake ladder. Not the server seed.

### POST /matches
Auth, `match.private_create`. Body `{ game, stake, visibility: "invite"|"friends"|"club", club_id? }`. Response lobby. Errors: `insufficient_tokens` when stake is held at ready, not at create. Stake 0 is free.

### POST /matches/{id}/invites
Auth, host. Body `{ user_id }`. Response `201`.

### POST /matches/{id}/join
Auth, invited or visibility allows. Response lobby.

### POST /matches/{id}/ready
Auth, lobby member. Response lobby. Hold runs when every human is ready.

### POST /matches/{id}/leave
Auth, member, only in `lobby`. Response `204`.

### GET /matches/{id}
Auth: players always; others if spectate is allowed or match is tournament-public. Response state summary, not the full input log. Errors: `not_found`.

### POST /matches/{id}/inputs
Auth, seated player, match `live`. Body `{ seq, payload }`. Response `{ data: { accepted_seq, state_version } }`. Errors: `rule_violation`, `conflict` duplicate seq with different payload.

### POST /matches/{id}/reconnect
Auth, seated player. Response latest snapshot. Errors: `conflict` if budget elapsed.

### POST /matches/{id}/forfeit
Auth, seated player. Response match summary.

### POST /matches/{id}/rematch
Auth, just-finished participant. Response `{ data: { status: "offered"|"started"|"expired" } }`.

### POST /matches/{id}/spectate
Auth. Response `{ data: { channel, delay_seconds: 15 } }`. Errors: `forbidden`.

There is no endpoint to submit a winner.

## Wallet and transactions

### GET /wallet
Auth, self. Response `{ available, bonus, escrow, pending_withdrawal }`.

### GET /wallet/entries
Auth, self. Query `cursor`. Response ledger rows.

### POST /wallet/daily-claim
Auth. Body empty. Response entry or `conflict` already claimed.

### POST /payments/checkout
Auth, `wallet.purchase`, email verified. Body `{ sku }`. Response `{ data: { checkout_url } }`. Errors: `rule_violation` if purchases disabled by flag.

### POST /payments/webhook
Stripe signature, not a user token. Body is the provider event. Response `200`. Idempotent on `provider_ref`. Errors: `401` bad signature.

### POST /wallet/withdrawals
Auth. Response `403` code `not_enabled`. The route exists so clients do not invent one. No body is processed.

## Leaderboard and ranking

### GET /leaderboards/{game}
Public. Query `region`, `season=current|{id}`, `cursor`. Response ranked rows: username, league, division, rating display (not RD).

### GET /seasons/current
Public. Query `game`, `region`. Response season window and status.

### GET /me/ranks
Auth. Response hidden fields only for self: rating, rd, placement progress. Public league fields match the leaderboard.

## Tournaments

### POST /tournaments
Auth, `tournament.create`, email verified, trust score at least 40. Body `{ game, region, name, format, capacity, entry_fee, starts_at, prize_template, visibility }`. Response tournament `draft`.

### GET /tournaments
Public. Query `status`, `game`, `region`, `cursor`. Unlisted omitted.

### GET /tournaments/{id}
Public if public. Unlisted: host, staff, entrants.

### PATCH /tournaments/{id}
Auth, host or tournament admin, only in `draft` or `registration`. Body is the same fields as create. Errors: `conflict` if live.

### POST /tournaments/{id}/publish
Auth, host. Moves `draft → registration`.

### POST /tournaments/{id}/register
Auth, `tournament.register`. Response entry `registered`. Errors: `conflict` full or closed, `email_unverified` if fee > 0.

### POST /tournaments/{id}/withdraw
Auth, entrant, before `live`. Response `204`.

### POST /tournaments/{id}/check-in
Auth, entrant, during `check_in`. Response entry. Errors: `insufficient_tokens`, `conflict`.

### POST /tournaments/{id}/seed
Auth, host, status `seeding`. Body `{ seeds: [{ user_id, seed }] }` optional override. Response bracket preview.

### POST /tournaments/{id}/start
Auth, host, status `seeding`. Response tournament `live`.

### GET /tournaments/{id}/bracket
Same visibility as the tournament.

### POST /tournaments/{id}/staff
Auth, host. Body `{ user_id, role }`. Cannot grant platform admin.

### POST /tournaments/{id}/disputes
Auth, match participant. Body `{ match_id, reason }`. Response dispute. Errors: `conflict` if one is open.

### POST /disputes/{id}/resolve
Auth, referee of that tournament or Moderator. Body `{ outcome: "upheld"|"reversed"|"voided", note }`. Response dispute.

### POST /tournaments/{id}/cancel
Auth, host, not `completed`. Response tournament. Voids unfinished matches.

## Venues

### POST /venues
Auth, email verified. Body `{ name, slug, city, region }`. Response `pending_review`.

### GET /venues/{slug}
Public if `active`.

### PATCH /venues/{id}
Auth, venue owner. Body `{ name, city }`. Errors: `forbidden`.

### POST /venues/{id}/staff
Auth, venue owner. Body `{ user_id, role: "host"|"staff" }`.

### POST /venues/{id}/events
Auth, venue host or owner. Body `{ starts_at, question_set_id }`. Response event.

### POST /venue-events/{id}/codes
Auth, host. Response `{ data: { code, expires_at } }` once. Stored as a hash.

### POST /venue-events/{id}/check-in
Auth. Body `{ code }`. Response check-in. Errors: `rule_violation` bad code, `conflict` already checked in.

### GET /venues/{id}/standings
Public if venue is active. Query `season`.

### GET /venues/{id}/dashboard
Auth, venue staff. Response upcoming events, check-in counts. No global wallet data.

## Chat and voice

### GET /conversations
Auth. Response conversations the caller belongs to.

### POST /conversations
Auth. Body `{ kind: "dm", user_id }`. Response conversation. Errors: `forbidden` if blocked.

### GET /conversations/{id}/messages
Auth, member. Query `before_seq`. Response messages.

### POST /conversations/{id}/messages
Auth, member, not muted. Body `{ body, client_id }`. `client_id` dedupes. Response message. Errors: `sanctioned`, `forbidden`.

### POST /conversations/{id}/read
Auth, member. Body `{ seq }`. Response `204`.

### POST /conversations/{id}/messages/{seq}/reactions
Auth, member. Body `{ emoji }`. Response `201`.

### DELETE /conversations/{id}/messages/{seq}
Auth, sender or Moderator. Response `204`. Soft delete.

### POST /voice/rooms
Auth, member of the party, match, or club. Body `{ kind, target_id }`. Response `{ data: { token, url, expires_in } }`. Errors: `forbidden`.

## Notifications, quests, replays

### GET /notifications
Auth, self. Query `cursor`.

### POST /notifications/{id}/read
Auth, owner. Response `204`.

### POST /notifications/read-all
Auth, self. Response `204`.

### GET /quests
Auth. Response current period progress.

### POST /quests/{id}/claim
Auth. Response wallet entry id. Errors: `conflict`, `rule_violation` incomplete.

### GET /achievements
Auth optional. Query `user` defaults to self. Public achievements only on other users.

### GET /replays/{matchId}
Auth, visibility check. Response signed URL. Errors: `forbidden`, `not_found`.

### POST /replays/{matchId}/share
Auth, participant. Response `{ share_token }`.

### GET /replays/share/{token}
Public. Response signed URL if visibility is `link` or `public`.

## Admin and moderation

All admin routes require a staff role. Every call writes `audit_logs`.

### POST /reports
Auth. Body `{ target_user_id, match_id?, reason }`. Response report. Errors: `rate_limited`.

### GET /moderation/reports
Moderator. Query `status`, `cursor`.

### POST /moderation/reports/{id}/cases
Moderator. Response case.

### POST /moderation/cases/{id}/sanctions
Moderator. Body `{ user_id, type, expires_at, note }`. `permanent` requires Admin. Response sanction.

### POST /moderation/sanctions/{id}/revoke
Admin. Body `{ note }`. Response sanction.

### POST /appeals
Auth, sanctioned user. Body `{ sanction_id, body }`.

### POST /appeals/{id}/resolve
Admin. Body `{ outcome: "accepted"|"denied", note }`.

### GET /admin/users/{id}
Moderator. Full profile, wallet summary, sanctions, recent matches.

### POST /admin/users/{id}/notes
Moderator. Body `{ note }`. Stored in audit log only.

### POST /admin/wallet-adjustments
`economy_admin`. Body `{ user_id, account, amount, note, approver_id? }`. If abs(amount) > 1000, `approver_id` must be a different economy admin. Response operation. Errors: `forbidden`.

### POST /admin/matches/{id}/void
Admin. Body `{ note }`. Response match. Refunds and reverses rating.

### POST /admin/venues/{id}/review
Admin. Body `{ decision: "active"|"suspended" }`.

### POST /admin/seasons/{id}/close
Super Admin. Manual close if cron failed. Resumes `season_jobs`.

## Websocket

Connect `wss://realtime.{region}.chanceus.com/v1` with the access token.

Client messages: `presence.heartbeat`, `queue.heartbeat`, `chat.typing` `{ conversation_id }`, `match.input` `{ match_id, seq, payload }`.

Server messages: `queue.health`, `queue.proposal`, `match.ready`, `match.countdown`, `match.state`, `match.ended`, `presence.update`, `friend.presence`, `chat.message`, `chat.typing`, `party.updated`, `tournament.updated`, `notification.created`, `rank.updated`, `wallet.updated`.

Each server message includes `event_id`. The client dedupes on it.
