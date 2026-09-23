# Feature migration log (presentation layer)

Canonical references: Home (`/dashboard`), Play (`/games`), Queue (`/games/[gameId]`), Lobby, Wallet, `DESIGN_BIBLE.md`.

---

## Gameplay + Results

### Before
- Connect Four used `compactPresentation`; Math Blitz and Trivia used legacy `Card` + `bg-black` / gray stacks inside `GameplayShell`.
- Post-match UI relied on in-game overlays; no shared queue/activity CTAs in the shell.
- Orange spinners and gray typography inside the board area.

### After
- `gameEmbedSurfaceClass()` + `compactPresentation` on Math Blitz and Trivia (wired from `enhanced-match-interface.tsx`).
- `.chance-game-embed` board overrides in `chance-competitive-rich.css` (borders, answer buttons, brand accent).
- `GameplayResultActions` in `GameplayShell` for win/loss/draw (Queue again + Activity); friend CTA remains optional `resultFooter`.
- `inGameplayPresentation` moved above `renderGame` for correct hook ordering.

### Screenshots required
- [ ] Live Math Blitz — light + dark
- [ ] Live Trivia — compact header row
- [ ] Connect Four — regression
- [ ] Completed match — result banner + CTAs + add friend

### Technical debt remaining
- Math Blitz still renders large in-card “game over” blocks; shell overlay may duplicate copy until those blocks are hidden in compact mode.
- Legacy non-shell match UI path in `enhanced-match-interface.tsx` (waiting lobby) not fully reskinned.
- `multiplayer-math-blitz.tsx` size / console noise unchanged (logic frozen).

---

## Activity (`/matches`)

### Before
- Shell OK; `StatsCard` used shadcn gray + **fake** week-over-week trends.
- `MatchHistoryTable` gray cards, filter stub, debug `console.log`.

### After
- `StatsCard` delegates to `ChanceStatCard`; trends removed from Activity page.
- `MatchHistoryTable` → `chance-premium-card` list rows, token semantics, empty state with Find a match CTA.

### Screenshots required
- [ ] Activity stats grid — light + dark
- [ ] Populated history list
- [ ] Empty history

### Technical debt remaining
- Filter control removed (was non-functional UI); re-add when API exists.

---

## Profile (`/profile`)

### Before
- Legacy `Header` + gray shadcn cards and gradient avatars.

### After
- `CompetitiveShell` + `FeaturePageHeader` + `chance-premium-card` sections.
- `ChancePlayerAvatar`, `chance-play-stat-pill`, match-first empty activity CTA.

### Screenshots required
- [ ] Profile hero + stats — light + dark
- [ ] Achievements column

### Technical debt remaining
- Achievements still static rules (unchanged logic).

---

## Settings (`/settings`)

### Before
- `Header` + gray `Card` forms with cyan/yellow gradient buttons.

### After
- `CompetitiveShell` + `FeaturePageHeader`.
- `ProfileSettings` / `PreferencesSettings` → `chance-premium-card`, `.chance-input`, bible CTAs.

### Screenshots required
- [ ] Profile form
- [ ] Preferences toggles

### Technical debt remaining
- File input styling is minimal; consider `ChanceInput` wrapper later.

---

## Tournaments — index (`/tournaments`)

### Before
- `Header`, orange buttons, gray tournament cards.

### After
- `CompetitiveShell`, premium cards, brand/ghost CTAs, status pills.

### Screenshots required
- [ ] Index empty + populated

### Technical debt remaining
- `/tournaments/create`, `/tournaments/[id]` still on legacy `Header` (next in Tournament area).

---

## Authentication — login / sign-up

### Before
- Full marketing `Header` on auth routes.

### After
- `AuthMarketingShell` (logo bar + centered column, bible tokens).

### Screenshots required
- [ ] Login — light + dark
- [ ] Sign up

### Technical debt remaining
- `LoginForm` / `SignUpForm` inner card styling may still use legacy classes — migrate forms next.

---

## Shared abstractions added

| Component | Path |
|-----------|------|
| `FeaturePageHeader` | `components/app/feature-page-header.tsx` |
| `GameplayResultActions` | `components/gameplay/gameplay-result-actions.tsx` |
| `AuthMarketingShell` | `components/app/auth-marketing-shell.tsx` |
| `gameEmbedSurfaceClass` | `components/gameplay/gameplay-utils.ts` |
| `.chance-input` | `app/chance-competitive-rich.css` |

---

## Social — Add friends (`/friends/add`)

### Before
- Client-only page, gray gradient, legacy `Header`, shadcn gray cards.

### After
- Server page + `CompetitiveShell`; logic in `AddFriendsClient` with premium cards and bible CTAs.

### Screenshots required
- [ ] Pending requests + search results

---

## Chat — global (`/chat`)

### Before
- Legacy `Header`, gray subtitle.

### After
- `CompetitiveShell`, chat embedded in `chance-premium-card`.

### Screenshots required
- [ ] Global chat — light + dark

### Technical debt
- `/chat/dm/[userId]` still on legacy shell; `ChatWindow` inner styling not fully audited.

---

## Calls — lobby (`/call`)

### Before
- Legacy `Header`.

### After
- `CompetitiveShell` + `FeaturePageHeader`; `CallLobby` unchanged (logic).

### Screenshots required
- [ ] Call lobby

### Technical debt
- `/call/[roomCode]` and in-room UI components still legacy presentation.

---

## Error — `not-found`

### Before
- Gray card, orange 404 and buttons.

### After
- Bible tokens, premium card, primary/ghost CTAs to `/dashboard`.

### Screenshots required
- [ ] 404 — light + dark

---

## Routes not yet migrated (next dependency order)

- **Tournament:** create, detail
- **Chat:** `/chat/dm/[userId]`
- **Calls:** `/call/[roomCode]`
- **Venues / bars:** `/bars/**`, `/bar/**`, `/session/**`, `/demo-bar`
- **Landing:** `/`
- **Misc:** `/watch`, `/replays/**`, `/games/[gameId]/play`, `/analytics`, debug routes
- **Error:** `not-found`, error boundaries
