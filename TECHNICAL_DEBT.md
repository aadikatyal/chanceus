# Technical Debt

Debt that blocks a million-user competitive platform. Cosmetic debt is omitted.

## Critical

1. **Client-authoritative results.** Match status and `winner_id` are updated by the participants. A competitive ladder cannot exist on that write path.
2. **Client-authoritative money.** `users.tokens` plus RLS that lets a user insert `transactions` means the balance is not a balance. This is the first thing to delete.
3. **Client-side matchmaking.** The browser can read the entire queue and is expected to pair rows. Tickets, MMR, and ready checks are unprotected.
4. **RLS as the security model, and RLS turned off.** Venue policies were disabled to escape recursion. Several match and tournament policies allow any authenticated user to update rows they do not own. That is an authorization bypass, not a prototype shortcut.
5. **Cash match types without a payments and legal model.** `cash5` and `cash10` sit on the same integer wallet as free tokens.
6. **Debug surfaces in the product.** `/debug`, `/debug-games`, `/debug-matches`, and debug token routes do not belong on a production origin.
7. **No idempotency on payment fulfillment.** Checkout completion that credits tokens without a unique provider reference will double-pay under retries.

## Structural

8. **1v1 columns.** `player1_id` / `player2_id` block parties, spectators-as-participants, and FFA trivia. `match_players` should replace them before tournaments grow.
9. **Friends overload blocking.** `status = blocked` on a friend row cannot represent “blocked but never friends” or a block that survives an unfriend.
10. **No region, no hot state.** Live games and presence are Postgres rows. That will not hold 100k concurrent users or a reconnect story.
11. **Game rules inside React components.** Math Blitz index bugs are a symptom: the rules live in the client. Moving them server-side is a rewrite of the referee, not a clamp.
12. **Tournament writes are global.** Any logged-in user can update a tournament. Hosts, referees, and players are the same role.
13. **Single elimination only, and bracket positions are denormalized early.** Fine for a demo. The node model in the schema spec should land before a second format.
14. **Analytics and leaderboard tables have no producer.** Caches without a rating service will drift or be empty.
15. **Two sources of trivia.** Global trivia questions and venue trivia are separate piles. One question bank, two modes.

## Operational

16. **No tests around money, queue, or match completion.**
17. **Console logging in place of an audit log.**
18. **Queue expiry depends on someone opening the games page.**
19. **Service-role and anon assumptions are mixed.** The web app is both the UI and the backend. Splitting that is the migration, not a refactor week.
20. **Secrets in project docs.** `PROJECT_DOCUMENTATION.md` contains a live anon key and project URL. Rotate anything that was ever a service key, and stop committing environment values.

## Keep

- The game catalog (Math Blitz, 4 In a Row, Trivia) is the right content bet: short, skill-expressive, spectator-readable.
- Stripe as the purchase processor.
- Venues as a distinct mode with local rewards.
- Supabase Auth can remain the identity provider if domain services verify its tokens. Supabase should not remain the place where clients write match and wallet rows.
