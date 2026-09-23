# Match lobby review — `/games/match/[matchId]`

Canonical design language: **Home** + **Play** + **Queue** (`/games/[gameId]`). This document covers the **match lobby** redesign only.

---

## 1. What was weak (before)

| Area | Issue |
|------|--------|
| **Shell** | Legacy `Header`, `bg-gray-950`, orange/green ad-hoc buttons — instant context switch after Queue. |
| **Information hierarchy** | No single “versus” moment; stakes and game buried in generic cards and debug-style status rows. |
| **Ready flow** | Duplicate “I’m Ready” blocks (friend vs normal); gray helper text easy to miss. |
| **Anticipation** | No arena header, no pot/stakes hero, no ranked/casual framing, no intentional waiting animations. |
| **Game embed** | `EnhancedMatchInterface` duplicated header + player chips while lobby also showed controls — felt like an admin panel stacked on a form. |
| **Loading** | Plain “Loading…” on black — no competitive tone. |
| **Spectator / chat** | Functional but visually disconnected from the rest of the product. |

---

## 2. Why immersion broke

Players flow **Play → Queue → Match lobby** with rising tension. The old lobby looked like a **2019 games CRUD page**: gray cards, orange CTAs, emoji-scale headers, and `Header` nav unrelated to the competitive shell. Cognitive dissonance: “I was in a ranked product; now I’m in a different app.” Ready states and match start lacked **ceremony** (FACEIT/Valorant-style ready check and launch beat).

---

## 3. How the redesign fixes it

- **`CompetitiveShell`** — same sidebar, topbar, tokens, and spacing as Home/Play/Queue.
- **Match arena header** — game artwork, title, pot, entry stake, mode badge (Ranked/Casual/Tournament), status pill.
- **Player comparison** — P1 vs P2 columns with avatars, win rate, match count, tokens, ready rings.
- **Match details strip** — mode, rules blurb, winner reward (no new APIs).
- **Unified ready panel** — one ready check UX; opponent state; pulsing “match starting” banner when both ready.
- **Preserved flows** — friend accept/decline, join open lobby, wait for opponent + share link, `markPlayerReady`, join-as-P2, realtime/polling, tournament redirect, rematch logic inside `EnhancedMatchInterface`.
- **Live phase** — lobby chrome hidden when `status !== 'waiting'`; game runs in `EnhancedMatchInterface` with legacy chrome suppressed via scoped CSS; lobby chat + spectator unchanged in behavior.

Implementation lives in:

- `app/games/match/[matchId]/page.tsx` (logic/controller)
- `components/match-lobby/match-lobby-page-view.tsx` (presentation)
- `app/chance-competitive-rich.css` (`.chance-match-*` tokens)

---

## Before / after

| Before | After |
|--------|--------|
| Black page + marketing header | Competitive shell + arena hero |
| Emoji game icon header | Full game thumbnail + scrim |
| Scattered green/orange buttons | Brand ready CTA + secondary actions |
| Two duplicate ready sections | Single ready-check panel |
| Always-visible game card header | Waiting = lobby only; live = embedded game |
| “Loading…” text | Premium skeleton in theme |

---

## Interaction improvements

- **Loading** — themed skeleton instead of blank screen.
- **Ready** — large “I’m ready” with locked state + per-player ready indicators.
- **Both ready** — animated border banner + stay-on-screen copy (handoff to in-game countdown in `EnhancedMatchInterface`).
- **Waiting** — spinner ring for friend accept / open slot.
- **Join / accept** — callout cards with primary/secondary actions aligned to Queue.
- **Spectator** — badge in header when watching.

---

## Remaining issues

1. **In-game UI** — `EnhancedMatchInterface` internals (countdown, results, rematch) still use legacy orange/gray styling; only outer chrome is hidden/suppressed.
2. **Countdown sync** — lobby shows a static “3” banner when both ready; actual 3-2-1 remains inside the game component (possible double messaging briefly).
3. **Stats depth** — no streak/favorite game/achievements in DB; columns show win rate + matches + tokens only.
4. **Reconnect / disconnect** — no dedicated lobby messaging; still relies on game layer + polling.
5. **Page-level rematch helpers** — unused in UI (rematch handled in `EnhancedMatchInterface`); dead state could be cleaned later without UX change.
6. **Join flow** — still uses `window.location.reload()` after joining as P2 (preserved behavior).

---

## Future opportunities

- **Single launch sequence** — coordinate lobby banner with `EnhancedMatchInterface` countdown via shared `game_data` flag.
- **`embedMode` on EnhancedMatchInterface** — replace CSS hiding with a prop for results/rematch theming.
- **Sound/haptics** — ready lock, match found (optional, off by default).
- **Rank tier** — replace token-only comparison with real MMR when available.
- **Disconnect banner** — lobby-level opponent connection state from presence channel.
- **Post-match** — results screen as a fourth canonical surface (next journey step after Game).

---

## Routes intentionally not changed

- `/dashboard`, `/games`, `/games/[gameId]` (Home, Play, Queue)
- `/games/[gameId]/create`, `/games/[gameId]/play`, auth, landing
