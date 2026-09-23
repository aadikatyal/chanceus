# Ranking System

Per game, two ratings: casual (hidden) and ranked (hidden MMR, visible league). Tournament and venue results do not write ranked MMR unless the event is explicitly a ladder event.

## Rating math

Glicko-2.

- Start: rating 1500, RD 350, volatility 0.06.
- Ranked K equivalent is the Glicko-2 update; do not also add a flat Elo delta.
- Placement games (first 5 ranked): treat RD as staying high so a single upset cannot print a top division.
- Minimum games before a public rank: 5 placements.
- Inactive ranked RD inflates weekly after 14 days away, which widens matchmaking but does not change the visible badge until decay rules say so.

Expected score and updates are computed in the Ranking service from the match fact (`winner_id`, `end_reason`). Game Service emits the fact. Ranking never trusts a client payload.

## Visible structure

Eight leagues. Each league has four divisions (IV, III, II, I) except the top league.

| League | Rating band (display) | Entry stake (tokens) |
| --- | --- | --- |
| Bronze | 0–1099 | 0 |
| Silver | 1100–1299 | 10 |
| Gold | 1300–1499 | 25 |
| Platinum | 1500–1699 | 25 |
| Diamond | 1700–1899 | 50 |
| Master | 1900–2099 | 50 |
| Grandmaster | 2100–2299 | 100 |
| Legend | 2300+ | 100, capped population |

Legend is a percentile cut inside the rating band: top 500 per game per region per season, minimum rating 2300. Everyone else at 2300+ stays Grandmaster I. This keeps the top badge scarce the way Legend works in competitive ladders.

Display rank stores `league`, `division`, `progress` (0–100 inside the division), and `peak`.

## Promotion and demotion

Progress is not “3 wins in a row” as the only rule. The source of truth is rating. Division borders have a 30-point buffer.

- Promotion when rating exceeds the next border by 15 and the last game was a win.
- Demotion when rating falls 30 below the current border and the last game was a loss.
- A promotion game is a normal ranked game. There is no best-of-three series at this game length; series create hostage queues.
- Demotion protection: the first 3 games after a promotion cannot demote. They can still lose rating inside the buffer.

## Streaks

Streaks are a reward-layer concept, not a rating multiplier. A 5-win streak does not inflate MMR. It pays a token bonus and a quest credit (see economy). Rating inflation from streaks is how ladders lie.

The only rating modifier is a placement and a season-reset uncertainty boost (higher RD), which lets results move the rating faster without granting free points.

## Seasons

Length: 8 weeks. Region-scoped ladders, global profile shows the best region.

End of season:

1. Snapshot peak and final division.
2. Pay season rewards from the snapshot (economy spec).
3. Soft reset: `new_rating = 1500 + (old_rating - 1500) * 0.5`, RD reset to 200, Legend cleared.
4. Visible rank becomes `placement pending` until 3 calibration games. Calibration uses the reset rating; it is not a climb from Bronze.
5. Match history and peak badges remain.

Mid-season resets do not happen. Emergency integrity resets are an admin action with an audit log and a player-facing note.

## Decay

Decay protects Legend, Grandmaster, and Master only. Lower leagues do not decay; punishing casual players for a vacation destroys retention.

- Starts after 14 days without a ranked game in that game.
- Then −15 rating per 7 days, floored at the Master IV border (1900) for Master and at the Grandmaster IV border (2100) for Grandmaster and Legend.
- A decay warning notification fires at day 10.
- Decay never drops a player more than one league from their season peak.

## Placement and rank reset

Placement: 5 games, no fee, no public division, losses count, abandons count as losses. Finish produces a league and division from the rating, snapped down to the nearest division border so a lucky streak cannot start in Legend. Cap initial placement at Diamond II.

Rank reset means the season soft reset above. A manual “reset my rank” button does not exist. Smurf control depends on that absence.

## Integrity rules

- Rematch cap: 3 per opponent per hour in ranked.
- Party ranked games move rating for every member.
- Bot games never touch ranked rating.
- Forfeit after 30 seconds of live play counts. Forfeit before that (disconnect during countdown) is a dodge, not a rated loss, so the opponent is not farmed.
- Collusion and win-trading flags freeze rating writes until moderation resolves them.
