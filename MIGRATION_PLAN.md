# ChanceUS Design System Migration Plan

**Audit date:** September 22, 2026  
**Baseline:** `DESIGN.md`, `app/chance-design-tokens.css`, `components/design-system/*`  
**Current app:** `components/ui/*` (shadcn), pervasive `bg-gray-950` / `text-white` / orange·purple·blue·yellow accents  
**Code changes in this audit:** None (documentation only)

---

## Executive summary

Only **`/design-system`** uses the new system today. Every product route still follows a **legacy “gaming dark mode”** pattern: `min-h-screen bg-gray-950`, hardcoded `text-white`, rainbow CTAs (`orange-500`, `purple-600`, `blue-600`), and cards as `bg-gray-900/80 border-gray-800`. That conflicts with the target **Kalshi × Linear × Stripe** direction: warm neutral surfaces (`--chance-bg`), green brand actions, tabular mono for money, and restrained elevation.

**Highest-leverage work** is not individual pages first—it is **shared chrome** (`Header`, page shell, stat cards, CTAs) used on ~25 routes. After foundation, migrate **dashboard → games → wallet → auth → tournaments → bar cluster → marketing home**.

**Screenshots:** Not captured in this audit (dev server was not running). During Phase 0, capture before/after for `/`, `/dashboard`, `/games`, `/wallet`, and one bar route; store under `docs/migration-screenshots/` (create when migrating).

---

## Global gaps vs design system

| Category | Current state | Target (`--chance-*` / Chance*) |
|----------|----------------|----------------------------------|
| **Page shell** | Repeated `Header` + `main max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8` on ~25 routes; widths vary (`4xl`, `6xl`, `7xl`, `container`) | `ChanceAppShell`, `ChancePageHeader`, consistent max widths |
| **Background** | Mostly `bg-gray-950`; outliers `bg-black`, purple gradients (`bars/create`, `demo-bar`) | `bg-chance-bg` / semantic `background` |
| **Typography** | Ad-hoc `text-2xl`–`text-7xl font-bold text-white`, `text-gray-400` | `ChanceHeading`, `ChanceText`, `chance-text-*` scale |
| **Numeric data** | Plain `text-2xl font-bold` for tokens/stats | `ChanceText variant="mono"` + tabular nums |
| **Buttons** | shadcn `Button` + inline `bg-orange-500`, `#FFA500`, gradients | `ChanceButton` (`primary`, `brand`, `outline`) |
| **Cards** | shadcn `Card` + `bg-gray-900/80 border-gray-800`; `card-modern` in globals | `ChanceCard` variants |
| **Badges** | Inline `bg-purple-500/20 text-purple-400` maps duplicated | `ChanceBadge` (+ `yes`/`no`/`live`) |
| **Inputs** | shadcn `Input`; bar flows use `bg-gray-800 border-gray-600 text-white` | `ChanceInput` / `ChanceField` |
| **Spacing** | Inconsistent `mb-8` vs `mb-4`, mobile `px-2` on games only | 4px grid; `ChanceSection`, `ChanceStack` |
| **Hierarchy** | Multiple competing `h1` styles; `CardDescription` styled as `text-white` on tournaments | Single header block per page; label vs body semantics |
| **Responsiveness** | Generally OK grids; `/friends/add` split containers; games debug banner | Unify containers; hide dev-only UI in prod |
| **Accessibility** | `layout.tsx` disables zoom (`user-scalable=no`); spinners often color-only; custom bar modals without Dialog focus trap | Fix viewport meta; `aria-busy`, live regions; shadcn Dialog + chance tokens |
| **Light mode** | `globals.css` hacks invert `text-white` on light; many pages assume dark | Migrate to token-based colors; test both themes |

---

## Duplicate components & abstractions to extract

| Duplicate pattern | Where it appears | Proposed abstraction |
|-------------------|------------------|----------------------|
| **KPI stat grid (4-up)** | `StatsCard`; inline grids in `wallet`, `profile`, `tournaments/[id]`, `bars/.../dashboard`, `debug-matches` | `ChanceStatCard` + `ChanceDashboardGrid` |
| **Page title block** | ~20 routes: `h1 text-3xl font-bold text-white` + gray subtitle | `ChancePageHeader` |
| **Supabase not configured** | 19+ routes, mixed `bg-black` / `bg-gray-950` | `SupabaseNotConfigured` (uses chance typography) |
| **App authenticated layout** | Most logged-in routes | `AppPageShell` → wraps `Header` + `ChanceAppShell` |
| **Tournament status colors** | `tournaments/page.tsx`, `tournaments/[tournamentId]/page.tsx` | `TournamentStatusBadge` → `ChanceBadge` |
| **Orange gradient CTA** | Landing, tournaments, play, login | `ChanceButton variant="brand"` |
| **Wallet purchase UI** | `AddTokensForm`, `BuyButtons`, `stripe-payment-form` | Single `WalletPurchasePanel` |
| **Bar onboarding form** | `bars/create`, `demo-bar`, `quick-setup-wizard` | One flow; drop purple gradient shell |
| **Bar session lobby** | `bar/join`, `session/[sessionCode]`, `bar/session/[id]`, host session page | `BarSessionLobby` shared layout |
| **Chat page shell** | `chat/page`, `chat/dm/[userId]` | `ChatPageLayout` with props |
| **Replay shell** | `replays/[matchId]`, `replays/share/[token]` | Shared layout + `Header` optional |
| **Game promo cards** | `app/page.tsx`, `components/games/game-card.tsx` | `GamePromoCard` (neutral surface + small game accent only) |

---

## Components to replace (mapping)

| Legacy | Replace with | Notes |
|--------|--------------|-------|
| `@/components/ui/button` (CTAs) | `ChanceButton` | Keep shadcn for complex menus until styled |
| `@/components/ui/card` (marketing/dashboard) | `ChanceCard` + subcomponents | Game boards can stay custom |
| `@/components/ui/input` + `Label` | `ChanceField` + `ChanceInput` | Bar flows priority |
| `@/components/ui/badge` | `ChanceBadge` | Map win/loss → yes/no where appropriate |
| `StatsCard` | `ChanceStatCard` (new, thin wrapper) | Fix gray-400 hardcoding |
| `components/navigation/header.tsx` | Restyle or `ChanceToolbar` + nav slots | Remove orange ring/avatar default |
| `card-modern` / `card-hover` (globals) | `ChanceCard variant="interactive"` | Deprecate after migration |
| Hand-rolled modals (bar dashboard) | shadcn `Dialog` + chance token classes | a11y |

---

## Risks

| Risk | Mitigation |
|------|------------|
| **Light mode regressions** | Migrate tokens first; visual QA both themes per route |
| **Gameplay readability** | Phase gameplay as **shell-only**; don’t restyle boards in v1 |
| **Bar purple/blue identity** | Stakeholders may expect “neon bar” — use **brand green + neutral** for chrome; keep purple only as optional bar branding later |
| **Large client pages** (`games/match/[matchId]`, `bars/[barId]`) | Incremental PRs; feature flags for new shell |
| **Wallet / Stripe** | Visual-only first pass; no payment logic changes |
| **Scope creep on landing `/`** | Defer hero illustration work; tokens + layout first |
| **Duplicate purchase paths** | Consolidate wallet UI in one migration PR to avoid user confusion |
| **Removing debug UI from `/games`** | Confirm prod vs dev before delete |

---

## Effort scale

| Size | Meaning | Typical duration (1 dev) |
|------|---------|---------------------------|
| **S** | Shell/tokens or dev-only page | 0.5–1 day |
| **M** | Page + 1–2 child components | 1–2 days |
| **L** | Full page + several children | 2–4 days |
| **XL** | Large client surface or cluster | 4–8+ days |

---

## Migration impact ranking (Highest → Lowest)

Impact = user visibility × inconsistency × reuse of fixed primitives.

| Rank | Route / area | Why | Effort |
|------|----------------|-----|--------|
| **1** | **Global: `Header` + app shell** | On almost every authenticated page; orange accent vs `--chance-brand` | **L** |
| **2** | **`/dashboard`** | Primary logged-in home; sets tone for stats, quick actions, winners | **M** (page) / **L** (children) |
| **3** | **`/games`** | Core loop entry; debug banner, fake stats, heavy inline panels | **L** |
| **4** | **`/wallet`** | Trust/fintech; yellow borders, duplicate purchase paths, no mono balances | **L** |
| **5** | **`/auth/login`, `/auth/sign-up`** | `#FFA500` submit, dark card; first-run experience | **M** |
| **6** | **`/` (landing)** | Brand mismatch (orange/purple gradients vs chance system); logged-out first impression | **XL** |
| **7** | **`/games/[gameId]`** | `bg-black` outlier; orange/blue/yellow/purple CTAs in one view | **L** |
| **8** | **`/matches`** | Same shell as dashboard; colored `StatsCard` borders | **M** |
| **9** | **`/tournaments`, `/tournaments/[tournamentId]`** | Orange CTAs, purple status, KPI duplication | **L** |
| **10** | **`/games/match/[matchId]`** | Critical UX; 800+ lines, many inline cards | **XL** |
| **11** | **`/profile`** | Rainbow badges/avatar gradient; duplicate stat grid | **L** |
| **12** | **`/bars`** | Orange CTAs; bar discovery | **L** |
| **13** | **`/settings`** | Good candidate for `ChanceSplitLayout` | **M** |
| **14** | **`/tournaments/create`** | Form + orange submit in child | **M** |
| **15** | **`/games/[gameId]/play`, `/create`** | Orange play CTA; preview panel | **M** |
| **16** | **`/friends/add`** | Split `container` layout; gradient bg | **M** |
| **17** | **`/chat`, `/chat/dm/[userId]`** | Identical shells | **M** |
| **18** | **`/call`, `/call/[roomCode]`** | Shell + WebRTC UI | **M** / **L** |
| **19** | **`/watch`** | Blue empty state; `container` vs mx-auto inconsistency | **M** |
| **20** | **`/analytics`** | No Header; inherits wrong bg | **M** |
| **21** | **Bar cluster:** `/bars/create`, `/demo-bar`, `/bars/[barId]`, `/bars/.../dashboard`, `/bars/.../session`, `/bar/join`, `/bar/session/[id]`, `/session/[sessionCode]` | Largest duplicate surface; purple gradients & blue join buttons | **XL** (cluster) |
| **22** | **`/replays/*`** | Minimal shell, no nav | **M** |
| **23** | **`/design-system`** | Already migrated — regression guard | **S** |
| **24** | **`/debug`, `/debug-games`, `/debug-matches`, `/supabase-todos`** | Internal / scaffold | **S** (optional) |

---

## Recommended migration order (phases)

### Phase 0 — Foundation (week 1)

1. Add `AppPageShell`, `SupabaseNotConfigured`, `ChanceStatCard` (wrappers only).
2. Restyle **`components/navigation/header.tsx`** with `--chance-*` (defer full nav redesign).
3. Fix **`app/layout.tsx`** viewport meta (allow zoom).
4. Capture **before screenshots** for top 5 routes.

**Deliverable:** New routes can opt into shell without changing old pages yet.

### Phase 1 — Core product (weeks 2–3)

1. `/dashboard` + `StatsCard`, `QuickActions`, `RecentMatches`, `WinningList`
2. `/games` + `GameCard`, lobby panels (remove or gate debug block)
3. `/wallet` + consolidate `BuyButtons` / `AddTokensForm`
4. `/auth/login`, `/auth/sign-up` + forms

### Phase 2 — Competition loop (weeks 3–4)

1. `/matches`
2. `/tournaments`, `/tournaments/[tournamentId]`, `/tournaments/create`
3. `/games/[gameId]` (normalize `bg-black` → chance bg)
4. `/games/[gameId]/play`, `/games/[gameId]/create`
5. `/games/match/[matchId]` — **shell + headers first**, game UI pass 2

### Phase 3 — Identity & social (week 5)

1. `/profile`, `/settings`, `/friends/add`
2. `/chat/*`, `/call/*`, `/watch`
3. `/analytics`, `/replays/*`

### Phase 4 — Bar trivia cluster (weeks 6–8)

1. `/bars`, `/bars/create` (remove purple gradient; merge `demo-bar` or dev-gate)
2. `/bars/[barId]`, `/bars/[barId]/dashboard` (modals → Dialog)
3. `/bar/join`, `/session/[sessionCode]`, `/bar/session/[sessionId]`, host session routes
4. Shared `BarSessionLobby` + `BarTriviaGame` chrome pass

### Phase 5 — Marketing (week 9)

1. `/` — `ChanceMarketingShell`, neutral cards, brand CTAs, optional retained game accent thumbnails

### Phase 6 — Internal (as needed)

- `/debug*`, `/supabase-todos`

---

## Per-route audit

Legend: **Effort** S/M/L/XL. **Replace** = primary Chance* / new shared components.

### Product & marketing

#### `/` — `app/page.tsx` — **XL**

| Issue type | Findings |
|------------|----------|
| Inconsistencies | Logged-out uses `bg-background`; content still uses `text-white`, orange/purple/cyan gradients, `bg-gray-900/80 border-gray-800` cards |
| Duplicates | Game list mirrors `game-card` marketing pattern inline |
| Spacing | Hero `text-7xl`; section padding inconsistent with 4px system |
| Typography | Multiple gradient text spans; not `chance-text-display` |
| Colors | Orange CTAs (`shadow-orange-500/50`), per-game rainbow gradients |
| Hierarchy | Strong marketing sections but competes with legacy gaming palette |
| Buttons | shadcn `Button` + gradient classes |
| Cards | shadcn `Card` with heavy gradient borders |
| Responsive | Marketing grids OK |
| a11y | Verify contrast on gradient text |
| Simplify | Extract `games` config; single marketing layout component |
| Replace | `ChanceMarketingShell`, `ChanceButton`, `ChanceCard`, `GamePromoCard` |

#### `/design-system` — `app/design-system/page.tsx` — **S**

Reference implementation — use for visual QA. No migration needed.

---

### Authenticated hub

#### `/dashboard` — `app/dashboard/page.tsx` — **M** (page) / **L** (widgets)

| Issue type | Findings |
|------------|----------|
| Inconsistencies | `bg-gray-950`; welcome `h1` uses `text-accent` not brand scale |
| Duplicates | `StatsCard` ×4; inline winners `card-modern` |
| Spacing | `mb-8`, `gap-6` OK but not token-named |
| Typography | `text-2xl sm:text-3xl font-bold` vs chance h1 |
| Colors | Relies on shadcn + gray-400 subtitles |
| Hierarchy | Good structure; eagle + h1 compete visually |
| Buttons | Via `QuickActions` (purple gradients in child) |
| Cards | `StatsCard` uses `text-gray-400` not muted token |
| Replace | `ChanceAppShell`, `ChancePageHeader`, `ChanceDashboardGrid`, migrate children |

#### `/analytics` — `app/analytics/page.tsx` — **M**

| Issue type | Findings |
|------------|----------|
| Inconsistencies | **No `Header`**; bare `container mx-auto p-4` |
| Duplicates | Chart cards like dashboard analytics component |
| Replace | `ChanceAppShell`, `ChanceSection`, `AnalyticsDashboard` card pass |

---

### Games

#### `/games` — `app/games/page.tsx` — **L**

| Issue type | Findings |
|------------|----------|
| Inconsistencies | Yellow **debug** panel in prod UI; lobby stats use green/yellow/cyan text |
| Duplicates | `GameCard`, `MatchList`; fake “1,247 online” |
| Typography | `text-2xl sm:text-4xl font-bold text-white` |
| Colors | `bg-gray-900/80`; mobile `px-2` only here |
| Replace | `ChancePageHeader`, `ChanceToolbar`, `ChanceBadge live`, remove debug |

#### `/games/[gameId]` — `app/games/[gameId]/page.tsx` — **L**

| Issue type | Findings |
|------------|----------|
| Inconsistencies | **`bg-black`** vs `gray-950` elsewhere |
| Colors | Orange join, blue/yellow/purple create buttons; game title colors |
| Cards | `bg-gray-900/50`, queue rows `bg-gray-800/30` |
| Replace | Normalize shell; `ChanceCard interactive`; `ChanceButton brand` |

#### `/games/[gameId]/play` — **M**

Orange `Button` CTA; `text-4xl font-bold text-white`. Replace header + CTA; leave game canvas.

#### `/games/[gameId]/create` — **M**

Preview `bg-gray-900/50 border-gray-800`. Use `ChanceCard inset` + `CreateMatchForm` field pass.

#### `/games/match/[matchId]` — **XL**

826+ line client page; orange/yellow debug cards; green/red actions; friend request orange panel. Shell + headers first; `EnhancedMatchInterface` later.

---

### Wallet & matches

#### `/wallet` — `app/wallet/page.tsx` — **L**

| Issue type | Findings |
|------------|----------|
| Duplicates | Inline 4 KPI cards (not `StatsCard`); `AddTokensForm` imported unused vs `BuyButtons` |
| Colors | `border-yellow-500/20`, green/red/cyan stat borders |
| Typography | Balances `text-3xl font-bold` without mono |
| Children | `add-tokens-form`, `transaction-history` use `text-white`, gray-800 inputs |
| Replace | `ChanceDashboardGrid`, `ChanceText mono`, unified purchase panel |

#### `/matches` — `app/matches/page.tsx` — **M**

Standard shell; `StatsCard` with `border-purple-500/20`, `border-yellow-500/20`. `MatchHistoryTable` dark styling.

---

### Profile & settings

#### `/profile` — `app/profile/page.tsx` — **L**

Avatar gradient cyan→yellow; badges yellow/purple/cyan; duplicate 4-up stats `bg-gray-800/30`.

#### `/settings` — `app/settings/page.tsx` — **M**

Ideal for **`ChanceSplitLayout`**; children `profile-settings`, `preferences-settings` use dark cards.

#### `/friends/add` — **M**

Gradient bg; split `container` blocks; mix of default Card and `bg-gray-800/50` rows.

---

### Auth

#### `/auth/login`, `/auth/sign-up` — **M**

`LoginForm` / `SignUpForm`: submit `bg-[#FFA500]`, `focus:ring-[#FFA500]`, shadcn Card on gray-950.

---

### Tournaments

#### `/tournaments` — **L**

Orange create buttons; gradient view buttons; purple bracket badge; `statusColors` inline map.

#### `/tournaments/[tournamentId]` — **L**

4 KPI cards duplicate list metrics; `CardDescription className="text-white"` semantic misuse.

#### `/tournaments/create` — **M**

`CreateTournamentForm` orange gradient submit.

---

### Social & watch

#### `/chat`, `/chat/dm/[userId]` — **M**

Identical layout; merge wrapper. `ChatWindow` styling pass.

#### `/call`, `/call/[roomCode]` — **M** / **L**

Standard shell; `CallRoom` custom UI.

#### `/watch` — **M**

`container max-w-7xl`; blue empty state `bg-blue-500/10`.

---

### Bars (cluster)

#### `/bars` — **L**

Orange CTAs (`bg-orange-600`); trophy orange; gray cards.

#### `/bars/create`, `/demo-bar` — **L**

**Full-screen purple/blue/indigo gradient** — strongest divergence from design system. Duplicate forms.

#### `/bars/[barId]` — **XL**

~646 lines; staff, QR, drinks, sessions.

#### `/bars/[barId]/dashboard` — **XL**

Custom modals (no Dialog focus trap); blue/orange/purple actions; 4-up stats; purple spinners.

#### `/bars/[barId]/session/[sessionId]` — **XL**

Host controls; gray-900 stack.

#### `/bar/join` — **XL**

Multiple loading branches; purple selected session; blue join.

#### `/bar/session/[sessionId]` — **XL**

Mix **`bg-black`** and gray-950; blue CTAs; purple/yellow badges.

#### `/session/[sessionCode]` — **L**

Public lobby; purple spinner; blue selected participant ring.

---

### Replays & dev

#### `/replays/[matchId]`, `/replays/share/[shareToken]` — **M**

No Header; `text-2xl font-bold mb-6`; `ReplayPlayer` dark cards.

#### `/debug`, `/debug-games`, `/debug-matches`, `/supabase-todos` — **S**

Internal styling; low priority.

---

## Screenshot checklist (capture during Phase 0)

| Route | Viewport | Theme |
|-------|----------|-------|
| `/` | 1440 + 390 | light + dark |
| `/dashboard` | 1440 | dark (current default) |
| `/games` | 1440 | dark |
| `/wallet` | 1440 | dark |
| `/bars/create` | 1440 | dark (gradient baseline) |
| `/design-system` | 1440 | both (target reference) |

Store as: `docs/migration-screenshots/{route}-{theme}-{width}.png`

---

## Success criteria

- [ ] All product routes use `AppPageShell` or documented exception (replay share, bar join fullscreen).
- [ ] No hardcoded `text-white` on page shells (use `text-chance-fg` / semantic foreground).
- [ ] Primary CTAs use `ChanceButton` `brand` or `primary` — no `#FFA500` / `orange-500` on critical paths.
- [ ] Token balances and stakes use mono tabular typography.
- [ ] KPI grids use one `ChanceStatCard` implementation.
- [ ] `/design-system` and migrated routes pass visual review in light and dark mode.
- [ ] WCAG AA spot-check on wallet, auth, and dashboard after migration.

---

## Related files

| Doc / code | Path |
|------------|------|
| Design principles | `DESIGN.md` |
| CSS tokens | `app/chance-design-tokens.css` |
| TS tokens | `lib/design-system/tokens.ts` |
| Components | `components/design-system/` |
| Legacy UI | `components/ui/` |
| Global overrides | `app/globals.css` (`card-modern`, light-mode white hacks) |
| Navigation | `components/navigation/header.tsx` |

---

*Generated from static analysis of 39 `app/**/page.tsx` routes and shared components. Re-validate after major feature work.*
