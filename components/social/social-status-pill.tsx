import type { FriendPresenceStatus } from "@/components/social/social-hub-types"

const LABEL: Record<FriendPresenceStatus, string> = {
  offline: "Offline",
  idle: "Idle",
  away: "Away",
  searching: "Searching",
  in_match: "In match",
  in_tournament: "In tournament",
  spectating: "Spectating",
  in_voice: "In voice",
}

const MOD: Record<FriendPresenceStatus, string> = {
  offline: "chance-social-presence--off",
  idle: "chance-social-presence--idle",
  away: "chance-social-presence--away",
  searching: "chance-social-presence--search",
  in_match: "chance-social-presence--live",
  in_tournament: "chance-social-presence--tourney",
  spectating: "chance-social-presence--spec",
  in_voice: "chance-social-presence--voice",
}

export function presenceLabel(status: FriendPresenceStatus) {
  return LABEL[status]
}

export function SocialStatusPill({ status }: { status: FriendPresenceStatus }) {
  return <span className={`chance-social-presence ${MOD[status]}`}>{LABEL[status]}</span>
}
