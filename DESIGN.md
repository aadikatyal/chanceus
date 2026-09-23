# ChanceUS Design System

Reference for migrating product UI to a cohesive system inspired by **Kalshi** (market clarity, yes/no semantics), **Linear** (precision, density, motion), and **Stripe** (typography, elevation, trust).

**Status:** Tokens and `components/design-system/*` are ready. Existing pages still use `components/ui/*` until migrated.

## Principles

1. **Neutral canvas, intentional accent** — Warm gray surfaces (`#f7f7f5` light / `#0a0a0a` dark) with green brand for wins, stakes, and primary actions.
2. **4px grid** — Spacing in multiples of 4; default stack gap `16px`, section `32px`.
3. **Typography does hierarchy** — Size and weight before color; muted text for secondary only.
4. **Borders + subtle shadow** — Linear-style 1px borders; Stripe-style soft elevation on raised cards.
5. **Tabular numbers** — Token amounts, odds, and timers use `font-mono` + `tabular-nums`.

## Tokens

| Layer | Location |
|-------|----------|
| CSS variables | `app/chance-design-tokens.css` (`--chance-*`) |
| TypeScript | `lib/design-system/tokens.ts` |
| Tailwind | `tailwind.config.js` (`chance-*`, `shadow-chance-*`, `rounded-chance-*`) |

### Color roles

| Token | Use |
|-------|-----|
| `--chance-bg` / `--chance-surface` | Page vs card |
| `--chance-primary` | Default CTA (near-black / near-white) |
| `--chance-brand` | Skill gaming accent, success, “Yes” |
| `--chance-yes` / `--chance-no` | Market-style binary outcomes |
| `--chance-muted-fg` | Captions, hints, table meta |

### Typography scale

| Class / variant | Size | Use |
|-----------------|------|-----|
| `chance-text-display` | 40px | Marketing hero |
| `chance-text-h1`–`h4` | 30–16px | Page and section titles |
| `chance-text-body` | 14px | Default UI copy |
| `chance-text-caption` | 12px | Meta, timestamps |
| `chance-text-label` | 11px uppercase | Form labels, section kicker |
| `chance-text-mono` | 13px tabular | Stakes, scores |

### Spacing (4px grid)

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64` — prefer Tailwind `1–16` or semantic layout components.

### Radius

| Token | px |
|-------|-----|
| `chance-radius-sm` | 6 |
| `chance-radius-md` | 8 |
| `chance-radius-lg` | 12 |
| `chance-radius-xl` | 16 |

### Shadows

`chance-shadow-xs` (resting controls) → `chance-shadow-md` (modals, popovers). Focus: `chance-shadow-focus` or `chance-shadow-focus-brand`.

### Motion

- Fast interactions: **150ms** (`--chance-duration-fast`)
- Enter animations: **200ms** fade / slide-up
- Utilities: `animate-chance-in`, `animate-chance-slide-up`, `animate-chance-scale-in`
- Live badge: `animate-chance-pulse-dot`

## Components

Import from `@/components/design-system`:

| Component | Notes |
|-----------|--------|
| `ChanceButton` | `primary`, `brand`, `secondary`, `outline`, `ghost`, `destructive`, `link`, `yes`, `no` |
| `ChanceCard` | `default`, `elevated`, `inset`, `outline`, `interactive` |
| `ChanceInput` / `ChanceField` | States: `default`, `error`, `success` |
| `ChanceBadge` | Includes `live` + `showLiveDot` |
| `ChanceText`, `ChanceHeading` | Typography variants |
| Layouts | `ChanceAppShell`, `ChancePageHeader`, `ChanceSection`, `ChanceSplitLayout`, `ChanceDashboardGrid`, etc. |

## Page layouts

| Pattern | Component | When |
|---------|-----------|------|
| App dashboard | `ChanceAppShell` + `ChancePageHeader` + `ChanceDashboardGrid` | Games, wallet, matches |
| Settings / docs | `ChanceSplitLayout` | Nav sidebar + content |
| Marketing | `ChanceMarketingShell` + wide sections | Landing (future) |
| Sticky filters | `ChanceToolbar` | Lists, leaderboards |

## Migration

1. Replace `Button` → `ChanceButton` per screen when touching that screen.
2. Map shadcn semantic colors to `--chance-*` in a later pass (optional).
3. Preview all tokens at **`/design-system`** (internal catalog).

## Fonts

Inter (UI) and JetBrains Mono (numeric) — configured in `app/layout.tsx`.

## Competitive shell (reference-derived)

Reverse-engineered from a high-density gaming dashboard layout (three columns, card feed, utility rail). **ChanceUS uses the structure and rhythm, not the reference palette, copy, or artwork.** Brand stays green (`--chance-brand`); surfaces stay neutral.

### Layout grid

| Zone | Width | Breakpoint |
|------|-------|------------|
| Left nav | `240px` (`--chance-sidebar-w`) | `≥1024px` fixed column; `<1024px` sheet from top bar |
| Main feed | Fluid (`min-w-0`, max ~`80rem` content) | Always |
| Utility rail | `280px` (`--chance-rail-w`) | `≥1024px` right column; `<1024px` stacks under main |
| Page padding | `24–32px` (`--chance-space-6` / `8`) | Tighter on mobile |

Vertical rhythm between major blocks: **`32px`** (`gap-8` / `--chance-space-8`).

### Navigation philosophy

- **Primary rail (4 items):** Home → Play → Activity → Wallet — always visible on desktop sidebar.
- **Secondary block:** Compete, Social, Add friends, Venues, Live call — separated by a hairline divider, slightly smaller type/icons.
- **Active state:** Muted pill background + brand-tinted icon (not full brand fill).
- **Promo card:** Bottom of sidebar — low-priority CTA in an inset surface card (ghost button).
- **Top bar (shell):** Mobile menu, centered search affordance (⌘K placeholder), token pill, theme, account — sticky with blur.

Legacy routes still use `components/navigation/header.tsx` (same `lib/navigation/app-nav.ts` config) until migrated to `CompetitiveShell`.

### Spacing scale (8px base, 4px half-steps)

CSS tokens: `--chance-space-1` (4px) through `--chance-space-12` (48px). Prefer **4, 8, 12, 16, 24, 32, 48** for UI; card internal padding **16–20px**; list row gaps **8–12px**.

### Typography (shell contexts)

| Role | Treatment |
|------|-----------|
| Hero band headline | `24–30px`, bold, tight tracking (sentence case for ChanceUS — not reference all-caps marketing) |
| Section titles | `14px` semibold |
| Sidebar labels | `14px` medium / secondary `14px` regular |
| Meta / timestamps | `12px` caption + muted |
| Kickers | `11px` label (uppercase optional) |
| Money / rank | `chance-text-mono`, tabular |

### Card system

- **Surface card** (`.chance-surface-card`): `--chance-surface`, `1px` `--chance-border`, `--chance-radius-shell` (16px), `--chance-shadow-xs`.
- **Hero band** (`.chance-home-banner`): gradient mesh using brand at low opacity + inset surface; **20px** radius (`--chance-radius-banner`).
- **Interactive game tiles:** same shell radius; hover → stronger border + `--chance-shadow-elevated`; no bitmap heroes.

### Table system

Row lists inside a surface card — **no outer grid borders**. Header row: caption-style labels, bottom hairline. Body: **40px-ish** row height, hover wash on `--chance-surface-inset`. Result chips use `ChanceBadge` yes/no. P/L column right-aligned mono, semantic green/red.

### Button hierarchy

1. **Primary:** `.chance-btn-primary` / brand fill — one per viewport zone (e.g. Find match).
2. **Secondary:** 1px border, transparent/inset bg — Withdraw, View activity.
3. **Ghost / link:** Caption + brand underline — View all →.
4. **Icon affordance:** Square `36px` brand fill for “add” in wallet rail.

### Icons

- Sidebar primary: **`20px`** (`size-5`).
- Secondary nav: **`18px`**.
- Top bar / inline: **`16px`** (`size-4`).
- Lucide stroke, consistent with existing app.

### Borders, shadows, radius

- **Borders:** 1px hairlines only; strong border for hover/focus on inputs and secondary buttons. No heavy outlines.
- **Shadows:** Resting `xs`; elevated cards/modals `elevated` / `md`. No neumorphism.
- **Radius:** Controls `8px` (`md`); cards/rails `16px` (`shell`); hero `20px` (`banner`).

### Color system (ChanceUS mapping)

| Reference idea | Chance token |
|----------------|--------------|
| Accent CTA / active | `--chance-brand` |
| Canvas | `--chance-bg` |
| Cards | `--chance-surface` / `--chance-surface-inset` |
| Win / online | `--chance-yes` |
| Loss | `--chance-no` |
| Muted copy | `--chance-muted-fg` |

### Imagery

No copied hero art. Use **CSS gradients**, optional product logo in sidebar, **Lucide** game icons in tiles. Avatars circular in lists when present.

### Interaction patterns

- Sticky top bar with backdrop blur.
- Sidebar links: quick `150ms` color/bg transition.
- Game tiles: subtle scale on press (`active:scale-[0.99]`).
- Live feed: `ChanceBadge` live + polling/realtime (existing components).
- Search: visible affordance, read-only until search ships.

### Responsive behavior

| Viewport | Behavior |
|----------|----------|
| `<1024px` | Hide fixed sidebar; hamburger → sheet nav. Rail stacks below main content (single mount). |
| `≥1024px` | Three columns: sidebar · main · rail. |
| Tables | Horizontal scroll with `min-width` guard on small screens. |
| Featured games | 2 → 3 → 4 → 5 columns as width grows. |

### Implementation

| Piece | Path |
|-------|------|
| Shell | `components/app/competitive-shell.tsx` |
| Sidebar / top bar | `competitive-sidebar.tsx`, `competitive-topbar.tsx` |
| Nav config | `lib/navigation/app-nav.ts` |
| Home composition | `app/dashboard/page.tsx`, `home-hero`, `featured-games`, `home-rail` |
| CSS fallbacks | `app/chance-design-tokens.css` (`.chance-shell*`, `.chance-surface-card`) |

**Rollout:** Home (`/dashboard`) uses the shell first; migrate Play, Activity, Wallet next while keeping backend logic unchanged.

### Visual richness (product vision)

Home uses `chance-competitive-theme` + `app/chance-competitive-rich.css` for **cinematic depth** (ambient canvas, gradient mesh hero, glow CTAs, premium gradient-border cards, tall featured-game tiles). This is not a wireframe pass — fidelity targets the *feeling* of a pro-gaming command center while keeping ChanceUS green and original copy/art (eagle hero, no third-party mock assets).
