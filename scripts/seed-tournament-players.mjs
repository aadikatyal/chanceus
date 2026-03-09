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

async function main() {
  const [tournamentId, desiredCountArg] = process.argv.slice(2)
  const desiredCount = Number(desiredCountArg || 25)

  if (!tournamentId) {
    console.error('usage: node scripts/seed-tournament-players.mjs <tournament-id> [count]')
    process.exit(1)
  }

  console.log(`seeding up to ${desiredCount} players into tournament ${tournamentId}...`)

  const { data: existing, error: existingError } = await supabase
    .from('tournament_participants')
    .select('id, user_id')
    .eq('tournament_id', tournamentId)

  if (existingError) {
    console.error('error fetching existing participants:', existingError)
    process.exit(1)
  }

  const already = existing?.length || 0
  const toCreate = Math.max(0, desiredCount - already)

  console.log(`already have ${already} participants, need to add ${toCreate}`)

  if (toCreate === 0) {
    console.log('nothing to do')
    process.exit(0)
  }

  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('entry_fee, prize_pool')
    .eq('id', tournamentId)
    .single()

  if (tErr || !tournament) {
    console.error('could not load tournament:', tErr)
    process.exit(1)
  }

  const createdUserIds = []
  const sharedPassword = 'tournament-bot-dev-only-change-me'

  for (let i = 0; i < toCreate; i++) {
    const label = already + i + 1
    const email = `tournament_bot_${label}@example.com`
    const username = `tournament_bot_${label}`
    const displayName = `Tournament Bot ${label}`

    let userId
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: sharedPassword,
      email_confirm: true,
      user_metadata: { username, display_name: displayName },
    })

    if (authErr?.code === 'email_exists' || authErr?.status === 422) {
      // User already exists from a previous run - look up by username in public.users
      const { data: existingUser, error: lookupErr } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single()
      if (lookupErr || !existingUser) {
        console.error('error looking up existing user', label, lookupErr)
        continue
      }
      userId = existingUser.id
    } else if (authErr || !authUser?.user) {
      console.error('error creating auth user', label, authErr)
      continue
    } else {
      userId = authUser.user.id
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({
        username,
        display_name: displayName,
        tokens: 1_000_000,
      })
      .eq('id', userId)

    if (updateErr) {
      console.error('error updating user tokens', label, updateErr)
    }

    createdUserIds.push(userId)

    const { error: partErr } = await supabase
      .from('tournament_participants')
      .insert({
        tournament_id: tournamentId,
        user_id: userId,
        status: 'registered',
      })

    if (partErr) {
      console.error('error inserting participant for user', userId, partErr)
    } else {
      console.log(`registered bot ${label} (${userId})`)
    }
  }

  const totalParticipants = already + createdUserIds.length
  const newPrizePool = totalParticipants * (tournament.entry_fee || 0)

  const { error: prizeErr } = await supabase
    .from('tournaments')
    .update({ prize_pool: newPrizePool })
    .eq('id', tournamentId)

  if (prizeErr) {
    console.error('error updating prize pool (non-fatal):', prizeErr)
  } else {
    console.log(`updated prize pool to ${newPrizePool} tokens for ${totalParticipants} participants`)
  }

  console.log('done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

