import WalletRail from "@/components/dashboard/wallet-rail"
import FriendsRail from "@/components/dashboard/friends-rail"
import LiveMatchesRail from "@/components/dashboard/live-matches-rail"
import WinningList from "@/components/dashboard/winning-list"

type HomeRailProps = {
  userId: string
  tokens: number
}

export default function HomeRail({ userId, tokens }: HomeRailProps) {
  return (
    <div className="chance-rail-stack">
      <WalletRail userId={userId} initialTokens={tokens} />
      <FriendsRail />
      <LiveMatchesRail />
      <div className="chance-premium-card p-4 sm:p-[1.125rem]">
        <WinningList />
      </div>
    </div>
  )
}
