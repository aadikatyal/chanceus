# ChanceUS — Top 1% Roadmap

Derived from `TOP_1_PERCENT_REVIEW.md`. **No code in this document** — execution guide only.

**Principle:** Phase 1 = maximum **perceived** quality gain per line changed. Later phases deepen gameplay, bar, and marketing.

**Constraints (carry all phases):**
- Do not change matchmaking, payment, or game logic unless listed as dependency.
- Game boards (Connect Four, Math Blitz, etc.) — **shell only** until Phase 5.
- Preserve `--chance-*` as single source of truth (`DESIGN.md`).
- Visual QA in **light + dark** before closing each phase.
- Capture screenshots: `/`, `/auth/login`, `/dashboard`, `/games`, `/wallet`, `/matches`, one bar route → `docs/migration-screenshots/`.

---

## Phase 0 — Trust & stability (pre-requisite)

**Expected improvement:** Product stops lying; dev/prod stops embarrassing you. **Visual gain: low; trust gain: critical.**

| Item | Action |
|------|--------|
| Remove fake “1,247” stat | `app/games/page.tsx` |
| Gate debug routes | `middleware.ts`, `app/debug*/page.tsx` |
| Remove/gate `/supabase-todos` | `app/supabase-todos/page.tsx` |
| Env-gate server console dumps | `app/games/page.tsx`, `lib/supabase/middleware.ts` |
| Remove hardcoded match trends | `app/matches/page.tsx`, `components/dashboard/stats-card.tsx` |
| Fix server `onClick` lobby | `app/games/[gameId]/page.tsx` |
| Fix create page user on error path | `app/games/[gameId]/create/page.tsx` |
| CSS/build hygiene | `components/ui/calendar.tsx`, `app/layout.tsx`, `app/globals.css`, `scripts/next-dev.mjs`, `next.config.mjs` |

**Effort:** 2–4 engineer-days  
**Files affected:** ~10  
**Dependencies:** None  
**Risk:** Low — mostly deletes and guards  
**Rollback:** Feature flags for debug if needed  

---

## Phase 1 — Global chrome + token enforcement (biggest visual lift, fewest concepts)

**Expected improvement:** **~60%** of “world-class” feel — one shell, one nav, one background, header/body match. Users stop whiplash after dashboard.

### Work

1. **`AppPageShell` on all authenticated hubs**  
   - Replace duplicated `min-h-screen bg-gray-950` + `main max-w-*` blocks.  
   - Width presets: `app` (7xl hubs), `wide` (games lobby), `content` (settings/chat).

2. **`ChancePageHeader` on every hub**  
   - Replace `h1 text-3xl font-bold text-white` + gray subtitle.

3. **Token ban list (eslint or grep CI)**  
   - Fail PRs introducing `bg-gray-950`, `text-white` (raw), `#FFA500`, `bg-orange-500` in `app/` and `components/` (exclude `components/games/*` boards).

4. **Header completion**  
   - Link token pill → `/wallet`.  
   - Group mobile nav (Play / Money / Social / Venues).  
   - Remove duplicate Games/Wallet from dropdown.  
   - Move feedback trigger from floating orb → menu item.

5. **Root layout**  
   - Skip link to `#main-content` globally.  
   - Restrict AdSense to landing only (if kept).

6. **Floating feedback**  
   - Remove fixed orange FAB or restyle to Chance ghost + header entry.

### Files affected (primary)

| File | Change |
|------|--------|
| `components/app/app-page-shell.tsx` | Default tokens only; document widths |
| `components/navigation/header.tsx` | IA grouping, wallet link, feedback |
| `components/design-system/layouts.tsx` | `ChancePageHeader` adoption |
| `app/games/page.tsx` | Shell + header |
| `app/wallet/page.tsx` | Shell + header |
| `app/matches/page.tsx` | Shell + header |
| `app/tournaments/page.tsx` | Shell + header |
| `app/chat/page.tsx`, `app/chat/dm/[userId]/page.tsx` | Shell |
| `app/profile/page.tsx`, `app/settings/page.tsx` | Shell |
| `app/call/page.tsx`, `app/call/[roomCode]/page.tsx` | Shell |
| `app/bars/page.tsx` | Server user + shell |
| `components/feedback/floating-feedback-button.tsx` | Demote or restyle |
| `app/layout.tsx` | Skip link, ads scope |
| `app/globals.css` | Deprecate `card-hover` later |

**Effort:** 5–8 engineer-days  
**Dependencies:** Phase 0 complete  
**Risk:** Medium — wide diff, low logic risk  
**Mitigation:** One PR per route cluster (games+matches, wallet, social)  

---

## Phase 2 — Auth + wallet fintech pass (first-run & money trust)

**Expected improvement:** Login and wallet feel **Mercury/Stripe**-adjacent; first impression no longer “arcade.” **~15%** additional quality score.

### Work

1. **Auth** — `login-form.tsx`, `sign-up-form.tsx`, `app/auth/*/page.tsx`  
   - `ChanceButton`, `ChanceField`, `ChanceCard`  
   - Copy: remove arena metaphors; plain microcopy  
   - Background: `--chance-bg`, not gray-950 slab

2. **Wallet** — `app/wallet/page.tsx`, `add-tokens-form.tsx`, `BuyButtons.tsx`, `transaction-history.tsx`, `stripe-payment-form.tsx`  
   - Balance hero (copy dashboard `DashboardSummary` pattern)  
   - Single purchase panel (merge duplicate flows)  
   - Ledger table with mono amounts, hairline rows  
   - Remove rainbow stat card borders

3. **Stripe return** — meaningful Suspense fallback skeleton

### Files affected

~12 wallet/auth components + 2 routes  

**Effort:** 4–6 days  
**Dependencies:** Phase 1 shell  
**Risk:** Medium for payments UI — **visual only**, no Stripe logic changes  
**QA:** Test checkout flow end-to-end after UI merge  

---

## Phase 3 — Games & matches operational UI (core loop density)

**Expected improvement:** `/games` and `/matches` scan like **Kalshi/Linear** — rows, tables, live data. **~20%** quality lift for power users.

### Work

1. **`/games`** — Replace `GameCard` grid emphasis with table/rows (keep thumbnails optional secondary column).  
2. **`QuickActions` pattern** already on dashboard — reuse for games list from DB.  
3. **`/games/[gameId]`** — token surfaces; client CTAs; lobby as dense list not card stack.  
4. **`/matches`** — retire 4-up `StatsCard`; inline KPIs + `MatchHistoryTable` with Chance table styles.  
5. **`components/games/match-list.tsx`, `matchmaking-*`** — border hairlines, no gray-900 cards.  
6. **`/games/match/[matchId]`** — Phase 3a: shell + header always; Phase 3b: decompose states (XL, separate project).

### Files affected

`app/games/**`, `app/matches/page.tsx`, `components/games/*`, `components/matches/*`, `components/dashboard/stats-card.tsx` (deprecate)

**Effort:** 8–12 days (3b match page additional 5–8)  
**Dependencies:** Phase 1–2  
**Risk:** High on match page — split 3a/3b  
**Do not:** Restyle game canvas internals in 3a  

---

## Phase 4 — Dashboard polish + social layer

**Expected improvement:** Dashboard becomes **template** for rest of app; friends/chat/call stop looking legacy.

### Work

1. **`friends-online.tsx`** — full Chance dialog (remove legacy orange).  
2. **Chat** — `ChatPageLayout`, flex height, chance inputs.  
3. **Nav** — add Friends or merge into social; decide Watch → Matches spectate.  
4. **Copy** — “Market payouts” → accurate label.  
5. **Analytics** — merge into dashboard section or remove orphan `/analytics` route.

### Files affected

`components/dashboard/friends-online.tsx`, `components/chat/*`, `app/chat/**`, `app/analytics/page.tsx`, `app/dashboard/page.tsx`

**Effort:** 5–7 days  
**Dependencies:** Phase 3 table patterns  
**Risk:** Low–medium  

---

## Phase 5 — Tournaments + profile + settings

**Expected improvement:** Competitive features feel **official**, not Discord bot.

### Work

- Tournaments list/detail/create → Chance badges, buttons, headers  
- Profile → remove rainbow noise; stat strip like dashboard  
- Settings → `ChanceSplitLayout` (Notion/Linear settings)

**Files:** `app/tournaments/**`, `components/tournaments/*`, `app/profile/page.tsx`, `app/settings/page.tsx`, `components/settings/*`

**Effort:** 6–9 days  
**Dependencies:** Phase 2 forms  
**Risk:** Medium (tournament password gate UX)  

---

## Phase 6 — Bar cluster unification (IA + visual merge)

**Expected improvement:** Bar hosts stop thinking ChanceUS is a **different app**.

### Work

1. **URL consolidation plan** — redirects: `/session/:code` → canonical; document host vs player.  
2. **Retire purple gradient onboarding** — `bars/create`, `demo-bar` → Chance onboarding.  
3. **Migrate** `bar/join`, `bars/[barId]/**`, `bar/session/**` to `AppPageShell`.  
4. **Dialog/modal** audit → shadcn Dialog + tokens.  
5. **`/demo-bar`** dev-only.

**Files:** `app/bars/**`, `app/bar/**`, `app/session/**`, `components/bar/**`

**Effort:** 10–15 days  
**Dependencies:** Phase 1 shell, Phase 2 forms  
**Risk:** **High** — many client pages; venue flows critical  
**Mitigation:** One bar route at a time; QA with real QR flow  

---

## Phase 7 — Marketing landing + light mode hardening

**Expected improvement:** Logged-out story matches logged-in product; theme toggle honest.

### Work

- `/` — `ChanceMarketingShell`, restrained hero, DB-driven games, no rainbow feature icons  
- Remove hardcoded game IDs on landing  
- Light mode pass: delete `html:not(.dark) .text-white` hacks as pages migrate to tokens  
- `error.tsx`, `not-found.tsx` branded

**Effort:** 8–12 days  
**Dependencies:** Phases 1–3 prove token-only pages work  
**Risk:** Medium (SEO/marketing stakeholder review)  

---

## Phase 8 — Delight & optional world-class extras

**Expected improvement:** Last 5–10% — not required for credible launch.

- Command palette (navigation)  
- Keyboard shortcuts panel in match  
- Subtle page transition on shell only  
- Internal link to `/design-system` from settings (team)  
- Visual regression CI (Chromatic or similar)

**Effort:** 5–15+ days optional  
**Dependencies:** All prior phases  
**Risk:** Scope creep — defer aggressively  

---

## Phase summary table

| Phase | Visual Δ (cumulative est.) | Effort | Primary files | Risk |
|-------|---------------------------|--------|---------------|------|
| 0 Trust | +5% trust | S | games, middleware, debug | Low |
| 1 Chrome | **+60%** | M | shell, header, 10+ routes | Med |
| 2 Auth/Wallet | +15% | M | auth, wallet components | Med |
| 3 Games/Matches | +20% | L–XL | games, matches, match page | High |
| 4 Social | +10% | M | friends, chat, analytics | Med |
| 5 Tournaments/Profile | +10% | M | tournaments, settings | Med |
| 6 Bar cluster | +15% | XL | bar routes, components | High |
| 7 Landing/Light | +10% | L | `app/page.tsx`, globals | Med |
| 8 Optional | +5% | Optional | various | Low |

---

## Dependencies graph (simplified)

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
                │                      │
                └──────────► Phase 5 ──┘
                │
                └──────────► Phase 6 (needs 1 + 2)
Phase 3 ──► Phase 7 (landing aligns with hub patterns)
Phase 8 (after 7)
```

---

## Recommended PR slicing (reviewable units)

1. Phase 0 only (trust fixes)  
2. AppPageShell + games + matches  
3. AppPageShell + wallet + auth visual  
4. Dashboard friends dialog + header IA  
5. Games table layout  
6. Wallet ledger  
7. Bar — join flow only  
8. Bar — host dashboard  
9. Landing  

---

## Success metrics (qualitative)

- **Consistency:** No route uses raw `gray-950` shell after Phase 1.  
- **Trust:** Zero fake numbers in UI after Phase 0.  
- **Navigation:** Every protected feature reachable in ≤2 clicks from header.  
- **Theme:** Light mode usable on dashboard, games, wallet after Phase 2–3.  
- **Benchmark:** Side-by-side screenshot with Stripe dashboard — same *density class*, not same colors.

---

## What NOT to do (preserve focus)

- Do not invent a fourth visual theme.  
- Do not redesign game boards before shells stable.  
- Do not add new dashboard widgets — consolidate first.  
- Do not enable Turbopack dev until Tailwind v4 migration is intentional.  
- Do not preserve `/debug-matches` for “convenience” in production.

---

*Roadmap aligns with existing `MIGRATION_PLAN.md` but prioritizes trust, shell, and wallet before landing hero work.*
