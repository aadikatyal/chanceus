# Social hub review

Flagship route: `/chat` · presentation only · chat APIs unchanged.

---

## Before vs after

| Area | Before | After |
|------|--------|--------|
| Hero | Generic “see who’s online” + 3 CTAs | Living-floor copy, present / live / searching pills, compact Queue · Add · Voice |
| Pulse | Repeated live + “Match completed” + chat snippets | Deduped competitive events: tournament open/live, friend banked tokens, friend queued, streak, win-rate board, one announcement, one featured live table |
| Friends | Online/offline pills | Rich presence: In match, Searching, Idle, Away + WR / streak / game + Spectate / Message / Invite |
| Live | Empty “check back” or thin vs line | Empty CTA to Play; populated: names, game, entry, elapsed clock, Watch |
| LFM | Per-player list | Per-game lanes: searching count, est. wait, avg stake, Join → queue |
| DMs | Name + preview | Presence dot, timestamp, unread badge (`is_read`) |
| Voice | Static room names | Join + honest “0 in room / no speakers” (no fake occupancy) |
| Party | One-liner empty | Premium empty + Start a room |
| Mobile | Stacked three columns | Tabs: Friends · Activity · Chat · More |
| Motion | Page jump on chat load (fixed earlier) | 160–200ms hover lift + staggered card enter |

---

## UX improvements

1. **Three questions stay first:** hero stats + pulse + friends presence.
2. **Pulse earns its height** — unique kinds, icons, timestamps, no repeated “Match completed”.
3. **Empty states push Play**, not dead air.
4. **LFM is a queue board**, not a contact list.
5. **Mobile is tabbed**, not a 2,000px stack.

---

## Interaction improvements

- Friend rows: hover lift, mini-actions always visible.
- Pulse rows: kind-colored icon tiles, click-through to match / tournament / Play / DM.
- Live Watch + LFM Join use existing routes only.
- Global chat still `ChatWindow` + `sendMessage`; pane-only scroll (no document jump).
- Realtime refresh on matches / queue / messages.

---

## Screenshots to capture

- [ ] Desktop full hub — light + dark
- [ ] Pulse with mixed event kinds
- [ ] Friends: in match + searching + idle
- [ ] Live empty vs populated
- [ ] LFM empty vs multi-game lanes
- [ ] DMs with unread badge
- [ ] Mobile: Friends / Activity / Chat / More tabs
- [ ] Global chat send (no page jump)

---

## Remaining opportunities

- Spectator counts (no API).
- Typing indicators (no API — not faked).
- Voice occupancy (rooms link to `/call`; counts stay 0 until occupancy exists).
- Party invite inbox (no invite table).
- “New rank” / daily challenge (no rank/challenge models).
- In-tournament presence (no participant join on this query).
- Suggested friends is a public-user sample, not graph-based.

---

## Remaining technical debt

- `last_seen` / `is_read` depend on existing columns; if RLS hides them, presence/unread degrade gracefully.
- Win streak is “recent completed wins in the fetched slice,” not a stored streak.
- Estimated wait is derived from lane size (`18 + n*8`s), not matchmaker telemetry.
- `LiveMatchesRail` on Home is still the older rail; Social uses `LivePanel` with richer fields.
- Chat inner list still uses shadcn `Card` under `appearance="chance"`.
