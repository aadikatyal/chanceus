# ChanceUS — Product Readiness Audit

**Reference:** `DESIGN_BIBLE.md` (source of truth)  
**Audit date:** September 2026  
**Method:** Full-repo review — canonical routes, shared components, tokens/CSS, player flows, a11y/perf signals. **No code modified.**

**Frozen canonical surfaces (do not redesign):** Home, Play, Queue, Lobby, Wallet (+ live gameplay presentation on match route).

---

# 1. Design Consistency

Implementation vs. bible gaps, grouped by category. **Canonical routes** are noted where they largely comply but have known inner drift.

## Typography

| Gap | Where | Bible expectation |
|-----|--------|-------------------|
| Legacy `text-white` / `text-gray-400` in nested UI | `MatchHistoryTable`, `ChatWindow`, game internals (`multiplayer-*`, `create-match-form`), bar/call/tournament components | `chance-text-caption`, `var(--chance-fg)`, `chance-section-title` |
| Page titles on migrated canvas still mixed | Auth, Profile, Settings, Tournaments — `chance-hero-title` on shell only; inner forms use shadcn labels | Kicker → title → caption hierarchy |
| Emoji as primary game identifiers | Activity `MatchHistoryTable` (🧮🔴🧠) | Lucide + mono; thumbnails on Play |
| `text-3xl` ad-hoc on legacy inner cards | Profile header, tournament detail | `chance-hero-title` scale |

**Canonical OK:** Home hero, Play spotlight, Queue hub, Lobby arena title, Wallet balance hero.

## Spacing

| Gap | Where |
|-----|--------|
| `max-w-7xl mx-auto py-8` on non-shell routes | Chat, Call, Tournaments, Profile, Settings |
| Inconsistent section gaps | Activity: stats grid + table vs. bible `gap-8` feed rhythm |
| Double padding on some legacy mains | Header + main without shell rail alignment |
| Play page: lobbies block `mt-8` separate from `chance-home-feed` wrapper | Minor rhythm break inside Play |

## Radius

| Gap | Where |
|-----|--------|
| `rounded-lg` / `rounded-xl` on gray shadcn cards | Activity table, chat, auth forms, tournaments |
| Bible `chance-radius-shell` (16px) on premium surfaces | Partial — canonical uses; legacy uses Tailwind `rounded-lg` (8px) inconsistently |

## Buttons

| Gap | Where |
|-----|--------|
| shadcn `Button` default/orange/yellow/cyan gradients | ~60+ files; `MatchHistoryTable`, `CreateMatchForm`, `AddTokensForm`, bar/tournament UIs |
| Three families coexist | `chance-hero-cta-primary`, `ChanceButton`, shadcn + raw Tailwind (`bg-blue-600` in games) |
| **Canonical OK:** Play, Queue, Lobby ready, Wallet hero/packs |

## Cards

| Gap | Where |
|-----|--------|
| `Card` + `bg-gray-900/80 border-*-500/20` KPI pattern | Activity `StatsCard` (rainbow borders + fake trends) |
| Inner game panels `bg-gray-900/50` | Math/Trivia/C4 during gameplay |
| **Canonical OK:** `chance-premium-card` on Home, Play, Queue, Wallet, Lobby |

## Tables

| Gap | Where |
|-----|--------|
| Activity uses stacked gray rows, not `chance-table-rich` / queue row pattern | `components/matches/match-history-table.tsx` |
| No competitive empty state CTA pattern | Activity empty copy only (no Find a match button in table) |
| Export button non-functional | Removed from Wallet tx; Activity table may still expose dead actions if present |

## Forms

| Gap | Where |
|-----|--------|
| Login/sign-up/settings use shadcn Input + gray focus rings | Not `chance-focus-ring` + `--chance-border` |
| Feedback modal inner fields partially tokenized; dialog shell still gray-900 option on some paths | `feedback-modal.tsx` |
| **Canonical OK:** Wallet transfer form, BuyButtons modal shell (post-polish) |

## Navigation

| Gap | Where |
|-----|--------|
| **Dual chrome:** `CompetitiveShell` (6 routes) vs `Header` (20+ routes) | Same `app-nav.ts` but different layout, token pill, sheet behavior |
| Logged-out landing uses `Header` only | No sidebar; expected |
| Search in topbar | Decorative / non-functional (bible: optional until shipped) |

## Icons

| Gap | Where |
|-----|--------|
| Mixed stroke weights | Most canonical use 1.75; some legacy `h-4 w-4` without stroke class |
| Emoji in Activity | See typography |

## Colors

| Gap | Where |
|-----|--------|
| Hardcoded Tailwind semantic colors | `text-green-400`, `text-red-400`, `border-cyan-500/20`, yellow buy buttons in dead `add-tokens-form` |
| Game board semantics (red/yellow chips) | Acceptable for game rules; **surrounding** chrome should stay tokenized |
| Marketing `/` | Brand gradients applied; inner game cards still `border-gray-800`, `hover:border-yellow` on landing showcase |
| Bar/call/orange stragglers | `friends-online`, `call-lobby`, bars pages |

## Motion

| Gap | Where |
|-----|--------|
| Theme fade only on competitive + toggle | Legacy pages feel instant |
| `animate-pulse` on game timers (C4, legacy HUD) | Bible: subtle; gameplay prefers phase pill |
| Live dot pulse | Canonical; has reduced-motion guard in CSS |
| Match completion refresh delay 1s | `GamesPageClient` — functional jitter |

## Loading

| Gap | Where |
|-----|--------|
| Few skeletons outside Home/Play rails | `chance-skeleton` underused on Activity, Chat, Tournaments |
| Suspense `fallback={null}` | Wallet Stripe success |
| Full-page compile flashes | Dev-only; prod needs route-level loading UI on heavy routes |

## Empty states

| Gap | Where |
|-----|--------|
| **Canonical pattern:** `EmptyState` + CTA to `/games` | Play rails, Play library |
| Legacy text-only empty | Activity table, Chat, Replays, many bar pages |
| **Canonical OK:** Wallet transaction empty |

## Error states

| Gap | Where |
|-----|--------|
| `app/error.tsx`, `not-found` — legacy gray/orange | Not competitive illustration + Home CTA |
| Replay not found — plain `text-gray-400` container | No shell |
| Supabase setup pages | Token bg on some routes; inconsistent copy |

## Dark mode / Light mode

| Gap | Where |
|-----|--------|
| Canvas tokens on many routes via `chance-competitive-theme` | **Inner** components still hardcoded dark-gray panels → low contrast in **light mode** on Activity/Chat/Profile |
| Game `bg-black` embeds | Gameplay overrides exist but incomplete for Math/Trivia |
| Avatar gradients | shadcn cyan/yellow fallback vs `ChancePlayerAvatar` |

## Responsive

| Gap | Where |
|-----|--------|
| **Canonical OK:** shell sidebar sheet, rail stack | — |
| Live match chat column beside board | Tight on tablet; bible suggests optional collapse |
| Activity stats `xl:grid-cols-4` KPI grid | Bible Wallet/Activity target: reduce KPI feel (Activity still 4-up) |
| Bar dashboards | Desktop-first, not launch-critical |

## Accessibility (design-related)

| Gap | Where |
|-----|--------|
| Phase pills + dots | Gameplay — good |
| Legacy status = color only | Activity win/loss text colors; game “your turn” yellow/green |
| Focus rings inconsistent | shadcn vs `chance-focus-ring` |

---

# 2. Engineering Quality

## Duplicate / parallel components

| Item | Notes |
|------|--------|
| `Header` vs `CompetitiveTopbar` + `CompetitiveSidebar` | Duplicate nav logic, token subscription, sheets |
| `game-card.tsx` vs `play-game-card.tsx` | Overlap; Play uses play variant |
| `match-interface.tsx` vs `enhanced-match-interface.tsx` | Legacy vs active |
| `add-tokens-form.tsx` vs `BuyButtons.tsx` | Stripe path is BuyButtons; add-tokens may be dead/unused on routes |
| `chat-window.tsx` vs `enhanced-chat-window.tsx` | Unclear single owner |
| `app-page-shell.tsx` vs `CompetitiveShell` | Legacy wrapper |
| `my-matchmaking-queues.tsx` vs `PlayMyQueues` | Potential duplication |

## Duplicate CSS

| Item | Notes |
|------|--------|
| `chance-design-tokens.css` + `chance-competitive-rich.css` + shadcn `globals.css` | Three layers; rich overrides repeat hero/button blocks (~1177 vs ~333) |
| `.chance-btn-primary` vs `.chance-hero-cta-primary` | Overlapping CTA styles |
| Tailwind `card-hover` vs premium card hover | Legacy pages |

## Unused / underused tokens

| Item | Notes |
|------|--------|
| `ChanceButton`, `ChanceCard`, `ChanceInput` | Mostly `/design-system` only |
| `--chance-max-app`, `--chance-max-wide` | Rarely applied in canonical feed (intentionally fluid) |
| `DESIGN.md` vs `DESIGN_BIBLE.md` | Two docs; bible governs — `DESIGN.md` creates drift risk |

## Dead / legacy code

| Item | Notes |
|------|--------|
| `CreateMatchForm` + route redirect | Component remains; route is redirect-only |
| `app/games/[gameId]/play` | Solo practice path; legacy shell |
| `debug-*`, `demo-bar`, `supabase-todos` | Should not ship publicly |
| `GamesPageClient` | Null render; only subscription — could merge into Play realtime |
| `forceCompleteMatches()` on Play page load | Operational hack; side effects on every visit |

## Hardcoded values

| Type | Prevalence |
|------|------------|
| Colors | Widespread in `components/games/*`, bar, tournament, chat (~40+ files with gray/orange/cyan classes) |
| Spacing | Ad-hoc `p-4`, `mb-8`, `gap-6` without `--chance-space-*` |
| Typography | `text-sm`, `text-lg` instead of bible classes |

## Inline styles

| Item | Notes |
|------|--------|
| `ChancePlayerAvatar` gradient | Acceptable (deterministic) |
| BuyButtons past `style={{ pointerEvents }}` | Mostly removed |
| Bar QR / game canvases | Some inline for game boards |

## Large components (decomposition candidates)

| File | ~Lines | SRP issue |
|------|--------|-----------|
| `multiplayer-math-blitz.tsx` | 2,489 | Game + UI + networking + completion |
| `enhanced-match-interface.tsx` | 1,908 | Match lifecycle + renderGame + friend + countdown |
| `simple-connect-four.tsx` | 1,646 | Game + rematch + friend + history |
| `multiplayer-trivia-challenge.tsx` | large | Same pattern |
| `app/games/match/[matchId]/page.tsx` | 517 | Page + many handlers (partially extracted to lobby view) |
| `tournament-detail-client.tsx` | large | Bracket + registration UI |

## Console noise

| Item | Notes |
|------|--------|
| **100+ `console.log` in production paths** | `enhanced-match-interface` (~92), `simple-connect-four` (~71), match page, middleware debug, Play subscription |

## Cleanup plan (engineering)

1. **P0 — Launch hygiene:** Remove/gate debug routes; strip or env-guard verbose `console.log` in match/game paths; document `forceCompleteMatches` (remove from hot path or move to cron).
2. **P1 — Shell migration:** Replace `Header` with `CompetitiveShell` on Activity-adjacent primary nav (Profile, Settings) without layout redesign — presentation swap only.
3. **P1 — Component consolidation:** Deprecate `game-card` in favor of `play-game-card`; archive `match-interface`; delete or wire `add-tokens-form`.
4. **P2 — Activity presentation:** Re-skin `MatchHistoryTable` to competitive rows; remove fake `StatsCard` trends; optional single summary line vs 4 KPI cards.
5. **P2 — Game embed mode:** Extract presentation props for Math/Trivia (Connect Four `compactPresentation` pattern).
6. **P3 — Split god components:** Extract hooks (`useMatchSync`, `useGameComplete`) from 1k+ line game files — behavior unchanged.
7. **P3 — CSS consolidation:** Merge duplicate hero/CTA blocks in `chance-competitive-rich.css`; migrate legacy pages off shadcn gray cards incrementally.

---

# 3. UX — Player flows

Scale: **Strong** / **Adequate** / **Weak** | Next action obvious?

## Landing (`/`)

| Question | Assessment |
|----------|------------|
| Next action obvious? | **Yes** — Sign up / Explore games |
| Hesitation? | Brand shift vs logged-in app (landing cards still gray/yellow accents) |
| Friction | Extra eagle + marketing length before app |
| Overload | Long feature sections |
| Unfinished | Logged-in users redirect — OK |

## Signup / Login

| Question | Assessment |
|----------|------------|
| Next action obvious? | **Yes** |
| Hesitation? | Legacy gray form on token canvas — trust dip after marketing |
| Friction | Header nav while logged out differs from in-app shell |
| Unfinished | No competitive auth card treatment |

## Home (`/dashboard`)

| Question | Assessment |
|----------|------------|
| Next action obvious? | **Strong** — Find a match, featured games, active match banner |
| Hesitation? | Many rails — still scannable |
| Friction | Low |
| Unfinished | Optional: clearer active-match sticky |

## Play (`/games`)

| Question | Assessment |
|----------|------------|
| Next action obvious? | **Strong** — Spotlight + Queue on cards |
| Hesitation? | Host vs Queue both go to queue (OK post-redirect) |
| Friction | Page weight: many server queries + cleanup + force complete + realtime refresh |
| Unfinished | `GamesPageClient` invisible refresh can surprise |

## Queue (`/games/[gameId]`)

| Question | Assessment |
|----------|------------|
| Next action obvious? | **Strong** — Enter queue |
| Hesitation? | Stake affordability |
| Friction | Low when tokens sufficient |
| Unfinished | “Custom lobby” = same queue (label OK) |

## Lobby (`/games/match/[matchId]` waiting)

| Question | Assessment |
|----------|------------|
| Next action obvious? | **Strong** — Ready up |
| Hesitation? | Friend accept edge cases |
| Friction | Chat rail optional noise pre-match |
| Unfinished | Spectator/join paths OK |

## Gameplay (live)

| Question | Assessment |
|----------|------------|
| Next action obvious? | **Adequate→Strong** — HUD + board; inner game UI still legacy for Math/Trivia |
| Hesitation? | “Syncing…” without websocket; dual timer sources |
| Friction | Chat column on small screens |
| Unfinished | Inner skins; score/timer not unified all games |

## Results

| Question | Assessment |
|----------|------------|
| Next action obvious? | **Weak** — No dedicated results route; banner + rematch in-game/C4 |
| Hesitation? | Where to go after win — back to Play not always highlighted |
| Friction | Post-match tokens update relies on refresh |
| Unfinished | **Dedicated results beat** (bible emotional goal) not shipped |

## Wallet (`/wallet`)

| Question | Assessment |
|----------|------------|
| Next action obvious? | **Strong** — Balance hero, Add/Withdraw/Find match |
| Hesitation? | Withdraw = P2P transfer (label clarity for new users) |
| Friction | Low |
| Unfinished | Stripe modal theming minor |

## Tournament

| Question | Assessment |
|----------|------------|
| Next action obvious? | **Adequate** on list; bracket busy |
| Hesitation? | Password gate; legacy UI |
| Friction | Visual break leaving canonical shell |
| Unfinished | Full competitive skin |

## Profile / Settings

| Question | Assessment |
|----------|------------|
| Next action obvious? | **Adequate** |
| Hesitation? | Legacy dashboard feel |
| Friction | Not match-first |
| Unfinished | Shell + avatar system |

## Activity (`/matches`)

| Question | Assessment |
|----------|------------|
| Next action obvious? | **Weak** — Table is focus; no hero CTA; fake trend KPIs undermine trust |
| Hesitation? | KPI cards imply analytics that aren’t real |
| Friction | Visual break from Home |
| Unfinished | Competitive list + empty → Play |

---

# 4. Accessibility

| Area | Status | Gaps |
|------|--------|------|
| Keyboard navigation | Partial | Game boards column buttons; queue stakes need audit; shadcn dialogs OK |
| Focus management | Partial | `chance-focus-ring` on canonical CTAs; legacy forms inconsistent |
| Screen readers | Partial | Gameplay phase `role="status"`; Activity rows lack structured list semantics |
| ARIA | Partial | Skip link on shell; live regions for sync banner; chat messages variable |
| Contrast | Good on canonical light/dark tokens | Legacy `text-gray-400` on `bg-gray-800` in light theme fails |
| Touch targets | Mostly OK on CTAs | Small icon buttons in table rows |
| Reduced motion | Implemented | Theme + some CSS; game `animate-pulse` may ignore |
| Responsive | Shell strong | Gameplay + chat split; table horizontal scroll on Activity when migrated |

---

# 5. Performance

## Largest components / bundles

- **Client-heavy game modules** (`multiplayer-math-blitz`, `simple-connect-four`, `enhanced-match-interface`) load on match route — largest JS cost in core loop.
- **Play page server work:** Parallel Supabase fetches (games, queues, lobbies, tournaments, friends) + `forceCompleteMatches` + stuck-match logic.

## Heavy renders

- Realtime subscriptions: `GamesPageClient`, `MatchmakingInterface`, `matchmaking-realtime`, `CallInviteListener`, wallet token channels — multiple channels per session.
- `CleanupHandler`: server action on Play mount + every 5 min (reduced from 10s; still POST traffic).

## Images

- JPG thumbnails on Play/Home — appropriate; ensure `sizes` on Next/Image (mostly present on Play).

## Animations

- Hero art, premium card pseudo-elements, live pulse — low GPU cost; many simultaneous on Home.

## Opportunities

| Opportunity | Impact | Area |
|-------------|--------|------|
| Lazy-load game components by `game.name` on match route | High | Match page |
| Remove `forceCompleteMatches` from Play critical path | Medium | `/games` TTFB |
| Memoize Play catalog filters (already useMemo in client) | Low | Play |
| Stream Activity table body | Medium | `/matches` |
| Single realtime multiplexer vs many channels | Medium | App-wide |
| Route-level `loading.tsx` for match/play | Medium | UX perf |
| Code-split bar/tournament/call routes | Low (non-core) | Bundle |

---

# 6. Launch blockers

## Critical

| Issue | Effort | Files | Risk | Priority |
|-------|--------|-------|------|----------|
| Activity UX breaks trust (fake KPI trends + legacy table in shell) | M (2–3d) | `matches/page.tsx`, `stats-card.tsx`, `match-history-table.tsx` | Users question integrity of stats | P0 |
| Inner game UI breaks light mode / brand during gameplay (Math/Trivia) | L (5–7d) | `multiplayer-*.tsx`, CSS overrides | Core loop feels “old app” | P0 |
| No clear post-match results beat | M (3–4d) | `gameplay-shell`, match route | Weak closure after win/loss | P0 |
| Production debug logging volume | S (1d) | `enhanced-match-interface`, `simple-connect-four`, middleware | Noise, minor perf/leak | P0 |
| `forceCompleteMatches` on every Play load | S (0.5d) | `app/games/page.tsx`, `lib/force-complete-matches.ts` | Unexpected match state changes | P0 |

## High

| Issue | Effort | Files | Risk | Priority |
|-------|--------|-------|------|----------|
| Primary nav outside shell (Profile, Settings, Chat, Tournaments, Call) | M (4–5d) | `app/*/page.tsx`, reuse shell | Brand break mid-session | P1 |
| Auth/landing alignment with bible (no layout redesign) | M (3–4d) | `app/page.tsx`, auth pages, forms | Acquisition drop-off | P1 |
| Match history / Activity empty + CTA | S (1d) | `match-history-table.tsx` | Dead-end | P1 |
| Chat/feedback dialogs full token treatment | S (1–2d) | `chat-window`, `feedback-modal` | Polish | P1 |
| Replay route bare | S (1d) | `app/replays/*` | Broken journey from Activity | P1 |

## Medium

| Issue | Effort | Files | Risk | Priority |
|-------|--------|-------|------|----------|
| Consolidate duplicate nav/components | M | `header.tsx`, `game-card`, forms | Maintenance | P2 |
| Dedicated loading/skeleton on Activity, Chat | S | route `loading.tsx`, craft | Perceived perf | P2 |
| Gameplay chat collapse `< lg` | S | `match-lobby-page-view.tsx` | Tablet UX | P2 |
| Hide debug/admin routes in prod | S | middleware/env | Security perception | P2 |
| Global queue cleanup (service role) | M | SQL/cron, not client | Stale queue rows | P2 |

## Low

| Issue | Effort | Files | Risk | Priority |
|-------|--------|-------|------|----------|
| Bar vertical full skin | XL | `app/bar*`, `app/bars*` | N/A if nav hidden | P3 |
| `/analytics` chrome | S | `app/analytics` | Internal only | P3 |
| Merge DESIGN.md into bible appendix | S | docs | Doc drift | P3 |
| Search topbar implementation | L | topbar + API | Feature | P3 |

---

# 7. World-class opportunities (polish > features)

Benchmarks: **Steam** (library + presence), **FACEIT** (match clarity + hub), **Chess.com** (board-first + post-game), **Discord** (social presence), **Riot Client** (single hub + clear states), **Epic** (clean commerce).

Highest ROI **polish** remaining:

| Opportunity | Benchmark | ROI | Notes |
|-------------|-----------|-----|-------|
| **Unified client shell on all post-login routes** | Riot / FACEIT | Very high | Same sidebar/topbar/tokens — no new IA |
| **Post-match results screen (3s beat)** | Chess.com | Very high | Pot change, rank delta, Rematch + Queue again — reuse `GameplayShell` data |
| **Activity as “match log” not dashboard** | FACEIT | High | Row list like Wallet tx; filter by game; no fake analytics |
| **Presence strip consistency** | Discord | High | Friends rail online — same avatar/badge language everywhere |
| **Queue/wait single status language** | FACEIT | High | One string system: Syncing / Searching / Opponent found |
| **Board-first fullscreen toggle** | Chess.com | Medium | Hide chat/rail one tap in gameplay |
| **Sound/haptic-off subtle state ticks** | Steam | Medium | Optional; mute by default |
| **Skeleton-first rails** | Epic | Medium | Play/Activity never “pop” empty |
| **Token pill = balance + one-tap wallet** | Steam wallet | Medium | Already in topbar — ensure instant realtime everywhere |

Avoid for launch polish pass: new game modes, new social graph, redesigning frozen canonical layouts.

---

# Summary verdict

| Dimension | Launch readiness |
|-----------|------------------|
| Core loop (Home → Play → Queue → Lobby → Game → Wallet) | **Near ready** — presentation strong; gameplay inner UI + results closure gap |
| Primary nav coherence | **Not ready** — Activity shell partial; Profile/Settings/Chat/Tournaments legacy |
| Trust & polish | **At risk** — fake Activity trends, debug logs, operational hooks on Play |
| Engineering maintainability | **Needs pass** — 1k–2k line game files, duplicate chrome, shadcn drift |

**Recommended launch sequence:** P0 blockers → P1 shell/auth/Activity → selective P2 perf (force-complete, lazy games) → post-launch bar vertical.

---

# Appendix — Canonical route compliance snapshot

| Route | Shell | Bible typography | Premium cards | Primary CTA | Match-first |
|-------|-------|------------------|---------------|-------------|-------------|
| `/dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/games` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/games/[gameId]` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/games/match/[id]` | ✅ | ✅ | ✅ | ✅ | ✅ (gameplay inner partial) |
| `/wallet` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/matches` | ✅ | Partial | Partial | ❌ | Partial |
| All other authenticated | ❌/partial canvas | Partial | ❌ | Varies | Varies |

---

*Generated from static codebase review against `DESIGN_BIBLE.md`. Validate with light/dark manual QA on Safari, Chrome, and 390px viewport before release.*
