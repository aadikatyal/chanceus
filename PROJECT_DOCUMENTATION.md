# 📚 ChanceUS Project Documentation

## Quick Run/Deploy Notes

LOCAL DEVELOPMENT (QUICK START)

1. Install Dependencies
   Run: pnpm install

2. Set Environment Variables
   Create .env.local file in project root with:
   
   NEXT_PUBLIC_SUPABASE_URL=https://qhggmqttxbmuehugwbzi.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZ2dtcXR0eGJtdWVodWd3YnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyODMzODYsImV4cCI6MjA3MDg1OTM4Nn0.JRDx-BTayKoB7-_EdtcmKtgMWqAPs7wc0avQ0g0cGd0
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

3. Run Development Server
   Run: pnpm dev

4. Access Application
   Open: http://localhost:3000

PRODUCTION DEPLOYMENT (VERCEL)

1. Build Command
   Run: pnpm build

2. Environment Variables (Set in Vercel Dashboard)
   NEXT_PUBLIC_SUPABASE_URL=https://qhggmqttxbmuehugwbzi.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZ2dtcXR0eGJtdWVodWd3YnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyODMzODYsImV4cCI6MjA3MDg1OTM4Nn0.JRDx-BTayKoB7-_EdtcmKtgMWqAPs7wc0avQ0g0cGd0
   NEXT_PUBLIC_SITE_URL=https://chanceus.com

3. Supabase Redirect URLs (Configure in Supabase Dashboard)
   Site URL: https://chanceus.com
   Redirect URL: https://chanceus.com/auth/callback
   
   For local development, also add: http://localhost:3000/auth/callback

PREREQUISITES

- Node.js: Version 18+ (check with: node --version)
- Package Manager: pnpm
- Database: Supabase PostgreSQL database (already configured)
- Deployment: Vercel account (for production)

COMMON COMMANDS

Development:
pnpm dev              Start dev server
pnpm build            Build for production
pnpm start            Start production server
pnpm lint             Run linter

Package Management:
pnpm install          Install dependencies
pnpm add <package>    Add new package

TROUBLESHOOTING

Port Already in Use:
Run: lsof -ti:3000 | xargs kill -9

Build Errors:
Run: rm -rf .next node_modules
Then: pnpm install
Then: pnpm build

Environment Variables Not Working:
- Restart dev server after changing .env.local
- Verify variables are prefixed with NEXT_PUBLIC_ for client-side access

---

## Missing Features

### High Priority
1. **Spectator Mode**
   - Allow users to watch ongoing matches without participating
   - Real-time viewing of game state
   - Chat/commentary system for spectators
   - Reference: Mentioned in `REALTIME_IMPLEMENTATION.md`

2. **In-Game Chat System**
   - Direct messaging between players during matches
   - Emoji reactions
   - Chat history persistence
   - Reference: Mentioned in `REALTIME_IMPLEMENTATION.md`

3. **Replay System**
   - Watch completed matches
   - Match history playback
   - Share replay links
   - Reference: Mentioned in `REALTIME_IMPLEMENTATION.md`

4. **Advanced Analytics Dashboard**
   - Detailed game statistics per user
   - Win/loss trends
   - Performance metrics by game type
   - Leaderboards with filtering
   - Reference: Mentioned in `REALTIME_IMPLEMENTATION.md`

### Medium Priority
5. **Push Notifications**
   - Match invitations
   - Turn notifications
   - Tournament updates
   - Friend activity alerts

6. **Social Features**
   - Friend requests system (partially implemented)
   - User profiles with achievements
   - Social sharing of wins
   - Team/clan system

7. **Mobile App**
   - Native iOS/Android apps
   - Push notifications
   - Offline mode support

8. **Advanced Tournament Features**
   - Double elimination brackets
   - Round-robin tournaments
   - Custom tournament rules
   - Tournament scheduling

9. **Game Variants**
   - Different difficulty levels
   - Custom game rules
   - Time controls
   - Practice mode

10. **Payment Integration**
    - Real money transactions (if applicable)
    - Payment gateway integration
    - Withdrawal system
    - Transaction history

### Low Priority
11. **Achievement System**
    - Badges and trophies
    - Milestone rewards
    - Streak tracking

12. **Customization**
    - Avatar customization
    - Theme selection
    - Profile customization

13. **Localization**
    - Multi-language support
    - Regional settings
    - Currency conversion

---

## Known Bugs

### Critical Bugs

1. **Match Status Inconsistency**
   - **Location**: `app/games/page.tsx` (lines 234-256)
   - **Issue**: Matches with both players can remain in "waiting" status instead of transitioning to "in_progress"
   - **Workaround**: Force completion function exists but requires manual intervention
   - **Status**: Debug section visible in production (lines 347-363)
   - **Fix Needed**: Automatic match status transition when player2 joins

2. **Row Level Security (RLS) Issues**
   - **Location**: `scripts/disable-rls-temporarily.sql`, `scripts/disable-bar-rls-temporarily.sql`
   - **Issue**: RLS policies causing infinite recursion or blocking access to bar-related tables
   - **Workaround**: RLS temporarily disabled on multiple tables
   - **Status**: Security risk - needs proper RLS policy implementation
   - **Affected Tables**: `bars`, `bar_staff`, `bar_trivia_games`, `bar_trivia_sessions`, `bar_trivia_participants`, `bar_trivia_questions`, `bar_trivia_answers`, `bar_drink_rewards`

3. **Math Blitz Index Out of Bounds**
   - **Location**: `components/games/multiplayer-math-blitz.tsx` (lines 1026-1054)
   - **Issue**: `currentProblemIndex` can exceed `problems.length`
   - **Workaround**: Index correction logic exists but may cause data inconsistency
   - **Status**: Has error handling but root cause needs investigation

### Medium Priority Bugs

4. **Excessive Debug Logging**
   - **Location**: Throughout codebase (141 instances found)
   - **Issue**: Console.log statements left in production code
   - **Impact**: Performance and security concerns
   - **Fix**: Remove or replace with proper logging system

5. **Matchmaking Queue Expiration**
   - **Location**: `app/games/page.tsx` (lines 148-188)
   - **Issue**: Expired queues may not be cleaned up properly
   - **Status**: Manual cleanup may be required

6. **User Profile Fallback Logic**
   - **Location**: `lib/user-utils.ts`, `app/page.tsx` (lines 22-48)
   - **Issue**: Fallback user creation may not persist to database
   - **Impact**: Users may lose data on refresh

7. **Session Code Lookup Issues**
   - **Location**: `app/session/[sessionCode]/page.tsx`, `app/bar/join/page.tsx`
   - **Issue**: Multiple debug logs suggest session lookup problems
   - **Status**: May be resolved but needs verification

### Low Priority / Code Quality Issues

8. **Duplicate Match Queries**
   - **Location**: `app/games/page.tsx`
   - **Issue**: Multiple similar queries for matches (lines 52-124)
   - **Impact**: Performance - could be optimized

9. **Hardcoded Values**
   - **Location**: `app/games/page.tsx` (line 340)
   - **Issue**: Online users count is hardcoded/fake
   - **Impact**: Misleading user experience

10. **Debug UI in Production**
    - **Location**: `app/games/page.tsx` (lines 347-363)
    - **Issue**: Debug warning section visible to all users
    - **Fix**: Remove or gate behind admin flag

---

## Tournament Flow

### Overview
The tournament system supports single-elimination brackets for up to 100 players across all game types. See `TOURNAMENT_SYSTEM.md` for complete documentation.

### Current Flow

1. **Registration Phase**
   ```
   User → Create Tournament → Set Entry Fee → Players Register → Entry Fees Collected
   ```

2. **Bracket Generation**
   ```
   Tournament Starts → Assign Bracket Positions (1-100) → Generate First Round Matches
   ```

3. **Round Progression**
   ```
   Players Compete → Match Completes → Winner Advances → Loser Eliminated
   → All Matches Complete? → Generate Next Round → Repeat Until Winner
   ```

4. **Completion**
   ```
   Final Match Completes → Winner Receives Prize Pool → Tournament Status: Completed
   ```

### Technical Implementation

- **Database Tables**: `tournaments`, `tournament_participants`, `tournament_matches`
- **Auto-Advancement**: Handled by `TournamentAutoAdvance` component
- **Real-time Updates**: Supabase real-time subscriptions
- **Match Integration**: Uses existing `matches` table with `bet_amount: 0`

### Known Limitations

- Only single-elimination format
- No double-elimination or round-robin
- No tournament scheduling
- No pause/resume functionality
- Prize pool is winner-takes-all only

### Future Enhancements

- Double elimination brackets
- Round-robin tournaments
- Tournament scheduling
- Multiple prize tiers
- Spectator mode for tournaments

---

## Design References

### Design System

**Component Library**: shadcn/ui (New York style)
- **Config**: `components.json`
- **Base Color**: Neutral
- **CSS Variables**: Enabled
- **Icon Library**: Lucide React

**Styling Framework**: Tailwind CSS
- **Config**: `tailwind.config.js`
- **Custom Colors**: Background/foreground via CSS variables
- **Fonts**: Poppins (primary), Open Sans (secondary), JetBrains Mono (mono)

### Color Scheme

**Primary Colors**:
- Background: `gray-950` (dark theme)
- Primary Accent: `orange-500` (brand color)
- Secondary Accent: `blue-600/blue-500` (highlights)
- Success: `green-400`
- Warning: `yellow-400`
- Error: `red-500` (destructive)

**Gradient Overlays**:
- `bg-gradient-to-br from-blue-950/20 via-purple-950/10 to-transparent`

### Typography

- **Primary Font**: Poppins (weights: 300-800)
- **Secondary Font**: Open Sans (weights: 300-700)
- **Monospace**: JetBrains Mono (weights: 400-700)

### UI Patterns

1. **Cards**: Dark background (`bg-gray-900/80`) with border (`border-gray-800`)
2. **Buttons**: Multiple variants (default, destructive, outline, secondary, ghost, link)
3. **Forms**: Dark input backgrounds (`dark:bg-input/30`)
4. **Modals/Dialogs**: Radix UI components with dark theme
5. **Toasts**: Sonner toast notifications

### Layout Patterns

- **Max Width**: `max-w-7xl` for main content
- **Padding**: Responsive (`px-2 sm:px-4 lg:px-8`)
- **Grid**: Responsive grid layouts (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- **Spacing**: Consistent spacing scale (4, 6, 8, 12, etc.)

### Component Examples

**Game Cards**: 
- Image with overlay
- Game name and description
- Active matches count
- Online users indicator
- Action buttons

**Match Lists**:
- Player avatars
- Bet amounts
- Game type
- Status indicators
- Join/Action buttons

**Dashboard**:
- Stats cards
- Quick actions
- Recent matches
- Friends online
- Winning list

### Design Principles

1. **Dark Theme First**: All components designed for dark backgrounds
2. **Responsive**: Mobile-first approach with breakpoints
3. **Accessibility**: Focus states, ARIA labels, keyboard navigation
4. **Consistency**: Reusable component patterns
5. **Performance**: Optimized images, lazy loading

### Assets

- **Logo**: `public/chanceus-logo.png`, `public/chanceus-logo-golden.svg`
- **Game Images**: `public/4-in-a-row.JPG`, `public/math-blitz.JPG`, `public/trivia-blitz.JPG`
- **Placeholders**: Multiple placeholder images for users and content

---

## Developer Requirements

### Prerequisites

- **Node.js**: Version 18+ (check with `node --version`)
- **Package Manager**: pnpm (recommended) or npm
- **Database**: Supabase PostgreSQL database
- **Git**: For version control

### Environment Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd app
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Environment Variables**
   Create `.env.local` file (see `ENVIRONMENT_SETUP.md`):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Database Setup**
   - Run SQL scripts in `scripts/` directory in order:
     - `01-create-tables.sql` - Core tables
     - `02-enable-rls.sql` - Row Level Security
     - `03-create-functions.sql` - Database functions
     - `04-enable-realtime.sql` - Real-time subscriptions
     - `10-create-tournament-schema.sql` - Tournament tables
     - `11-enable-tournament-realtime.sql` - Tournament real-time

5. **Run Development Server**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

6. **Access Application**
   - Local: `http://localhost:3000`
   - Production: Configured in Vercel

### Key Dependencies

**Core Framework**:
- `next`: 15.2.4 (React framework)
- `react`: ^19 (UI library)
- `react-dom`: ^19

**Database & Auth**:
- `@supabase/supabase-js`: Latest
- `@supabase/ssr`: ^0.7.0
- `@supabase/auth-helpers-nextjs`: Latest

**UI Components**:
- `@radix-ui/*`: Component primitives
- `lucide-react`: ^0.454.0 (Icons)
- `tailwindcss`: ^3.4.18
- `class-variance-authority`: ^0.7.1

**Utilities**:
- `zod`: 3.25.67 (Validation)
- `date-fns`: 4.1.0 (Date handling)
- `react-hook-form`: ^7.60.0 (Forms)

### Project Structure

```
app/
├── api/              # API routes
├── auth/             # Authentication pages
├── bars/             # Bar management
├── chat/             # Chat functionality
├── dashboard/        # User dashboard
├── games/            # Game pages
├── matches/          # Match pages
├── tournaments/      # Tournament pages
└── wallet/           # Wallet/tokens

components/
├── ui/               # shadcn/ui components
├── games/            # Game components
├── dashboard/        # Dashboard components
├── navigation/       # Navigation components
└── tournaments/      # Tournament components

lib/
├── supabase/         # Supabase utilities
├── actions.ts        # Server actions
├── game-actions.ts   # Game-related actions
└── utils.ts          # Utility functions

hooks/
├── use-match-realtime.ts    # Real-time match hook
├── use-math-blitz.ts        # Math Blitz game hook
└── use-user-activity.ts     # User activity tracking

scripts/              # SQL and utility scripts
```

### Development Guidelines

1. **Code Style**
   - TypeScript strict mode
   - ESLint configuration
   - Prettier (if configured)

2. **Component Patterns**
   - Server Components by default
   - Client Components with `"use client"` directive
   - Server Actions for mutations

3. **Database Access**
   - Use `createClient()` from `@/lib/supabase/server` for server components
   - Use `createClient()` from `@/lib/supabase/client` for client components
   - Always handle errors and null cases

4. **Real-time Subscriptions**
   - Use `useMatchRealtime` hook for match updates
   - Clean up subscriptions in `useEffect` return
   - Handle connection errors gracefully

5. **Error Handling**
   - Try-catch blocks for async operations
   - User-friendly error messages
   - Log errors for debugging (remove in production)

6. **Testing**
   - Test locally with two browser windows/tabs
   - Verify real-time updates
   - Check console for errors

### Deployment

**Vercel Configuration**:
- Framework: Next.js
- Build Command: `pnpm build` or `npm run build`
- Output Directory: `.next`
- Environment Variables: Set in Vercel dashboard

**Supabase Configuration**:
- Set redirect URLs in Supabase dashboard
- Enable real-time for required tables
- Configure RLS policies
- Set up database triggers and functions

### Common Tasks

**Adding a New Game**:
1. Add game to `games` table
2. Create game component in `components/games/`
3. Add match interface integration
4. Update game actions in `lib/game-actions.ts`

**Adding a New Feature**:
1. Create database schema (if needed)
2. Add server actions in `lib/`
3. Create UI components
4. Add routing in `app/`
5. Update navigation if needed

**Debugging**:
- Check browser console for errors
- Verify Supabase real-time subscriptions
- Check database policies (RLS)
- Use debug pages: `/debug`, `/debug-games`, `/debug-matches`

### Security Considerations

1. **Row Level Security (RLS)**
   - Currently disabled on some tables (security risk)
   - Need to implement proper RLS policies
   - Test with different user roles

2. **Authentication**
   - Supabase Auth handles authentication
   - Check user session in server components
   - Protect API routes

3. **Input Validation**
   - Use Zod for form validation
   - Sanitize user inputs
   - Validate on both client and server

4. **Environment Variables**
   - Never commit `.env.local`
   - Use Vercel environment variables for production
   - Rotate keys if exposed

### Performance Optimization

1. **Database Queries**
   - Use select() to limit fields
   - Add indexes for frequently queried columns
   - Batch queries when possible

2. **Real-time Subscriptions**
   - Limit subscription scope
   - Clean up subscriptions
   - Debounce frequent updates

3. **Code Splitting**
   - Use dynamic imports for large components
   - Lazy load game components
   - Optimize images with Next.js Image

4. **Caching**
   - Use Next.js caching strategies
   - Cache static data
   - Revalidate when needed

### Troubleshooting

**Real-time Not Working**:
- Check Supabase dashboard for real-time settings
- Verify tables are added to real-time publication
- Check browser console for connection errors

**Authentication Issues**:
- Verify redirect URLs in Supabase
- Check environment variables
- Clear browser cookies/cache

**Database Errors**:
- Check RLS policies
- Verify table permissions
- Check database logs in Supabase dashboard

**Build Errors**:
- Clear `.next` directory
- Reinstall dependencies
- Check TypeScript errors

---

## Additional Resources

- **Tournament System**: See `TOURNAMENT_SYSTEM.md`
- **Real-time Implementation**: See `REALTIME_IMPLEMENTATION.md`
- **Environment Setup**: See `ENVIRONMENT_SETUP.md`
- **Scripts Security**: See `SCRIPTS_SECURITY.md`

---

**Last Updated**: Generated from codebase analysis
**Maintainer**: Development Team


