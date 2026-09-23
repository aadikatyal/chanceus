# Venues review — flagship discovery (from first principles)

Presentation-only · canonical shell: Home, Play, Wallet, Social, Competition · `DESIGN_BIBLE.md`

**Target emotion:** *Something awesome is happening nearby tonight.*

---

## First principles (answered before build)

| Question | Answer |
|----------|--------|
| **Why visit?** | Find a live competitive night, check in fast, play for local board + rewards — not to “manage QR.” |
| **First thing they see?** | Cinematic hero: live nights, real rooms, primary CTA **Find a venue** (anchors to posters). |
| **&lt;3 second action?** | Tap **Join tonight** on a live poster or **Find a venue** scroll to **Live tonight**. |
| **Excitement?** | Event posters, live pills, real session counts, trending themes, **Live right now** rows. |
| **Trust?** | Real venue names, check-in counts, champion scores from `bar_trivia_games`, same shell/tokens as Home. |
| **What disappeared?** | Player/host toggle as primary IA, “featured venues” tiny grid, journey rail as hero content, QR-first copy, bar-trivia admin tone on `/bars`. |

---

## Previous weaknesses

- **QR utility framing** — hero and journey treated Venues as check-in software, not event discovery.
- **Admin / CRUD energy** — player vs host tabs, small discover cards, stats without FOMO.
- **Weak parity with Home** — premium card hero only; no cinematic hero, no spotlight-scale artwork, uneven hierarchy.
- **Information architecture mirrored components** (“what we have”) instead of player needs (what’s live, where, how fast can I join).
- **Host mode dominated** the same page as discovery instead of a dedicated **Host the experience** chapter.
- **Join flow** (`/bar/join`) still mixed legacy shadcn in places — **not rewritten in this pass** (hub focus).

---

## New information hierarchy (`/bars`)

1. **Cinematic hero** — `VenuesCinematicHero` · `chance-hero-cinematic` + venue glow/posters · stats from live data · CTAs: Find a venue · Host an event  
2. **Live tonight** — large **event posters** (`VenuesEventPoster`) · venue, location, time label, checked-in count, prize copy, themes · join via `/bar/join?code=`  
3. **Trending events** — horizontal carousel (`VENUES_TRENDING_THEMES`) · marketing rails until venue tagging exists in DB  
4. **Live right now** — real sessions · `getActiveBarSessions` + `getSessionParticipants` · Play / Watch → `/bar/join?session=`  
5. **How it works** — 5-step visual timeline (Discover → Check in → Compete → Win → Local rankings)  
6. **Host the experience** — benefits + **Become a host** · embedded **Your venues** when staff  
7. **Community** — recent champions from high scores + trust copy · link to `/leaderboards`  
8. **Footer** — subtle “Already have a code? Check in”  

**Removed from hub:** `VenuesModeTabs`, `VenuesJourneyRail` as primary content, `VenuesDiscoverCard` grid, `VenuesHero` card-only hero.

---

## UX reasoning

- **Sell the experience** — posters and carousel borrow from Eventbrite / Fever / Riot event pages: big visuals, scarcity (live pills), social proof (players in room).
- **FOMO** — sort posters and live rows by active sessions and player count; hero float shows “N live tonight.”
- **3-second path** — hero CTA scrolls to posters; poster CTA deep-links check-in with venue code (same as QR destination).
- **Host without hijacking discovery** — host tools live in section 6; operators still reach `/bars/create`, `/bars/[id]`, dashboard via cards.
- **Business logic unchanged** — same Supabase reads, `getActiveBarSessions`, `getSessionParticipants`, staff bar query, join URLs.

---

## Implementation map

| Area | Path |
|------|------|
| Hub page | `app/bars/page.tsx` → `VenuesHubClient` |
| Discovery UI | `components/venues/discovery/*` |
| Shell | `venues-page-chrome.tsx` · `chance-home-feed--hero-first` |
| CSS | `app/chance-competitive-rich.css` · `.chance-venues-*` discovery block |
| Legacy (unchanged routes) | `/bar/join`, host ops pages, `bar-actions.ts` |

---

## Screenshots to capture

1. **`/bars` full page** — hero + first row of posters (desktop)  
2. **Live tonight** — featured poster with live pill  
3. **Trending carousel** — horizontal scroll mid-track  
4. **Live right now** — at least one active session row  
5. **How it works** — 5-column timeline (desktop)  
6. **Host block** — with and without “Your venues”  
7. **Side-by-side** — `/dashboard` and `/bars` heroes (parity check)  
8. **Mobile** — hero CTAs + single poster + carousel swipe  

---

## Remaining improvements

| Priority | Item |
|----------|------|
| P0 | Redesign **`/bar/join`** to match discovery (event hero, session picker, scanner as secondary — not page identity) |
| P0 | Migrate **host ops** pages off orange/gray shadcn (`[barId]/page`, dashboard, session) to tokens-only |
| P1 | **Real theme tags** on venues/games (replace `VENUES_TRENDING_THEMES` marketing-only rails) |
| P1 | **Geo / distance** when address geocoding exists |
| P1 | **Spectate** link to real spectator route when available (currently reuses join) |
| P2 | Venue **cover images** in poster art (upload field on `bars`) |
| P2 | **`/demo-bar`** — shell + discovery or remove |
| P2 | Wire **drink rewards** UI to `bar_drink_rewards` (manager still mock) |
| P3 | Delete orphan `app/bars/page-account-specific.tsx` |

---

## Parity check (Home vs Venues)

| Dimension | Home | Venues (after) |
|-----------|------|----------------|
| Shell | `CompetitiveShell` | Same |
| Feed | `chance-home-feed--hero-first` | Same |
| Hero | `chance-hero-cinematic` | Same pattern + venue variant |
| CTAs | primary + ghost | Same tokens |
| Cards | `chance-premium-card` | Posters + premium sections |
| Motion | `chance-home-enter` | Applied to sections |

**Side-by-side test:** If heroes and section rhythm match, Venues reads as the same product — continue join/host surfaces until full funnel matches.
