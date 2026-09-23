# Add friends → Player discovery review

Presentation-only · canonical shell: Home, Play, Social, Venues, Competition · `/friends/add`

**Target emotion:** *I just found people I actually want to play with.*

---

## First principles (before build)

| Question | Answer |
|----------|--------|
| **Why visit?** | Grow a competitive network — rematch opponents, queue with friends, accept requests. |
| **What to discover?** | Recommended players, recent opponents, rivals, trending climbers — not a blank search box. |
| **30-second action?** | Add someone from **Recommended** or **Recently played with** without typing. |
| **What makes a player interesting?** | Win rate, streak, online/LFM, shared history, head-to-head record. |
| **Why send a request?** | Rematch, rivalry, mutual activity, or trending skill — not “I found a row in a table.” |

---

## Previous weaknesses

- Page was **search-first** — empty until you query.
- **List rows** with shadcn `Input` / `Button` — admin CRUD feel.
- **Pending requests** buried above search; no outgoing/suggested tabs.
- No **recent opponents**, **rivals**, or **trending** surfaces.
- No cinematic hero; mismatched vs Home / Social / Venues.
- **Giant empty state** when no search term.

---

## New information architecture

1. **Hero — Find your squad** — cinematic block + premium search (tool, not the page)
2. **Recommended players** — horizontal premium profile cards (live data)
3. **Recently played with** — W/L, game, time, Add / Rematch / Message
4. **Rivals** — 2+ matches vs same opponent; record, token delta, challenge
5. **Friend requests** — Incoming · Outgoing · Suggested (segmented)
6. **Trending players** — swipeable cards by activity / win rate
7. **Search results** — only after search; same profile cards, grid layout

**Route unchanged:** `/friends/add`  
**Logic unchanged:** `searchUsers`, `sendFriendRequest`, `getPendingRequests`, `getSentRequests`, accept/reject.

---

## UX reasoning

- **Discovery before search** — page feels populated on first paint.
- **Profile cards** — avatar, rank badge, stats, online/LFM, CTAs (Add, Message, challenge shortcut).
- **Rivals** — signature competitive loop; reinforces rematch + friend add.
- **Mobile-first** — horizontal tracks with scroll-snap; search stacks full width.
- **Empty states** — section-level prompts + link to Play, not a blank page.

---

## Implementation map

| Piece | Path |
|-------|------|
| Page | `app/friends/add/page.tsx` |
| Discovery UI | `components/social/discovery/*` |
| Legacy (unused on route) | `components/social/add-friends-client.tsx` |
| CSS | `app/chance-competitive-rich.css` · `.chance-discovery-*` |

---

## Screenshots to capture

1. Full `/friends/add` desktop — hero through recommended track  
2. Recently played + rivals grid  
3. Friend requests tabs (incoming / outgoing / suggested)  
4. Trending horizontal scroll  
5. Search results grid (after query)  
6. Mobile — hero search stack + one card swipe  
7. Side-by-side with `/chat` or `/dashboard` hero (parity check)

---

## Remaining polish

| Priority | Item |
|----------|------|
| P0 | **Mutual friends** count (graph query) |
| P0 | **Favorite game** from match history per user |
| P1 | Real **global rank** on cards (not tier label) |
| P1 | **Profile** deep links when public profile routes exist |
| P1 | Remove or redirect legacy `add-friends-client` usages |
| P2 | Realtime refresh on friends/matches channels |
| P2 | Right rail optional (mirror Social) |
| P3 | Challenge → direct friend match when flow is linked |

---

## Quality check

*If this page existed alone, would someone browse it without searching?*  
After this pass: **yes for active players** (recent + rivals + recommendations). **Sparse accounts** still see trending + recommended community members — continue enriching fallback data as the network grows.
