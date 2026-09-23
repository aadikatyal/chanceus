# ChanceUS — Product Architecture Review

**Lens:** Principal Product Designer (information architecture only)  
**Explicitly out of scope:** Color, typography, tokens, implementation quality  
**Scope:** All 39 routes, global navigation, middleware auth boundaries, primary user jobs  
**Question:** Is the **product structure** correct for a skill-stakes platform at scale?

---

## Executive thesis

ChanceUS is **four products welded together**:

1. **Skill matchmaking** (1v1 games, tokens, wallet) — the core Stripe/Kalshi-shaped business  
2. **Social play** (friends, chat, live call, watch) — Discord-shaped  
3. **Competitive seasons** (tournaments) — esports-shaped  
4. **Venue trivia** (bars, QR join, host dashboards) — Square-for-venues-shaped  

Each has a valid user, but they share **one flat nav of eight peers**. That is not how Linear, Stripe, Mercury, or Kalshi organize complexity. Those products use **one primary loop**, **secondary surfaces behind grouping**, and **rarely duplicate entry points**.

Today the logged-in user lands on a **dashboard** that partially serves the core loop, then the header sends them to **Games**, **Matches**, **Wallet**, **Tournaments**, **Bar Trivia**, **Chat**, and **Live Call** with equal weight. **No mental model is primary.**

If **Stripe built ChanceUS from scratch**, you would get roughly:

- **Overview** — balance, exposure (active stakes), recent activity, one primary CTA (“Play” or “Find match”)  
- **Play** — catalog + lobby + queues (not split across Dashboard + Games + game detail + create)  
- **Activity** — matches in progress, history, replays, disputes (one timeline)  
- **Wallet** — balance, deposits, withdrawals, ledger (Mercury-shaped)  
- **Compete** (optional tier-2) — tournaments only  
- **Venues** (optional tier-2 or separate product) — bar host tools, not in the main player nav  
- **Account** — profile, settings, friends, chat (social under account or inbox, not top-level)

You would **not** get: separate Dashboard + Games + Matches for the same loop, four bar URL families, `/analytics` as a ghost page, `/watch` hidden, `/friends/add` orphaned, debug routes in the sitemap, or **Live Call** as a top-level sibling of **Wallet**.

---

## Mental model comparison

| Reference | Primary object | Home answers | Secondary |
|-----------|----------------|--------------|-----------|
| **Linear** | Issue | What needs my attention? | Projects, cycles, inbox triage |
| **Stripe** | Money movement | Balance + recent activity | Products, customers deep in nav |
| **Mercury** | Cash position | Balance + cash flow | Cards, wires in context |
| **Kalshi** | Position / market | Portfolio + open interest | Browse markets subordinate to activity |
| **ChanceUS today** | Unclear | Dashboard (mixed) | Everything else flat in header |

**Target mental model for ChanceUS (player):**  
**Balance → Active stakes → Play → History.** Social and venues are **adjacent**, not **equal**.

---

## Route hierarchy (recommended)

```
/                          Marketing (logged-out); redirect when authed
/auth/*                    Auth

/app or /dashboard         Overview (rename mentally to "Home")
/play                      Games catalog + open lobbies + queues (MERGE)
/play/[gameId]             Game hub: matchmake, create, practice
/play/[gameId]/match/new   Create stake (optional slug)
/match/[id]                Active + completed match (canonical)
/activity                  Matches list + filters (MERGE matches + replays index)
/activity/[id]/replay      Replay viewer
/wallet                    Money
/compete                   Tournaments list (optional nav group)
/compete/new               Create tournament
/compete/[id]              Tournament detail
/venues                    Bar discovery for players (optional)
/venues/manage/*           Host tools (B2B; separate nav when in host mode)
/social                    Friends + chat hub (MERGE) OR under account
/call/*                    Friend video play (deep link; not primary nav)
/account/profile
/account/settings
```

Below, **current routes** are evaluated; **recommended** actions use **Keep / Merge / Demote / Delete / Split**.

---

## Per-route evaluation (10 questions each)

Format abbreviated after first exemplars; all routes covered in tables and sections.

### Marketing & auth

#### `/` (landing)
| # | Answer |
|---|--------|
| 1 Why exist? | Acquire and explain value; route to sign-up. |
| 2 Primary goal | Understand “skill → tokens” and register. |
| 3 Do first | Sign up or explore games (logged-out). |
| 4 Most attention | Value prop + single CTA. |
| 5 Distracting | Logged-in user never sees it (redirect) — OK. |
| 6 Should exist? | **Yes** (logged-out only). |
| 7 Merge? | No; keep separate from app. |
| 8 Nav noise? | N/A logged-out. |
| 9 Linear/Stripe? | Stripe marketing vs dashboard separation — **aligned**. |
| 10 Stripe rebuild? | Same; logged-in **`/` → /dashboard** is correct. |

#### `/auth/login`, `/auth/sign-up`
| # | Answer |
|---|--------|
| 1 Why exist? | Identity. |
| 2 Goal | Enter app with redirect preserved. |
| 3 Do first | OAuth or email. |
| 4 Attention | Single path in. |
| 5 Distracting | Extra marketing on auth card — minor. |
| 6 Exist? | **Yes**. |
| 7 Merge? | Keep separate pages (signup has more fields). |
| 8 Nav? | None — good. |
| 9 Stripe? | **Aligned**. |
| 10 Stripe? | Unified auth subdomain pattern optional; not required. |

---

### Overview

#### `/dashboard`
| # | Answer |
|---|--------|
| 1 Why exist? | Post-login home. |
| 2 Goal | Orient: money, play, recent outcomes. |
| 3 Do first | **Start a match** (core loop). |
| 4 Attention | Balance, active stakes, open queues, last matches. |
| 5 Distracting | Global “market payouts” feed (other users) competes with **your** next action; friends widget duplicates social nav. |
| 6 Exist? | **Yes** — but rename conceptually to **Home / Overview**. |
| 7 Merge? | **Partially with `/games`** — catalog + quick play belong in one “Play” surface; dashboard should not duplicate full game table. |
| 8 Nav? | **“Dashboard” + “Games”** is redundant (see navigation). |
| 9 Mercury/Kalshi? | Mercury home = balance + tasks; Kalshi = portfolio + feed. Current dashboard **directionally right** but **split brain** with Games page. |
| 10 Stripe? | Stripe Dashboard = balance + recent activity + shortcuts — **not** a second browse-games page elsewhere. |

**Dashboard redesign (IA only):**

| Zone | Purpose | Priority |
|------|---------|----------|
| **A — Position** | Token balance, rank, active users (context) | Highest |
| **B — Action** | One primary CTA + compact game picker (3 rows max) | Highest |
| **C — Your activity** | Your last N matches, in/out tokens | High |
| **D — Live ecosystem** | Optional collapsible “community payouts” | Low (Kalshi-style sidebar, not hero) |
| **E — Social** | Friends online → link to Social, not full CRM on home | Demote |

Remove duplicate: anything on Dashboard that repeats **full** Games lobby should link to **Play**, not replicate.

---

### Core play loop (fragmented today)

#### `/games`
| # | Answer |
|---|--------|
| 1 Why exist? | Browse games, open matches, queues. |
| 2 Goal | Join or create a staked match. |
| 3 Do first | Pick game → matchmake or join open match. |
| 4 Attention | Open matches **you can join**, your queues, game list. |
| 5 Distracting | Stats sidebar, debug concepts, duplicate of dashboard quick actions. |
| 6 Exist? | **Yes** as **Play** hub. |
| 7 Merge? | **Merge with dashboard play section** into **`/play`** OR make dashboard a thin overview that deep-links here only. |
| 8 Nav? | **Games + Dashboard** = two homes. **Pick one.** |
| 9 Kalshi? | Kalshi “Browse” is secondary to portfolio; here Browse is **primary nav** — **misordered**. |
| 10 Stripe? | Stripe doesn’t have two product catalogs; **one Play entry**. |

#### `/games/[gameId]`
| # | Answer |
|---|--------|
| 1 Why exist? | Per-game lobby. |
| 2 Goal | Matchmake, join waiting match, practice. |
| 3 Do first | Join queue **or** create match. |
| 4 Attention | Open matches for **this game**, matchmaking state. |
| 5 Distracting | Multiple create tiers (free/tokens/cash) as equal buttons — decision paralysis. |
| 6 Exist? | **Yes** — under `/play/[gameId]`. |
| 7 Merge? | **`/create` and `/play` (practice)** should be **modes** on this page, not separate destinations where possible. |
| 8 Nav? | Reach via Play catalog only — **not** header. |
| 9 Linear? | Project page = context + actions — **good analogy**. |
| 10 Stripe? | Drill-down from catalog — **yes**. |

#### `/games/[gameId]/create`
| # | Answer |
|---|--------|
| 1 Why exist? | Configure stake and create match. |
| 2 Goal | Confirm bet and enter waiting/match state. |
| 3 Do first | Select stake → submit. |
| 4 Attention | Stake, balance check, confirm. |
| 5 Distracting | Large preview/marketing column. |
| 6 Exist? | **Yes** — as **modal or step** on game hub preferred over separate page. |
| 7 Merge? | **Into game hub** wizard (Stripe Checkout pattern: focused step). |
| 8 Nav? | Never in global nav. |
| 9 Stripe? | Payment = focused flow — **merge steps**. |
| 10 Stripe? | Single funnel, not page + page. |

#### `/games/[gameId]/play`
| # | Answer |
|---|--------|
| 1 Why exist? | Practice / solo. |
| 2 Goal | Try game without stake. |
| 3 Do first | Play. |
| 4 Attention | Game board. |
| 5 Distracting | Competing CTAs to ranked play. |
| 6 Exist? | **Yes** — tab/mode “Practice” on game hub. |
| 7 Merge? | **Game hub tab**, not sibling route in IA mental map. |
| 8 Nav? | No. |
| 9 | Training mode subordinate — **correct**. |
| 10 | Onboarding practice before stake — **good** if surfaced once. |

#### `/games/match/[matchId]`
| # | Answer |
|---|--------|
| 1 Why exist? | **The product** — live skill contest. |
| 2 Goal | Play, win/lose, rematch. |
| 3 Do first | If waiting — share/wait; if live — play; if done — result + rematch. |
| 4 Attention | Game state, timer, opponent, stake. |
| 5 Distracting | Friend request cards, tournament links mid-match. |
| 6 Exist? | **Yes** — canonical **`/match/[id]`**. |
| 7 Merge? | Replays link to activity; tournament context only if match is tourney. |
| 8 Nav? | **Never** header; **Inbox/Activity** badge when in progress. |
| 9 Linear? | Issue detail — **full focus**; side metadata collapsed. |
| 10 Stripe? | Dispute detail page — **single purpose**. |

---

### Activity & history

#### `/matches`
| # | Answer |
|---|--------|
| 1 Why exist? | Historical matches + stats. |
| 2 Goal | Review performance, find past match. |
| 3 Do first | Scan table, filter. |
| 4 Attention | Match table (W/L, stake, opponent). |
| 5 Distracting | KPI cards that duplicate dashboard/wallet. |
| 6 Exist? | **Yes** — as **`/activity`** (matches tab). |
| 7 Merge? | **`/replays/*` index**, **`/watch`** (spectate list) → **Activity** with tabs: Yours | Live | Replays. |
| 8 Nav? | **One “Activity”** not Matches + hidden Watch. |
| 9 Kalshi? | History = ledger of outcomes — **aligned**. |
| 10 Stripe? | Payments list — **one ledger surface**. |

#### `/watch`
| # | Answer |
|---|--------|
| 1 Why exist? | Spectate live matches. |
| 2 Goal | Watch others play. |
| 3 Do first | Pick live match. |
| 4 Attention | Live list. |
| 5 Distracting | Dev-oriented empty copy. |
| 6 Exist? | **Yes** — **tab under Activity**, not standalone product. |
| 7 Merge? | **Activity → Live**. |
| 8 Nav? | **Remove** from needing discovery; optional link from Play. |
| 9 | Spectator = secondary — **demote**. |
| 10 | Not top-level Stripe nav item. |

#### `/replays/[matchId]`, `/replays/share/[shareToken]`
| # | Answer |
|---|--------|
| 1 Why exist? | Review/share past game. |
| 2 Goal | Watch replay or share link. |
| 3 Do first | Play replay. |
| 4 Attention | Player. |
| 5 Distracting | Missing app chrome on logged-in route — **IA disconnect**. |
| 6 Exist? | **Yes** — share URL can stay public-style. |
| 7 Merge? | Logged-in: **Activity → match → Replay**; share: minimal public page. |
| 8 Nav? | No direct nav; deep link. |
| 9 | Share links = Stripe invoice link pattern — **OK**. |
| 10 | Public share ≠ full app shell — **OK** if intentional. |

#### `/analytics`
| # | Answer |
|---|--------|
| 1 Why exist? | Deeper stats. |
| 2 Goal | Analyze performance by game. |
| 3 Do first | Select game filter. |
| 4 Attention | Charts. |
| 5 Distracting | Entire page duplicates dashboard + matches KPIs. |
| 6 Exist? | **Debatable** — **merge into Activity or Profile**. |
| 7 Merge? | **Profile → Stats** or **Activity → Analytics tab**. |
| 8 Nav? | **Remove** top-level; protected but orphaned today. |
| 9 Stripe? | Stripe Sigma = separate **pro** tier — not orphan page. |
| 10 | **Delete as route** or merge; don’t leave orphan. |

---

### Money

#### `/wallet`
| # | Answer |
|---|--------|
| 1 Why exist? | Token balance management. |
| 2 Goal | Buy tokens, see ledger, transfer. |
| 3 Do first | Understand balance; add funds if low. |
| 4 Attention | **Current balance**, then ledger. |
| 5 Distracting | Multiple purchase UIs, stat cards duplicating dashboard. |
| 6 Exist? | **Yes** — Mercury/Stripe essential. |
| 7 Merge? | Do not merge; **link heavily from Home**. |
| 8 Nav? | **Keep** — but token in header **must link here** (Mercury). |
| 9 Mercury? | **Core** — **aligned**. |
| 10 Stripe? | Balance + transactions — **single Wallet**; no second “tokens” concept elsewhere. |

---

### Social

#### `/chat`, `/chat/dm/[userId]`
| # | Answer |
|---|--------|
| 1 Why exist? | Communication. |
| 2 Goal | Message friends/global. |
| 3 Do first | Read/send. |
| 4 Attention | Message thread. |
| 5 Distracting | Global vs DM as separate **pages** — OK technically, heavy in nav. |
| 6 Exist? | **Yes**. |
| 7 Merge? | **One Social inbox**: Friends | Global chat | DMs (Linear/Discord sidebar model). |
| 8 Nav? | **Demote** from 8-item header to **Social** or account menu. |
| 9 Linear? | Inbox is primary for comms products — here **play** should beat chat. |
| 10 | Stripe: support chat ≠ top nav — **demote**. |

#### `/friends/add`
| # | Answer |
|---|--------|
| 1 Why exist? | Find/add friends. |
| 2 Goal | Send friend request. |
| 3 Do first | Search username. |
| 4 Attention | Search + results. |
| 5 Distracting | Duplicates Friends on dashboard + friends dialog. |
| 6 Exist? | **Merge into Social**. |
| 7 Merge? | **Yes** — Social → Add friends. |
| 8 Nav? | Not in header today — **good**; don’t add. |
| 9 | Sub-screen — **yes**. |
| 10 | Part of Social hub. |

#### `/call`, `/call/[roomCode]`
| # | Answer |
|---|--------|
| 1 Why exist? | Video + friend games. |
| 2 Goal | Join room, play with friend on call. |
| 3 Do first | Enter code or accept invite. |
| 4 Attention | Call + match panel. |
| 5 Distracting | **Top-level nav** implies equal importance to Wallet. |
| 6 Exist? | **Yes** — feature. |
| 7 Merge? | **Social → Play with friends**; room via invite deep link. |
| 8 Nav? | **Remove from primary nav**; keep listener/invites. |
| 9 | Zoom is not Mercury nav — **deep link product**. |
| 10 | Invite-only entry, not daily driver nav item. |

---

### Compete

#### `/tournaments`, `/tournaments/create`, `/tournaments/[tournamentId]`
| # | Answer |
|---|--------|
| 1 Why exist? | Organized multi-match competition. |
| 2 Goal | Join/create bracket, play tourney matches. |
| 3 Do first | Browse open tournaments or create (host). |
| 4 Attention | Bracket, next match, registration. |
| 5 Distracting | Password gate as separate concept without onboarding. |
| 6 Exist? | **Yes** — **secondary product area**. |
| 7 Merge? | List + create under **`/compete`**; detail stays. |
| 8 Nav? | **One “Compete”** item, not equal to Wallet. |
| 9 Kalshi? | Events exist but portfolio first — **order Compete after Play/Activity**. |
| 10 | Stripe: complex products nested — **grouped**. |

---

### Venues (bar trivia) — separate job-to-be-done

#### `/bars`, `/bars/create`, `/bars/[barId]`, `/bars/[barId]/dashboard`, `/bars/[barId]/session/[sessionId]`
| # | Answer |
|---|--------|
| 1 Why exist? | B2B2C venue trivia. |
| 2 Goal | Player: find bar; Owner: run session. |
| 3 Do first | Player: join session; Owner: start session. |
| 4 Attention | **Active session** (player) / **Session control** (host). |
| 5 Distracting | Same words “bar” across **four URL roots** (`/bars`, `/bar`, `/session`). |
| 6 Exist? | **Yes** — likely **second product** or **mode**. |
| 7 Merge? | **One tree**: `/venues` (discover) + `/venues/manage/[id]` (host). |
| 8 Nav? | **“Bar Trivia” in main nav** forces every player to see B2B — **wrong default**. |
| 9 Stripe? | Stripe Connect = **separate dashboard** for connected accounts — **split host mode**. |
| 10 | **Venues** nav item OR join-via-QR only for players; **host app** or mode switch. |

#### `/bar/join`, `/bar/session/[sessionId]`, `/session/[sessionCode]`, `/demo-bar`
| # | Answer |
|---|--------|
| 1 Why exist? | Player join flows (QR, code). |
| 2 Goal | Enter trivia at venue. |
| 3 Do first | Scan/enter code → nickname → play. |
| 4 Attention | Code entry / active question. |
| 5 Distracting | Three parallel join paths. |
| 6 Exist? | **One canonical join flow**. |
| 7 Merge? | **`/join/[code]`** or **`/venues/join?code=`** — redirect legacy URLs. |
| 8 Nav? | **No nav** — QR/deep link only for players. |
| 9 | Event join links = Calendly/Stripe payment link — **landing, not nav**. |
| 10 | **demo-bar** = **delete in prod** IA. |

---

### Account

#### `/profile`, `/settings`
| # | Answer |
|---|--------|
| 1 Why exist? | Identity + preferences. |
| 2 Goal | View stats; change account. |
| 3 Do first | Settings if task-driven; profile if ego-driven. |
| 4 Attention | Profile: public stats; Settings: forms. |
| 5 Distracting | Achievements + stats duplicate matches/analytics. |
| 6 Exist? | **Yes**. |
| 7 Merge? | Optional **Account** shell with Profile | Settings | Stats tabs. |
| 8 Nav? | **Account menu only** — **correct today**. |
| 9 Stripe? | Settings nested — **aligned**. |
| 10 | Stats/analytics merge into Profile tab. |

---

### Internal / non-product (IA verdict: remove from product map)

| Route | Verdict |
|-------|---------|
| `/design-system` | Internal/dev catalog — not user IA |
| `/supabase-todos` | **Delete** from product |
| `/debug`, `/debug-games`, `/debug-matches` | **Delete** from product (admin tools elsewhere) |

---

## Navigation redesign

### Problem today
- **8 peer top-level items** — no grouping, no priority  
- **Dashboard + Games** — two entry points to play  
- **Matches** — history, while dashboard shows recent matches  
- **Live Call, Chat** — social at same tier as **Wallet**  
- **Bar Trivia** — venue B2B on every player’s nav  
- **Missing:** Activity aggregation, Social aggregation, Friends, Watch, Replays, Analytics  
- **Account menu duplicates** Games, Wallet  

### Recommended primary nav (player app)

**4 items + account (Stripe-like restraint):**

| Nav label | Contains | Replaces |
|-----------|----------|----------|
| **Home** | Overview (current dashboard) | Dashboard |
| **Play** | Game catalog, lobbies, queues | Games + parts of dashboard |
| **Activity** | Your matches, live spectate, replays | Matches, Watch, replays index |
| **Wallet** | Balance, buy, transfer, ledger | Wallet |

**Secondary (overflow “More” or footer of sidebar):**

| Label | Contains |
|-------|----------|
| **Compete** | Tournaments |
| **Social** | Friends, chat, DMs, call entry |
| **Venues** | Find bars / join (players); link to host setup |

**Account menu only:** Profile, Settings, Sign out — **remove duplicate Games/Wallet links**.

### Optional: host mode (Stripe Connect pattern)

When user owns a bar: toggle **“Player | Host”** → Host nav shows Sessions, QR, Staff, Rewards — **not** shown to pure players.

### Mobile
Same four primaries; **More** sheet for Compete, Social, Venues.

---

## Content hierarchy (what wins on each screen)

| Screen | L1 (dominant) | L2 | L3 (demote/hide) |
|--------|---------------|-----|------------------|
| Home | Balance + **Play now** | Your active match/queue | Community feed, friends |
| Play | Joinable matches | Game list | Marketing stats |
| Game hub | Matchmake / join open | Practice | Create tiers as advanced |
| Match | Game board | Stake/opponent | Social upsells |
| Activity | Filterable table | Live tab | Aggregate KPIs |
| Wallet | Balance | Ledger | Secondary stats |
| Compete | Open tournaments | Yours | Create (host) |
| Social | Threads | Friends list | Call (action) |
| Venues join | Session / question | Leaderboard | Bar marketing |

---

## Page hierarchy (depth)

```
Home
├── Play
│   └── [Game]
│       ├── Match (live)
│       ├── Create stake (step)
│       └── Practice (mode)
├── Activity
│   ├── [Match] → Replay
│   └── Live spectate
├── Wallet
├── Compete
│   └── [Tournament]
├── Social
│   ├── Chat / DM
│   └── Friends
└── Venues (optional)
    ├── Join (deep link)
    └── Manage (host)
```

**Max depth to complete core loop:** Home → Play → Game → Match = **4 taps** (acceptable).  
**Today:** Home → Games → Game → Create → Match = **5+** with parallel confusion.

---

## Interaction hierarchy

1. **Primary (global):** Play / matchmake  
2. **Primary (contextual):** Submit move, confirm stake, pay  
3. **Secondary:** Rematch, share replay, add friend  
4. **Tertiary:** Chat, call, profile peek  
5. **Forbidden primary:** Buy tokens **during** match (wallet is prep only)

Stripe rule: **one primary button per screen**. Today game hubs violate this (practice + 4 create tiers + join).

---

## Information density

| Area | Today | Target |
|------|-------|--------|
| Home | Medium-high; split with Games | High on **your** state; low on global |
| Play | Low (cards) | High (tables/lists) — Kalshi browse |
| Activity | Medium | High table — Stripe ledger |
| Match | Should be **low** (focus) | Minimal chrome |
| Wallet | Medium duplicated | High ledger, low KPI |

---

## Feature prioritization (product layers)

| Tier | Features | Nav |
|------|----------|-----|
| **P0 — Core** | Matchmaking, match play, wallet, activity history | Home, Play, Activity, Wallet |
| **P1 — Retention** | Friends, rematch, replays | Social (secondary) |
| **P2 — Growth** | Tournaments, spectate | Compete, Activity tab |
| **P3 — Vertical** | Bar trivia host/player | Venues / host mode |
| **P4 — Experimental** | Live call + game | Invite/deep link only |
| **P0 — Remove from IA** | Debug, todos, demo-bar, orphan analytics | — |

---

## Pages that should merge

| Merge into | Current routes |
|------------|----------------|
| **Home (thin)** + **Play (thick)** | `/dashboard` + `/games` (decide: dashboard = summary only) |
| **Play → [game] hub** | `/games/[id]/create`, `/games/[id]/play` as modes |
| **Activity** | `/matches`, `/watch`, replays list |
| **Social** | `/chat`, `/chat/dm/*`, `/friends/add`, friends panel |
| **Profile → Stats** | `/analytics` |
| **Venues join (one URL)** | `/bar/join`, `/session/[code]`, `/bar/session/[id]` (player path) |
| **Compete** | `/tournaments`, `/tournaments/create` (list + CTA) |

---

## Pages that should disappear (from user-facing IA)

| Route | Reason |
|-------|--------|
| `/supabase-todos` | Scaffold |
| `/debug`, `/debug-games`, `/debug-matches` | Not product |
| `/demo-bar` | Demo only |
| `/analytics` (as standalone) | Merge into Profile or Activity |
| **Conceptual duplicate home** | Either demote dashboard to summary **or** demote `/games` landing — **not both full hubs** |

---

## Recommended user flows

### Flow A — New user first stake (critical)
1. Sign up → **Home** (balance visible, empty activity)  
2. **Play** → pick game → **Game hub** → suggested default stake → **Match**  
3. Result → **Activity** row + prompt rematch  
4. Low balance → **Wallet** (blocking modal from Play, not random nav)

*Today:* sign-up → dashboard → user must guess Games vs dashboard quick actions vs game lobby tiers.

### Flow B — Returning player daily
1. **Home** → see active queue/match → one click resume  
2. If none → **Play** last game or open matches list  
3. **Wallet** only if balance blocks play  

*Today:* check dashboard, games, matches separately.

### Flow C — Friend play
1. **Social** → friend → Invite to match **or** Call  
2. Land in **Match** or call room — **not** header “Live Call” first  

*Today:* friends on dashboard + `/friends/add` orphan + Call in nav.

### Flow D — Tournament
1. **Compete** → join → tourney **Match** routes reuse `/match/[id]`  
2. Activity shows tourney badge  

*Today:* OK structure; nav weight too high vs daily loop.

### Flow E — Bar player (QR)
1. Scan QR → **Join** (no main nav) → nickname → session  
2. After session → optional “Create account” → Home  

*Today:* multiple join URLs; bar on main nav for everyone.

### Flow F — Bar host
1. **Host mode** → Venues manage → session → QR  
2. Never mixed with player **Wallet** nav  

*Today:* `/bars/create` separate visual product.

---

## Dashboard vs Games — decision required

**Option 1 (Mercury / Stripe):** **Home** is authoritative; **Play** is deep directory. Home shows balance, **one** active thing, 3 recent rows, CTA to Play.  
**Option 2 (Kalshi):** **Home** is portfolio + feed; **Browse** is separate but **secondary** in nav order.  

**Recommendation:** **Option 1.** Demote global feed on Home; merge catalog into **Play**; **delete parallel full lobby on Dashboard** (keep quick-start only).

---

## If Stripe built ChanceUS — summary diff

| Stripe would… | ChanceUS today… |
|---------------|-----------------|
| One overview | Dashboard + Games |
| One activity ledger | Matches + replays + watch scattered |
| Wallet always reachable from balance | Balance in header not linked (IA gap) |
| Group rare features | Flat 8-link nav |
| Separate Connect dashboard | Bar host mixed into player nav |
| No fake/demo surfaces in prod map | demo-bar, debug, todos |
| Deep links for edge flows | Call as top nav |
| Single join URL for events | 3+ bar join paths |

---

## Implementation note (non-UI)

This document is **IA only**. URL redirects, nav config, and route merges are **product decisions** to approve before the next migration phase. **Do not** apply visual migration until nav hierarchy is agreed — otherwise you will polish two homes and eight peers twice.

---

*End of product architecture review.*
