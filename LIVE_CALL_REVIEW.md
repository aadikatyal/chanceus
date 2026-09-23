# Live Call review — multiplayer social hub

Presentation-only · canonical shell: Home, Play, Queue, Lobby, Wallet, Social, Competition · `DESIGN_BIBLE.md`

**Target emotion:** *I'm hanging out with competitive players.*

---

## Before vs after

| Before | After |
|--------|--------|
| `/call` = **Create Call** utility: form-first lobby, generic feature header, two-column “start/join” card | **Community hub**: cinematic hero, live stats, featured lounges, friends presence, LFM, voice channels, parties, activity |
| Felt like Zoom setup | Feels like **Houseparty × Discord** — browse rooms, see who’s around, jump in |
| Single workflow (generate code) | **Join a room** + **Create room** + persistent community codes + party invite flow |
| Room page: plain caption + video grid | **Elite room chrome**: premium header, on-air indicator, elevated video stage; same WebRTC + match panel |

**Unchanged:** routing (`/call`, `/call/[roomCode]`), `generateRoomCode`, `normalizeRoomCode`, `use-webrtc-call`, `call-actions`, `CallMatchPanel`, `CallFriendInvite`, invite listener, LiveKit/WebRTC wiring.

---

## New information hierarchy (`/call`)

1. **Cinematic hero** — live rooms, players online, active calls, friends around · CTAs: Create room · Join a room · room code field  
2. **Live rooms** (primary, center on desktop) — premium cards: game, players, voice pulse, queue/public, spectators, friends, Join  
3. **Friends hanging out** — presence rows (voice / queue / offline) · Join lounge · Message  
4. **Live matches** — in-progress tables from Supabase · Watch → match page  
5. **Looking for team** — lanes from `matchmaking_queue` · stake · voice hint · Join → Play  
6. **Voice channels** — persistent community codes (Ranked, Casual, Tourney, etc.)  
7. **Party** — game pick · Create party · copy link · embedded friend invite (same component as room)  
8. **Recent activity** — recent wins + community seed copy  

**Active room (`/call/[code]`):** header + controls + video + match/queue panel (layout polish only).

---

## Community improvements

- **Persistent lounges** (`CALL_FEATURED_ROOMS`, `CALL_VOICE_CHANNELS`) give players named places to land instead of only private codes.  
- **Hero stats** pull real **online user count** and **in-progress match** signal so the page reads “alive.”  
- **LFM** and **live matches** tie the hub to the broader ChanceUS competitive graph (queue + spectate).  
- **Activity timeline** surfaces recent token wins from completed matches.

**Honest limits (future):** room occupancy and voice activity on cards use lightweight heuristics until a global call-presence service exists; friend “In Ranked Lounge” is inferred from online + queue state, not WebRTC room membership.

---

## Engagement improvements

- **Browse-before-create** — hero anchors to `#call-live-rooms`; mobile sticky bar: Create room · Browse rooms.  
- **Social proof on cards** — voice pulse, spectator count, friends-in-room, featured first room.  
- **Party block** keeps invite + queue-together intent without a separate “form page.”  
- **Room experience** — on-air badge and stage treatment reinforce “you’re in the hangout,” not “you’re in a meeting.”

---

## Mobile improvements

- Single-column stack by default; **2-column** from `768px`, **3-column social grid** from `1200px`.  
- **Sticky bottom actions** on hub (`chance-call-hub-mobile-bar`) with safe-area padding.  
- No horizontal page scroll; room grid becomes 2-up on small tablets.  
- Hub stack adds bottom padding so content isn’t hidden behind the sticky bar.

---

## Accessibility

- Section headings with `aria-labelledby`; hero `aria-labelledby` on title.  
- Room code input with visible label (`sr-only`).  
- Voice activity pill with `aria-label`; live status uses `aria-live="polite"`.  
- Focus rings on CTAs (`chance-focus-ring`); reduced-motion disables pulse/breathe animations.

---

## Implementation map

| Area | Path |
|------|------|
| Hub route | `app/call/page.tsx` → `CallHubPage` |
| Hub UI | `components/call/hub/*` |
| Room route | `app/call/[roomCode]/page.tsx` → `CallRoom` (header removed) |
| Room polish | `components/call/call-room.tsx` |
| CSS | `app/chance-competitive-rich.css` · `.chance-call-*` |
| Legacy (unused on route) | `components/call/call-lobby.tsx` |

---

## Remaining future opportunities

1. **Real presence** — Supabase/LiveKit channel for “who’s in which room” to replace seeded player counts.  
2. **Friend presence accuracy** — map friends to actual room codes and spectating match IDs.  
3. **Elite in-room UI (phase 2)** — participant strip, room chat, spectator rail, cinematic match-found transition (logic already in `CallMatchPanel` / game embed).  
4. **Tournament badge** on live match watch cards when `matches` links to bracket events.  
5. **Invite** action on friend rows (deep link to active party code when host).  
6. **Queue together** from party block → deep link into Queue with shared stake/game params.

---

## Screenshots to capture

1. **`/call` desktop** — hero + three-column grid  
2. **Live rooms** — featured card with voice pulse  
3. **Mobile** — hero + sticky bar  
4. **`/call/STAKES`** (or party code) — elite header + video stage  
5. **Side-by-side** — `/chat` or `/bars` hero parity check  
