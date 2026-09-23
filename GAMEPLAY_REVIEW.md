# Gameplay presentation review — active match (`/games/match/[matchId]`)

Scope: **in-game presentation only** (HUD, layout, states). Home, Play, Queue, and **waiting lobby** UI unchanged in intent. Game logic, networking, and APIs untouched.

---

## Before implementing

### 1. What distracted from gameplay

- Duplicate **match admin chrome** inside `EnhancedMatchInterface` (titles, “Polling” badges, P1/P2 chips, orange/gray cards).
- **Lobby header** (arena, VS columns) still visible above the board during `in_progress`.
- Game components wrapped in **`bg-black`** shells — visual break from competitive shell.
- **Countdown** and **results** styled as orange debug blocks, not a launch/end beat.
- No single **turn / stake / timer** read at a glance.

### 2. What should stay visible

- Game title (compact)
- **Pot + entry stake**
- **Phase** (your turn / opponent / simultaneous / starting / outcome)
- **Player identity** (P1 vs P2, highlight “You”)
- **Scores** when present in `game_data`
- **Timer** when `timeLeft > 0`
- **Network sync** note when polling fallback active
- **Lightweight chat + spectator** (unchanged behavior, tighter chrome when live)

### 3. What should disappear during gameplay

- Match lobby arena and ready-check sections (hidden when `in_progress` / `completed`)
- Legacy card headers and duplicate player rows inside `EnhancedMatchInterface`
- Orange marketing CTAs and “Match Status / Polling” admin rows
- Extra padding from premium card wrapper around the board (active frame is flush)

---

## Before vs after

| Before | After |
|--------|--------|
| Full-width gray/orange game card | **Gameplay HUD** + board stage |
| Scattered status text | **Phase pill** (text + dot, colorblind-safe pairing) |
| Hidden stakes in badges | **Pot + entry** in top bar |
| Orange 3-2-1 pulse in card body | **Full-stage countdown overlay** |
| JSON / emoji result blocks | **Victory / defeat / draw** banner + optional add-friend |
| Black game panels | **Themed board** via scoped CSS overrides |
| Lobby art above live game | **Active layout** — lobby chrome only while `waiting` |

---

## Information hierarchy

1. **HUD bar** — phase, timer, stakes, game name  
2. **Player strip** — avatars, names, scores (if synced)  
3. **Stage** — countdown / result overlay (when applicable) → **game board** (max width)  
4. **Side column** — spectator + chat (players only, unchanged logic)

---

## Gameplay improvements

- **`GameplayShell`** — competitive HUD wrapper (`components/gameplay/gameplay-shell.tsx`).
- **`resolveGameplayPhase`** — maps match + turn + connection to intentional states (`components/gameplay/gameplay-utils.ts`).
- **`EnhancedMatchInterface`** — when match is live, renders shell + `renderGame()` only; legacy card kept for rare `waiting` edge paths inside the same component.
- **`MatchLobbyPageView`** — minimal glue: hides lobby chrome when active; frame class for full-width board (not a lobby redesign).
- **CSS** — `.chance-gameplay-*`, `.chance-gp-*` tokens; board descendant theming for legacy black game UIs.

---

## Remaining technical debt

1. **Per-game UI** — Math Blitz / Connect Four / Trivia components still own internal layout; only outer colors overridden, not full HUD integration inside each game.
2. **Score sync** — HUD reads common `game_data` keys; not all games publish `player1Score` / `player2Score` consistently.
3. **`timeLeft`** — wired when games set it; not all modes expose a unified timer to the shell.
4. **Disconnect/reconnect** — no dedicated opponent presence channel; “syncing” reflects polling/`isConnected`, not true reconnect detection.
5. **Rematch** — server helpers exist in page/interface; rematch UX still minimal post-match.
6. **Duplicate countdown** — lobby “match starting” banner may still show briefly before status flips to `in_progress`.

---

## Recommendations for future polish

- Pass **`onTimer` / `onScore`** callbacks from each multiplayer game into the shell (single source of truth).
- Add **`presence`** channel for opponent disconnected / reconnecting banners.
- **`embedMode`** on each game component to remove inner headers and score duplicates.
- **Sound** — optional tick on countdown, muted by default.
- **Spectator count** in HUD when `SpectatorMode` exposes a count.
- **Post-match route** — dedicated results screen as next journey step (keep board replay optional).

---

## Files touched (presentation)

- `components/gameplay/gameplay-shell.tsx`
- `components/gameplay/gameplay-utils.ts`
- `components/games/enhanced-match-interface.tsx` (render path only)
- `components/match-lobby/match-lobby-page-view.tsx` (active-state visibility only)
- `app/chance-competitive-rich.css`

No changes to Home, Play, Queue, or waiting lobby flows beyond hiding lobby chrome during active play.
