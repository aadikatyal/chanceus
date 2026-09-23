import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

function createBrowserSupabaseClient(): SupabaseClient {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    realtime: {
      params: {
        eventsPerSecond: 5,
      },
    },
  })
}

/** Browser Supabase client — use @supabase/ssr so OAuth PKCE matches /auth/callback. */
export const supabase = createBrowserSupabaseClient()

export const createClient = () => supabase

export interface User {
  id: string
  username: string
  email: string
  display_name?: string
  gamertag?: string
  avatar_url?: string
  tokens: number
  total_games_played: number
  total_games_won: number
  win_rate: number
  created_at: string
  updated_at: string
}

export interface Game {
  id: string
  name: string
  description?: string
  min_bet: number
  max_bet: number
  is_active: boolean
  created_at: string
}

export interface Match {
  id: string
  game_id: string
  player1_id: string
  player2_id?: string
  bet_amount: number
  status: "waiting" | "in_progress" | "completed" | "cancelled"
  winner_id?: string
  game_data?: unknown
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  match_id?: string
  type: "bet" | "win" | "loss" | "bonus"
  amount: number
  description?: string
  created_at: string
}

export interface MatchHistory {
  id: string
  match_id: string
  user_id: string
  action_type: string
  action_data?: unknown
  timestamp: string
}

export interface Message {
  id: string
  sender_id: string
  content: string
  message_type: "match" | "global" | "dm" | "tournament"
  match_id?: string
  tournament_id?: string
  recipient_id?: string
  is_read: boolean
  created_at: string
  sender?: User
  recipient?: User
}
