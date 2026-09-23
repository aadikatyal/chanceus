# Authentication experience review

Presentation-only redesign for `/auth/login` and `/auth/sign-up`. Supabase actions, routing, and session logic unchanged.

## Before vs after

| Area | Before | After |
|------|--------|--------|
| Layout | Small centered card under a thin header | Full-height cinematic split: story + live stats + product preview (desktop) / stacked mobile |
| Visual language | Gray/orange card, legacy `#FFA500` buttons | ChanceUS tokens, brand green primary, raised panel with glow |
| Copy | Generic “Welcome Back / win big” | Arena tone: “Your next match is waiting”, “Continue your climb” |
| Social proof | None | Real platform counts (online, live matches, queue, tournaments) — `—` when zero |
| OAuth | Inline duplicated buttons | Shared neutral Google / Apple components |
| Forms | shadcn Card, orange focus | Dedicated auth inputs, calm alerts, password visibility toggle |
| Primary CTA | Orange “Enter ChanceUS” (login) | Canonical `chance-hero-cta-primary` — **Enter ChanceUS** on both routes |

**Note:** Dedicated password-reset / verify-email routes are not in the repo today; sign-up email confirmation still uses the existing success message from `signUp` with updated styling.

## Responsiveness

- **Desktop (≥1024px):** 2-column grid — narrative + compact mockup left, auth panel right (`max-width: 440px`).
- **Tablet / mobile:** Single column — logo, headline, live strip, then auth panel; preview hidden below 1024px to avoid clipped screenshots.
- Safe-area padding on top/bottom; full-width submit buttons on small screens (existing `chance-responsive.css` rules still apply).
- Live stats grid: 2 columns on narrow phones, 4 on wider.

## Accessibility

- Labels tied to every input; password toggle with `aria-label` / `aria-pressed`.
- Error/success regions use `role="alert"` / `role="status"`.
- Live strip uses `role="status"` and `aria-live="polite"`.
- Focus rings via `chance-focus-ring` on links, OAuth, submit, and toggle.
- Contrast aligned to competitive dark theme tokens; hit targets ≥44px on primary actions.

## Animation

- Ambient green drift (slow background glow).
- Staggered fade-in for story, panel, and preview.
- Panel hover lift + shadow (disabled under `prefers-reduced-motion`).
- Live beacon pulse when arena activity &gt; 0.
- Reuses landing mockup float/breathe where enabled.

## Files touched

- `app/auth/layout.tsx` + `app/chance-auth.css`
- `components/app/auth-marketing-shell.tsx`
- `components/login-form.tsx`, `components/sign-up-form.tsx`
- `components/auth/*` (live strip, OAuth, password field, form UI)
- `lib/platform-live-stats.ts`
- `app/auth/login/page.tsx`, `app/auth/sign-up/page.tsx`

## Remaining polish opportunities

- Add `/auth/forgot-password` and `/auth/verify-email` shells using the same `AuthMarketingShell` when routes exist.
- Client-side refresh of live stats (optional polling or short ISR) on long auth sessions.
- Link “Forgot password?” when Supabase reset flow UI is added (presentation-only).
- Optional testimonial or recent match ticker if a public, non-PII feed becomes available.
