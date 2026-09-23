# Matchmaking Specification

Matchmaking is a service, not a table the client polls and writes. The client asks to queue. The matcher owns tickets, proposals, ready checks, and penalties.

## Pools

A pool key is:

`region + game_id + mode + party_size + stake_bucket`

Stake bucket is discrete (`free`, `10`, `25`, `50`, `100`), never an arbitrary bet. Arbitrary bets destroy queue health. Cash buckets do not exist until a regulated skill-contest product is approved.

Each pool has its own queue health: players waiting, median wait, match quality. If a pool’s median wait exceeds 45 seconds for 10 minutes, it is marked `thin` and the client offers the nearest healthy stake or casual.

## Ticket

```
ticket_id, user_id, party_id?, pool_key, mmr, mmr_deviation,
latency_ms, trust_score, new_player, joined_at, expires_at
```

One active ticket per user. Parties enqueue as one ticket using the party leader’s region and a party MMR of the average, widened by the internal spread. A party may not cross more than 400 MMR between members in ranked.

## Hidden MMR and visible rank

Matchmaking reads hidden MMR (Glicko-2 rating and deviation). Visible division is a lagging presentation of that rating. Dodging, leaving queue, and declining ready do not change MMR. Only a completed game does.

New accounts start at rating 1500, deviation 350. Casual and ranked are separate ratings per game. There is no single “ChanceUS MMR” used to match Trivia against Connect Four.

## Search window

At t = 0 the window is `max(80, deviation / 2)` rating points and 40 ms latency. Every 5 seconds the rating window grows by 40 and the latency cap by 15 ms, capped at 400 rating and 120 ms. After 25 seconds, `new_player` tickets may match bots. After 40 seconds, casual may match across one adjacent stake-free pool. Ranked never matches bots and never crosses stake buckets.

Queue priority, highest first:

1. Players returning from a failed ready-check (the opponent who readied is requeued with a 15-second head start).
2. Parties (they have less supply).
3. High deviation (placements) so new players resolve quickly.
4. FIFO inside the same window.

## Flows

### Casual

Enter pool `casual/free`. Accept is implicit (no ready check) for the first 20 account games to reduce drop-off, then a 12-second ready check.

### Ranked

Enter pool after the ranked unlock. Stake is the league’s fixed entry, escrowed at ready-accept, not at queue join. Declining ready releases nothing because nothing was taken yet.

### Placement

Five ranked-rules games. Window starts wide (deviation 350). K-factor is 40. No entry fee. No public division until game 5 resolves. Leaving a placement match counts as a loss and consumes the placement.

### Private and friend matches

No matcher. The host creates a lobby: game, rules, stake or free, visibility (`invite`, `friends`, `club`). Invitees have 60 seconds to ready. Results are unranked. Token stakes still escrow.

### Rematch

Both clients receive `rematch_offered` for 30 seconds. If both accept, Game Service creates a new match with the same pool parameters, skipping the queue. If either declines, both return to the post-match screen. A rematch is a new match id. It cannot be used to grind a single opponent more than 3 times per hour in ranked; the fourth must requeue.

## Ready check

Ranked and tournaments: 15 seconds. Both must ready. Outcomes:

| Outcome | Effect |
| --- | --- |
| Both ready | Match locks, countdown 3 seconds, escrow captures |
| One declines or times out | Dodger gets a dodge. Readied player requeues with priority |
| Both fail | No dodge. Both requeue at the back |

## Dodging, AFK, reconnect, penalties

Dodge: failing a ready check, or cancelling a ranked queue in the last 5 seconds more than 3 times in an hour.

| Strikes in 24h | Penalty |
| --- | --- |
| 1 | Warning |
| 2 | 5-minute queue lock |
| 3 | 30-minute queue lock |
| 4+ | 2-hour lock and trust-score drop |

AFK: no input for 20 seconds in a live game (game-specific). First offense: pause and a 10-second return warning. Still absent: forfeit. The winner is the opponent. Ranked MMR moves as a completed game. Repeated AFK forfeits (3 in a day) apply the dodge ladder and block token rewards.

Reconnect: the match is authoritative on the server. A dropped client has 60 seconds (casual) or 90 seconds (ranked, tournament) to resume the same match id. The opponent sees a reconnect banner. The clock for turn-based games pauses up to that budget once per player. Exceeding it is an AFK forfeit.

Leaving the queue before a proposal is free and silent.

## Queue health

Published every 10 seconds per pool:

- `healthy`: median wait under 20 seconds
- `slow`: 20–45 seconds
- `thin`: over 45 seconds or fewer than 4 tickets

The client may show “play casual while you wait” but must not silently move a ranked ticket into casual.

A global balancer job merges only regions that are both `thin` and under 80 ms of each other. It never merges across continents.

## What is wrong today

The app stores tickets in `matchmaking_queue` and lets the browser match on bet amount. Any client can see every ticket. Expiry is a timestamp, not a worker. There is no MMR, no ready check, no dodge memory, and no party. That design cannot be patched into this spec. Replace it.
