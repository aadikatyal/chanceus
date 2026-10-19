import type { Metadata } from "next"
import Link from "next/link"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import PublicArticle from "@/components/public/public-article"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Standings · ChanceUS",
  description: "Public win-loss records from completed ChanceUS matches.",
}

export const revalidate = 300

type StandingRow = {
  rank: number
  name: string
  matches: number
  wins: number
  losses: number
  winRate: number
  streak: number
}

type ProfileRow = {
  id: string
  username: string | null
  display_name: string | null
  gamertag: string | null
}

function standingsReader() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && serviceKey) {
    return createSupabaseClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return null
}

async function loadStandings(): Promise<{ rows: StandingRow[]; playersWithMatches: number }> {
  if (!isSupabaseConfigured) return { rows: [], playersWithMatches: 0 }

  const supabase = standingsReader() ?? (await createClient())
  const { data: stats, error } = await supabase
    .from("user_statistics")
    .select("user_id, total_matches, total_wins, total_losses, win_rate, current_win_streak")
    .gt("total_matches", 0)
    .order("total_wins", { ascending: false })
    .order("win_rate", { ascending: false })
    .limit(25)

  if (error || !stats?.length) return { rows: [], playersWithMatches: 0 }

  const ids = stats.map((row) => row.user_id as string)
  const users = await supabase.from("users").select("id, username, display_name, gamertag").in("id", ids)
  const profiles = !users.error && users.data ? (users.data as ProfileRow[]) : null

  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const named = stats.filter((row) => byId.has(row.user_id as string))
  if (named.length === 0) return { rows: [], playersWithMatches: stats.length }

  const rows = named.map((row, index) => {
    const profile = byId.get(row.user_id as string)
    const name = profile?.gamertag || profile?.display_name || profile?.username || "Player"
    return {
      rank: index + 1,
      name,
      matches: Number(row.total_matches) || 0,
      wins: Number(row.total_wins) || 0,
      losses: Number(row.total_losses) || 0,
      winRate: Number(row.win_rate) || 0,
      streak: Number(row.current_win_streak) || 0,
    }
  })

  return { rows, playersWithMatches: stats.length }
}

export default async function StandingsPage() {
  const { rows, playersWithMatches } = await loadStandings()

  return (
    <PublicArticle
      eyebrow="Standings"
      title="Public records"
      lede="Standings list players who have finished at least one match. Order is wins, then win rate. A name appears when the account has a public username."
    >
      <section>
        <h2 className="text-base font-semibold text-[var(--chance-fg)]">What is counted</h2>
        <p className="mt-3">
          A completed match updates both players. Wins, losses, win rate, and the current streak come from those completed matches. A match still in a queue, or voided, is not a result. Token balance is not a rank. Buying tokens does not move you up this list.
        </p>
        <p className="mt-3">
          Win rate is wins divided by matches played, shown as a percent. The streak column is the current run of wins. It resets when you lose. The table shows up to 25 players and refreshes through the day as matches finish.
        </p>
        <p className="mt-3">
          How a win is decided depends on the game. Four in a Row is four connected pieces. Math Blitz uses a composite score across ten shared problems. Trivia Challenge sums the points from eight shared questions. The rules are on the{" "}
          <Link href="/guides" className="text-[var(--chance-brand)] hover:underline">
            guides
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-[var(--chance-fg)]">Current table</h2>
        {rows.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--chance-border)] text-xs uppercase tracking-[0.08em] text-[var(--chance-fg)]">
                  <th className="py-2 pr-3 font-medium">Rank</th>
                  <th className="py-2 pr-3 font-medium">Player</th>
                  <th className="py-2 pr-3 font-medium">Wins</th>
                  <th className="py-2 pr-3 font-medium">Losses</th>
                  <th className="py-2 pr-3 font-medium">Played</th>
                  <th className="py-2 pr-3 font-medium">Win rate</th>
                  <th className="py-2 font-medium">Streak</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.rank}-${row.name}`} className="border-b border-[var(--chance-border)]">
                    <td className="py-2.5 pr-3 text-[var(--chance-fg)]">{row.rank}</td>
                    <td className="py-2.5 pr-3 text-[var(--chance-fg)]">{row.name}</td>
                    <td className="py-2.5 pr-3">{row.wins}</td>
                    <td className="py-2.5 pr-3">{row.losses}</td>
                    <td className="py-2.5 pr-3">{row.matches}</td>
                    <td className="py-2.5 pr-3">{`${row.winRate.toFixed(1)}%`}</td>
                    <td className="py-2.5">{row.streak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3">
            {playersWithMatches > 0
              ? `${playersWithMatches} players have a completed match on record. Usernames are not public yet, so this table stays empty until display names can be read without exposing account email or token balances.`
              : "No completed matches are on the public record yet. The table fills after players finish games."}
          </p>
        )}
      </section>
    </PublicArticle>
  )
}
