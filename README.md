# ChanceUS

Skill-based games platform: head-to-head matches, tournaments, bar trivia, and token-based play.

## Quick start

1. **Clone and install**
   ```bash
   pnpm install
   ```

2. **Environment**
   - Copy env vars from [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) into `.env.local`.
   - Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.
   - Optional: Stripe keys for wallet/token purchases; tournament gate password.

3. **Run**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

- **Build:** `pnpm build`
- Set env vars in the Vercel dashboard (see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)).
- Configure Supabase redirect URLs for your production domain.

## Docs

- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) — Env vars and Supabase/Stripe setup.
- [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) — Features, commands, troubleshooting.
- [PRODUCTION_READINESS_ROADMAP.md](./PRODUCTION_READINESS_ROADMAP.md) — Checklist for production hardening.
