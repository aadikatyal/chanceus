# Landing page elevation review

Public `/` presentation pass aligned with the authenticated ChanceUS shell (Home, Play, Queue, Wallet, Social). No auth, routing, or API route changes.

## What changed

### Hero
- **Headline-first layout**: copy centered above the product; mockup scaled down and floated with spotlight, layered shadows, and subtle float animation.
- **Emotional copy**: “Prove you're **better.**” with aspirational lede (skill, reputation, rank).
- **CTAs**: “Enter the arena” / “Browse games” instead of generic SaaS demo language.
- **Live strip**: real-time arena metrics in a pill under the eyebrow (see Live platform).

### Product preview (`landing-mockup.tsx`)
- Shell nav matches product surfaces: Home, Play, Queue, Wallet, Social.
- **Alive when data exists**: queue glow + pulse, “Match live” kicker, tile badge, online count in topbar, primary CTA glow when queue &gt; 0.
- **Static when idle**: no fake counters; balance remains illustrative default (1,000) as UI chrome only.

### Narrative rhythm
1. Hero  
2. Three moves. One outcome.  
3. Featured games (alternating layout + background tones)  
4. Competitive loop (Home → Rank typographic journey)  
5. Community never sleeps + live grid  
6. Your rank remembers  
7. Platform record (real totals)  
8. Prove it. (final CTA)

### Copy
- Shorter lines, player-facing voice; removed feature-list tone.
- Game panels use live match counts when Supabase reports `in_progress` per game.

### Live platform
- **Server reads (existing Supabase tables / actions only)**:
  - `users.is_online` → players online  
  - `users.total_games_played > 0` → players with a record  
  - `matches.status = in_progress` → matches live  
  - `matchmaking_queue.status = waiting` → in queue  
  - `getAllTournaments()` → tournaments in progress  
  - Completed match pots + win/bonus transactions → tokens earned  
- **Removed inflated launch floors** (`landing-public-stats.ts` deleted). Zeros display as **—**, not fabricated thousands.

### Visual polish
- Dual ambient layers (global + hero spotlight).
- Section borders/gradients for story, journey, record, game tone variants.
- Game art frames with local glow; reversed panels on alternate games.
- Header **Live** badge when any arena signal is active.

### New files
- `lib/landing-live-metrics.ts` — real metrics only  
- `components/landing/landing-live-arena.tsx` — strip + grid live UI  

## Why this improves conversion

- **Emotion first**: visitors feel challenged (“prove you're better”) before reading mechanics.
- **Product as proof**: mockup supports the headline instead of competing with it.
- **Trust**: live counts and honest placeholders avoid “marketing numbers” skepticism.
- **Competitive identity**: loop, rank, and arena language mirror the logged-in app, reducing post-sign-up disconnect.
- **Clear action**: repeated “Enter the arena” ties emotion to sign-up.

## Responsiveness

- Hero stacks copy → product on all breakpoints; mockup `max-width` capped (~980px) to prevent oversized screenshots on tablet/desktop.
- Mockup `min-height` reduced on small viewports; hero actions full-width on mobile.
- Live strip wraps; grid live panel stacks under community copy on narrow screens.
- Game grids remain single-column under 900px; reversed layout uses `direction` flip without breaking reading order.
- Journey separators hidden on mobile; vertical word stack preserved.
- `overflow-x: clip` on root; no intentional horizontal scroll.

## Animation additions

| Element | Motion | Notes |
|--------|--------|--------|
| Mockup device | Slow float (`translateY`) | Pauses on hover |
| Mockup screen | Soft shadow breathe | `filter` only |
| Live beacon / queue | Opacity + scale pulse | When activity &gt; 0 |
| Scroll hint | Bob | Existing |
| CTA “Queue now” | Glow when queue active | Opacity/box-shadow |

All gated behind `@media (prefers-reduced-motion: reduce)`.

## Accessibility

- Live regions: `role="status"`, `aria-live="polite"` on arena strip/grid.
- Decorative mockup: `aria-hidden`.
- Journey line retains `aria-label`; section headings keep logical `h1` → `h2` order.
- Zero metrics use em dash with `[data-zero]` styling (not misleading numerals).
- Focus rings unchanged (`chance-focus-ring`); header live badge includes `aria-label`.

## Remaining polish opportunities

- **Voice rooms live**: no public table query yet; could add when call rooms are countable without new API surface.
- **Authenticated screenshot**: optional static capture from `/dashboard` for pixel-perfect parity (heavier asset pipeline).
- **Real token balance in mockup**: would require public aggregate or signed-out-safe endpoint (out of scope).
- **ISR / revalidate**: optional short `revalidate` on `/` for fresher live counts without client polling.
- **Game panel motion**: subtle parallax on art frames on scroll (keep reduced-motion safe).
