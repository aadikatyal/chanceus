# Launch polish progress

**Source of truth:** `LAUNCH_DESIGN_AUDIT.md`  
**Current phase:** Critical issues (complete)  
**Next phase:** High severity (not started)

---

## Critical issues — completed

### 1. Split app shell (Activity + Wallet off `CompetitiveShell`)

| | |
|---|---|
| **Why it existed** | Primary nav routes were never migrated after Home/Play; they still used legacy `Header` + full-width gray canvas while the core loop used sidebar/topbar/rail. |
| **Solution** | Wrap `/matches` and `/wallet` in `CompetitiveShell` with `chance-home-feed` layout and competitive page headers. Wallet reuses `WalletRail` in the right rail. |
| **Files** | `app/matches/page.tsx`, `app/wallet/page.tsx` |
| **Verification** | No data/query changes; same components for table/history/buy flows. Removed duplicate `Header` and `bg-gray-950` wrappers on these two routes only. |

---

### 2. Orange vs brand green

| | |
|---|---|
| **Why it existed** | Early marketing and utility UI used Tailwind orange; competitive product uses `--chance-brand`. Global feedback FAB and legacy match card paths still used orange. |
| **Solution** | Tokenize feedback FAB/modal to brand + `chance-hero-cta-primary`. Replace marketing landing orange with `var(--chance-brand)` gradients. Swap orange accents in `EnhancedMatchInterface` legacy (waiting) card to brand mixes. |
| **Files** | `components/feedback/floating-feedback-button.tsx`, `components/feedback/feedback-modal.tsx`, `app/page.tsx`, `components/games/enhanced-match-interface.tsx` |
| **Verification** | No feedback action/API changes. Match logic unchanged; only class names on non–`GameplayShell` branches. |

---

### 3. Light/dark fracture (`bg-gray-950` + `text-white` canvas)

| | |
|---|---|
| **Why it existed** | Legacy routes hard-coded dark gray backgrounds and white titles while `Header`/`ThemeProvider` follow `--chance-*` tokens — light mode looked broken on those pages. |
| **Solution** | Replace page-level `bg-gray-950` with `chance-competitive-theme`, `bg-[var(--chance-bg)]`, and `text-[var(--chance-fg)]` across remaining `app/**/page.tsx` shells. Replace common `text-3xl font-bold text-white` titles with `chance-hero-title`. Activity/Wallet fixed via shell (issue 1). |
| **Files** | All `app/**/page.tsx` that had `bg-gray-950` (auth, chat, call, profile, settings, tournaments, bars, bar, watch, session, not-found, debug-matches, games/play, etc.), plus `app/bar/join/page.tsx` (hover token) |
| **Verification** | No routing or fetch logic changed. One intentional hover class updated on bar join. **Note:** Inner components (shadcn cards, chat, forms) may still use gray-800 panels — addressed in High severity. |

---

### 4. Dual match entry (`/games/[gameId]/create` vs Queue)

| | |
|---|---|
| **Why it existed** | Legacy create page duplicated matchmaking UI that Queue now owns (`GameQueueHub` + `MatchmakingInterface`). |
| **Solution** | `/games/[gameId]/create` → **301-style server `redirect`** to `/games/[gameId]`, preserving `?tier=free` (and other tier query read by queue hub). Update in-app links to point at Queue directly. |
| **Files** | `app/games/[gameId]/create/page.tsx`, `components/play/play-spotlight.tsx`, `components/play/play-game-card.tsx`, `components/queue/game-queue-hub.tsx`, `components/queue/game-queue-rail.tsx`, `components/games/game-card.tsx`, `components/dashboard/quick-actions.tsx`, `app/games/[gameId]/play/page.tsx` |
| **Verification** | Old `/create` URLs still work via redirect. Matchmaking APIs untouched. `CreateMatchForm` no longer rendered (dead code path removed from route only — component file remains for High/cleanup if needed). |

---

## Remaining issues (from audit)

### High (next phase)

- Shell migration: Profile, Settings, Chat, Tournaments, Call, Friends, Watch, etc. (canvas tokens applied; still on legacy `Header`)
- Activity stat cards: fake trends, rainbow borders; `MatchHistoryTable` competitive re-skin
- Auth pages: competitive auth panel (still `Header` + centered form)
- In-game embed skins (Math, Trivia) beyond Connect Four `compactPresentation`
- Floating feedback dialog surface tokens (partial — submit button done)
- Remove fake `StatsCard` trends on Activity

### Medium / Low

- Unchanged from `LAUNCH_DESIGN_AUDIT.md`

---

## Screenshots to verify (Critical)

| # | Capture |
|---|--------|
| 1 | `/matches` light + dark — sidebar, Activity title, stats, table |
| 2 | `/wallet` light + dark — balance cards (premium), rail, buy + history |
| 3 | `/` logged out — green/brand hero CTAs (no orange FAB clash) |
| 4 | Any page — feedback FAB green on Home and Wallet |
| 5 | `/games/[id]/create` → lands on Queue (same game id) |
| 6 | `/profile` or `/chat` light mode — readable title (not white-on-light) |
| 7 | Theme toggle: Wallet vs Home — both respect fade (same theme class on canvas) |

---

## Files modified (Critical phase only)

```
app/matches/page.tsx
app/wallet/page.tsx
app/games/[gameId]/create/page.tsx
app/page.tsx
app/games/[gameId]/play/page.tsx
app/auth/login/page.tsx
app/auth/sign-up/page.tsx
app/profile/page.tsx
app/settings/page.tsx
app/chat/page.tsx
app/chat/dm/[userId]/page.tsx
app/call/page.tsx
app/call/[roomCode]/page.tsx
app/tournaments/page.tsx
app/tournaments/create/page.tsx
app/tournaments/[tournamentId]/page.tsx
app/watch/page.tsx
app/not-found.tsx
app/session/[sessionCode]/page.tsx
app/bar/join/page.tsx
app/bar/session/[sessionId]/page.tsx
app/bars/page.tsx
app/bars/page-account-specific.tsx
app/bars/[barId]/page.tsx
app/bars/[barId]/dashboard/page.tsx
app/bars/[barId]/session/[sessionId]/page.tsx
app/bars/create/page.tsx
app/debug-matches/page.tsx
components/feedback/floating-feedback-button.tsx
components/feedback/feedback-modal.tsx
components/games/enhanced-match-interface.tsx
components/play/play-spotlight.tsx
components/play/play-game-card.tsx
components/queue/game-queue-hub.tsx
components/queue/game-queue-rail.tsx
components/games/game-card.tsx
components/dashboard/quick-actions.tsx
```

---

## Regressions found

| Item | Severity | Notes |
|------|----------|--------|
| None observed in code review | — | Manual QA still required for Stripe checkout success UI on Wallet and match history row actions. |
| `/create` bookmark | Low | Users with old URL land on Queue — intended. |
| Play game card “Host” | Low | Now same href as Queue; custom lobby semantics = Queue page (audit-aligned). |

---

## Next step

Begin **High** severity with **Profile + Settings + Activity table/stats** (audit Phase 1 continuation), unless product wants **auth shell** first.
