# Environment Variables Setup

## Local Development (.env.local)

Create a `.env.local` file in your project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://qhggmqttxbmuehugwbzi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZ2dtcXR0eGJtdWVodWd3YnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyODMzODYsImV4cCI6MjA3MDg1OTM4Nn0.JRDx-BTayKoB7-_EdtcmKtgMWqAPs7wc0avQ0g0cGd0
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Stripe (for wallet token purchases / test checkout)
# Get keys from https://dashboard.stripe.com/apikeys
# Use Test mode (sk_test_...) for testing to avoid real charges
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
# Required for in-page Apple Pay / card (Payment Element). Use pk_test_... in test mode.
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx

# Optional: tournament gate password (tournaments page). If unset, defaults to Ca$ino.
# NEXT_PUBLIC_TOURNAMENT_GATE_PASSWORD=your-secret-password
```

## Vercel Production

Add these environment variables in your Vercel dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=https://qhggmqttxbmuehugwbzi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZ2dtcXR0eGJtdWVodWd3YnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyODMzODYsImV4cCI6MjA3MDg1OTM4Nn0.JRDx-BTayKoB7-_EdtcmKtgMWqAPs7wc0avQ0g0cGd0
NEXT_PUBLIC_SITE_URL=https://chanceus.com

# Optional: tournament gate password (if you change it from the default)
# NEXT_PUBLIC_TOURNAMENT_GATE_PASSWORD=your-secret-password
```

## Supabase Configuration

### Redirect URLs

In your Supabase dashboard, set these redirect URLs:

```
Site URL: https://chanceus.com
Redirect URL: https://chanceus.com/auth/callback

(For local development, also add: http://localhost:3000/auth/callback)
```

### Sign in with Apple (optional)

To enable **Sign in with Apple**:

1. In Supabase: **Authentication → Providers → Apple** → enable and add your Apple Service ID, Team ID, Key ID, and private key (from Apple Developer).
2. In [Apple Developer](https://developer.apple.com): create a Services ID, enable Sign in with Apple, and add your redirect URL (e.g. `https://<project-ref>.supabase.co/auth/v1/callback`).

## After Setup

1. **Restart your local dev server**: `pnpm dev`
2. **Test locally**: Should redirect to `http://localhost:3000/auth/callback`
3. **Test on Production**: Should redirect to `https://chanceus.com/auth/callback`

## How It Works

- **Local development**: Uses `http://localhost:3000` for OAuth callbacks
- **Production**: Uses `https://chanceus.com` for OAuth callbacks
- **Config file**: Centralizes URL logic in `lib/config.ts`
- **Automatic**: No code changes needed when switching environments
