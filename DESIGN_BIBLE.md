# ChanceUS Design Bible

**Status:** Internal specification — single source of truth for product UI  
**Canonical surfaces (frozen — do not redesign):** Home (`/dashboard`), Play (`/games`), Queue (`/games/[gameId]`), Lobby & live match (`/games/match/[matchId]`), Wallet (`/wallet`)  
**Implementation layers:** `app/chance-design-tokens.css`, `app/chance-competitive-rich.css`, `components/app/competitive-shell.tsx`, domain components under `components/dashboard`, `components/play`, `components/queue`, `components/match-lobby`, `components/gameplay`, `components/wallet`  
**Fonts:** Inter (UI), JetBrains Mono (numeric) — `app/layout.tsx`  
**Preview catalog:** `/design-system` (primitives); competitive richness lives in CSS classes documented below  

---

## Foundations

### Philosophy

ChanceUS is a **skill-first competitive arena** where tokens represent stake, not gambling house edge. The interface should feel like **entering a match**, not opening a bank app or a generic SaaS dashboard. Every screen asks: *does this get the player back into fair head-to-head play faster?*

Design serves **clarity under pressure**: stakes, turn, timer, and opponent identity must read in one glance. Decoration supports confidence; it never competes with the board.

### Design principles

1. **Neutral canvas, intentional green** — Warm gray surfaces; `--chance-brand` owns wins, stakes, primary actions, and live state. No orange accent in product chrome (legacy marketing excepted until migrated).
2. **4px grid, 8px rhythm** — Spacing in multiples of 4; major sections separated by 24–32px (`--chance-space-6` / `--chance-space-8`).
3. **Typography before color** — Hierarchy from size, weight, and tracking; muted color for secondary only.
4. **Hairline borders + soft elevation** — 1px `--chance-border`; cards use `--chance-shadow-xs` or `--chance-shadow-elevated` on hero/premium surfaces.
5. **Tabular numbers** — Tokens, timers, scores, ranks: `chance-text-mono` + `tabular-nums`.
6. **One primary action per zone** — One brand CTA per viewport region (e.g. Find match, Enter queue, Ready up, Add tokens).
7. **Match-first wallet** — Balance is a stack for the next queue, not a fintech KPI dashboard.
8. **Accessible state** — Phase/status uses **text + icon/dot**, not color alone (gameplay phase pills, live badges).

### Product personality

| Trait | Expression |
|--------|------------|
| Confident | Bold hero titles, uppercase arena titles in lobby, crisp CTAs |
| Fair | Copy emphasizes skill, head-to-head, no house edge |
| Live | Pulse dots, “Live” badges, syncing banners when realtime degrades |
| Premium | Gradient-border premium cards, cinematic home hero, subtle glow on brand |
| Direct | Short labels, mono for money, minimal dashboard jargon |

### Emotional goals

| Moment | Player should feel |
|--------|---------------------|
| Home | “I belong here; I can play now.” |
| Play | “Pick a game and queue in seconds.” |
| Queue | “Stake is set; I’m finding a fair match.” |
| Lobby | “Opponent, pot, ready — focus before the board.” |
| Live game | “I know turn, time, and stakes — the board is center.” |
| Wallet | “I have X tokens; I can join another match immediately.” |
| Win/loss | Clear outcome without clutter; path to rematch or play again |

### Visual identity

- **Accent:** Green `--chance-brand` (light `#00a862`, dark `#00d26a`).
- **Outcomes:** `--chance-yes` (win/positive), `--chance-no` (loss/negative stake).
- **Canvas:** `--chance-bg` warm neutral (light `#f7f7f5`, dark `#0a0a0a`).
- **Logo:** Eagle mark in home hero and sidebar; no third-party mock art.
- **Imagery:** Game JPG thumbnails on Play/Queue/Lobby; CSS scrims and gradient meshes elsewhere.
- **Icons:** Lucide, stroke ~1.75, sizes 16px inline / 20px nav.
- **Theme:** Light default in competitive theme; system + toggle with view-transition fade (`lib/theme/start-theme-transition.ts`).

---

## Layout

### Page spacing

| Context | Padding / gap |
|---------|----------------|
| Shell main | `px-4 py-5` → `sm:px-6 sm:py-7` → `lg:px-8 lg:py-8` |
| Feed blocks | `chance-home-feed`: vertical stack, section gap **32px** (`gap-8` / `--chance-space-8`) |
| Premium card inner | **16–22px** (`p-4` / `sm:p-[1.125rem]` / `sm:p-5`) |
| Rail column | `gap-6` between rail cards |
| Hero internal | Wallet/Play spotlight: **24–32px** padding on large breakpoints |

### Containers

| Class / pattern | Role |
|-----------------|------|
| `.chance-competitive-theme` | Token-aware light/dark competitive palette |
| `.chance-shell` | Full viewport app root |
| `.chance-home-feed` | Main content column; `max-w-none`, fluid |
| `.chance-premium-card` | Default elevated content surface |
| `.chance-gameplay-frame` | Active match board column (minimal padding) |

### Gutters

- Shell column gap: sidebar | main | rail with **no double padding** at rail border.
- Mobile: single column; rail **stacks below** main with top border.
- CTA rows: `chance-hero-cta-row` — flex wrap, **8–12px** gap.

### Widths

| Token | Value | Use |
|-------|-------|-----|
| `--chance-sidebar-w` | 15rem (240px) | Left nav |
| `--chance-rail-w` | 17.5rem (280px) | Right utility rail |
| `--chance-header-h` | 3.5rem | Top bar |
| `--chance-max-content` | 42rem | Narrow forms (reference) |
| `--chance-max-app` | 72rem | App max (reference) |
| `--chance-max-wide` | 90rem | Wide lists (reference) |

Main feed is **fluid** (`min-w-0`); avoid arbitrary `max-w-7xl` on canonical pages.

### Responsive rules

| Breakpoint | Behavior |
|------------|----------|
| `<1024px` | Sidebar → sheet (hamburger in topbar); rail below main |
| `≥1024px` | Three columns: sidebar · main · rail |
| `<640px` | Stack CTAs; reduce hero type with `clamp()` |
| Tables / long rows | Horizontal scroll with `min-w-0` on parents |

### Grids

| Surface | Grid |
|---------|------|
| Featured games (Home) | Responsive 2→5 columns |
| Play library | Responsive card grid via `PlayGameCard` |
| Queue stakes | Horizontal stake pills / grid |
| Wallet packs | `1 col` → `sm:3 cols` |
| Lobby players | `lg:grid-cols-[1fr_auto_1fr]` (P1 · VS · P2) |
| Live match (active) | Main + chat aside `lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]` |

---

## Typography

### Scale (competitive + design-system)

| Role | Class / element | Size | Weight | Line height | Tracking |
|------|-----------------|------|--------|-------------|----------|
| Display / hero title | `.chance-hero-title` | clamp ~24–48px | 800 | ~0.95–1.05 | -0.03em to -0.04em |
| Arena title | `.chance-match-arena-title` | clamp 24–34px | 800 | 1.05 | -0.03em, uppercase |
| Wallet balance | `.chance-wallet-hero-balance` | clamp 36–64px | 800 | 0.95 | -0.04em |
| Section title | `.chance-section-title` | ~14px | 600–700 | tight | -0.01em |
| Body | `.chance-text-body` / 15px prose | 14–15px | 400–500 | 1.55 | -0.01em |
| Caption / meta | `.chance-text-caption` | 12px | 400–500 | 1.4 | normal |
| Label / kicker | `.chance-hero-kicker`, `.chance-text-label` | 10–11px | 700 | 1.2 | 0.08–0.1em uppercase |
| Mono / stakes | `.chance-text-mono` | 13px+ | 600–700 | 1.2 | tabular-nums |
| Design-system h1–h4 | `ChanceText` variants | 30–16px | 600 | per token | per token |

### Hierarchy rules

1. **One hero per page** — Home cinematic title; Play spotlight; Queue game art; Lobby arena; Wallet balance; Gameplay HUD title row.
2. **Kickers above titles** — `chance-hero-kicker` → title → caption.
3. **Section titles** — Sentence case on Wallet/Play; uppercase optional in lobby arena only.
4. **Never use color alone** for critical status — pair with label, dot, or icon.

### Weights

- **800:** Marketing/hero/arena/wallet balance  
- **700:** CTAs, phase pills, badges  
- **600:** Section titles, player names, nav active  
- **400–500:** Body, captions  

---

## Color

### Semantic colors

| Token | Role |
|-------|------|
| `--chance-bg` | Page background |
| `--chance-fg` | Primary text |
| `--chance-surface` | Card face |
| `--chance-surface-raised` | Raised panels, HUD |
| `--chance-surface-inset` | Inputs, wells, rail rows |
| `--chance-border` / `--chance-border-strong` | Hairlines / hover emphasis |
| `--chance-muted` / `--chance-muted-fg` | Secondary surfaces / text |
| `--chance-primary` / `--chance-primary-fg` | Neutral CTA (dark/light invert) |
| `--chance-brand` / `--chance-brand-hover` / `--chance-brand-fg` | Primary product accent |
| `--chance-brand-muted` | Tinted backgrounds |

### Success

- Token: `--chance-success` (aligned with brand green).
- Muted fill: `--chance-success-muted`.
- Use: wins, positive tx amounts, ready rings, live match badge, phase `--win`.

### Warning

- Token: `--chance-warning` (+ `--chance-warning-muted`).
- Use: waiting lobby, syncing banner, ready-check pending, phase `--warn`.

### Destructive

- Token: `--chance-destructive` / `--chance-destructive-fg`.
- Use: errors, cancel match, insufficient funds (copy + border).

### Surface colors

Light: white / `#f0f0ec` inset on `#f7f7f5` bg.  
Dark: `#141414` / `#1a1a1a` raised on `#0a0a0a` bg.

### Backgrounds

- **App:** `bg-[var(--chance-bg)]` under `.chance-competitive-theme`.
- **Premium card:** gradient pseudo-border via `.chance-premium-card::before`.
- **Hero cinematic:** `.chance-hero-cinematic` + eagle art layer.
- **Play/Queue spotlight:** `.chance-play-spotlight` / `.chance-queue-spotlight` + scrim.

### Overlays

- Countdown: `.chance-gp-countdown-overlay` full-stage, z-index 20.
- Result banner: `.chance-gp-result` on stage.
- Arena scrim: `.chance-match-arena-scrim`, `.chance-play-spotlight-scrim`.
- Dialogs: shadcn `DialogContent` with `--chance-surface-raised` (Wallet checkout).

### Gradients

- Brand CTA: `linear-gradient(180deg, brand 95% → brand 100%)` on `.chance-match-ready-btn`.
- Hero mesh: radial brand at low opacity in `.chance-home-banner` / wallet `.chance-wallet-hero-glow`.
- Avatar: deterministic gradient from username (`avatarGradient` in `chance-craft`).
- **Avoid** orange gradients in product; marketing migration should use brand gradients only.

---

## Components

Convention for each entry: **Purpose · Variants · States · Spacing · Accessibility · Animations**

---

### Buttons

**Purpose:** Commit actions in the competitive loop (play, queue, pay, ready).

**Variants (canonical CSS):**

| Class | Use |
|-------|-----|
| `.chance-hero-cta-primary` | Single primary per zone — brand fill, glow hover |
| `.chance-hero-cta-ghost` | Secondary text/outline — Browse, Custom lobby |
| `.chance-secondary-btn` | Bordered secondary — Withdraw, cancel-adjacent |
| `.chance-match-ready-btn` | Lobby ready — uppercase, brand gradient |
| `.chance-match-ready-btn--locked` | Disabled ready state |

**Design-system (`ChanceButton`):** `primary`, `brand`, `secondary`, `outline`, `ghost`, `destructive`, `link`, `yes`, `no` — use for forms/dialogs being migrated.

**States:** default, hover (opacity/translateY/glow), active (`chance-pressable` scale 0.98), disabled (opacity 0.5–0.65, no glow), loading (spinner + label change).

**Spacing:** Primary padding ~`0.625rem 1.25rem`; full-width allowed on mobile; icon gap 8px.

**Accessibility:** `.chance-focus-ring:focus-visible` — 3px brand or neutral ring; min touch 44px on mobile CTAs; `aria-busy` on buy/ready loading.

**Animations:** `--chance-duration-fast` (150ms); ready button translateY -1px on hover; theme transition via View Transitions API on theme toggle.

---

### Cards

**Purpose:** Group content without fintech “widget grid” noise.

**Variants:**

| Class | Use |
|-------|-----|
| `.chance-premium-card` | Default surface — border gradient, elevated shadow |
| `.chance-surface-card` | Flatter lists (tokens CSS) |
| `.chance-play-game-card` | Play library tile |
| `.chance-match-player-col` | Lobby player column |
| `.chance-wallet-pack` | Token pack selectable tile |

**States:** default, hover (border brand tint, shadow), active press on interactive tiles.

**Spacing:** Inner padding 16–20px; list rows 12–16px vertical.

**Accessibility:** Interactive cards use native `button` or `Link` with focus ring; articles for game cards with readable names.

**Animations:** Hover border/shadow 150ms; game card visual scale on hover optional.

---

### Inputs

**Purpose:** Search (topbar affordance), transfer username/amount, auth forms (migration).

**Canonical pattern:**  
`h-11`, `rounded-[var(--chance-radius-md)]`, `border-[var(--chance-border)]`, `bg-[var(--chance-surface-inset)]`, `chance-focus-ring`, labels as `.chance-text-label`.

**Variants:** Default, error (destructive border + message), success (yes border — rare).

**States:** default, focus, disabled, invalid.

**Spacing:** Label 8px above field; field groups 20px apart.

**Accessibility:** Associated `<label>`; `autoComplete` where applicable; error text `role="alert"`.

**Animations:** Border color 150ms on focus.

**Reference:** `ChanceInput` / `ChanceField` in design-system for migrated forms.

---

### Dialogs

**Purpose:** Stripe checkout, feedback (global), mobile nav sheet.

**Variants:** Modal (`Dialog`), slide sheet (`Sheet` — sidebar menu).

**States:** open/closed; loading inside modal during payment.

**Spacing:** `sm:max-w-md` checkout; header + body 16–24px.

**Accessibility:** Focus trap (radix); title in `DialogHeader`; close control.

**Animations:** Radix enter/exit; prefer `--chance-duration-normal` (200ms).

**Wallet:** Token checkout — `DialogContent` with semantic surface tokens.

---

### Tables

**Purpose:** Activity match history (migration), row lists inside premium cards.

**Canonical pattern:** `.chance-table-rich` — no outer grid; header caption row; body row hover wash; mono right-aligned amounts.

**Variants:** Activity list rows (target); transaction rows `.chance-wallet-tx-row`.

**States:** default row, hover, empty.

**Spacing:** Row height ~40–48px; cell padding 12–16px horizontal.

**Accessibility:** `<table>` or list with clear headers; sortable columns announce when implemented.

**Animations:** Row background 150ms hover.

---

### Badges

**Purpose:** Live state, match status, queue depth, tournament tags.

**Variants:**

| Class | Use |
|-------|-----|
| `.chance-play-live-badge` + `.chance-play-live-dot` | Live matches / pulse |
| `.chance-match-status-badge--{waiting,in_progress,completed}` | Lobby status |
| `.chance-play-stat-pill` | Pot, entry, mode chips |
| `ChanceBadge` `live` | Design-system live dot |

**States:** static; pulsing dot for live only.

**Spacing:** Pill padding 4–10px; inline with titles.

**Accessibility:** Text label always (“Live”, “Ready check”); dot `aria-hidden`.

**Animations:** `chance-play-pulse` 1.8s on live dot; respect `prefers-reduced-motion`.

---

### Avatars

**Purpose:** Player identity in lobby, HUD, friends, rails.

**Component:** `ChancePlayerAvatar` — initial letter, deterministic gradient, `ring-1` border.

**Variants:** Sizes via `className` (`size-8` HUD chips → `chance-match-player-avatar` 4.5rem lobby).

**States:** default; “you” ring via `ring-[var(--chance-brand)]` in lobby/HUD.

**Spacing:** 8–12px gap to name label.

**Accessibility:** Decorative in rows where name is adjacent; `aria-hidden` on avatar span when name present.

**Animations:** None.

---

### Search

**Purpose:** Topbar discovery affordance (placeholder until search ships).

**Class:** `.chance-search-rich` — inset glass fill, 40px height, md radius.

**States:** read-only placeholder; future: focus expands.

**Spacing:** Centered in topbar; max width ~400px desktop.

**Accessibility:** `aria-label="Search players, games…"` when interactive.

**Animations:** None currently.

---

### Dropdowns

**Purpose:** Account menu, “More” nav on legacy header, pack select in forms.

**Implementation:** shadcn `DropdownMenu` on topbar; align end; rounded-xl content.

**States:** open/closed; item hover.

**Spacing:** Item padding 8–12px; icon 16px left.

**Accessibility:** Keyboard nav via radix; `aria-expanded` on trigger.

**Animations:** 150ms fade/zoom.

---

### Tooltips

**Purpose:** Rare; prefer visible captions. Use shadcn `Tooltip` when needed for icon-only controls.

**States:** hover/focus delay.

**Accessibility:** Only for supplementary info; not for essential stakes/rules.

---

### Toasts

**Purpose:** Async feedback (friend request, errors).

**Implementation:** `Toaster` in root layout — align with `--chance-surface` when migrated.

**States:** success, error, default.

**Spacing:** Bottom offset clear of feedback FAB.

**Accessibility:** `role="status"` / live region.

**Animations:** Slide in 200ms.

---

### Skeletons

**Purpose:** Loading rails and lists without layout shift.

**Classes:** `.chance-skeleton`, `.chance-skeleton-list` in competitive CSS; `SkeletonRows` in `chance-craft`.

**States:** indeterminate shimmer.

**Spacing:** Match final row heights.

**Accessibility:** `aria-busy` on parent; `aria-label="Loading"`.

**Animations:** Shimmer; disable for reduced motion.

---

### Loading

**Purpose:** Queue matchmaking, payment, page suspense.

**Patterns:** Spinner on buttons; `MatchmakingInterface` competitive variant; `Suspense fallback={null}` only where CLS acceptable — prefer skeletons on rails.

**Accessibility:** `aria-busy`, disabled controls during load.

---

### Tabs

**Purpose:** Play category filters (`PlayToolbar` pills, not radix tabs).

**Pattern:** `.chance-play-category-pill` / `--active` — horizontal scroll row.

**States:** active pill brand tint; inactive muted.

**Spacing:** 8px gap; 12px pill padding.

**Accessibility:** `aria-pressed` on toggle pills.

---

### Sidebar

**Purpose:** Primary IA — Home, Play, Activity, Wallet + More.

**Component:** `CompetitiveSidebar` — `.chance-nav-link`, `.chance-nav-active-pill`, invite card footer.

**Variants:** Primary vs secondary (More) link groups.

**States:** active route; hover muted bg.

**Spacing:** 12px vertical link padding; 240px width.

**Accessibility:** `<nav aria-label="Main">`; skip link to `#main-content`.

**Animations:** 150ms color/background; active pill inset glow.

---

### Topbar

**Purpose:** Mobile menu, page title (mobile), search, tokens, theme, notifications, avatar.

**Component:** `CompetitiveTopbar` — `.chance-topbar-rich`, `.chance-token-pill-rich`, `.chance-toolbar-btn`.

**States:** sticky blur backdrop.

**Spacing:** `--chance-header-h` 56px; horizontal padding 16–24px.

**Accessibility:** Menu button `aria-label`; token pill `aria-label` with balance.

**Animations:** Theme toggle uses view transition.

---

### Game cards

**Purpose:** Browse games on Play; featured on Home.

**Components:** `PlayGameCard`, `FeaturedGames`, `GameCard` (legacy paths).

**Variants:** `.chance-play-game-card--featured`; thumbnail + scrim + live badge.

**States:** hover lift border; actions Queue + Host.

**Spacing:** Visual aspect ~ card grid; actions row 8px gap.

**Accessibility:** Game name in heading; buttons distinct labels.

**Animations:** Hover 150ms border/shadow.

---

### Wallet

**Purpose:** Show stack; add tokens; withdraw (transfer); activity list; return to play.

**Components:** `WalletPageClient`, `BuyButtons`, `TransferTokensForm`, `TransactionHistory`, rail `WalletPlayRail`.

**Layout:** `.chance-wallet-hero` → sections `#wallet-add-tokens`, `#wallet-withdraw` → recent activity.

**Variants:** Pack tiles `.chance-wallet-pack`; tx rows `.chance-wallet-tx-row`.

**States:** Realtime balance via supabase channel; payment modal open; transfer success/error banners.

**Spacing:** Hero 24–32px padding; sections 32px apart.

**Accessibility:** Balance in `<h1>`; alerts `role="alert"`.

**Animations:** Pack hover glow; smooth scroll to anchors from hero CTAs.

**Rules:** No KPI grid; no duplicate balance in rail on wallet page (use “Find a match” rail).

---

### Queue

**Purpose:** Pick stake; enter matchmaking; open lobbies link.

**Components:** `GameQueueHub`, `GameQueueRail`, `MatchmakingInterface variant="competitive"`.

**Layout:** `.chance-queue-spotlight` + stake pills + CTA row.

**States:** `inQueue` shows matchmaking panel; `autoStart` flow preserved.

**Spacing:** Spotlight matches Play; stake pills horizontal wrap.

**Accessibility:** Stake selection keyboardable; disabled when insufficient tokens.

**Animations:** Matchmaking status text updates; no distracting pulse.

---

### Lobby

**Purpose:** Pre-match — opponent, pot, ready check, chat, join/spectate.

**Components:** `MatchLobbyPageView`, `match-lobby-utils`.

**Layout:** Arena art + `.chance-match-arena-body`; P1 VS P2 columns; ready panel; hide chrome when `in_progress` / `completed`.

**States:** waiting / ready check / starting banner / friend pending / spectator.

**Spacing:** Arena padding 20–24px; player cols equal width grid.

**Accessibility:** Ready ring + text; status badge text; chat aside labeled.

**Animations:** Start banner count `3`; wait pulse on empty opponent slot.

---

### Gameplay (HUD)

**Purpose:** Live match — phase, timer, pot, players, board stage.

**Components:** `GameplayShell`, `gameplay-utils` phase resolver.

**Layout:** `.chance-gp-hud` grid → `.chance-gp-stage` with board + overlays.

**Variants:** Phase modifiers `--you`, `--opp`, `--win`, `--loss`, `--warn`; countdown overlay; result banner.

**States:** your-turn, opponent-turn, simultaneous, syncing, victory/defeat/draw, network-error.

**Spacing:** HUD 12–16px gaps; compact player chips in bar.

**Accessibility:** `role="status"` on phase pill; `aria-live="polite"` on stage; timer `aria-label`.

**Animations:** Countdown number only; subtle result fade-in; no full-screen flash.

---

### Tournament

**Purpose:** Compete nav — list, detail bracket (migration partial).

**Play rail:** `PlayTournaments` rows `.chance-play-tournament-row`.

**Target pattern:** Same shell as Play; premium cards; no orange bracket chrome when migrated.

**States:** registration open/closed; password gate.

**Accessibility:** Tournament name as heading; link rows keyboard focusable.

---

### Profile

**Purpose:** Identity and stats (legacy migration).

**Target pattern:** Competitive shell; `ChancePlayerAvatar`; premium card header; link to Settings — **no** cyan/yellow gradient shadcn avatar.

**Canonical reference:** Home hero identity block typography only.

---

### Activity

**Purpose:** Match history and performance (shell migrated; table migration pending).

**Target pattern:** Shell + `chance-section-title`; mono stats inline or single row — **no** fake trend KPIs; table/list like `.chance-play-queue-row` or `.chance-wallet-tx-row`; empty → Find a match.

---

### Settings

**Purpose:** Account preferences (legacy migration).

**Target pattern:** Shell; section stacks in premium cards; form inputs per Input spec; single save CTA per section.

---

## Motion & interaction (global)

| Duration | Token | Use |
|----------|-------|-----|
| 100ms | `--chance-duration-instant` | Micro feedback |
| 150ms | `--chance-duration-fast` | Hover, press, nav |
| 200ms | `--chance-duration-normal` | Dialogs, toasts |
| 300ms | `--chance-duration-slow` | Hero optional |

**Press:** `.chance-pressable` / `active:scale-[0.98]` on primary CTAs.  
**Theme:** `.chance-theme-fade-in/out` in `globals.css` with reduced-motion bypass.  
**Live:** Pulse dot only — never full-viewport animation during gameplay.

---

## Accessibility (global)

- Skip link to `#main-content` in competitive shell.
- Focus visible on all interactive elements — `.chance-focus-ring`.
- Colorblind-safe: phase pills use text + dot; win/loss not red/green alone in HUD labels.
- Minimum contrast: body text on `--chance-bg` / `--chance-surface` meets WCAG AA for canonical surfaces.
- Keyboard: lobby ready, queue stakes, wallet hero scroll CTAs (buttons), form submit.
- Screen reader: live regions for match phase and syncing banners.

---

## File reference (implementers)

| Concern | Path |
|---------|------|
| CSS tokens | `app/chance-design-tokens.css` |
| Competitive richness | `app/chance-competitive-rich.css` |
| Shell | `components/app/competitive-shell.tsx` |
| Nav config | `lib/navigation/app-nav.ts` |
| Craft helpers | `components/dashboard/chance-craft.tsx` |
| Primitives | `components/design-system/*` |
| Audits | `LAUNCH_DESIGN_AUDIT.md`, `LAUNCH_PROGRESS.md`, `MATCH_LOBBY_REVIEW.md`, `GAMEPLAY_REVIEW.md` |

---

## Governance

1. **Frozen surfaces** — Home, Play, Queue, Lobby, Wallet: presentation changes require explicit product approval; logic/API changes follow separate review.
2. **New UI** — Must use `--chance-*` tokens and competitive classes before shadcn defaults.
3. **One primary CTA** per viewport zone; secondary actions ghost or secondary button.
4. **Match-first copy** on Wallet and empty states — default exit ramp is `/games`.
5. **This document wins** over ad-hoc `DESIGN.md` sections where they conflict; update the bible when canonical surfaces change.

---

*Last updated: internal launch polish phase — reflects Wallet match-first redesign and competitive shell on core routes.*
