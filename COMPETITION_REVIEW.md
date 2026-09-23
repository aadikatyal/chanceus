# Competition ecosystem review

Presentation-only migration · canonical refs: Home, Play, Queue, Lobby, Wallet, Social · `DESIGN_BIBLE.md`

**Emotion target:** *I am progressing.* — skill, status, reputation, achievement — not spreadsheet dashboards.

---

## Scope

| Surface | Route | Status |
|---------|--------|--------|
| Activity | `/matches` | Migrated — hero, progress meter, match **timeline** |
| Match history | `/matches` (timeline section) | Same route — list reframed as competitive history |
| Profile | `/profile` | Migrated — career hero, rank spotlight, achievements, timeline |
| Rankings | `/rankings` | **New route** — personal rank + progress signals (`getUserStatistics`, `getLeaderboard`) |
| Leaderboards | `/leaderboards` | **New route** — global ladder (`getLeaderboard`) |
| Leaderboards (legacy) | `/analytics` | Shell + same ladder client (APIs unchanged) |
| Tournaments index | `/tournaments` | Migrated — arena hero + arena cards |
| Tournament details | `/tournaments/[tournamentId]` | Migrated — `CompetitiveShell`, arena hero, stat strip |
| Tournament brackets | Detail → **Bracket** tab | Bracket shell + token overrides on legacy bracket UI |
| Tournament create | `/tournaments/create` | Not in this pass — still legacy chrome |

---

## Shared presentation layer

**Components** (`components/competition/`):

- `competition-hero.tsx` — kicker, display title, progression copy, stat pills, CTAs
- `competition-progress-meter.tsx` — trajectory grid (replaces stat-card dashboards)
- `competition-match-timeline.tsx` — vertical competitive history (replaces table/list “CRUD” feel)
- `competition-ladder.tsx` — ranked rows, podium tiers, “You” highlight
- `competition-rank-spotlight.tsx` — standing card + climb CTAs
- `competition-achievement-wall.tsx` — reputation milestones (existing rules, richer chrome)
- `competition-tournament-arena-card.tsx` — tournament index cards
- `competition-tournament-hero.tsx` — detail header
- `leaderboards-page-client.tsx` / `rankings-page-client.tsx` — client data via existing server actions

**CSS** — `app/chance-competitive-rich.css` section **Competition ecosystem** (`.chance-competition-*`).

**Shell** — all routes use `CompetitiveShell` + `CompetitivePageFeed` (`chance-competition-feed` gap).

---

## Before → after (by route)

### Activity / match history (`/matches`)

| Before | After |
|--------|--------|
| Plain header + 4 stat cards + flat history list | Competition hero (“every match is a step”) |
| Dashboard KPI copy | Progress meter (victories, WR, volume, pace) |
| “Match history” table section | **Timeline** with victory/defeat pills, token delta, recap links |
| — | Streak banner when 2+ recent wins; links to ladder + tournaments |

### Profile (`/profile`)

| Before | After |
|--------|--------|
| Feature header + avatar card + stat grid + list rows | Competition hero with @handle |
| Static achievement list in inset boxes | **Achievement wall** (locked/unlocked tiers) |
| “Gaming statistics” grid | **Rank spotlight** (standing + climb CTAs) |
| Recent activity rows | **Recent battles** timeline (same match query, richer select) |
| — | Sidebar links to Rankings, Leaderboards, Tournaments |

### Rankings (`/rankings`)

| Before | After |
|--------|--------|
| *(no dedicated route)* | Personal rank hero + spotlight + progress signals from `getUserStatistics` |
| — | Ladder position from `getLeaderboard("overall")` |

### Leaderboards (`/leaderboards`, `/analytics`)

| Before | After |
|--------|--------|
| Gray analytics dashboard, tabs, charts | Global **ladder** with podium tiers, WR/streak copy |
| `/analytics` container layout | Same ladder on competitive shell (route preserved) |

### Tournaments (`/tournaments`)

| Before | After |
|--------|--------|
| Feature header + generic premium cards | Arena hero (open/live counts) |
| dl grid cards | **Arena cards** — prize pool focus, status pills, “Enter arena” |

### Tournament detail + brackets (`/tournaments/[id]`)

| Before | After |
|--------|--------|
| Legacy `Header`, orange/gray stat cards | `CompetitiveShell`, arena hero, 4-up stat strip |
| Orange tab triggers | `.chance-competition-tabs-list` / `.chance-competition-tab` |
| Gray bracket empty states | Premium bracket shell + progression copy |
| Full legacy client UI | Wrapped in `.chance-competition-tournament-detail` token overrides (cards, text, brand CTAs) |

**Logic unchanged:** register, start, delete, auto-advance, realtime refresh, chat tab, bracket math.

---

## UX principles applied

1. **Progression first** — heroes and meters answer “where am I going?” not “what are my numbers?”
2. **Timelines over tables** — match history reads as a path, not a database export
3. **Ladders over grids** — leaderboards show rank, tier, and challenge affordance
4. **Arenas over listings** — tournaments framed as brackets with pools and stages
5. **One ecosystem** — shared hero, pills, premium cards, brand CTAs across routes
6. **No new APIs** — `getLeaderboard`, `getUserStatistics`, Supabase match/tournament queries only

---

## Screenshots to capture

- [ ] Activity — hero + progress meter + timeline (win + loss nodes)
- [ ] Activity — streak banner
- [ ] Profile — hero + rank spotlight + achievements
- [ ] Rankings — spotlight + progress signals
- [ ] Leaderboards — ladder with “You” row
- [ ] Tournaments — arena grid
- [ ] Tournament detail — hero + stat strip + bracket tab
- [ ] Tournament — participants / matches tabs (post-override)
- [ ] Light + dark on each

---

## Remaining opportunities

- `/tournaments/create` — still legacy header/forms; align to arena “host” flow
- Profile rank spotlight uses `rank={null}` on server page; wire server-side ladder index or client hydrate like `/rankings`
- `AnalyticsDashboard` charts/trends unused on `/analytics`; reintroduce **performance arc** as optional timeline chart (presentation only) if product wants trends back
- Bracket match cells still shadcn innards — dedicated `.chance-competition-bracket-match` components (visual only)
- Nav: add Rankings / Leaderboards under Compete or Activity in `app-nav` (product decision)
- Game-scoped ladders (`getLeaderboard("game", gameId)`) — UI selector not built yet
- Token-based `UserRank` on Home vs stats-based ladder rank may diverge — document for players

---

## Technical debt

- `tournament-detail-client.tsx` — large legacy component; overrides via CSS, not full component rewrite
- `tournament-bracket.tsx` — main bracket tree still gray/orange in deep nodes; empty states migrated
- `match-history-table.tsx` — unused by Activity page; kept for other imports if any
- Achievements on Profile — same boolean rules as before, not persisted badges
- Rankings/Leaderboards depend on `user_statistics` population; empty ladder degrades gracefully

---

## Files touched (reference)

- `app/matches/page.tsx`, `app/profile/page.tsx`, `app/tournaments/page.tsx`, `app/tournaments/[tournamentId]/page.tsx`
- `app/leaderboards/page.tsx`, `app/rankings/page.tsx`, `app/analytics/page.tsx`
- `components/competition/*`
- `components/tournaments/tournament-detail-client.tsx` (tabs), `tournament-bracket.tsx` (empty states)
- `app/chance-competitive-rich.css` (competition block)
