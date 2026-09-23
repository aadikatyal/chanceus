# Missing Features

Status is against the product this spec describes. “Present” means a page or table exists, not that the design is met.

## Lifecycle

| Feature | State |
| --- | --- |
| Visitor catalog | Present, incomplete |
| Signup and login | Present |
| Email-gated provisional account | Missing |
| Onboarding (game, region, friend code) | Missing |
| Tutorial bot match on the real rules | Missing |
| First-match bot backfill, labeled | Missing |
| Ranked unlock and placements | Missing |

## Matchmaking and matches

| Feature | State |
| --- | --- |
| Casual queue | Incomplete (bet buckets, no MMR) |
| Ranked queue | Missing |
| Hidden per-game MMR | Missing |
| Ready check | Missing (a readiness column exists; it is not this system) |
| Dodge and AFK penalties | Missing |
| Reconnect to an authoritative match | Missing |
| Parties in queue | Missing |
| Private and friend lobbies | Incomplete |
| Rematch offer with a cap | Missing |
| Regional pools and queue health | Missing |
| Server-side results | Missing |

## Ranking

| Feature | State |
| --- | --- |
| Leagues, divisions, buffer, peak | Missing (a rankings page is not a ladder) |
| Seasons and soft reset | Missing |
| Decay | Missing |
| Promotion protection | Missing |

## Economy

| Feature | State |
| --- | --- |
| Ledger and escrow | Missing |
| Bonus vs available tokens | Missing |
| Fixed stakes by league | Missing |
| Daily claim, first win, streak rewards | Missing |
| Season and tournament prize payout | Missing |
| Refund matrix | Missing |
| Anti-fraud velocity and idempotency | Missing |
| Withdrawals | Missing, and should stay missing until Phase 6 |
| Token purchases | Incomplete (Stripe routes exist) |

## Social

| Feature | State |
| --- | --- |
| Friend requests | Incomplete |
| Blocks as their own relation | Missing |
| Presence | Incomplete (online column, not a presence service) |
| Parties | Missing |
| Clubs | Missing |
| Communities | Missing |
| Recents and post-match add | Missing |
| Profiles with titles and privacy | Incomplete |
| Activity feed | Missing |
| DMs and match chat | Incomplete |
| Voice | Incomplete (call pages, no party integration) |
| Spectate with delay | Incomplete |

## Competition

| Feature | State |
| --- | --- |
| Leaderboards from a rating | Incomplete |
| Achievements, badges, titles | Missing |
| XP, level, prestige | Missing |
| Daily, weekly, club quests | Missing |
| Season pass | Missing on purpose until the free ladder exists |
| Events | Missing |
| Single-elimination with roles and check-in | Incomplete |
| Swiss, double elimination, round robin | Missing |
| Seeding, late join rule, disputes | Missing |
| Prize templates | Missing |

## Venues

| Feature | State |
| --- | --- |
| Venue records, staff, sessions | Present, authorization broken |
| QR check-in | Present |
| Live trivia | Incomplete |
| Venue season standings | Missing |
| Host dashboard | Present, incomplete |
| Separation of drink rewards from tokens | Incomplete |

## Trust and ops

| Feature | State |
| --- | --- |
| Reports and appeals | Missing (chat moderation rows are not a case system) |
| Trust score and smurf signals | Missing |
| Collusion holds on payout | Missing |
| Notification inbox and push | Missing |
| Admin roles and dual-control adjustments | Missing |
| Audit log | Missing |
| Background jobs (rating, season, payout, cleanup) | Missing |
| Realtime gateway as specified | Incomplete (table listeners are not match, queue, and presence channels) |

## Unnecessary in the current build

- Priority async matches as a competitive mode.
- Cash stake enums.
- Debug pages and a debug token API.
- A second guild system beside clubs.
- Client-side “force complete” controls.

Build order is `FEATURE_ROADMAP.md`. This list is the gap, not a backlog to start from the bottom.
