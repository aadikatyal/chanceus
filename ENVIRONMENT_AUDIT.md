# Environment audit

Inspected the repo and the names present in `.env.local`. Secret values are not recorded here.

## What exists

| Surface | Finding |
| --- | --- |
| Local app | `pnpm dev` (Next.js). Configured by `.env.local`. |
| Database | One Supabase project, referenced as `qhggmqttxbmuehugwbzi` in `ENVIRONMENT_SETUP.md`. Local development and the documented production site (`chanceus.com` on Vercel) point at that same project. |
| Staging | None. No second Supabase project, no preview database, no staging env file. |
| Production app | Documented as Vercel. No `vercel.json` and no GitHub Actions workflow in this repo. Deploys are dashboard-driven if they happen at all. |
| Migration tooling | SQL files in `scripts/`. No Supabase CLI config, no migration runner, no `DATABASE_URL`. |
| Tests | `pnpm test` runs the in-memory ledger. It does not connect to Supabase. |

## Secrets

| Name | Local `.env.local` | Needed for ledger deploy |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Set | Yes, for the app |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Set | Yes, for the browser session |
| `SUPABASE_URL` | Set | Same project as the public URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Set | Yes. Server wallet calls use it. It must also be set in Vercel or purchases and holds fail closed. |
| `STRIPE_SECRET_KEY` | Set | Yes, for checkout fulfillment |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Set | Yes, for the payment form |
| `DATABASE_URL` / `SUPABASE_DB_URL` / `POSTGRES_URL` | Missing | Required to apply SQL. The service role cannot create tables. |

`ENVIRONMENT_SETUP.md` does not list `SUPABASE_SERVICE_ROLE_KEY` under the Vercel block. If production was configured only from that document, the ledger API will return 503 there.

## Pipeline gap

There is no CI job that applies `scripts/27-ledger.sql`, `scripts/28-ledger-cutover.sql`, `scripts/28b-ledger-backfill.sql`, or `scripts/29-freeze-user-tokens.sql`. Shipping the current app to Vercel before those scripts run makes every balance read return 0 and every grant fail, while the old database column is still writable.

## Do not treat local as production

Applying the freeze trigger on this Supabase project freezes the only database the live site uses. There is no staging copy to rehearse on.
