# Dashboard migration review (Phase 1)

**Route:** `/dashboard` only  
**Date:** September 22, 2026  
**Reference:** `DESIGN.md`, `components/design-system/*`, `MIGRATION_PLAN.md`

---

## Before: what was weak

| Area | Issue | Why it mattered |
|------|--------|-----------------|
| **Visual language** | `bg-gray-950`, `text-white`, orange accent name, rainbow Quick Play gradients | Felt “gamer/neon,” not fintech-grade (Kalshi/Mercury/Linear/Stripe) |
| **Hierarchy** | Eagle + oversized welcome block before metrics; friends widget buried in header row | Balance and rank scanned late; marketing chrome competed with data |
| **Typography** | Ad-hoc `text-2xl/3xl`, `text-gray-400`, stats without tabular mono | Hard to compare token values; weak numeric trust |
| **Cards** | Mix of `StatsCard`, `card-modern`, `bg-gray-900/80` | Inconsistent elevation, borders, and hover behavior |
| **Quick Play** | Per-game gradient CTAs, thumbnail scale animation | Flashy, off-brand; distracted from primary action |
| **Activity** | Recent winners in generic wrapper; green “Live Payouts” text only | Secondary feed looked bolted-on |
| **Loading** | Plain “Loading…” strings in stat slots; gray pulse rows | No polish; poor screen reader feedback |
| **Empty states** | Minimal copy in matches list | Missed chance to guide next action |
| **a11y** | No landmark sections; limited `aria-*` on async widgets | Dashboard is flagship authenticated view |

---

## After: what we improved (and why)

| Change | Rationale |
|--------|-----------|
| **`AppPageShell` + `--chance-bg`** | One canonical layout (skip link, `#main-content`, width presets) aligned with future route migrations |
| **`ChancePageHeader`** with “Overview” label | Stripe-style kicker + calm title; friends control in **actions** (scan path: title → metrics) |
| **Metrics first** via `ChanceDashboardGrid` + `ChanceStatCard` | Kalshi-like density; token balance uses **brand** accent; wins use **yes** semantic |
| **Mono tabular** values in stat cards and match rows | Mercury/Stripe readability for money and rank |
| **Reordered sections** | 1) metrics → 2) quick play → 3) recent matches + payouts sidebar | Matches stated priority without removing features |
| **Neutral Quick Play cards** | `ChanceCard interactive` + `ChanceButton brand/outline`; thumbnails in bordered frames, no gradients |
| **Recent matches** on `ChanceCard` with yes/no badges | Linear-style rows; hover border lift; empty state with CTA |
| **Recent payouts** in `ChanceCard` + `ChanceBadge live` | Calm secondary column; brand-muted avatars instead of orange circles |
| **Loading skeletons** | Pulse placeholders in stats embeds, matches, winners; `aria-busy` / `aria-live` where appropriate |
| **Friends dropdown** | `appearance="chance"` on dashboard only; `/games` keeps `legacy` default |

---

## Components changed

| File | Change type |
|------|-------------|
| `app/dashboard/page.tsx` | **Rewired** — shell, header, metrics grid, section order, payouts card |
| `components/dashboard/quick-actions.tsx` | **Design system only** — no game IDs or routes changed |
| `components/dashboard/recent-matches.tsx` | **Design system only** — same Supabase query/limit/realtime |
| `components/dashboard/winning-list.tsx` | **Design system only** — same fetch/limit/realtime/poll |
| `components/dashboard/user-rank.tsx` | **Presentation only** — skeleton loader |
| `components/dashboard/online-users-count.tsx` | **Presentation only** — skeleton loader |
| `components/dashboard/friends-online.tsx` | **Optional `appearance` prop** — dashboard uses `chance`; default `legacy` for `/games` |
| `components/dashboard/dashboard-client.tsx` | **Unchanged** (activity hook) |
| `components/dashboard/stats-card.tsx` | **Unchanged** — still used by `/matches` |

### Design system primitives used on dashboard

- `AppPageShell`
- `ChancePageHeader`
- `ChanceStatCard`
- `ChanceCard` (+ header/content)
- `ChanceButton`
- `ChanceBadge`
- `ChanceStack` / `ChanceInline` / `ChanceDashboardGrid`
- `ChanceText`

---

## Design decisions

1. **Removed eagle from page title** — Logo remains in global `Header`; dashboard title focuses on user + data (Linear/Stripe dashboard pattern).
2. **Kept game thumbnails** — Visual recognition for quick play, but contained in neutral bordered frames (not full-bleed gradient cards).
3. **Brand green only for primary actions and key metrics** — No purple/cyan/yellow CTAs on dashboard.
4. **“Recent payouts” vs “Recent Winners”** — Clearer fintech wording; same underlying winner feed.
5. **Friends panel interior still shadcn** — Full Chance migration of dialogs/dropdown internals deferred to avoid scope creep; **trigger + menu chrome** updated for dashboard via `appearance="chance"`.

---

## Remaining issues

| Issue | Notes |
|-------|--------|
| **FriendsOnline dialog/dropdown body** | Play-friend flows still use legacy orange/cyan/purple buttons inside modal when opened from dashboard |
| **Page bg vs shell** | `AppPageShell` default is `gray-950`; dashboard overrides with `--chance-bg` — other routes still gray until migrated |
| **Light mode on dashboard** | Chance tokens support light/dark; dashboard child components use `--chance-*` — verify visual QA in both themes |
| **No route-level loading.tsx** | Server page is instant; client widgets still hydrate with skeletons only |
| **Stat card trends** | Legacy `StatsCard` trend prop not used on dashboard; could add later from analytics |

---

## Recommendations (future dashboard work)

1. **`FriendsOnlineChance`** — Extract chance-styled dropdown + dialogs for dashboard-only, or finish `appearance="chance"` through dialog content.
2. **`ChanceStatCard` trend** — Wire weekly token delta when analytics API exists.
3. **Personalized quick play** — Sort games by recent play without changing routes.
4. **Unified empty dashboard** — First-time user banner (wallet fund + first match) using `ChanceCard inset`.
5. **Migrate `/matches` next** — Reuse `ChanceStatCard` and match row pattern from `RecentMatches`.
6. **Screenshot regression** — Capture `/dashboard` light/dark after each phase (see `MIGRATION_PLAN.md` checklist).

---

## Verification

- [x] No other `app/**/page.tsx` routes modified  
- [x] Supabase queries, redirects, and `DashboardClient` activity tracking unchanged  
- [x] All quick play / lobby / view-all links preserved  
- [x] `next build` succeeds  
