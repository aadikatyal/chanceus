# Ledger security review

## RLS

`wallet_entries` has RLS enabled and a select policy for `auth.uid() = user_id`. There is no insert, update, or delete policy, so the anon and authenticated roles cannot write lines. Updates and deletes are also rejected by `prevent_ledger_mutation`.

`wallet_operations` has RLS enabled and no policies. Authenticated users cannot read idempotency records. The service role bypasses RLS, which is how the server posts.

`users` still has an update policy for the signed-in user. That policy includes the `tokens` column until `scripts/29-freeze-user-tokens.sql` is applied. Until then, a client can change their own balance with a direct table update. That is the open production hole.

`transactions` still allows inserts until Phase E drops `Users can create their own transactions`. The app no longer inserts. The policy does.

## Service role

`lib/wallet/server.ts` uses `SUPABASE_SERVICE_ROLE_KEY` for reads and for `ledger_apply`. The key never belongs in a `NEXT_PUBLIC_` variable. It is set locally. The Vercel instructions in `ENVIRONMENT_SETUP.md` omit it. Production must set it in the server environment only.

The service role can do more than post ledger lines. Any compromised server route is a full database admin. Scope is not enforceable inside Supabase beyond "only the server holds the key."

## Admin permissions

There is no staff-only adjustment route in this milestone. `walletGrant` with `type: adjustment` exists as a server function. Nothing in the UI calls it. Do not expose it as a public route. When an admin tool is added, it needs a role check and a second approver above 1,000 tokens, as in `PERMISSION_MODEL.md`. That tool does not exist yet.

## RPC permissions

`ledger_apply` is `SECURITY DEFINER` with `search_path = public`. The script revokes execute from `PUBLIC`, `anon`, and `authenticated` and grants it to `service_role`. After deploy, confirm that with the grant query in the runbook. Supabase has granted new functions to `anon` by default on other projects. The revoke is there so this one does not.

`transfer_tokens` and `increment_tokens_and_log` are not dropped by these scripts. The app no longer calls them. Drop or revoke them in Phase F so a leftover client cannot.

## Replay, signing, idempotency

Stripe fulfillment uses the Checkout session id or PaymentIntent id as the idempotency key. A second call posts nothing new if `ledger_apply` is installed. The route still checks that Stripe says the payment succeeded before granting. It does not verify a Stripe webhook signature on these fulfillment routes. A user who can guess a paid session id for their own account could retry, and the idempotency key makes the retry harmless. A user who can pass another customer's session id could grant themselves tokens if the route does not compare the session's customer to the logged-in user.

That customer check is not in `app/api/fulfill-checkout/route.ts` or `app/api/fulfill-payment-intent/route.ts`. Treat it as a required fix before real charges. Test-mode keys limit the money. They do not limit token minting inside the app.

Idempotency is enforced in the database by unique keys, not by a client-supplied header on the public wallet GET. Grants from the server set the key. There is no public `POST /ledger` for the browser.

## Request signing

Browser calls to `GET /api/v1/wallet` use the user session cookie. Mutations go through server actions or the Stripe fulfillment routes, then the service role. The browser never signs a ledger body. That is correct as long as `ledger_apply` stays off the anon role.

## Verdict

The ledger function is safe to install. The product is not safe to call production-authoritative until the freeze script has run, the old token RPCs are revoked, and fulfillment rejects a Stripe session that does not belong to the signed-in user. Match Service stays blocked.
