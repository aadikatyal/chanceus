# Domain Boundaries

One writer per domain. Read models are projections. "Call" means the owner's API, never its tables.

## Identity

- **Owner.** Authentication Service (`users`, `sessions`, `devices`).
- **Read.** Profile, Admin, Moderation (status). Gateway validates tokens locally.
- **Write.** Authentication only.
- **Events.** `USER_CREATED`.
- **Depends on.** Moderation for sanction lookup at refresh.
- **Allowed callers.** Gateway, the user, Admin for revoke via Auth API.
- **Forbidden.** Every other service writing email, status, or sessions.

## Profile

- **Owner.** Profile Service.
- **Read.** Any service via `GET /players` or internal get. Search via events only.
- **Write.** Profile Service.
- **Events.** `PROFILE_UPDATED`.
- **Depends on.** Auth for `USER_CREATED`.
- **Allowed callers.** The user. Admin does not edit bios.
- **Forbidden.** Game, Wallet, Queue.

## Presence

- **Owner.** Presence Service. Redis is the record.
- **Read.** Friend-filtered API. Notification may ask "is offline?" through the API.
- **Write.** Presence Service, from heartbeats and from events it consumes.
- **Events.** `FRIEND_ONLINE`.
- **Depends on.** Friend and Club APIs for the visibility filter.
- **Allowed callers.** The user's client. Queue, Match, and Game do not write presence keys. They emit events.
- **Forbidden.** Clients setting another user's status. Postgres as the online store.

## Social graph

- **Owner.** Friend Service (`friendships`, `blocks`, `recents`).
- **Read.** Chat, Queue (private lobbies), Party, via API.
- **Write.** Friend Service.
- **Events.** `FRIEND_REQUESTED`, `FRIEND_ACCEPTED`, `USER_BLOCKED`.
- **Depends on.** Match `MATCH_FINISHED` for recents.
- **Allowed callers.** The user.
- **Forbidden.** Matchmaking using blocks to split ranked pools. Ranked ignores blocks on purpose.

## Party

- **Owner.** Party Service.
- **Read.** Queue, Voice, Chat.
- **Write.** Party Service.
- **Events.** `PARTY_UPDATED`.
- **Depends on.** Friend API for invites.
- **Allowed callers.** Leader and members.
- **Forbidden.** Queue writing membership.

## Chat

- **Owner.** Chat Service.
- **Read.** Members. Moderation for a case.
- **Write.** Chat Service.
- **Events.** `MESSAGE_SENT`.
- **Depends on.** Friend blocks, Moderation sanctions, membership APIs.
- **Allowed callers.** Members. Moderator delete.
- **Forbidden.** Notification writing messages. Game embedding a second log.

## Voice

- **Owner.** Voice Service.
- **Read.** Clients with a token.
- **Write.** Voice Service mints tokens. The SFU owns media state and is outside the domain.
- **Events.** `VOICE_JOINED`.
- **Depends on.** Party, Match, Club authorization APIs.
- **Allowed callers.** Members.
- **Forbidden.** Game Service.

## Queue

- **Owner.** Queue Service. Redis tickets are the record.
- **Read.** The queued user. Admin metrics.
- **Write.** Queue Service.
- **Events.** `QUEUE_JOINED`, `QUEUE_LEFT`, `MATCH_FOUND`, `READY_CONFIRMED`.
- **Depends on.** Rating read API, Party API, Moderation sanction API, Match create API.
- **Allowed callers.** Players. Tournament Service asks Match for a match directly and does not enqueue public tickets.
- **Forbidden.** Clients pairing tickets. Game writing tickets. Wallet writing tickets.

## Match

- **Owner.** Match Service (`matches`, `match_players`, `match_results`).
- **Read.** Players, Tournament, Replay, Admin, Profile (history) via API.
- **Write.** Match Service only, including status. Game does not update `matches`.
- **Events.** `MATCH_CREATED`, `MATCH_CANCELLED`, `MATCH_VOIDED`.
- **Depends on.** Wallet for holds, Game for the room, Queue or Tournament or Venue as the creator.
- **Allowed callers.** Queue, Tournament, Venue, host, Admin void.
- **Forbidden.** Clients setting `winner_id`. Rating writing the result. Wallet writing status.

## Game rules

- **Owner.** Game Service (`games`, `match_events`, live Redis snapshot).
- **Read.** Replay via a one-shot export API. Spectators via the delayed gateway, which subscribes to Game fan-out.
- **Write.** Game Service.
- **Events.** `MATCH_STARTED`, `PLAYER_DISCONNECTED`, `PLAYER_RECONNECTED`, `MATCH_FINISHED`.
- **Depends on.** Match for "this room should exist."
- **Allowed callers.** Seated players for inputs. Match for start and stop.
- **Forbidden.** Clients posting a result. Tournament advancing itself from client input.

## Rating

- **Owner.** Rating Service.
- **Read.** Queue, Profile, Leaderboard, Tournament seeding, via API.
- **Write.** Rating Service.
- **Events.** `RATING_UPDATED`, `LEAGUE_PROMOTED`, `LEAGUE_DEMOTED`, `SEASON_CLOSING`, `SEASON_ARCHIVED`.
- **Depends on.** `MATCH_FINISHED` and `MATCH_VOIDED`.
- **Allowed callers.** Its consumer. Super Admin season repair through Rating's internal resume endpoint, audited by Admin.
- **Forbidden.** Wallet, Game, and clients.

## Leaderboard

- **Owner.** Leaderboard Service (Redis projections only).
- **Read.** Public.
- **Write.** Leaderboard Service.
- **Events.** None required downstream.
- **Depends on.** `RATING_UPDATED`.
- **Allowed callers.** Public GET. No writes.
- **Forbidden.** Rating storing the public board. Clients sorting themselves.

## Wallet policy

- **Owner.** Wallet Service (policies, claims).
- **Read.** The user, through Wallet, which reads Ledger.
- **Write.** Wallet decides. It does not write balance tables.
- **Events.** None directly. Ledger emits the money events Wallet caused.
- **Depends on.** Ledger.
- **Allowed callers.** Match, Tournament, Quest, Achievement, Payment, Season worker inside Rating calling Wallet, Admin economy route.
- **Forbidden.** Game, Queue, Chat, clients, Ledger's other hypothetical callers.

## Ledger

- **Owner.** Ledger Service.
- **Read.** Wallet only, then Wallet shows the user.
- **Write.** Ledger only, and only when Wallet calls `POST /internal/ledger/operations`.
- **Events.** `TOKENS_ESCROWED`, `TOKENS_RELEASED`.
- **Depends on.** Nothing in the product domain.
- **Allowed callers.** Wallet service identity. Reconciler in-process.
- **Forbidden.** Payment, Match, Admin, and the database owner running ad hoc updates. A manual credit is still a Wallet adjustment.

## Payments

- **Owner.** Payment Service (`purchases`).
- **Read.** The user (status), Admin.
- **Write.** Payment Service for purchase rows. Token credit is Wallet.
- **Events.** `PURCHASE_PAID`.
- **Depends on.** Stripe and Wallet.
- **Allowed callers.** The user for checkout. Stripe for webhooks.
- **Forbidden.** Payment updating `wallets`.

## Tournament

- **Owner.** Tournament Service.
- **Read.** Public if public.
- **Write.** Tournament Service for nodes and entries.
- **Events.** Publish, check-in, start, advance, complete.
- **Depends on.** Match, Wallet, Rating (seed values only).
- **Allowed callers.** Host, entrant, referee.
- **Forbidden.** Wallet branching on `format`. Game writing `bracket_nodes`.

## Venue

- **Owner.** Venue Service.
- **Read.** Public boards. Staff dashboard.
- **Write.** Venue Service.
- **Events.** `VENUE_CHECKIN`, `VENUE_EVENT_STARTED`, `VENUE_PUBLISHED`.
- **Depends on.** Match for live games. Not Wallet.
- **Allowed callers.** Owner, host, patron check-in.
- **Forbidden.** Global rating writes. Drink rewards as ledger lines.

## Club

- **Owner.** Club Service, including communities.
- **Read.** Members and public clubs.
- **Write.** Club Service.
- **Events.** `CLUB_UPDATED`.
- **Depends on.** `MATCH_FINISHED` for points.
- **Allowed callers.** Owner, officer, member.
- **Forbidden.** A second guild service. Chat owning membership.

## Progression

- **Owner.** Quest Service for quests, XP, level, prestige. Achievement Service for achievements, badges, and titles catalog.
- **Read.** The user. Profile reads equipped title through Achievement's "does user own title" API.
- **Write.** Each service, its own tables.
- **Events.** `QUEST_COMPLETED`, `ACHIEVEMENT_UNLOCKED`, `XP_GRANTED`.
- **Depends on.** Match facts and Wallet for grants.
- **Allowed callers.** Their consumers and the user for claim.
- **Forbidden.** One service unlocking the other's rows.

## Replay and media

- **Owner.** Replay Service for replay metadata and replay blobs. Media Service for avatars and venue images.
- **Read.** Authorized URL mint.
- **Write.** The owner that minted the key.
- **Events.** `REPLAY_ARCHIVED`, `MEDIA_ATTACHED`.
- **Depends on.** Game export for replays. Storage for bytes.
- **Allowed callers.** Replay worker. The user for avatar upload.
- **Forbidden.** A shared "storage service" that also decides visibility.

## Moderation

- **Owner.** Moderation Service.
- **Read.** Every competitive service, through the sanction API.
- **Write.** Moderation Service.
- **Events.** `REPORT_FILED`, `SANCTION_APPLIED`, `SANCTION_REVOKED`.
- **Depends on.** Auth, Queue, and Chat to enforce. They consume the event and also check on the next command.
- **Allowed callers.** Players for reports and appeals. Moderators and Admins for actions.
- **Forbidden.** Queue inventing its own ban table.

## Admin and audit

- **Owner.** Admin Service for `audit_logs`.
- **Read.** Moderator and above.
- **Write.** Append-only by Admin Service and by domain services via an audit client that only inserts. Domain services insert their own audit rows for money and voids. The table's grant is insert-only for those roles. Admin Service is still the product owner: it defines the schema and is the only deleter, and it never deletes.
- **Events.** `ADMIN_ACTION`.
- **Depends on.** The service it is calling.
- **Allowed callers.** Staff routes.
- **Forbidden.** Updating a ledger row or a match result in place.

## Analytics and search

- **Owner.** Analytics owns the warehouse. Search owns the index.
- **Read.** Staff for analytics. Public for search, filtered by visibility.
- **Write.** Their projectors only.
- **Events.** They consume. They do not produce product events.
- **Depends on.** The bus.
- **Allowed callers.** None of the write path.
- **Forbidden.** Product requests waiting on either service.

## Call graph (allowed sync)

```
Client → Gateway → owning service
Queue → Rating (read), Party (read), Moderation (read), Match (create)
Match → Wallet (hold/release), Game (start/stop)
Wallet → Ledger (post)
Payment → Wallet (grant)
Tournament → Match, Wallet, Rating (read)
Venue → Match
Quest / Achievement → Wallet
Admin → Match, Wallet, Moderation, Rating
```

There is no edge from Ledger to Wallet, from Game to Wallet, from Rating to Wallet, or from Wallet to Queue. Season rewards are Rating emitting `SEASON_ARCHIVED` and Wallet consuming it. That is one direction.
