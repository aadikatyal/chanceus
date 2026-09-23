# ChanceUS — Launch Design Audit

**Role:** Design Director pre-launch review  
**Date:** September 2026  
**Scope:** Full application route inventory vs. **Home → Play → Queue → Lobby** (locked, complete)  
**Method:** Source audit of layouts, shells, tokens, and shared components. No code changes in this pass.  
**North star:** One premium product — same typography, spacing, surfaces, motion, and IA — without reinventing completed layouts.

---

## Executive summary

The **core competitive journey** (`/dashboard`, `/games`, `/games/[gameId]`, `/games/match/[matchId]`) reads as a cohesive **“competitive rich”** product: `CompetitiveShell`, `chance-competitive-theme`, premium cards, brand green, mono stakes, sidebar + topbar + optional rail.

**~70% of authenticated routes** still use the **legacy stack**: page-level `bg-gray-950`, `text-white` / `text-gray-400`, shadcn `Card` with **rainbow border accents** (yellow/green/cyan/purple), and **orange** CTAs (landing, feedback, older game UIs). The global `Header` already consumes `--chance-*` tokens, but **page canvases fight the header** in light mode and feel like a different app.

**Launch risk:** A user who signs up on marketing orange, lands on polished Home, then opens **Activity** or **Wallet** experiences a **hard brand break** — not a bug, but a trust/clarity problem for a token product.

**Recommendation:** Treat launch polish as **shell + token migration** (presentation only), not new IA. Extend `CompetitiveShell` to primary nav siblings first, then auth/marketing, then verticals (bars, call).

---

## Reference design language (do not redesign)

| Element | Source of truth |
|--------|------------------|
| App chrome | `CompetitiveShell`, `CompetitiveSidebar`, `CompetitiveTopbar` |
| Theme | `.chance-competitive-theme`, `app/chance-competitive-rich.css` |
| Tokens | `app/chance-design-tokens.css`, `--chance-*` |
| Typography | `chance-hero-*`, `chance-text-caption`, `chance-text-mono`, section titles |
| Cards / CTAs | `chance-premium-card`, `chance-hero-cta-primary`, `chance-secondary-btn`, stat pills |
| Motion | Theme fade (`start-theme-transition`), subtle competitive CSS; avoid orange pulse blocks |
| Documented (partially adopted) | `DESIGN.md` + `components/design-system/*` — use for **forms/tables/dialogs** when migrating, not as a third visual language |

---

## Route scorecard

Scores: **Cohesion** (matches Home/Play), **Hierarchy**, **Primary action**, **Craft**, **Launch readiness** (1–10).  
**Effort** to reach 8+ without layout redesign: **S** (&lt;1d), **M** (1–3d), **L** (3–5d), **XL** (1–2w+).

### Tier A — Core journey (locked)

| Route | Cohesion | Hierarchy | Primary action | Craft | Ready | Notes |
|-------|----------|-----------|----------------|-------|-------|-------|
| `/dashboard` | 10 | 9 | 9 | 9 | 9 | Reference surface |
| `/games` | 9 | 9 | 9 | 8 | 9 | Play hub |
| `/games/[gameId]` | 9 | 9 | 9 | 8 | 8 | Queue |
| `/games/match/[matchId]` (waiting) | 9 | 8 | 8 | 8 | 8 | Lobby |
| `/games/match/[matchId]` (live) | 7 | 8 | 8 | 7 | 7 | HUD + legacy game innards; chat rail |

### Tier B — Primary nav (must feel native at launch)

| Route | Cohesion | Hierarchy | Primary action | Craft | Ready | Effort |
|-------|----------|-----------|----------------|-------|-------|--------|
| `/matches` (Activity) | 4 | 6 | 6 | 5 | 5 | **M** — shell + table/card tokens |
| `/wallet` | 4 | 7 | 7 | 5 | 5 | **M** — shell + balance hero + tx list |
| `/profile` | 4 | 6 | 5 | 5 | 5 | **M** |
| `/settings` | 4 | 7 | 7 | 5 | 5 | **S–M** |

### Tier C — Growth & social (post-core but visible in “More”)

| Route | Cohesion | Hierarchy | Primary action | Craft | Ready | Effort |
|-------|----------|-----------|----------------|-------|-------|--------|
| `/tournaments` | 4 | 6 | 7 | 5 | 5 | **L** |
| `/tournaments/[tournamentId]` | 4 | 5 | 6 | 4 | 4 | **L** |
| `/tournaments/create` | 4 | 6 | 7 | 5 | 5 | **M** |
| `/chat` | 4 | 6 | 6 | 5 | 5 | **M** |
| `/chat/dm/[userId]` | 4 | 6 | 6 | 5 | 5 | **M** |
| `/friends/add` | 4 | 6 | 8 | 5 | 5 | **M** |
| `/call` | 4 | 7 | 8 | 5 | 6 | **M** — clarify vs ranked match |
| `/call/[roomCode]` | 3 | 6 | 7 | 5 | 5 | **M** |

### Tier D — Acquisition & auth

| Route | Cohesion | Hierarchy | Primary action | Craft | Ready | Effort |
|-------|----------|-----------|----------------|-------|-------|--------|
| `/` (marketing) | 3 | 7 | 8 | 6 | 5 | **L** — orange vs green brand |
| `/auth/login` | 4 | 7 | 8 | 5 | 6 | **M** |
| `/auth/sign-up` | 4 | 7 | 8 | 5 | 6 | **M** |

### Tier E — Game adjacency & legacy entry points

| Route | Cohesion | Hierarchy | Primary action | Craft | Ready | Effort |
|-------|----------|-----------|----------------|-------|-------|--------|
| `/games/[gameId]/create` | 3 | 5 | 6 | 4 | 4 | **L** — overlaps Queue; confusing journey |
| `/games/[gameId]/play` | 3 | 5 | 5 | 4 | 4 | **M** — solo/practice path |
| `/watch` | 4 | 6 | 6 | 5 | 5 | **M** |
| `/replays/[matchId]` | 2 | 4 | 4 | 3 | 3 | **M** — no shell, bare container |
| `/replays/share/[shareToken]` | 2 | 4 | 4 | 3 | 3 | **M** |

### Tier F — Venues / bar vertical (separate product skin)

| Route | Cohesion | Hierarchy | Primary action | Craft | Ready | Effort |
|-------|----------|-----------|----------------|-------|-------|--------|
| `/bars`, `/bars/[barId]`, dashboards, sessions | 3 | 6 | 6 | 4 | 4 | **XL** |
| `/bar/join`, `/bar/session/[sessionId]` | 3 | 5 | 6 | 4 | 4 | **XL** |
| `/session/[sessionCode]` | 3 | 5 | 6 | 4 | 4 | **L** |

### Tier G — Internal / dev (not launch-facing)

| Route | Ready | Recommendation |
|-------|-------|----------------|
| `/design-system` | N/A | Keep internal; aligns with `DESIGN.md` |
| `/analytics` | 3 | No chrome; admin-only or hide |
| `/supabase-todos`, `/debug*`, `/demo-bar` | — | Gate behind env or remove from prod nav |

### Global overlays

| Surface | Cohesion | Ready | Notes |
|---------|----------|-------|-------|
| `FloatingFeedbackButton` | 2 | 4 | Fixed orange FAB — clashes with competitive green |
| `Toaster` | 7 | 7 | shadcn; tune to tokens |
| `app/error.tsx`, `not-found` | 4 | 5 | Legacy gray/orange |

---

## Per-route review (template answers)

For each page: **Same product?** **Matches Home/Play?** **Primary action?** **Hierarchy?** **Unnecessary UI?** **Handcrafted?** **Production ready?**

### Completed journey (summary)

- **Home / Play / Queue / Lobby:** Yes across all seven questions for cohesion; gameplay live state still carries legacy game panels (Math/Trivia/Connect inner UI).
- **Primary actions:** Clear — resume play, enter queue, ready up, play move.
- **Unnecessary UI:** Mostly removed in lobby/gameplay shell; match chat rail still “lobby” weight on small viewports.

### `/matches` (Activity)

| Question | Assessment |
|----------|------------|
| Same product? | **No** — legacy gray canvas + shadcn stat grid vs competitive home |
| Design language? | **Partial** — header tokens only |
| Primary action? | **Weak** — table is focus but no “Play again” hero |
| Hierarchy? | Stats → table OK; **fake trend** on `StatsCard` (“+12% from last week”) hurts trust |
| Unnecessary UI? | Rainbow border per stat card; debug `console.log` noise in UI layer |
| Handcrafted? | **Generic** dashboard template |
| Production ready? | **No** for brand; **Yes** for function |

### `/wallet`

| Question | Assessment |
|----------|------------|
| Same product? | **No** |
| Design language? | Yellow/green bordered cards — **pre-competitive accent system** |
| Primary action? | Buy/add tokens — present but not hero-level |
| Hierarchy? | Balance → stats → forms → history — OK |
| Unnecessary UI? | Duplicate token display vs topbar |
| Handcrafted? | Medium |
| Production ready? | Functional; Stripe success state needs competitive styling |

### `/profile` & `/settings`

| Question | Assessment |
|----------|------------|
| Same product? | **No** |
| Primary action? | Settings link / save profile — OK |
| Hierarchy? | Profile card → stats → achievements — dense but readable |
| Unnecessary UI? | Cyan/yellow avatar gradient unlike `ChancePlayerAvatar` system |
| Production ready? | Acceptable utility pages, not launch showcase |

### `/` marketing

| Question | Assessment |
|----------|------------|
| Same product? | **No** — orange gradient hero vs green competitive app |
| Primary action? | Sign up — **clear** |
| Hierarchy? | Hero → games → features — classic landing |
| Unnecessary UI? | Large duplicate eagle vs in-app logo treatment |
| Production ready? | **Marketing OK**; **brand mismatch** with logged-in product |

### Auth

| Question | Assessment |
|----------|------------|
| Same product? | **Partial** — header modern, page `bg-gray-950` |
| Primary action? | Submit login/sign-up — clear |
| Light mode? | **Broken feel** — forced dark page background |

### `/games/[gameId]/create`

| Question | Assessment |
|----------|------------|
| Same product? | **No** |
| Primary action? | **Conflicts with Queue** — second matchmaking UX |
| Production ready? | **High confusion risk** for launch IA |

### Tournaments / Chat / Friends / Call

| Question | Assessment |
|----------|------------|
| Same product? | **No** — consistent *legacy* pattern (Header + gray-950) |
| Primary action? | Each page has one; tournament bracket UI is busy |
| Call vs match | **Product education gap** — video route separate from ranked match (document in UI copy, not layout change) |

### Bar vertical

| Question | Assessment |
|----------|------------|
| Same product? | **Separate sub-brand** (venue ops, QR, sessions) |
| Launch? | Decide: **integrate shell** or **hide “Venues” until themed** |

### Replays / Watch / Analytics

| Question | Assessment |
|----------|------------|
| Same product? | **No** — minimal or missing chrome |
| Empty/error states? | Replay “not found” — plain text, no CTA back to Activity |

---

## Cross-cutting findings

### Typography

| Severity | Issue |
|----------|--------|
| **High** | Page titles stuck on `text-3xl font-bold text-white` vs `chance-hero-title` / section system |
| **High** | Body copy mix: `text-gray-400`, `chance-text-caption`, `text-muted-foreground` |
| **Medium** | Game components: ad-hoc `text-sm text-gray-300` blocks |
| **Low** | `DESIGN.md` scale (`chance-text-h1`–`h4`) rarely used outside `/design-system` |

### Spacing

| Severity | Issue |
|----------|--------|
| **Medium** | Legacy pages: `max-w-7xl py-8` vs competitive `chance-home-feed` rhythm |
| **Medium** | Card padding: shadcn defaults vs `chance-premium-card` (1.125rem) |
| **Low** | Inconsistent `mb-8` page headers vs competitive kicker + title pairs |

### Buttons & inputs

| Severity | Issue |
|----------|--------|
| **Critical** | Three CTA families: `chance-hero-cta-primary`, shadcn default, orange gradient (`Button` + `bg-orange-500`) |
| **High** | Forms (`LoginForm`, wallet, settings) use shadcn `Input`/`Button` without `ChanceInput` / competitive classes |
| **Medium** | Game actions: raw `bg-blue-600` buttons inside boards |

### Tables & lists

| Severity | Issue |
|----------|--------|
| **High** | `MatchHistoryTable` — shadcn Card list, not competitive row/table (`chance-play-*`, rails) |
| **Medium** | Transaction history — legacy card rows |
| **Medium** | Tournament bracket — custom gray/orange |

### Dialogs & sheets

| Severity | Issue |
|----------|--------|
| **Medium** | shadcn `Dialog`/`Sheet` — default radius/shadow; mobile nav sheet OK on both headers |
| **Low** | Call invite toast/dialog — gray-950 copy |

### Motion

| Severity | Issue |
|----------|--------|
| **Medium** | Theme toggle: premium fade on competitive routes; legacy pages feel instant elsewhere |
| **Medium** | Game timers: `animate-pulse` red blocks vs subtle HUD timer |
| **Low** | Landing `animate-fade-in` only on marketing |

### Color & borders

| Severity | Issue |
|----------|--------|
| **Critical** | **Orange vs green** — marketing + feedback + old match UI vs `--chance-brand` |
| **High** | Page `bg-gray-950` **locks dark canvas** under token-aware header (light mode fracture) |
| **High** | Stat cards: per-hue borders (`border-green-500/20`) vs neutral border + brand accent |
| **Medium** | Game boards: red/yellow player colors OK; surrounding chrome still gray-900 |

### Shadows & hover

| Severity | Issue |
|----------|--------|
| **Medium** | `card-hover` utility on legacy cards vs `chance-premium-card` elevation |
| **Low** | Inconsistent `hover-lift` on marketing links only |

### States

| Severity | Issue |
|----------|--------|
| **High** | **Loading:** many client pages jump from empty → content; no competitive skeletons |
| **High** | **Empty:** Activity table, chat, friends — generic text, no illustrated empty state |
| **Medium** | **Error:** Supabase setup pages inconsistent (`bg-black` vs `bg-gray-950`) |
| **Medium** | **Network:** gameplay “Syncing…” exists; legacy pages silent on fetch errors |

### Responsive

| Severity | Issue |
|----------|--------|
| **Medium** | Match route: chat column beside board — tight on tablet |
| **Medium** | Header mobile sheet vs competitive sidebar sheet — similar but not identical markup |
| **Low** | Bar/venue flows — desktop-first dashboards |

### Accessibility

| Severity | Issue |
|----------|--------|
| **Medium** | Phase pills + dots (gameplay) — good start; legacy status relies on color alone (red/yellow text) |
| **Medium** | Focus rings: `chance-focus-ring` on competitive CTAs; shadcn focus elsewhere |
| **Low** | Search in topbar — decorative on some routes (no behavior) |

### Legacy components & systems

| Severity | Item |
|----------|------|
| **Critical** | Dual chrome: `Header` + gray page vs `CompetitiveShell` |
| **High** | `components/ui/*` default on most routes; `components/design-system/*` only on `/design-system` |
| **High** | Inner game UIs: `simple-connect-four`, `multiplayer-math-blitz`, `multiplayer-trivia-challenge` — black/orange/blue shells |
| **Medium** | `StatsCard` fake trends |
| **Medium** | `EnhancedMatchInterface` legacy branch still used for waiting edge cases |
| **Low** | Duplicate nav logic in `Header` vs `CompetitiveTopbar` |

---

## Issue backlog by severity

### Critical (launch blockers for “one product” feel)

1. **Split app shell** — Only 4 route families use `CompetitiveShell`; primary nav **Activity** and **Wallet** do not.
2. **Orange vs brand green** — Marketing, floating feedback, and legacy game/match accents read as a different brand.
3. **Light/dark fracture** — `bg-gray-950` + `text-white` pages under token header break light mode and theme transition story.
4. **Dual match entry** — `/games/[gameId]/create` vs Queue — users see two different “find a match” experiences.

### High

5. Migrate **Activity, Wallet, Profile, Settings** to competitive shell (presentation swap, same data).
6. Replace **stat card rainbow borders** with neutral surfaces + mono metrics (reuse Home/Play stat pills).
7. **Match history table** — re-skin rows to competitive list/table; add empty state + “Play” CTA.
8. **Auth pages** — competitive auth panel (no gray-950 canvas); align with post-login Home.
9. **In-game component presentation** — embed mode for all multiplayer games (not only Connect Four compact).
10. **Floating feedback** — tokenized FAB or move to topbar overflow.
11. **Remove or wire fake analytics** on Activity stats (trend percentages).

### Medium

12. Marketing landing — **recolor** orange hero to brand green (keep layout); single CTA style.
13. Tournaments list/detail — shell + bracket density pass.
14. Chat / DM / Friends — shell + `chance-premium-card` chat container.
15. Call lobby — shell + clearer “video match, not ranked queue” copy.
16. Replays + Watch — minimal competitive shell + empty/error templates.
17. Consolidate **page title** component (`chance-section-title` + kicker).
18. Dialog/sheet token pass (radius, border, shadow from `--chance-*`).
19. Loading skeletons for shell main areas.
20. Match gameplay: optional **collapse chat** on `< lg` for board space.

### Low

21. `/analytics` — admin chrome or hide.
22. Dev/debug routes — env gate.
23. `not-found` / error pages — competitive illustration + link Home.
24. Nav search — implement or remove from topbar until ready.
25. Profile avatar — use `ChancePlayerAvatar` for consistency.
26. Ad script in root layout — unrelated to design but affects perf/perception (product call).

---

## Screenshots to capture (QA matrix)

Capture **light + dark** unless noted. Use consistent viewport set: **1440×900**, **390×844**, **768×1024**.

| # | URL / state | Why |
|---|-------------|-----|
| 1 | `/dashboard` | Reference — hero, rails, sidebar |
| 2 | `/games` | Reference — spotlight + library |
| 3 | `/games/[gameId]` | Reference — queue hub |
| 4 | `/games/match/[id]` waiting | Lobby arena + ready |
| 5 | `/games/match/[id]` in_progress | HUD + board + chat |
| 6 | `/games/match/[id]` completed | Result banner + rematch/friend |
| 7 | `/matches` | Legacy break vs Home |
| 8 | `/wallet` | Token cards + Stripe |
| 9 | `/profile`, `/settings` | Account surfaces |
| 10 | `/` logged out | Orange marketing |
| 11 | `/auth/login`, `/auth/sign-up` | Auth + header |
| 12 | `/tournaments` + detail | Bracket density |
| 13 | `/chat`, `/friends/add` | Social |
| 14 | `/call`, `/call/[room]` | Video UI vs match |
| 15 | `/games/[gameId]/create` | Legacy matchmaking |
| 16 | `/replays/[matchId]` empty | Bare error state |
| 17 | `/bars` or bar dashboard | Vertical skin |
| 18 | Global | Floating feedback over Home |
| 19 | Theme toggle | Home (fade) vs Wallet (hard) |
| 20 | Mobile sheet nav | Competitive vs legacy Header |

---

## Recommended execution order

| Phase | Work | Outcome | Est. |
|-------|------|---------|------|
| **1** | `CompetitiveShell` → Activity, Wallet | Primary nav feels unified | **3–4d** |
| **2** | Profile, Settings, competitive page headers + stat patterns | Account trust | **2d** |
| **3** | Auth + marketing token alignment (green, shared CTAs) | Acquisition → app continuity | **4–5d** |
| **4** | Activity table, wallet tx list, empty/loading states | Production polish | **3d** |
| **5** | Game embed skins (Math, Trivia, C4) + gameplay timer/score wiring | Live match premium | **5–7d** |
| **6** | Tournaments, Chat, Friends, Call — shell only | “More” menu credible | **5d** |
| **7** | Replays, Watch, errors, feedback FAB | Edge journeys | **2–3d** |
| **8** | Bars vertical OR hide nav item | Scope decision | **XL optional** |

**Do not redesign** Home, Play, Queue, Lobby layouts in these phases — **wrap and re-skin** only.

---

## Reusable components (prioritize adoption)

| Component / pattern | Location | Use on |
|--------------------|----------|--------|
| `CompetitiveShell` + rail slot | `components/app/` | All authenticated primary/more nav |
| `chance-premium-card` | CSS + compositions | Tables, chat, wallet panels |
| `chance-hero-cta-primary` / `chance-secondary-btn` | CSS | Replace shadcn orange/blue CTAs |
| `chance-play-stat-pill`, `chance-text-mono` | Play/Home | Activity, Wallet metrics |
| `ChancePlayerAvatar` | dashboard | Profile, tables, friends |
| `chance-section-title` + kicker | competitive CSS | Page headers |
| `chance-focus-ring` | CSS | All interactive elements |
| `ChanceButton`, `ChanceInput`, `ChanceCard` | design-system | Forms/dialogs when touching legacy |
| `GameplayShell` | gameplay | Live match (extend props for scores/timer) |
| Home rails (`HomeRail`, `WalletRail` patterns) | dashboard | Optional Activity sidebar |

---

## Technical debt (design-relevant)

- **Two navigation implementations** (`Header` vs `CompetitiveTopbar`) — drift risk.
- **`DESIGN.md` vs competitive rich** — two documented systems; launch should pick **competitive rich** as product truth, design-system for primitives.
- **Game logic UI coupled** — large TSX files with inline Tailwind; embed/presentation props needed per game.
- **Console logging** in production UI components (match table, header).
- **Placeholder trends** on stats.
- **Create match route** overlaps Queue — IA debt, not just color.
- **Post-match** — results live inside match route; no dedicated results screen (future polish).
- **Spectator / watch** — partially implemented, weak visual tie-in.

---

## Polish opportunities (high ROI, low layout risk)

1. **Tokenize floating feedback** — 30 min visual win on every route.
2. **Shared `AppPageHeader`** — kicker, title, description, one primary CTA (used on Activity, Wallet, Tournaments).
3. **Empty state kit** — icon + one line + CTA to `/games` (Activity, chat, friends, replays).
4. **Skeleton kit** — main column + rail placeholders matching Home.
5. **“Syncing” pattern** — reuse gameplay banner style on any polling client view.
6. **Call vs ranked** — one-line explainer in sidebar tooltips or first visit (copy only).
7. **Suppress chat rail** below breakpoint during live gameplay.
8. **Stripe success** — competitive modal/banner matching Wallet hero.

---

## Launch readiness verdict

| Area | Verdict |
|------|---------|
| Core loop (Home → match) | **Ship-ready** with known gameplay inner UI debt |
| Primary nav completeness | **Not launch-unified** — Activity/Wallet will feel like a different app |
| Acquisition funnel | **Functional** — brand mismatch acceptable short-term if Phase 3 scheduled |
| Social / tournaments / call | **Beta quality** visually |
| Bar vertical | **Separate product** — do not block competitive launch on full bar polish |
| Dev routes | **Hide** before public launch |

**Design Director call:** Approve launch of the **competitive loop** as the hero experience; gate public marketing on a **minimum Phase 1–3** shell migration so first-session users never hit gray-950 Activity/Wallet after green Home.

---

## Related docs

- `DESIGN.md` — primitive reference (migration target for forms)
- `MATCH_LOBBY_REVIEW.md` — lobby presentation
- `GAMEPLAY_REVIEW.md` — active match HUD
- `DASHBOARD_REVIEW.md` / Play reviews (if present) — historical

---

*Audit complete. No product source modified in this pass.*
