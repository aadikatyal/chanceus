import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

// Create a singleton instance of the Supabase client for Client Components
// Enable real-time functionality with proper configuration
export const supabase = createClientComponentClient({
  realtime: {
    params: {
      eventsPerSecond: 5, // Reduced to prevent binding issues
      heartbeatIntervalMs: 30000, // Add heartbeat
      reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000) // Exponential backoff
    }
  }
})

// Export createClient function for compatibility
export const createClient = () => supabase

// Database types
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
  game_data?: any
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
  action_data?: any
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
  // Joined data
  sender?: User
  recipient?: User
}
