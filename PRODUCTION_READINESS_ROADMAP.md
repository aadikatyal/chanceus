# Production Readiness Roadmap

Actionable checklist to harden ChanceUS for production. Order is roughly by impact and ease.

---

## 1. Lock down debug routes (Quick win)

**Goal:** Prevent `/debug`, `/debug-games`, `/debug-matches` in production or restrict to admins.

**Options:**

- **A) Redirect in middleware (simplest)**  
  In `middleware.ts`: if `NODE_ENV === 'production'` and path starts with `/debug`, redirect to `/` or 404.

- **B) Environment gate**  
  In each debug page: if `process.env.NODE_ENV === 'production'`, render "Not available" or redirect.

- **C) Admin-only**  
  Require a role/flag (e.g. `users.is_admin` or env `ALLOW_DEBUG_USER_IDS`) and check in the debug pages or middleware.

**Files:** `middleware.ts`, `app/debug/page.tsx`, `app/debug-games/page.tsx`, `app/debug-matches/page.tsx`

---

## 2. Reduce console logging (Quick win)

**Goal:** No `console.log`/`console.warn` in production paths; use a small logger that no-ops in production.

**Steps:**

- Add a tiny `lib/logger.ts`: in production export no-op functions; in dev forward to `console.*`.
- Replace `console.log` / `console.error` / `console.warn` in critical paths (middleware, API routes, game flow) with the logger. Start with `middleware.ts`, `lib/supabase/middleware.ts`, and a few high-traffic components.
- Optionally run a lint rule to forbid `console.*` outside of `lib/logger.ts`.

**Files:** New `lib/logger.ts`; then `lib/supabase/middleware.ts`, API routes under `app/api/`, key components (e.g. `enhanced-match-interface.tsx`, `simple-connect-four.tsx`).

---

## 3. Fix RLS (High impact, higher effort)

**Goal:** Re-enable RLS on bar-related tables with policies that don’t recurse or over-restrict.

**Steps:**

- List tables that had RLS disabled: `bars`, `bar_staff`, `bar_trivia_games`, `bar_trivia_sessions`, `bar_trivia_participants`, `bar_trivia_questions`, `bar_trivia_answers`, `bar_drink_rewards`.
- In Supabase SQL editor, design policies per table (e.g. staff can manage their bar; participants can read/write their session). Use `auth.uid()` and avoid policies that select from the same table in a way that triggers recursion.
- Test locally with real roles (bar owner, staff, participant); then re-enable RLS and remove any `disable-rls-*` script usage from your runbooks.

**References:** `scripts/disable-rls-temporarily.sql`, `scripts/disable-bar-rls-temporarily.sql`, Supabase dashboard → Authentication → RLS.

---

## 4. Address documented critical bugs

**Goal:** Resolve or mitigate the critical bugs in `PROJECT_DOCUMENTATION.md`.

| Bug | Action |
|-----|--------|
| Match status stuck in "waiting" when both players present | Ensure transition to `in_progress` when player2 joins (e.g. in match join/update logic or a small trigger). Remove or hide any production-only “force complete” debug UI. |
| Math Blitz index out of bounds | In `multiplayer-math-blitz.tsx` (e.g. around 1026–1054), clamp `currentProblemIndex` to `problems.length` and add a guard so it never exceeds; add a unit test or manual test. |
| RLS issues | See section 3 above. |

**Files:** Match update/join flow (e.g. where player2_id is set), `components/games/multiplayer-math-blitz.tsx`, and any “debug section” in `app/games/page.tsx`.

---

## 5. Add automated tests (High impact, ongoing)

**Goal:** Basic test coverage so refactors and deploys are safer.

**Steps:**

- Add Vitest (or Jest) + React Testing Library: `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`.
- Add `vitest.config.ts` and a script in `package.json`: `"test": "vitest"`.
- Write a few tests: one for a critical util (e.g. `lib/config.ts` or a small game-logic helper), one for a key component (e.g. login form or tournament password gate), and one for an API route (e.g. create-checkout-session returns 401 when unauthenticated).
- Run `pnpm test` in CI (e.g. Vercel or GitHub Actions).

**Files:** New `vitest.config.ts`, `lib/config.test.ts` (or similar), one `*.test.tsx` for a component, one API route test.

---

## 6. Small polish items

| Item | Change |
|------|--------|
| Package name | In `package.json`, set `"name": "chanceus"` (or your real app name). |
| README | Replace “Test deployment trigger” with a short “What is this”, “Quick start” (clone, `pnpm install`, `pnpm dev`, `.env.local`), and “Deploy” (e.g. Vercel + env vars). Link to `ENVIRONMENT_SETUP.md` and `PROJECT_DOCUMENTATION.md`. |
| Tournament password | Move to env: e.g. `TOURNAMENT_GATE_PASSWORD` in `.env.local`; read in `tournament-password-gate.tsx`. If unset, you can treat as “gate disabled” for local dev. |

**Files:** `package.json`, `README.md`, `components/tournaments/tournament-password-gate.tsx`, `ENVIRONMENT_SETUP.md` (document the new env var).

---

## 7. Optional improvements

- **Watch route auth:** If `/watch` should be protected, add it to the protected list in `lib/supabase/middleware.ts`.
- **Error reporting:** Replace or supplement `console.error` in `error.tsx` with a service (e.g. Sentry) so production errors are reported and grouped.
- **Rate limiting:** Add rate limiting on auth and payment endpoints (e.g. Vercel serverless or Upstash) to reduce abuse.

---

## Suggested order of execution

1. **Today:** Lock down debug routes (1), small polish (6) — package name, README, optional tournament password env.
2. **This week:** Introduce logger and reduce console usage (2); fix Math Blitz index and match-status transition (4).
3. **Next:** Add tests (5); then tackle RLS (3) and remaining bugs (4).

Use this file as a living checklist: check off items as you go and add new ones (e.g. “Add Sentry”) as needed.
