# Event Flows

Solid arrows in the diagrams are synchronous calls. Dotted arrows are bus events. The client waits only on the synchronous path. A step that says "ack" is the consumer writing its idempotency row.

## Player signup

```mermaid
sequenceDiagram
  participant C as Client
  participant A as Auth
  participant B as Bus
  participant P as Profile
  participant W as Wallet
  participant L as Ledger
  C->>A: POST /auth/signup
  A->>A: insert user, session
  A-->>B: USER_CREATED
  A-->>C: 201 tokens
  B--)P: USER_CREATED
  P->>P: insert profile
  B--)W: USER_CREATED
  W->>L: grant starter bonus
  L->>L: post + outbox
  L-->>B: TOKENS_RELEASED
```

Sync: signup. Async: profile row and grant. The client may open `/me` before the profile exists. Profile's GET repairs once by creating the row if Auth says the user exists. Wallet's first read repairs a missing wallet the same way. Repair uses the same idempotency key `user:{id}:starter`.

## Friend request

```mermaid
sequenceDiagram
  participant C as Client
  participant F as Friend
  participant B as Bus
  participant N as Notification
  C->>F: POST /friends/requests
  F->>F: insert pending pair
  F-->>B: FRIEND_REQUESTED
  F-->>C: 201
  B--)N: FRIEND_REQUESTED
  N->>N: inbox row
```

Accept repeats the shape with `FRIEND_ACCEPTED`. Sync is the row. Notification is async.

## Queue join

```mermaid
sequenceDiagram
  participant C as Client
  participant Q as Queue
  participant R as Rating
  participant M as Moderation
  C->>Q: POST /queue
  Q->>M: sanctions
  Q->>R: rating
  Q->>Q: Redis ticket
  Q-->>C: ticket
  Note over Q: QUEUE_JOINED is async to Presence and Analytics
```

No Wallet call. Leaving is `DELETE /queue`, Redis delete, then async `QUEUE_LEFT`. If the ticket is already inside a ready check in the last 5 seconds, Queue still removes it and records a dodge.

## Match found and ready check

```mermaid
sequenceDiagram
  participant Q as Queue
  participant B as Bus
  participant N as Notification
  participant C as Clients
  participant W as Wallet
  participant L as Ledger
  participant M as Match
  Q->>Q: pair tickets
  Q-->>B: MATCH_FOUND
  B--)N: notify
  B--)C: queue.proposal
  C->>Q: POST ready
  Q->>Q: mark ready
  C->>Q: POST ready
  Q->>M: create match proposed
  M->>W: hold both stakes
  W->>L: post escrow
  L-->>W: operation
  W-->>M: held
  M-->>Q: match id
  Q-->>B: READY_CONFIRMED all_ready
  M-->>B: MATCH_CREATED
```

Sync and on the critical path: both readies, match insert, ledger hold. If the second hold fails, Match cancels, Wallet releases the first hold with key `release:{match}`, Queue requeues the solvent player. Notification of `MATCH_FOUND` is async and may arrive late. The proposal deadline does not extend to wait for a push.

## Match start

```mermaid
sequenceDiagram
  participant M as Match
  participant G as Game
  participant B as Bus
  G->>G: take owner lock, write seed
  M->>G: start (sync) after MATCH_CREATED
  G->>G: append start event
  G-->>B: MATCH_STARTED
  G-->>M: live
  M->>M: status countdown then live
```

Match's sync start call and Game's `MATCH_STARTED` are the same transition. If the sync call succeeds, the event is the fan-out. If the sync call times out, Match voids after 10 seconds unless Game has written the start event. Game's start is idempotent on match id.

## Disconnect and reconnect

```mermaid
sequenceDiagram
  participant RT as Realtime
  participant G as Game
  participant C as Client
  RT->>G: socket closed
  G->>G: set deadline once
  G-->>C: PLAYER_DISCONNECTED to opponent
  C->>G: POST reconnect
  G->>G: cancel deadline if inside budget
  G-->>C: snapshot
  G-->>C: PLAYER_RECONNECTED
```

Sync: reconnect returns the snapshot. The disconnect event is async to the opponent and must not be the only timer. Game's local timer is the authority. A duplicate disconnect does not move the deadline. A reconnect with an expired budget returns `409` and the forfeit path runs once.

## Match finish

```mermaid
sequenceDiagram
  participant G as Game
  participant M as Match
  participant B as Bus
  participant W as Wallet
  participant R as Rating
  G->>G: append final events
  G->>M: commit result (sync)
  M->>M: status finalizing, unique result
  G-->>B: MATCH_FINISHED
  B--)W: settle
  B--)R: rate
  W-->>M: ack
  R-->>M: ack
  M->>M: status completed
```

The sync result insert and the event carry the same `event_id`. Consumers that see the event before the row wait and retry. Consumers that see a duplicate ack. Match does not pay and does not rate.

## Escrow settlement

```mermaid
sequenceDiagram
  participant W as Wallet
  participant L as Ledger
  W->>W: compute rake and spend accounts
  W->>L: POST operation idempotency match:{id}:settle
  L->>L: lines + cache + outbox
  L-->>W: applied or replay
  L-->>B: TOKENS_RELEASED
```

One operation, many lines (winner credit, rake credit, escrow debits). A retry posts nothing new.

## Rating update and promotion

```mermaid
sequenceDiagram
  participant R as Rating
  participant B as Bus
  participant LB as Leaderboard
  participant N as Notification
  R->>R: insert rating_applications
  R->>R: update ratings and snapshot
  R-->>B: RATING_UPDATED
  alt division increased
    R-->>B: LEAGUE_PROMOTED
  end
  B--)LB: project
  B--)N: inbox on promotion only
```

Async after the rating transaction. Queue reads Redis, which Rating updates in that same transaction's after-commit hook: write Redis, then the outbox publisher is the backup if Redis write failed. On Redis failure, Queue's next read misses and loads from the Rating API.

## Achievement unlock

```mermaid
sequenceDiagram
  participant B as Bus
  participant Ach as Achievement
  participant W as Wallet
  B--)Ach: MATCH_FINISHED or LEAGUE_PROMOTED
  Ach->>Ach: insert user_achievements
  Ach->>W: grant if reward
  Ach-->>B: ACHIEVEMENT_UNLOCKED
  B--)N: Notification
```

The unlock row commits before the grant. If the grant fails, the event is not published and the consumer retries. The unlock insert is idempotent so the retry only grants.

## Quest completion

```mermaid
sequenceDiagram
  participant B as Bus
  participant Qs as Quest
  participant C as Client
  participant W as Wallet
  B--)Qs: MATCH_FINISHED
  Qs->>Qs: increment progress once per match
  Qs-->>B: QUEST_COMPLETED
  C->>Qs: POST claim
  Qs->>W: grant
  Qs->>Qs: set claimed_at
```

Progress is async. Claim is sync and fails closed. `QUEST_COMPLETED` does not pay. Only the claim does, so a quest cannot pay twice from a replayed event.

## Tournament registration, advancement, payout

```mermaid
sequenceDiagram
  participant C as Client
  participant T as Tournament
  participant W as Wallet
  participant M as Match
  participant G as Game
  C->>T: register
  Note over T: no charge
  C->>T: check-in
  T->>W: hold entry fee
  T->>T: status checked_in
  T->>T: seed, start
  T->>M: create match source tournament
  M->>G: start, stake already held so hold is zero
  G-->>B: MATCH_FINISHED
  B--)T: advance node
  T->>M: create next match
  T->>W: pay placements on complete
```

Registration is sync and free. Check-in is sync with Wallet. Advancement is async and ordered per tournament id. Payout is one Wallet call per placement, each with its own idempotency key, triggered once by `TOURNAMENT_COMPLETED`.

A format change replaces the "seed, start" and "advance node" boxes inside Tournament. The Wallet calls stay "hold a fee" and "pay these amounts."

## Venue check-in

```mermaid
sequenceDiagram
  participant C as Client
  participant V as Venue
  participant B as Bus
  C->>V: POST check-in code
  V->>V: hash match, insert check-in
  V-->>C: 201
  V-->>B: VENUE_CHECKIN
  B--)H: host dashboard
```

Sync is the insert. The dashboard is async. No Wallet call.

## Notification delivery

```mermaid
sequenceDiagram
  participant B as Bus
  participant N as Notification
  participant RT as Realtime
  participant P as Push
  B--)N: domain event
  N->>N: insert inbox on (user, event_id)
  N-->>RT: notification.created
  N->>P: push if prefs and offline
```

Inbox insert is the durable step. Realtime and push are after the commit. If push fails, the inbox row remains. A second delivery of the same event hits the unique key and does not push again, because the delivery attempt row is inserted in the same transaction as the inbox row before the push is attempted. Push retry reads pending attempts, max 3.

## Sync versus async summary

| Step | Mode |
| --- | --- |
| Auth, profile repair, queue join, ready, ledger post, match create, input, reconnect, quest claim, check-in, tournament register | Synchronous |
| Email, presence, inbox, push, leaderboard, achievements, quest progress, rating projection, analytics, search, replay archive, club points | Asynchronous |
| Rating apply and wallet settle after `MATCH_FINISHED` | Asynchronous but required before `completed` |
