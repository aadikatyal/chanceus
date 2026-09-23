# ChanceUS responsive audit

**Date:** 2026-09-23  
**Breakpoints (canonical):**

| Tier | Width | Intent |
|------|-------|--------|
| Mobile | 320–767px | Single column, drawer nav, full-width CTAs |
| Tablet | 768–1023px | Icon sidebar, 2-column hubs, rail below main |
| Desktop | 1024–1439px | Full sidebar, multi-column hubs, utility rail |
| Large desktop | 1440px+ | Wider section padding (32–40px rhythm) |

**Global layers:** `app/chance-design-tokens.css` (shell), `app/chance-responsive.css` (cross-app), `app/chance-competitive-rich.css` (page patterns).

---

## Global fixes (all authenticated routes using `CompetitiveShell`)

| Area | Issue | Fix |
|------|--------|-----|
| Sidebar | Full sidebar only at 1024px+; mobile had menu at 1024 | **768–1023:** icon rail (`--chance-sidebar-icon-w`); **1024+:** full labels + invite card |
| Sidebar | Hidden &lt;768 with weak mobile IA | **&lt;768:** hamburger → `CompetitiveMobileNav` (backdrop, ESC, close on navigate) |
| Topbar | Search + clutter on small screens | **Mobile:** logo, menu, title, balance, avatar; theme/bell hidden |
| Topbar | Tablet search | **768–1023:** search icon → expandable field |
| Topbar | Desktop | Unchanged centered search |
| Main padding | Inconsistent Tailwind vs tokens | `--chance-page-pad-*` + safe-area on `.chance-shell-main` |
| Overflow | Horizontal scroll risk | `overflow-x: clip` on main; `max-width: 100%` on feed children |
| Touch | Small tap targets | Min 44px on primary nav, CTAs, toolbar buttons |
| Heroes | Large type on phones | Smaller `clamp()` titles; stacked full-width CTAs on mobile |
| Safe area | Notch / home indicator | `viewportFit: cover`, `env(safe-area-inset-*)` on shell + sheets |
| Utility rail | Cramped on tablet | Already stacks under main until `lg`; padding synced to page tokens |
| Live call room | 2-col grid on narrow widths | Single column &lt;1280px via `chance-responsive.css` |

**New files:** `components/app/competitive-mobile-nav.tsx`, `app/chance-responsive.css`.

---

## Pages reviewed

### Canonical product (CompetitiveShell)

| Route | Reviewed | Issues found | Fixed |
|-------|----------|--------------|-------|
| `/dashboard` (Home) | Yes | Rail only `lg+`; hero CTAs narrow on mobile | Global hero + rail stack |
| `/games` (Play) | Yes | Tile grids rely on existing `sm`/`md` breakpoints | Global overflow + touch |
| `/games/[gameId]` | Yes | Same as Play | Inherited |
| `/games/[gameId]/create` (Queue) | Yes | Form width | Global form/full-width CTAs mobile |
| `/games/match/[matchId]` (Lobby) | Yes | Match layout `chance-match-*` at 768+ | Inherited tokens |
| `/games/[gameId]/play` | Yes | Board + embed; C4 drop animation separate fix | Call-style single col on small |
| `/wallet` | Yes | Transaction list cards (no raw table) | Global card width |
| `/chat` (Social) | Yes | 3-col at 768 broke tablet | **768–1023:** 2 col + full-width “more”; **1024+:** 3 col |
| `/chat/dm/[userId]` | Yes | Chat width | Shell padding + chat panel min-heights |
| `/friends/add` | Yes | Discovery grids at 640/1024 | Existing `.chance-discovery-*`; global pad |
| `/tournaments` (Competition) | Yes | Bracket horizontal stress | Existing competition CSS; table stack utility available |
| `/tournaments/[tournamentId]` | Yes | Bracket scroll | Wrap in `.chance-responsive-table-wrap` if table added |
| `/tournaments/create` | Yes | Forms | Global mobile form stacking |
| `/bars` (Venues) | Yes | Poster grid 1→2→3 | Existing `.chance-venues-poster-grid` |
| `/bars/create`, `/bars/[barId]`, dashboard | Yes | Legacy host pages denser | Shell + padding; host ops still denser (edge case) |
| `/call`, `/call/[roomCode]` | Yes | Hub 3-col at 1200px | **1024px** 3-col; room stack &lt;1280 |
| `/matches`, `/watch` | Yes | Lists | Card full width |
| `/leaderboards`, `/rankings` | Yes | Rank rows | Global overflow |
| `/profile`, `/settings` | Yes | Forms | Auth-style full-width submit on mobile |
| `/analytics` | Yes | Charts width | `max-width: 100%` inheritance |

### Auth & marketing

| Route | Reviewed | Issues found | Fixed |
|-------|----------|--------------|-------|
| `/` | Yes | Landing hero | Hero clamp + CTA stack (global) |
| `/auth/login`, `/auth/sign-up` | Yes | Narrow buttons on phone | `.chance-auth-marketing-shell` mobile full-width submit |

### Venues join / session

| Route | Reviewed | Issues found | Fixed |
|-------|----------|--------------|-------|
| `/bar/join` | Yes | Mixed legacy shadcn | Shell N/A; safe-area padding partial |
| `/bar/session/*`, `/session/*`, `/bars/.../session/*` | Yes | Session UI | Inherits when wrapped in shell |

### Debug / internal

| Route | Reviewed | Issues found | Fixed |
|-------|----------|--------------|-------|
| `/debug`, `/debug-games`, `/debug-matches` | Yes | Dev-only | Low priority |
| `/design-system` | Yes | Reference page | Shell padding |
| `/demo-bar`, `/supabase-todos` | Yes | Legacy | Not production surfaces |
| `/replays/*` | Yes | Video + metadata | Global overflow |

---

## Remaining edge cases

1. **Host / bar ops** (`/bars/[barId]/dashboard`, some session pages) — still older gray/orange density; need a dedicated pass (presentation only).
2. **`/bar/join`** — not on CompetitiveShell; QR-first layout may still feel desktop-first on 320px widths.
3. **Tournament brackets** — very wide trees may still need horizontal pan inside a contained scroller (prefer over page scroll).
4. **In-game embeds** (Math Blitz, Trivia) — dense HUD; test on iPhone SE for button wrap.
5. **Global search** — placeholder UI; when live, wire mobile expandable + desktop field.
6. **Tablet topbar** — when search expanded, title area hidden (acceptable); could add collapse on route change.
7. **Floating feedback button** — verify offset from home indicator (not moved in this pass).

---

## Screenshots to verify

Capture at **375×812**, **768×1024**, **1280×800**, **1440×900**:

1. Home — hero + rail stacked (mobile) vs 3-zone (desktop)
2. Social — tabs (mobile) vs 2-col (tablet) vs 3-col (desktop)
3. Live Call hub — sticky bar (mobile) vs 3-col (desktop)
4. Venues — poster carousel swipe
5. Play — game tile grid
6. Wallet — balance + transactions
7. Match lobby + in-call Connect Four
8. Mobile drawer open + backdrop
9. Tablet icon sidebar + page content
10. Auth login — full-width primary button

---

## Scores (post-pass)

| Tier | Score | Notes |
|------|-------|-------|
| **Mobile** | **7.5/10** | Shell + canonical hubs strong; bar join + host ops lag |
| **Tablet** | **8/10** | Icon rail + 2-col social/call; search compact |
| **Desktop** | **9/10** | Source of truth preserved; large-desktop padding tuned |

---

## How to extend

- Add `data-label` on `<td>` and class `chance-responsive-table-stack` on tables for card-style mobile rows.
- Page-specific 2-col tablet: use `@media (min-width: 768px) and (max-width: 1023.98px)` pattern from Social/Call hubs.
- Do **not** change desktop grid at `min-width: 1024px` without explicit product review.
