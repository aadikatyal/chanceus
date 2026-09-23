# Database Schema

Greenfield logical schema. Physical database is Postgres. Live presence, tickets, and match snapshots are Redis and are specified as such. UUIDv7 primary keys unless noted. Timestamps are `timestamptz`. Money is `bigint` token units. Rating is `numeric(8,2)`.

Conventions:

- `created_at` on every table. `updated_at` on mutable tables, maintained by the service, not by the client.
- Soft delete is `deleted_at timestamptz null`. Absent means hard-delete is forbidden for that table. Lookup queries exclude `deleted_at` unless the caller is Admin.
- No client role has `INSERT` or `UPDATE` on these tables. Services use a writer role per service, grants limited to the tables they own.
- Every foreign key is `ON DELETE RESTRICT` except where noted. Users are not hard-deleted.

## Identity

**users**
`id` PK, `email` citext unique, `email_verified_at`, `status` text check in (`provisional`,`active`,`limited`,`banned`), `home_region` text not null, `deleted_at`, `created_at`, `updated_at`.

**profiles**
`user_id` PK FK users, `username` citext unique, `display_name`, `avatar_url`, `bio`, `privacy` check (`public`,`friends`,`private`), `title_id` FK titles null, `featured_badge_id` null, `deleted_at`, `updated_at`.
Check username `^[a-z0-9_]{3,20}$`.

**user_settings**
`user_id` PK FK users, `allow_friend_requests` bool default true, `allow_spectate` bool default true, `show_online` bool default true, `notification_prefs` jsonb not null default `{}`.

**devices**
`id` PK, `user_id` FK, `platform`, `last_seen_at`, `revoked_at`. Unique `(user_id, id)`.

**sessions**
`id` PK, `user_id` FK, `device_id` FK, `refresh_hash` unique, `expires_at`, `revoked_at`, `created_at`.

**roles**
`user_id` FK, `role` check (`player`,`premium`,`moderator`,`admin`,`economy_admin`,`super_admin`), `granted_by` FK users, `created_at`.
PK `(user_id, role)`.

## Catalog and matches

**games**
`id` PK, `slug` unique, `name`, `rules_version` int not null, `status` check (`draft`,`active`,`deprecated`,`retired`), `afk_seconds` int, `supports_draw` bool, `updated_at`.

**matches**
`id` PK, `game_id` FK, `rules_version` int not null, `region` text not null, `mode` check (`casual`,`ranked`,`private`,`placement`,`tournament`,`venue`,`tutorial`), `stake` bigint not null default 0, `status` check (`lobby`,`proposed`,`escrow_held`,`countdown`,`live`,`finalizing`,`completed`,`cancelled`,`void`), `seed` text not null, `source_id` uuid null (tournament or venue event), `end_reason` check (`normal`,`forfeit`,`abandon`,`dodge`,`void`,`cancel`) null, `started_at`, `ended_at`, `created_at`.
Index `(region, status)`, `(game_id, created_at desc)`, `(source_id)`.

**match_players**
`match_id` FK, `slot` smallint, `user_id` FK null, `bot_id` text null, `party_id` uuid null, `result` check (`win`,`loss`,`draw`) null.
PK `(match_id, slot)`. Check exactly one of `user_id`, `bot_id`. Unique `(match_id, user_id)` where user_id is not null.
Index `(user_id, match_id)`.

**match_events** (append-only, partitioned monthly on `created_at`)
`match_id`, `seq` bigint, `actor_id` uuid null, `type` text, `payload` jsonb, `created_at`.
PK `(match_id, seq)`. No updates. No deletes except partition drop after archive.

**match_results** (one row, written once)
`match_id` PK FK, `winner_slot` smallint null, `end_reason` text not null, `facts` jsonb, `created_at`.

**replays**
`match_id` PK FK, `storage_key` text not null, `share_token` text unique null, `visibility` check (`participants`,`link`,`public`), `created_at`.

**spectators**
`match_id` FK, `user_id` FK, `joined_at`, `left_at`.
PK `(match_id, user_id)`.

## Rating

**ratings**
`user_id` FK, `game_id` FK, `queue` check (`casual`,`ranked`), `rating` numeric not null, `rd` numeric not null, `volatility` numeric not null, `games` int not null default 0, `wins` int not null default 0, `peak_rating` numeric not null, `updated_at`.
PK `(user_id, game_id, queue)`.
Index `(game_id, queue, rating desc)`.

**rating_applications** (idempotency)
`match_id`, `user_id`, `queue`, `rating_before`, `rating_after`, `created_at`.
PK `(match_id, user_id, queue)`.

**seasons**
`id` PK, `game_id` FK, `region` text, `starts_at`, `ends_at`, `status` check (`scheduled`,`active`,`closing`,`archived`).
Unique `(game_id, region, starts_at)`.

**rank_snapshots**
`user_id`, `game_id`, `season_id` FK, `league` text, `division` text, `progress` int, `peak_league` text, `updated_at`.
PK `(user_id, game_id, season_id)`.

**season_results**
`season_id` FK, `user_id` FK, `game_id` FK, `final_league`, `reward_entry_id` uuid null, `created_at`.
PK `(season_id, user_id, game_id)`.

**placement_progress**
`user_id`, `game_id`, `season_id`, `games_played` int, `completed_at` null.
PK `(user_id, game_id, season_id)`.

**season_jobs**
`season_id` FK, `step` text, `status` check (`pending`,`done`,`failed`), `updated_at`.
PK `(season_id, step)`.

## Ledger

**wallets** (cache)
`user_id` PK FK, `available` bigint not null default 0, `bonus` bigint not null default 0, `escrow` bigint not null default 0, `pending_withdrawal` bigint not null default 0, `updated_at`.
Checks all columns `>= 0`.

**wallet_entries** (append-only, partitioned monthly)
`id` PK, `user_id` FK, `account` check (`available`,`bonus`,`escrow`,`pending_withdrawal`), `amount` bigint not null, `type` check (`grant`,`stake_hold`,`stake_release`,`payout`,`rake`,`reward`,`purchase`,`adjustment`,`refund`,`reversal`), `reference_type` text not null, `reference_id` uuid not null, `idempotency_key` text not null, `actor_id` uuid null, `created_at`.
Unique `idempotency_key`. Index `(user_id, created_at desc)`, `(reference_type, reference_id)`.
Amount is signed. A hold is a negative on `available` or `bonus` plus a positive on `escrow`, two rows, one idempotency key suffix `:available` and `:escrow` under a shared operation id stored in `reference_id`. The operation's idempotency key is unique per row via the suffix, and `wallet_operations` prevents a second attempt.

**wallet_operations**
`id` PK, `idempotency_key` unique, `user_id` FK, `kind` text, `status` check (`applied`,`rejected`), `response` jsonb, `created_at`.

**purchases**
`id` PK, `user_id` FK, `provider` text, `provider_ref` text, `amount_cents` int, `tokens` bigint, `status` check (`pending`,`paid`,`failed`,`refunded`), `created_at`.
Unique `(provider, provider_ref)`.

**ledger_reconciliations**
`id` PK, `ran_at`, `user_id` null, `drift` bigint, `details` jsonb.

System rake account is a user row with `status = active` and username `platform_rake`, created in migration, not sign-up-able.

## Social

**friendships**
`user_low` FK, `user_high` FK, `requested_by` FK, `status` check (`pending`,`accepted`), `created_at`, `accepted_at`.
PK `(user_low, user_high)`. Check `user_low < user_high`. Index `(requested_by, status)`.

**blocks**
`blocker_id` FK, `blocked_id` FK, `created_at`.
PK `(blocker_id, blocked_id)`. Check not equal.

**recents**
`user_id` FK, `other_id` FK, `match_id` FK, `played_at`.
PK `(user_id, other_id)`.

**parties**
`id` PK, `leader_id` FK, `region` text, `status` check (`open`,`queue`,`match`,`closed`), `created_at`, `closed_at`.

**party_members**
`party_id` FK on delete cascade, `user_id` FK, `joined_at`.
PK `(party_id, user_id)`. Unique `(user_id)` where party is open is enforced in the service (one open party). Partial unique index on `user_id` filtered by a denormalized `active` bool set false on leave.

**clubs**
`id` PK, `name`, `tag` citext unique, `owner_id` FK, `visibility` check (`public`,`request`,`invite`), `member_count` int not null default 1, `deleted_at`, `created_at`.

**club_members**
`club_id` FK, `user_id` FK, `role` check (`owner`,`officer`,`member`), `joined_at`.
PK `(club_id, user_id)`. One owner enforced by a unique partial index `(club_id) where role = owner`.

**club_scores**
`club_id` FK, `season_id` FK, `week` int, `points` int not null default 0.
PK `(club_id, season_id, week)`.

**communities**
`id` PK, `slug` unique, `kind` check (`game`,`region`,`venue`), `name`, `created_at`.

**community_members**
PK `(community_id, user_id)`, both FKs, `joined_at`.

## Chat

**conversations**
`id` PK, `kind` check (`dm`,`party`,`match`,`club`,`community`), `subject_id` uuid not null, `created_at`.
Unique `(kind, subject_id)`.

**conversation_members**
`conversation_id` FK, `user_id` FK, `last_read_seq` bigint not null default 0, `muted_until` timestamptz null.
PK `(conversation_id, user_id)`.

**messages** (append-only, partitioned monthly)
`conversation_id`, `seq` bigint, `sender_id` FK, `body` text not null check char_length <= 2000, `deleted_at` null (soft delete body replaced for members; row kept), `created_at`.
PK `(conversation_id, seq)`.

**message_reactions**
PK `(conversation_id, seq, user_id, emoji)`.

## Tournaments

**tournaments**
`id` PK, `game_id` FK, `region`, `name`, `format` check (`single_elim`,`double_elim`,`swiss`,`round_robin`), `status` check (`draft`,`registration`,`check_in`,`seeding`,`live`,`completed`,`cancelled`), `entry_fee` bigint, `capacity` int, `team_size` int default 1, `host_id` FK, `visibility` check (`public`,`unlisted`), `prize_template` text not null, `overlay_tokens` bigint default 0, `check_in_opens_at`, `starts_at`, `created_at`, `updated_at`.
Index `(status, starts_at)`.

**tournament_staff**
PK `(tournament_id, user_id)`, `role` check (`host`,`admin`,`referee`).

**tournament_entries**
PK `(tournament_id, user_id)`, `seed` int null, `status` check (`registered`,`checked_in`,`playing`,`eliminated`,`disqualified`,`withdrawn`), `placement` int null, `checked_in_at`.

**bracket_nodes**
`id` PK, `tournament_id` FK, `round` int, `position` int, `slot` smallint, `entrant_id` uuid null, `match_id` FK null, `winner_to_node` uuid null, `bracket` check (`winners`,`losers`,`grand`,`swiss`).
Unique `(tournament_id, round, position, slot, bracket)`.

**tournament_disputes**
`id` PK, `match_id` FK, `tournament_id` FK, `opened_by` FK, `status` check (`open`,`upheld`,`reversed`,`voided`), `resolution` text null, `resolver_id` FK null, `created_at`, `resolved_at`.

## Progression

**account_levels**
`user_id` PK FK, `xp` bigint not null default 0, `level` int not null default 1, `prestige` int not null default 0.

**xp_grants**
PK `(match_id, user_id)`, `amount` int, `created_at`. Idempotency.

**achievements**
`id` PK, `slug` unique, `rule` jsonb, `reward_tokens` bigint default 0.

**user_achievements**
PK `(user_id, achievement_id)`, `unlocked_at`, `entry_id` null.

**badges**, **user_badges** PK `(user_id, badge_id)`, **titles**, **user_titles** PK `(user_id, title_id)`.

**quests**
`id` PK, `period` check (`daily`,`weekly`,`season`), `rule` jsonb, `reward_tokens` bigint.

**quest_progress**
PK `(user_id, quest_id, period_key)`, `progress` int, `claimed_at` null.

**events**
`id` PK, `slug` unique, `starts_at`, `ends_at`, `config` jsonb, `status` check (`scheduled`,`active`,`ended`).

## Notifications, moderation, audit

**notifications**
`id` PK, `user_id` FK, `event_id` uuid not null, `type` text, `payload` jsonb, `read_at` null, `created_at`.
Unique `(user_id, event_id)`. Index `(user_id, read_at, created_at desc)`.

**reports**
`id` PK, `reporter_id` FK, `target_user_id` FK, `match_id` FK null, `reason` text, `status` check (`open`,`reviewing`,`dismissed`,`actioned`), `created_at`.

**cases**
`id` PK, `report_id` FK null, `status`, `assignee_id` FK null, `created_at`.

**sanctions**
`id` PK, `user_id` FK, `case_id` FK null, `type` check (`mute`,`queue_ban`,`game_ban`,`stake_ban`,`permanent`), `expires_at` null, `created_by` FK, `created_at`, `revoked_at` null.

**appeals**
`id` PK, `sanction_id` FK, `user_id` FK, `body` text, `status` check (`open`,`accepted`,`denied`), `resolver_id` null, `created_at`.

**trust_scores**
`user_id` PK FK, `score` int not null, `factors` jsonb, `updated_at`.

**audit_logs** (append-only)
`id` PK, `actor_id` FK, `action` text, `target_type` text, `target_id` uuid, `before` jsonb null, `after` jsonb null, `trace_id` text, `created_at`.
Index `(target_type, target_id)`, `(actor_id, created_at desc)`.

**outbox**
`event_id` PK, `type` text, `aggregate_id` uuid, `region` text, `payload` jsonb, `created_at`, `published_at` null.
Index `(published_at)` where published_at is null.

## Venues

**venues**
`id` PK, `owner_id` FK, `name`, `slug` unique, `city`, `region`, `status` check (`pending_review`,`active`,`suspended`,`closed`), `deleted_at`, `created_at`.

**venue_staff**
PK `(venue_id, user_id)`, `role` check (`owner`,`host`,`staff`).

**venue_events**
`id` PK, `venue_id` FK, `status` check (`scheduled`,`check_in`,`live`,`completed`,`cancelled`), `starts_at`, `ends_at`.

**venue_checkins**
PK `(event_id, user_id)`, `method` check (`qr`), `code_id` uuid, `checked_in_at`.

**venue_codes**
`id` PK, `event_id` FK, `code_hash` text, `expires_at`, `created_at`.

**venue_standings**
PK `(venue_id, season_label, user_id)`, `points` int. `season_label` is text (`2026-s1`) so venue seasons are not global season rows.

**venue_rewards**
`id` PK, `event_id` FK, `user_id` FK, `kind` text, `payload` jsonb, `created_at`. No FK to wallet.

## History and versioning

- Match, wallet, rating application, audit, and outbox tables are the history. They are not updated in place.
- `games.rules_version` versions rules. `matches.rules_version` freezes the version used.
- Profile username changes insert **username_history** (`user_id`, `username`, `released_at`) so released names are reserved for 30 days. PK `(username)`.
- Sanction revocation sets `revoked_at`. It does not delete the row.
- Message delete sets `deleted_at` and blanks `body` in the API. The row remains for audit.

## Redis (not tables)

| Key | Value | TTL |
| --- | --- | --- |
| `presence:{user}` | status JSON | 30s |
| `pool:{pool_key}` | sorted set of tickets | none, members removed explicitly |
| `ticket:{user}` | ticket JSON | 15 min |
| `match:{id}:state` | snapshot | 2 hours |
| `match:{id}:owner` | node id | 5s lease |
| `ready:{proposal}` | set of user ids | 20s |
| `dodge:{user}` | counter | 24h |
| `lb:{game}:{region}:{season}` | sorted set | overwritten |

## Retired legacy tables

Do not extend. Migrate then drop.

| Legacy | Replacement |
| --- | --- |
| `users.tokens` | `wallets` + `wallet_entries` |
| `transactions` | `wallet_entries` |
| `matchmaking_queue` | Redis tickets + `queue_tickets` history if needed |
| `priority_matches` | Drop. No async ghost mode |
| `matches.player1_id`, `player2_id`, `winner_id`, `bet_amount` | `match_players`, `match_results`, `stake` |
| `friends.status = blocked` | `blocks` |
| `bars*` | `venues*` rename in migration |
| `leaderboard_cache` as written by clients | Redis projector |

**queue_tickets** (optional history, written when a proposal is created): `id`, `user_id`, `pool_key`, `enqueued_at`, `outcome`. Not read by the matcher.

## Relationships (summary)

- User 1—1 profile, settings, wallet, account level, trust score.
- User 1—N matches through match_players.
- Match 1—1 result, 1—N events, 0—1 replay.
- Match 0—1 tournament via `source_id` and bracket_nodes.match_id.
- Wallet operation 1—N ledger rows.
- Tournament 1—N entries, staff, nodes, disputes.
- Club 1—N members and scores.
- Conversation 1—N messages.

## Migration strategy

1. Add new tables beside legacy. Do not rename live tables in the first release.
2. Deploy services that write only the new tables for new matches and new token grants.
3. Backfill `wallets` from `users.tokens` as bonus (non-withdrawable) inside one audited adjustment per user. Freeze the old column.
4. Backfill profiles and friendships. Split blocked rows into `blocks` and delete the friend edge.
5. Leave historical `matches` readable through a compatibility view that maps player columns into `match_players` until history is copied.
6. Revoke browser grants on legacy write tables in the same release that the client stops writing them.
7. Drop legacy columns only after one full season of reads against the new schema.

Expand, dual-read, cut writes, drop. Never a big-bang truncate.
