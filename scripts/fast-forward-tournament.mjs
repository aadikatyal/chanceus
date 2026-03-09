import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function completeCurrentRound(tournamentId, tournament, currentRound) {
  const { data: roundMatches, error: matchErr } = await supabase
    .from('tournament_matches')
    .select('*, matches(id, player1_id, player2_id, winner_id, status)')
    .eq('tournament_id', tournamentId)
    .eq('round_number', currentRound)

  if (matchErr || !roundMatches?.length) {
    return { error: matchErr?.message || 'no matches for round' }
  }

  for (const tm of roundMatches) {
    if (tm.is_bye || tm.status === 'completed') continue

    const m = tm.matches
    if (!m || m.status === 'completed') continue

    const winnerId = m.player2_id
      ? [m.player1_id, m.player2_id][Math.floor(Math.random() * 2)]
      : m.player1_id

    await supabase
      .from('matches')
      .update({
        status: 'completed',
        winner_id: winnerId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', tm.match_id)

    await supabase
      .from('tournament_matches')
      .update({ status: 'completed' })
      .eq('id', tm.id)

    console.log(`  match ${tm.match_id}: winner ${winnerId}`)
  }

  return { ok: true }
}

async function advanceRound(tournamentId) {
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single()

  if (tErr || !tournament) {
    return { error: 'tournament not found' }
  }

  if (tournament.status !== 'in_progress') {
    return { completed: true, tournament }
  }

  const currentRound = tournament.current_round

  const { data: currentRoundMatches, error: mErr } = await supabase
    .from('tournament_matches')
    .select('*, matches(id, player1_id, player2_id, winner_id, status)')
    .eq('tournament_id', tournamentId)
    .eq('round_number', currentRound)

  if (mErr || !currentRoundMatches?.length) {
    return { error: mErr?.message || 'no round matches' }
  }

  const allCompleted = currentRoundMatches.every(
    (tm) => tm.status === 'completed' || tm.is_bye
  )
  if (!allCompleted) {
    return { error: 'not all matches completed' }
  }

  const winners = []

  for (const tm of currentRoundMatches) {
    if (tm.is_bye) {
      const { data: byeMatch } = await supabase
        .from('matches')
        .select('player1_id')
        .eq('id', tm.match_id)
        .single()
      if (byeMatch) {
        winners.push({
          bracketPosition: tm.winner_bracket_position ?? tm.player1_bracket_position ?? 0,
          userId: byeMatch.player1_id,
        })
      }
      continue
    }

    const { data: match } = await supabase
      .from('matches')
      .select('winner_id')
      .eq('id', tm.match_id)
      .single()

    if (match?.winner_id) {
      winners.push({
        bracketPosition: Math.ceil((tm.bracket_position || 1) / 2),
        userId: match.winner_id,
      })

      const loserId =
        match.winner_id === tm.matches?.player1_id
          ? tm.matches?.player2_id
          : tm.matches?.player1_id
      if (loserId) {
        await supabase
          .from('tournament_participants')
          .update({ status: 'eliminated', round_eliminated: currentRound })
          .eq('tournament_id', tournamentId)
          .eq('user_id', loserId)
      }
    }
  }

  if (winners.length === 0) {
    return { error: 'no winners' }
  }

  if (winners.length === 1) {
    const winner = winners[0]
    const { data: winnerUser } = await supabase
      .from('users')
      .select('tokens')
      .eq('id', winner.userId)
      .single()

    if (winnerUser) {
      await supabase
        .from('users')
        .update({ tokens: (winnerUser.tokens || 0) + (tournament.prize_pool || 0) })
        .eq('id', winner.userId)
      await supabase.from('transactions').insert({
        user_id: winner.userId,
        type: 'win',
        amount: tournament.prize_pool || 0,
        description: `Tournament winner: ${tournament.name}`,
      })
    }

    await supabase
      .from('tournaments')
      .update({
        status: 'completed',
        winner_id: winner.userId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', tournamentId)

    await supabase
      .from('tournament_participants')
      .update({ final_rank: 1, status: 'eliminated' })
      .eq('tournament_id', tournamentId)
      .eq('user_id', winner.userId)

    console.log(`  tournament complete. winner: ${winner.userId}`)
    return { completed: true }
  }

  const nextRound = currentRound + 1
  const matchesPerRound = Math.floor(winners.length / 2)
  const byes = winners.length % 2
  const shuffled = shuffleArray(winners)

  for (let i = 0; i < matchesPerRound; i++) {
    const p1 = shuffled[i * 2]
    const p2 = shuffled[i * 2 + 1]
    if (!p1 || !p2) continue

    const { data: p1Rec } = await supabase
      .from('tournament_participants')
      .select('bracket_position')
      .eq('tournament_id', tournamentId)
      .eq('user_id', p1.userId)
      .single()
    const { data: p2Rec } = await supabase
      .from('tournament_participants')
      .select('bracket_position')
      .eq('tournament_id', tournamentId)
      .eq('user_id', p2.userId)
      .single()

    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .insert({
        game_id: tournament.game_id,
        player1_id: p1.userId,
        player2_id: p2.userId,
        bet_amount: 0,
        status: 'waiting',
      })
      .select()
      .single()

    if (matchErr || !match) {
      console.error('match create error:', matchErr)
      continue
    }

    await supabase.from('tournament_matches').insert({
      tournament_id: tournamentId,
      match_id: match.id,
      round_number: nextRound,
      bracket_position: i + 1,
      player1_bracket_position: p1Rec?.bracket_position ?? p1.bracketPosition,
      player2_bracket_position: p2Rec?.bracket_position ?? p2.bracketPosition,
      winner_bracket_position: i + 1,
      status: 'pending',
    })
  }

  if (byes === 1) {
    const byePlayer = shuffled[shuffled.length - 1]
    const { data: byeMatch, error: byeErr } = await supabase
      .from('matches')
      .insert({
        game_id: tournament.game_id,
        player1_id: byePlayer.userId,
        bet_amount: 0,
        status: 'completed',
        winner_id: byePlayer.userId,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (!byeErr && byeMatch) {
      const { data: byePart } = await supabase
        .from('tournament_participants')
        .select('bracket_position')
        .eq('tournament_id', tournamentId)
        .eq('user_id', byePlayer.userId)
        .single()

      await supabase.from('tournament_matches').insert({
        tournament_id: tournamentId,
        match_id: byeMatch.id,
        round_number: nextRound,
        bracket_position: matchesPerRound + 1,
        player1_bracket_position: byePart?.bracket_position ?? byePlayer.bracketPosition,
        is_bye: true,
        winner_bracket_position: byePart?.bracket_position ?? byePlayer.bracketPosition,
        status: 'completed',
      })
    }
  }

  await supabase
    .from('tournaments')
    .update({ current_round: nextRound })
    .eq('id', tournamentId)

  console.log(`  advanced to round ${nextRound}`)
  return { completed: false, nextRound }
}

async function main() {
  const [tournamentId] = process.argv.slice(2)
  if (!tournamentId) {
    console.error('usage: node scripts/fast-forward-tournament.mjs <tournament-id>')
    process.exit(1)
  }

  console.log(`fast-forwarding tournament ${tournamentId}...`)

  while (true) {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('status, current_round')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      console.error('tournament not found')
      process.exit(1)
    }

    if (tournament.status === 'completed') {
      console.log('tournament already completed.')
      break
    }

    if (tournament.status !== 'in_progress') {
      console.error('tournament must be started first (status:', tournament.status, ')')
      process.exit(1)
    }

    const currentRound = tournament.current_round
    console.log(`\nround ${currentRound}: completing matches...`)
    const completeResult = await completeCurrentRound(tournamentId, tournament, currentRound)
    if (completeResult.error) {
      console.error('complete round error:', completeResult.error)
      process.exit(1)
    }

    const advanceResult = await advanceRound(tournamentId)
    if (advanceResult.error) {
      console.error('advance error:', advanceResult.error)
      process.exit(1)
    }
    if (advanceResult.completed) {
      console.log('\ndone.')
      break
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
