# ChanceUS — Top 1% Product Design Review

**Auditor lens:** Staff Product Designer (Linear, Stripe Dashboard, Mercury, Notion, Kalshi, Vercel)  
**Scope:** Full application — 39 routes, 124+ components, desktop/mobile patterns, auth flows, bar/tournament/game subsystems  
**Method:** Source audit of every `app/**/page.tsx`, shared chrome, design-system adoption vs `DESIGN.md`, IA from `header.tsx` + middleware  
**Screenshots:** User-captured dashboard failure (CSS/chunk incident, Sep 22 2026) shows unstyled HTML — evidence that **engineering instability directly destroys perceived quality**. Formal before/after matrix not captured in this pass; recommended at `docs/migration-screenshots/` during execution.

**Verdict:** ChanceUS is a **feature-rich prototype** wearing **three different products** (legacy gaming dark UI, nascent Chance design system, purple glass bar onboarding). It does **not** read as launch-ready for millions. The dashboard pilot is directionally correct but **orphaned** — it makes every other route feel worse by comparison.

---

## Executive Summary

World-class SaaS products feel **coherent, restrained, and honest**. They use **one layout grammar**, **one numeric language**, **one navigation model**, and **zero lies in the UI**. ChanceUS violates all four at scale.

The codebase contains a **credible design system** (`DESIGN.md`, `--chance-*`, `components/design-system/*`, `/design-system` catalog) that **~2 of 39 routes use**. Everything else repeats `min-h-screen bg-gray-950`, `text-3xl font-bold text-white`, rainbow accent borders, and orange CTAs (`#FFA500`). The header was partially migrated; the body was not — users get **Stripe nav + 2018 gaming lobby**.

**Information architecture** is fragmented: bar flows split across `/bars`, `/bar/join`, `/session/[code]`, `/bar/session/[id]`; friends/watch/analytics/replays are **orphans**; debug routes ship beside production. **Trust killers** include hardcoded **“1,247 Players Online”** on `/games`, fake-positive stat trends on `/matches`, and verbose server **console debug** on core paths.

**Delete or hide before launch:** `/supabase-todos`, `/debug-games`, `/debug-matches` (or gate entirely), `/demo-bar` in production, redundant purchase UIs on wallet. **Merge:** bar participant flows into one URL scheme; chat global + DM into one shell; replay pages into authenticated app chrome.

Competing at Linear/Stripe quality requires **finishing the migration you already started**, not another visual theme.

---

## Scores (1–10, vs world-class SaaS)

| Dimension | Score | Notes |
|-----------|-------|--------|
| **Overall Product** | **4.0** | Strong feature breadth; weak cohesion and trust |
| **Visual Design** | **3.5** | Three visual languages; dashboard vs rest |
| **Interaction** | **4.0** | Inconsistent loading, hover, focus; some broken patterns |
| **UX** | **4.0** | Core loops exist; IA and empty states uneven |
| **Information Architecture** | **3.5** | Split bar URLs; hidden features; nav duplication |
| **Accessibility** | **4.0** | Some skip links/sr-only; light mode broken; focus traps uneven |
| **Consistency** | **2.5** | Worst dimension — intentional system ignored |
| **Performance Perception** | **5.0** | Realtime exists; spinners and “Loading...” text vary |
| **Trust** | **3.0** | Fake metrics, debug in prod UI, fintech styling immature |

**Reference benchmarks (philosophy, not color):**

| Product | What they optimize | ChanceUS gap |
|---------|-------------------|--------------|
| **Linear** | Single workspace, density, keyboard-first, no decoration | 25 copy-pasted page shells; decorative game cards everywhere |
| **Stripe** | Money = monospace, tables, calm hierarchy, no lies | Wallet uses rainbow bordered cards; fake lobby stats |
| **Mercury** | Balance-first, one primary number, actions adjacent | Dashboard fixed this; wallet/games still card grids |
| **Notion** | Empty states teach; progressive disclosure | Empty states vary; debug banners teach fear |
| **Kalshi** | Markets as rows; live data; binary outcomes | Payout feed directionally right; games still promo cards |
| **Vercel** | Ship-quality docs, tight nav, dark/light parity | `/design-system` exists; product ignores it |

---

## Section 3 — Cross-cutting evaluation

### Typography
**State:** Inter + JetBrains Mono configured; `chance-text-*` used on dashboard only. Elsewhere: ad hoc `text-3xl font-bold text-white`, `text-gray-400`, emoji in game cards.  
**Gap:** No single page-title scale; labels not uppercase-tracked consistently; numeric data not mono-tabular outside dashboard.

### Spacing
**State:** Repeated `px-4 sm:px-6 lg:px-8 py-8`, `mb-8`, `gap-6`. Games uses tighter mobile padding; bar flows use different rhythm.  
**Gap:** No enforced 4px system in product; `DESIGN.md` documents it but routes don’t use `ChanceSection` / `ChanceStack`.

### Grid & alignment
**State:** Responsive grids generally work. Misalignment from mixed `max-w-4xl|6xl|7xl|container`.  
**Gap:** No canonical content width per page type (hub vs settings vs game).

### Density
**State:** Dashboard pilot = appropriate density. Games/wallet = card-heavy, low scan efficiency.  
**Gap:** Kalshi/Stripe density on lists; ChanceUS still defaults to marketing cards for operational UI.

### Whitespace
**State:** Large vertical gaps between sections; empty gradient comment placeholders in JSX.  
**Gap:** Wasted viewport on mobile; Mercury would compress KPI + table into one viewport.

### Layout
**State:** `AppPageShell` on dashboard only; ~25 routes duplicate Header + main markup.  
**Gap:** Linear single-surface philosophy applied once.

### Hierarchy
**State:** Multiple competing H1 styles; wallet balance same weight as section titles.  
**Gap:** One balance/hero per screen not enforced.

### Component consistency
**State:** shadcn + Chance + inline Tailwind one-offs.  
**Gap:** `ChanceButton` vs orange `Button` vs `#FFA500` submit.

### Visual rhythm
**State:** Section → grid → card repeated; hairline sections only on dashboard.  
**Gap:** Rest of app uses floating gray cards on gray-950.

### Motion
**State:** `animate-chance-in` on dashboard; spinners purple/orange elsewhere; `hover-lift` undefined in many paths.  
**Gap:** No global motion budget; feels random.

### Navigation
**State:** 8 top links + overcrowded mobile sheet; duplicates in account menu.  
**Gap:** No grouping (Play / Money / Social / Venues); orphans (Watch, Friends, Analytics).

### Interactions
**State:** Realtime subscriptions substantial. Some server components with `onClick` (game lobby).  
**Gap:** Stripe-level polish on hover/focus/active not systematic.

### Cards vs tables
**State:** KPIs always 4-up cards; matches often tables in components but wrapped in cards.  
**Gap:** Dashboard tables correct direction; wallet/games/matches should follow.

### Forms
**State:** Per-form inline classes (`focus:border-yellow-500`, `focus:border-cyan-500`).  
**Gap:** `ChanceField` unused in product.

### Buttons
**State:** Orange gaming CTA is default mental model.  
**Gap:** Brand green from system unused in auth/wallet/tournaments.

### Accessibility
**State:** Skip link on dashboard shell; theme toggle present; many icons without consistent `aria-hidden`.  
**Gap:** Light mode broken on most routes; bar modals not always Dialog.

### Dark / light mode
**State:** `globals.css` hacks invert `text-white` in light mode.  
**Gap:** Pages hardcode gray-950 — light mode is a lie.

### Responsiveness
**State:** Grids collapse; header hamburger exists.  
**Gap:** Tables overflow without consistent sticky headers; friends dialog legacy on dashboard.

### Copywriting
**State:** Mix of professional and gaming bro (“Enter the Arena”, “Enter ChanceUS”).  
**Gap:** Stripe copy is plain; Kalshi is precise; this oscillates.

### Microcopy
**State:** Debug strings in middleware logs; UI shows “Loading...” without context.  
**Gap:** Empty states should instruct next action (Notion-style).

### Onboarding / first-run
**State:** Landing → auth → dashboard; no guided first match.  
**Gap:** Mercury/Stripe onboard with one clear first action.

### Trust
**State:** Fake online count, hardcoded trends, debug pages, split payment flows.  
**Gap:** Unacceptable for real money.

### Delight
**State:** Game thumbnails, emojis, eagle branding.  
**Gap:** Delight should not replace clarity; world-class products delight **after** trust.

---

## Section 1 & 2 — Top 100 improvements (ranked by impact)

Each item: **Problem → Why it hurts → Best-in-class → ChanceUS fix → Priority (P0–P3) → Effort (S/M/L/XL) → Screenshot**

---

### P0 — Ship blockers (trust, coherence, security perception)

**1.**  
- **Problem:** Fake **“1,247 Players Online”** on `/games` (`app/games/page.tsx`).  
- **Why:** Users detect dishonesty instantly; destroys Kalshi/Stripe trust model.  
- **Best:** Real metric or remove.  
- **Fix:** Wire `OnlineUsersCount` or delete stat until real.  
- **P0 | S** | Screenshot: games lobby sidebar stat.

**2.**  
- **Problem:** `/debug-matches`, `/debug-games` reachable outside prod block.  
- **Why:** Looks like unfinished internal tool; security/reputation risk.  
- **Best:** No debug in prod builds (Vercel preview flags).  
- **Fix:** Middleware block all `/debug*`; env-gated only.  
- **P0 | S**

**3.**  
- **Problem:** Three visual product languages (legacy gray/orange, Chance dashboard, purple bar glass).  
- **Why:** Every navigation click feels like a different company.  
- **Best:** One shell grammar (Linear).  
- **Fix:** Mandate `AppPageShell` + `--chance-*` on all authenticated hubs.  
- **P0 | L** | Screenshot: dashboard vs games side-by-side.

**4.**  
- **Problem:** Design system exists but **2/39 routes** use it.  
- **Why:** Engineering tax with no user benefit.  
- **Best:** Notion — components match docs.  
- **Fix:** Execute `MIGRATION_PLAN.md` with enforcement (lint import paths).  
- **P0 | XL**

**5.**  
- **Problem:** Header Chance tokens + body legacy gray-950.  
- **Why:** Worst possible hybrid — users trust header, distrust content.  
- **Best:** Stripe — chrome and body share tokens.  
- **Fix:** Migrate `/games`, `/wallet`, `/matches` immediately after shell.  
- **P0 | L**

**6.**  
- **Problem:** Light mode toggle with hardcoded dark pages.  
- **Why:** Broken theme = amateur; accessibility failure.  
- **Best:** Vercel — both themes first-class.  
- **Fix:** Ban `text-white` / `bg-gray-950` in app routes; use semantic tokens.  
- **P0 | L**

**7.**  
- **Problem:** Wallet uses rainbow KPI card borders (yellow/green/red/cyan).  
- **Why:** Fintech users expect Mercury sobriety; rainbow reads casino.  
- **Best:** Mercury balance + ledger table.  
- **Fix:** Dashboard-style summary + transaction table; mono amounts.  
- **P0 | M**

**8.**  
- **Problem:** Auth CTAs `#FFA500` + “Enter the Arena” copy.  
- **Why:** First-run sets low-trust gaming tone for money product.  
- **Best:** Stripe login — neutral, precise.  
- **Fix:** `ChanceButton brand` + plain copy (“Sign in”).  
- **P0 | M** | Screenshot: login page.

**9.**  
- **Problem:** Hardcoded positive trends on `/matches` stats.  
- **Why:** Misleading analytics = ethical and legal risk.  
- **Best:** Show delta only when computed.  
- **Fix:** Remove or compute from data.  
- **P0 | S**

**10.**  
- **Problem:** Server-side debug logging on every `/games` load.  
- **Why:** Signals unstable product; slows TTFB perception.  
- **Best:** Structured logging behind flag.  
- **Fix:** `NODE_ENV` gate all match dumps.  
- **P0 | S**

**11.**  
- **Problem:** `/supabase-todos` public scaffold.  
- **Why:** Screams unfinished.  
- **Best:** Delete internal routes.  
- **Fix:** Remove route or auth-gate.  
- **P0 | S**

**12.**  
- **Problem:** CSS/build fragility caused **unstyled dashboard** (user screenshot).  
- **Why:** Perceived quality zero regardless of design intent.  
- **Best:** CI blocks invalid CSS.  
- **Fix:** Keep Tailwind v3-safe classes; visual regression in CI.  
- **P0 | M** | Screenshot: user Sep 22 unstyled dashboard.

**13.**  
- **Problem:** Floating orange feedback orb on every page.  
- **Why:** Clashes with Chance brand; covers UI on mobile.  
- **Best:** Linear — feedback in menu or cmd-k.  
- **Fix:** Ghost icon in header or settings-only.  
- **P0 | S**

**14.**  
- **Problem:** Duplicate wallet purchase paths (`BuyButtons`, `AddTokensForm`, Stripe form).  
- **Why:** Stripe never shows two checkout patterns for same action.  
- **Best:** One purchase panel.  
- **Fix:** Consolidate wallet right column.  
- **P0 | M**

**15.**  
- **Problem:** Game lobby `onClick` on server `Button` (`games/[gameId]/page.tsx`).  
- **Why:** Broken interaction = product feels untested.  
- **Best:** Client boundary for actions.  
- **Fix:** Extract client CTA wrapper.  
- **P0 | S**

---

### P1 — Core loop & IA (games, wallet, matches)

**16.** Bar URL schizophrenia (`/bars`, `/bar`, `/session`). **Why:** Cognitive load. **Best:** One namespace. **Fix:** Redirect map + single mental model. **P1 | L**

**17.** Watch, Friends, Analytics, Replays absent from nav. **Why:** Features die. **Best:** Linear sidebar grouping. **Fix:** “More” menu or secondary nav. **P1 | M**

**18.** Duplicate Games/Wallet in account dropdown. **Why:** Noise. **Best:** Single path. **Fix:** Profile/settings only in menu. **P1 | S**

**19.** `/games` debug/yellow banner for bad match states. **Why:** Teaches users system is broken. **Best:** Silent auto-heal + support link. **Fix:** Remove banner; admin only. **P1 | S**

**20.** Game cards as marketing tiles with gradients + emojis. **Why:** Low scan; not operational. **Best:** Kalshi rows. **Fix:** Extend dashboard `QuickActions` pattern to `/games`. **P1 | M**

**21.** `/games/[gameId]` uses `bg-black` vs `gray-950`. **Why:** Subtle sloppiness. **Fix:** Token background. **P1 | S**

**22.** Match page loading without header. **Why:** Disorienting. **Best:** Persistent chrome. **Fix:** Shell always renders. **P1 | M**

**23.** `/replays/*` and `/analytics` no Header. **Why:** Orphan pages. **Fix:** `AppPageShell` optional minimal header. **P1 | M**

**24.** `/friends/add` Header without user prop. **Why:** Flash wrong nav. **Fix:** Server user fetch. **P1 | S**

**25.** Client `/bars` page async user → logged-out header flash. **Why:** Trust. **Fix:** Server wrapper. **P1 | M**

**26.** Landing `/` hardcoded game UUIDs vs DB IDs. **Why:** Broken CTAs after seed change. **Fix:** Server fetch games. **P1 | M**

**27.** Landing redirects logged-in users away — no marketing for returning users. **Why:** OK but kills upsell. **Fix:** Optional product updates section. **P2 | M**

**28.** Tournaments purple/orange status soup. **Why:** Inconsistent semantics. **Fix:** `ChanceBadge` yes/no/live mapping. **P1 | M**

**29.** `/matches` still 4-up `StatsCard` grid. **Why:** Dashboard already moved on. **Fix:** Inline KPIs + table. **P1 | M**

**30.** Match history table styling legacy. **Why:** Core retention surface. **Fix:** Chance table primitives. **P1 | M**

**31.** `/wallet` Suspense fallback null on Stripe return. **Why:** User sees jump. **Fix:** Skeleton success state. **P1 | S**

**32.** Transaction history not monospace amounts. **Why:** Hard to scan money. **Fix:** `chance-text-mono`. **P1 | S**

**33.** `/profile` rainbow badges and gradient avatar. **Why:** Gaming profile ≠ skill wallet identity. **Fix:** Restrained badges. **P1 | M**

**34.** `/settings` not using split layout. **Why:** Notion/Linear settings pattern missing. **Fix:** `ChanceSplitLayout`. **P1 | M**

**35.** Chat fixed `maxHeight="600px"`. **Why:** Arbitrary; bad on mobile. **Fix:** Flex fill viewport. **P1 | M**

**36.** Global chat vs DM duplicate shells. **Why:** Duplicate code + UX drift. **Fix:** `ChatPageLayout`. **P1 | M**

**37.** `/call` in nav but not middleware list. **Why:** Inconsistent security story. **Fix:** Align middleware + page auth. **P1 | S**

**38.** Live Call nav label vs product “skill matches”. **Why:** IA confusion. **Fix:** Rename or group under Social. **P2 | S**

**39.** `/tournaments/create` form orange submit in child. **Why:** Same as auth. **Fix:** Chance form kit. **P1 | M**

**40.** Tournament detail not-found without back nav. **Why:** Dead end. **Fix:** Empty state with CTA. **P1 | S**

**41.** `/games/match/[matchId]` 800+ line client page. **Why:** Unmaintainable UX. **Fix:** Decompose + design patterns per state. **P1 | XL**

**42.** Spectator mode UI not aligned with player UI chrome. **Why:** Feels bolted on. **Fix:** Shared match shell. **P1 | L**

**43.** Rematch flows visually inconsistent. **Why:** Drop-off after match. **Fix:** One modal pattern. **P1 | M**

**44.** `/watch` emoji empty state + debug tips. **Why:** Dev copy in prod. **Fix:** Product empty state. **P2 | S**

**45.** `/games/[gameId]/create` user reference bug on error path. **Why:** Broken error UX. **Fix:** Code fix in roadmap phase 0. **P1 | S**

---

### P1 — Bar & venues (split product)

**46.** `/bars/create` + `/demo-bar` purple gradient ≠ main app. **Why:** Third product. **Fix:** Chance onboarding shell. **P1 | L**

**47.** Glass `bg-white/10` forms only in bar. **Why:** Unmaintainable. **Fix:** ChanceCard inset variant. **P1 | M**

**48.** Host dashboard 44+ hardcoded color classes. **Why:** Consistency nightmare. **Fix:** Token migration bar cluster. **P1 | XL**

**49.** QR join flow 61+ gray/orange classes in one page. **Why:** Highest complexity route. **Fix:** Dedicated bar design pass. **P1 | XL**

**50.** `/session/[sessionCode]` vs `/bar/session/[sessionId]` duplicate. **Why:** Users bookmark wrong URL. **Fix:** Merge routes. **P1 | L**

**51.** Participant success `bg-black` screen. **Why:** Off-brand. **Fix:** Token surfaces. **P1 | S**

**52.** Staff management search inputs white/20 on purple. **Why:** Illegible in light mode impossible. **Fix:** Chance inputs. **P1 | M**

**53.** Bar modals hand-rolled vs Dialog. **Why:** a11y gaps. **Fix:** shadcn Dialog + tokens. **P1 | M**

**54.** Bar trivia game UI not audited to same density standard. **Why:** Venue hosts need clarity under noise. **Fix:** Large type + high contrast without purple haze. **P1 | L**

**55.** `/demo-bar` seeds data in prod path. **Why:** Demo pollution. **Fix:** Dev-only route. **P1 | S**

---

### P2 — Polish, motion, content

**56.** Page titles all `text-3xl font-bold` — dashboard uses `text-lg`. **Why:** Inconsistent wayfinding. **Fix:** `ChancePageHeader` everywhere. **P2 | M**

**57.** Empty gradient overlay comments in JSX on wallet/games. **Why:** Suggests unfinished design. **Fix:** Delete or implement subtle inset bg. **P2 | S**

**58.** `card-hover` global class vs Chance interactive card. **Why:** Two hover systems. **Fix:** Deprecate globals. **P2 | S**

**59.** GameCard thumbnails + gradient buttons. **Why:** Marketing in operational list. **Fix:** Row layout option. **P2 | M**

**60.** Emoji icons in `GameCard` map. **Why:** Unprofessional next to Lucide elsewhere. **Fix:** Lucide only or small neutral icon. **P2 | S**

**61.** `hover-lift` on logo without defined utility in all builds. **Why:** Dead class risk. **Fix:** Use design-system motion. **P2 | S**

**62.** Friends online dialog still legacy orange/gray on dashboard. **Why:** Dashboard whiplash. **Fix:** `appearance="chance"` internals. **P2 | M**

**63.** “Market payouts” label on dashboard feed. **Why:** Kalshi metaphor without market mechanics — confusing. **Fix:** “Recent wins” or “Live payouts”. **P2 | S**

**64.** OnlineUsersCount + UserRank polling 30s on dashboard. **Why:** OK; no loading skeleton harmony. **Fix:** Unified skeleton components. **P2 | S**

**65.** Middleware console logs in production. **Why:** Unprofessional in server logs; noise. **Fix:** Debug flag. **P2 | S**

**66.** Auth rate limit toasts — good — but form errors inconsistent with ChanceField. **P2 | M**

**67.** Sign-up form duplicate field styling blocks. **Fix:** ChanceField once. **P2 | M**

**68.** Google/Apple auth buttons bespoke vs ChanceButton outline. **P2 | S**

**69.** Landing hero `text-white` on `bg-background` light mode clash. **P2 | M**

**70.** Landing feature grid rainbow icons. **Why:** Stripe marketing still restrained. **Fix:** Monochrome icons + one accent. **P2 | M**

**71.** Footer/legal trust marks missing on wallet/landing. **Why:** Fintech trust. **Fix:** Stripe-style footer links. **P2 | M**

**72.** No unified error page design (500/404). **Why:** Vercel-quality brands own errors. **Fix:** `error.tsx` + tokens. **P2 | M**

**73.** `/design-system` public catalog without auth. **Why:** OK for dev; odd in prod. **Fix:** Auth or hide in prod. **P3 | S**

**74.** AdSense script in root layout. **Why:** Trust/clutter for logged-in app. **Fix:** Landing only. **P2 | S**

**75.** JetBrains Mono loaded but unused outside dashboard/mono classes. **Fix:** Enforce mono on all token displays. **P2 | S**

---

### P2 — Accessibility & keyboard

**76.** Focus rings mix orange, cyan, yellow per form. **Fix:** `--chance-shadow-focus`. **P2 | M**

**77.** Table headers on dashboard lack sticky behavior on long lists. **Fix:** Sticky thead pattern. **P2 | S**

**78.** Skip link only on AppPageShell routes. **Fix:** Root layout skip target. **P2 | S**

**79.** Icon-only buttons vary in `aria-label` coverage. **Fix:** Audit lucide buttons. **P2 | M**

**80.** Match interface keyboard shortcuts undocumented. **Fix:** Linear-style shortcut hint panel. **P3 | M**

**81.** Color-only win/loss in places without icon/text backup. **Fix:** Badge text always visible. **P2 | S**

**82.** Chat message list live region not announced. **Fix:** `aria-live="polite"`. **P2 | S**

**83.** Tournament password gate focus trap unverified. **Fix:** Dialog primitive. **P2 | S**

**84.** Mobile sheet nav no escape hierarchy (8 flat links). **Fix:** Grouped sections. **P2 | M**

**85.** Token balance in header not linked to wallet (Mercury links cash). **Fix:** Wrap in Link. **P2 | S**

---

### P3 — Delight, edge routes, cleanup

**86.** `/debug` page styling acceptable but should not exist in prod. **P3 | S**

**87.** `PROJECT_DOCUMENTATION.md` admits fake online count — doc debt. **P3 | S**

**88.** Hardcoded game colors map duplicated landing + GameCard. **Fix:** Single source. **P3 | M**

**89.** `/games/[gameId]/play` practice mode buried. **Fix:** Onboard practice first. **P3 | M**

**90.** Replay player chrome minimal — OK for share, not for logged-in. **P3 | M**

**91.** Share replay token page should match marketing minimalism (Vercel share pages). **P3 | M**

**92.** Analytics dashboard component isolated — merge into dashboard or delete. **P3 | M**

**93.** Add friends section duplicated friends-online features. **Fix:** Merge flows. **P3 | M**

**94.** CleanupHandler/GamesPageClient invisible — document or remove user-visible effects. **P3 | S**

**95.** Console.log in GameCard render path. **Fix:** Remove. **P3 | S**

**96.** Image assets `.JPG` extension inconsistent casing. **Fix:** Normalize public paths. **P3 | S**

**97.** Eagle logo 60px in header — large vs Linear compact mark. **Fix:** 32–40px mark. **P3 | S**

**98.** No command palette (Linear/Vercel). **Fix:** Phase 4 optional. **P3 | XL**

**99.** No page transition continuity. **Fix:** Shared layout animation optional. **P3 | L**

**100.** Chance design system page not linked from settings for admins. **Fix:** Internal link for team. **P3 | S**

---

## Section 4 — Assumption challenges (explicit)

| Assumption | Verdict |
|------------|---------|
| “Every game needs a large thumbnail card” | **Reject** — use rows for repeat players (Kalshi) |
| “Orange is brand” | **Reject** — `DESIGN.md` brand green; orange reads legacy |
| “Bar product needs purple glass” | **Reject** — host tools should match Chance shell |
| “Dashboard should welcome with eagle hero” | **Already removed** — correct |
| “Stats must be 4 cards” | **Reject** — Mercury inline KPIs |
| “Debug pages help during beta” | **Reject for public launch** — gate or delete |
| “Light mode can wait” | **Reject** — theme toggle exists; broken is worse than none |
| “Analytics as separate orphan page” | **Merge or delete** — put KPIs on dashboard |
| “Watch deserves top-level nav” | **Challenge** — merge into Matches/Spectate |
| “Four bar URL patterns are fine” | **Reject** — merge |

---

## Comparison snapshots (philosophy)

**Linear:** One workspace, no hero cards, keyboard path, muted chrome → ChanceUS is **multi-shell, decorative, mouse-first**.

**Stripe:** Ledger truth, mono money, calm density → ChanceUS **rainbow KPI cards + fake stats**.

**Kalshi:** Rows, live feeds, binary outcomes → ChanceUS **moving toward this on dashboard only**.

**Mercury:** Balance first → **Dashboard yes; wallet no**.

**Notion:** Empty states teach → **Emoji debug tips on watch**.

**Vercel:** Docs, settings, and app feel one team → **`/design-system` vs `/games` say two teams**.

---

## What “world-class” would feel like (target state)

1. Log in → **one** calm shell; balance + next action above fold.  
2. Start match → **table row**, not poster.  
3. Wallet → **Mercury ledger**, not arcade counters.  
4. Navigate → **grouped IA**, no orphans, no debug.  
5. Theme → **both modes work** or toggle removed.  
6. Bar hosts → **same UI kit**, not purple wizard.  
7. Copy → **plain**, no arena metaphors on money paths.  
8. Engineering → **CSS/chunks stable** so design actually renders.

---

*End of review. Execution sequencing: `TOP_1_PERCENT_ROADMAP.md`.*
