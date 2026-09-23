# Landing page review — public front door

Presentation-only · `/` · branch `landing` · tokens: `chance-competitive-theme`, `chance-landing.css`

**Target emotion:** *Competitive gaming built around skill.*

---

## Before vs after

| Before | After |
|--------|--------|
| Orange/gray startup marketing page | Dark premium **competitive** aesthetic aligned with in-app shell |
| Eagle logo + side-by-side small mockup | **Product UI is the hero** — full-width frame (~1280px, 50vh+ screen) |
| Feature grids & small cards | **Full-viewport cinematic panels** — one idea per scroll |
| “Why Choose ChanceUS” SaaS blocks | **Storytelling**: typographic journey, game spotlights, keynote stats |
| Static “10K+” stats | **Live Supabase counts** with count-up animation |
| Legacy `Header` component | Dedicated **sticky blurred** landing header + minimal footer |
| Logged-in users saw same page briefly | Unchanged: **redirect to `/dashboard`** when authenticated |

### Cinematic pass (latest)

- First **~920px+** is dominated by the **ChanceUS product mockup** (shell, Play, real game art).
- Headline **“Skill wins here.”** sits under the product, not competing for above-the-fold space.
- Games = **full-bleed panels** per title (not card carousel).
- Community = **one statement** + tag line (no 5-card grid).
- Stats = **three huge numbers** in a row (Apple keynote scale).

**Unchanged:** Auth routes, sign-up/sign-in links, game IDs/routing, Supabase config gate.

---

## Messaging improvements

- **5-second read:** kicker “Competitive gaming” → headline → skill/token sentence → Get started.
- Copy is **short, confident, competitive** — no “join thousands” fluff, no AI jargon.
- **How it works:** choose → match → win tokens (mirrors Play → Queue → Results).
- **Final CTA:** “Ready to prove you're better?” — conversion-focused.

---

## Visual improvements

- Reuses **`chance-hero-cta-*`**, **`chance-premium-card`**, **`chance-play-live-badge`**, brand green glows.
- **Real game art** (`/4-in-a-row.JPG`, math, trivia) — no stock illustrations.
- **CSS product mockup** of Home/Play (sidebar + hero + tiles) with perspective hover.
- Section rhythm: **32–80px** vertical padding via `clamp`, large type, minimal chrome.

---

## Conversion improvements

- Primary CTA **Get started** → `/auth/sign-up` (hero, header, footer, final).
- Secondary **Watch demo** → `#community` (alive social proof block).
- Game cards link to **`/games/[id]`** with live match counts when available.
- Footer paths: Games, Discord placeholder, Sign in.

---

## Mobile review

- Hero **stacks** copy above mockup; mockup loses 3D tilt &lt;768px.
- Game row: **horizontal snap scroll**; desktop 4-column grid.
- CTAs: **full-width** via existing `chance-hero-cta-row` mobile rules in `chance-responsive.css`.
- Header: logo + Get started; nav links hidden until `md`.
- **No horizontal page scroll** (`overflow-x: clip` on landing root).

---

## Implementation map

| Piece | Path |
|-------|------|
| Route | `app/page.tsx` (server: auth redirect + stats) |
| UI | `components/landing/landing-page-client.tsx` |
| Chrome | `landing-header.tsx`, `landing-footer.tsx`, `landing-mockup.tsx` |
| Styles | `app/chance-landing.css` |
| Docs | `LANDING_PAGE_REVIEW.md` |

---

## Remaining opportunities

1. **Watch demo** — embed short WebM/GIF of real match or auto-scroll mockup animation.
2. **Privacy / Terms** — link real legal pages when published.
3. **Discord** — replace placeholder URL with community invite.
4. **Tournaments nav** — public teaser when logged out (currently links to app route).
5. **SEO** — metadata/OG image using eagle + green hero (not in this pass).
6. **A/B headline** — “Skill wins here.” variant via simple flag.

---

## Screenshots to verify

1. `/` desktop — hero + mockup side-by-side  
2. `/` mobile — stacked hero, swipeable games  
3. Stats section — count-up on scroll into view  
4. Compare `/` hero tokens vs `/dashboard` hero (parity)  
5. Logged-in visit → redirect to dashboard  
