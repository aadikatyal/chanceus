# Permission Model

Authorization is enforced in the service that owns the resource. The gateway only checks that a token is valid and that a route requires a role. Hiding a button is not a permission.

## Principals

A user has one account status (`provisional`, `active`, `limited`, `banned`) and zero or more platform roles. Resource roles (tournament staff, club role, venue staff) are rows on that resource, not platform roles.

`banned` fails authentication. `limited` authenticates and then fails the capabilities listed under sanctions. `provisional` is every new account until email is verified; it is not a role.

Premium is a role `premium` granted by a purchase or an admin. It is not required for ranked play. It does not change MMR, rake, or matchmaking priority.

## Capability keys

Services check keys, not role names, so a resource role can grant a key without becoming an Admin.

| Key | Meaning |
| --- | --- |
| `queue.casual` | Join casual |
| `queue.ranked` | Join ranked and placement |
| `queue.party` | Queue with a party |
| `match.private_create` | Create a private lobby |
| `match.play` | Submit inputs |
| `match.spectate` | Join delayed spectate |
| `wallet.read_self` | Read own ledger |
| `wallet.claim` | Daily claim and quest claim |
| `wallet.purchase` | Start checkout |
| `wallet.adjust` | Adjust any wallet |
| `social.friend` | Requests, accept, block |
| `social.club_create` | Create a club |
| `chat.send` | Send where a member |
| `voice.join` | Join a room the user belongs to |
| `tournament.create` | Create a draft |
| `tournament.register` | Register |
| `tournament.manage` | Edit, seed, start, cancel that tournament |
| `tournament.referee` | Resolve disputes for that tournament |
| `venue.create` | Submit a venue |
| `venue.manage` | Edit that venue and staff |
| `venue.host` | Run events and codes |
| `moderation.review` | Read reports and open cases |
| `moderation.sanction` | Apply non-permanent sanctions |
| `moderation.permanent` | Permanent sanctions and revokes |
| `admin.users` | Read full user records |
| `admin.void_match` | Void a match |
| `admin.venue_review` | Approve venues |
| `admin.season` | Force season steps |
| `admin.audit` | Read audit logs |

## Roles

### Guest

Capabilities: read public catalog, public leaderboards, public tournaments, public venue boards, shared replay links.
Restrictions: no token, no queue, no chat, no presence heartbeat, no profile writes. Private profiles return 404.
Ownership: none.
Escalation: signup.

### Player

Default role on every non-banned account, plus the status gates below.
Capabilities: `queue.casual`, `match.play`, `match.spectate`, `wallet.read_self`, `wallet.claim`, `social.friend`, `social.club_create`, `chat.send`, `voice.join`, `tournament.register`, `venue.create`, `match.private_create`.
If `email_verified` and status `active`: also `queue.ranked`, `queue.party`, `wallet.purchase`, `tournament.create` when trust score ≥ 40.
Restrictions: cannot read other users' ledgers, cannot set results, cannot grant roles, cannot see invisible users' true status, stakes above 25 require account age ≥ 7 days. `provisional` (unverified) loses ranked, purchase, tournament create, and paid register.
Ownership: own profile, own wallet, own messages, parties they lead, clubs they own, tournaments they host, venues they own.
Escalation: report a user. Appeal a sanction. Cannot escalate themselves into staff.

### Premium Player

Everything Player has.
Additional capabilities: none that affect fairness. Cosmetic: extra profile slots (featured badge), a premium title if the catalog grants one, higher replay retention (365 days versus 90).
Restrictions: same queue rules, same rake, same MMR. Premium cannot skip ready checks or dodge penalties.
Ownership: same as Player.
Escalation: same as Player. Chargebacks are a Payments problem, not a permission promotion.

### Moderator

Includes Player capabilities for their own play.
Additional: `moderation.review`, `moderation.sanction`, `admin.users`, `admin.audit`, delete any message in a conversation they open for a case.
Restrictions: cannot permanently ban, cannot adjust wallets, cannot void matches, cannot close seasons, cannot edit a match result, cannot view raw payment instruments. Sanctions they apply must include a note and a `case_id`. They cannot sanction an Admin or Super Admin (returns `forbidden`).
Ownership: cases they open. They do not own user accounts.
Escalation: hand a case to Admin for permanent ban, void, or wallet action.

### Tournament Host

Not a platform role. The user who created the tournament, stored as `host_id` and as staff role `host`.
Capabilities on that tournament: `tournament.manage`.
Restrictions: cannot change format after `registration` closes, cannot remove a checked-in player's hold without withdraw or cancel, cannot resolve their own match dispute if they are a participant (a referee must), cannot see private wallets, cannot edit seeds after `live`. Cancel during `live` voids unfinished matches only.
Ownership: that tournament until they transfer host to another staff admin. Transfer is `POST /tournaments/{id}/staff` with role `host` and requires the current host.
Escalation: platform Moderator for cheating reports. They cannot ban a user from the platform. They can disqualify an entrant, which emits a sanction-like tournament status `disqualified` and a refund if the match has not started.

### Venue Host

Resource role on `venue_staff`.
Capabilities: `venue.host` for that venue's events.
Restrictions: cannot change owner, cannot withdraw global tokens, cannot grant platform roles, cannot check in a user without a valid code, cannot write `venue_standings` directly (Game Service does).
Ownership: events they created.
Escalation: venue owner, then Admin for suspension of a patron only through a report. A host may remove a patron from the current event (`check-in` revoked) without a platform sanction.

### Club Owner

Resource role `owner`. Exactly one per club.
Capabilities: rename, set visibility, promote officers, remove members, delete club (soft).
Restrictions: cannot queue-ban a member, cannot read member wallets, cannot transfer more than the club. Removing the owner requires transferring ownership first.
Ownership: the club row.
Escalation: appoint officers. Report members. Platform sanctions stay with Moderators.

### Club Officer

Resource role `officer`.
Capabilities: accept join requests, remove `member` (not officers or owner), post club announcements (a message type).
Restrictions: cannot delete the club, cannot change the owner, cannot promote other officers.
Ownership: none of the club.
Escalation: owner.

### Admin

Platform role. Includes Moderator capabilities.
Additional: `moderation.permanent`, `admin.void_match`, `admin.venue_review`, revoke sanctions.
Restrictions: cannot adjust wallets (that is `economy_admin`), cannot force a season close, cannot grant `super_admin`. Two admins are not required for a void. A void always writes audit before and after.
Ownership: none of the user's property. Actions are attributed.
Escalation: Super Admin for season repair and role grants of Admin.

### Super Admin

Includes Admin and `economy_admin` and `admin.season`.
Capabilities: grant and revoke any platform role except they cannot remove the last remaining Super Admin. Dual-control still applies to wallet adjustments above 1,000 tokens: the approver must be a different `economy_admin` or Super Admin.
Restrictions: cannot delete audit logs, ledger rows, or match events. Cannot edit a result in place. The only result tools are void and dispute resolution.
Ownership: platform configuration, not user content.
Escalation: none inside the product. Break-glass is an infrastructure action outside this model and must append an audit row.

### Economy admin

Platform role, often paired with Admin but separable.
Capabilities: `wallet.adjust` under the dual-control rule.
Restrictions: no sanctions, no voids, unless they also hold those roles.
This role exists so a finance operator is not a moderator and a moderator is not a cashier.

## Ownership rules

| Resource | Owner | Who else can write |
| --- | --- | --- |
| Profile | The user | Admin can set status, not impersonate chat |
| Wallet | The user via services | Wallet service; economy admin adjustments |
| Match | Game Service | Admin void; referee through dispute |
| Party | Leader | Members may leave; leader may kick |
| Club | Owner | Officers within their keys |
| Tournament | Host | Tournament admins; referees for disputes |
| Venue | Owner | Hosts for events; Admin for status |
| Message | Sender | Moderator soft-delete |
| Audit log | Nobody | Append-only by services |

## Sanction interaction

An active sanction removes keys:

| Sanction | Keys removed |
| --- | --- |
| `mute` | `chat.send`, `voice.join` |
| `queue_ban` | `queue.casual`, `queue.ranked`, `queue.party` |
| `game_ban` | Those plus `match.play`, `tournament.register` |
| `stake_ban` | Any action with stake > 0 or entry fee > 0 |
| `permanent` | All keys except `wallet.read_self` and appeal |

The most restrictive active sanction wins. Expiry is checked at request time, not only by a job.

## Checks that are not permissions

Block lists are relationship rules. A blocked user cannot be invited, matched in private lobbies, or DM'd, even if both are Admins. Ranked matchmaking ignores blocks; otherwise blocks become a queue dodge tool. Chat between ranked opponents is opt-in per match and off by default.

Privacy is not a role. `private` profiles 404 to non-friends. Friends see online status only if `show_online` is true.
