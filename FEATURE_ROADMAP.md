# Feature Roadmap

Ordered by what makes the platform real, not by what is already half-built. Each phase is shippable to users.

## Phase 0 — Stop the bleeding

- Remove client writes to balances, match winners, and queue rows.
- Disable debug routes and cash queue types.
- Re-enable authorization on venue tables before any public venue launch.
- Idempotent Stripe fulfillment.

## Phase 1 — A fair match

- Authoritative Game Service for Connect Four and Math Blitz.
- Wallet ledger and escrow for free and bonus-token games.
- Casual queue with hidden MMR, bots labeled as bots, reconnect, forfeit.
- Post-match result that only the server can produce.

Exit: two strangers can play a rated-for-casual game and neither can gift themselves tokens.

## Phase 2 — Ranked

- Placements, leagues, promotion buffer, season soft reset, decay for top leagues.
- Ready check, dodge penalties, rematch cap.
- Regional pools and queue health.
- Public profile with rank and match list.

Exit: a new player can be placed and a top player can decay.

## Phase 3 — Social loop

- Friends, blocks, recents, presence, parties.
- DMs and party chat on the conversation model.
- Club create, join, weekly score from ranked games.
- Notifications: match found, friend online, rematch, rank up.

Exit: a party of two can queue together and see each other online tomorrow.

## Phase 4 — Competition surface

- Single-elimination tournaments with check-in, seeding, disputes, and escrowed prizes.
- Leaderboards per game, region, and season.
- Daily and weekly quests, achievements, titles.
- Spectator delay and replay from `match_events`.

## Phase 5 — Venues and retention

- Venue owner, staff, QR check-in, live trivia on the same Game Service rules, venue season standings.
- Season rewards and first-win ritual.
- Swiss and double elimination.
- Community spaces for a game and a city.

## Phase 6 — Scale and trust

- Moderation cases, appeals, trust score, smurf signals.
- EU region.
- Payments for token packs without withdrawal.
- Voice in parties.
- Cash withdrawal only after a legal and KYC review, as its own phase, not a flag.

## Explicitly later

- Native apps (the API is the product; the web client is enough until Phase 4).
- A season pass that gates rewards people already earned.
- Async ghost matches (`priority_matches`).
- Cross-game account MMR.
- User-created game rules.

## Success measures

- Median casual wait under 20 seconds in a live region.
- Ranked result disputes under 0.5% of matches.
- Zero client-originated wallet writes.
- Day-7 return driven by friends or clubs, measured before any cash-out work.
