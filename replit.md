# Football Mad - Replit Agent Guide

## Overview

Football Mad is a comprehensive football (soccer) news and fan platform designed to be a daily destination for football enthusiasts. The platform combines news, match coverage, team/player hubs, transfer rumors, injury tracking, Fantasy Premier League content, community features, and merchandise shopping. The core product philosophy prioritizes personalization through team following, trust indicators for transfer/injury news, and interconnected content where everything links together.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens, supporting light/dark themes via CSS variables
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints under `/api/` prefix
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod
- **Database**: PostgreSQL (connection via `DATABASE_URL` environment variable)

### Key Data Models
- **Teams**: Premier League clubs with colors, stadium, manager info
- **Players**: Linked to teams with position, nationality, stats
- **Articles**: News content with categories, tags, featured/trending flags
- **Matches**: Fixtures with home/away teams, scores, status, goalserveRound for round/matchday tracking
  - API: `/api/matches/day?date=YYYY-MM-DD&status=all|live|scheduled|fulltime&competitionId=xxx`
  - Priority ordering: UK leagues first, then Big 5 Europe, then UEFA, then others
- **Cup Progress**: FA Cup fixtures grouped by round
  - API: `/api/cup/progress?competitionId=1198&season=2025/2026`
  - Goalserve feed: `soccerfixtures/leagueid/{LEAGUE_ID}?json=true`
  - Verify with: `curl -sS "https://www.goalserve.com/getfeed/$GOALSERVE_FEED_KEY/soccerfixtures/leagueid/1198?json=true" | head -n 40`
  - **JavaScript gotcha**: Use `??` instead of `||` when 0 is a valid value (0 is falsy in JavaScript)
  - **Canonical 14-Round System** (order 1-14, anything else discarded):
    - Qualifying (1-6):
      1. Extra Preliminary Round
      2. Preliminary Round
      3. First Qualifying Round
      4. Second Qualifying Round
      5. Third Qualifying Round
      6. Fourth Qualifying Round
    - Proper (7-14):
      7. First Round
      8. Second Round
      9. Third Round
      10. Fourth Round
      11. Fifth Round
      12. Quarter-finals
      13. Semi-finals
      14. Final
  - **Fractional Round Mapping** (Goalserve → Canonical):
    - "1/128-finals" → First Round
    - "1/64-finals" → Second Round
    - "1/32-finals" → Third Round
    - "1/16-finals" → Fourth Round
    - "1/8-finals" → Fifth Round
  - **Sanity guards** (discard if over limit):
    - Quarter-finals > 8 matches
    - Semi-finals > 4 matches
    - Final > 2 matches
    - Fifth Round > 16 matches
    - Fourth Round > 24 matches
  - **Rule**: Any round that doesn't map to canonical 14 is DISCARDED
  - Debug flag: `DEBUG_CUP_ROUNDS=true` logs discarded rounds
  - **Accordion UI** (frontend):
    - Each round is a collapsible/expandable section
    - Default open: first non-completed round (has any match not FT/AET/PEN)
    - If all rounds completed, opens the latest round (highest order)
    - Header shows: round name, fixture count, status pill (Completed/In progress/Upcoming)
    - Expanded view shows ALL matches (no slicing/truncation)
- **EFL Cup (Carabao Cup)**: Goalserve competitionId 1199
  - API: `/api/cup/progress?competitionId=1199&season=2025/2026`
  - **Canonical 7-Round System** (order 1-7):
    1. First Round
    2. Second Round
    3. Third Round
    4. Fourth Round
    5. Quarter-finals
    6. Semi-finals
    7. Final
  - Same accordion UI and deduplication as FA Cup
  - Validation: `curl -sS "$DOMAIN/api/cup/progress?competitionId=1199&season=2025/2026" | node -e 'const d=require("/dev/stdin"); console.log("Rounds:", d.rounds.length); d.rounds.forEach(r=>console.log(r.order, r.name, r.matches.length));'`
- **DFB Pokal (Germany Cup)**: Goalserve competitionId 1226
  - API: `/api/cup/progress?competitionId=1226&season=2025/2026`
  - **Canonical 6-Round System** (user-friendly labels, order 1-6):
    1. First Round (mapped from "1/32-finals")
    2. Second Round (mapped from "1/16-finals")
    3. Round of 16 (mapped from "1/8-finals")
    4. Quarter-finals
    5. Semi-finals
    6. Final
  - **Design**: Goalserve uses fraction-style labels, we map to user-friendly names
  - Same accordion UI, deduplication, and empty round seeding as other cups
- **Europe Competitions (Tables > Europe tab)**:
  - API: `/api/europe/:slug?season=YYYY/YYYY`
  - **Champions League (UCL)**: Goalserve competitionId 1005
    - Uses new league-phase format (2024+ reform): 36 teams, 8 matchdays, single table
    - Standings: Top 8 advance to Round of 16, 9-24 go to Playoff Round, 25+ eliminated
    - Zone colors: Green (1-8), Blue (9-24), Red (25+)
  - **Europa League (UEL)**: Goalserve competitionId 1007 (not yet enabled)
  - **Conference League (UECL)**: Goalserve competitionId 18853 (not yet enabled)
  - Config: `client/src/lib/europe-config.ts`
  - Frontend component: `client/src/components/tables/europe-progress.tsx`
  - Backend endpoint: `/api/europe/:slug` in `server/routes.ts`
  - **Knockout round mapping** (Goalserve labels → canonical):
    - "knockout round play-offs" → "Knockout Play-offs" (order 1)
    - "1/8-finals" / "round of 16" → "Round of 16" (order 2)
    - "1/4-finals" / "quarter-finals" → "Quarter-finals" (order 3)
    - "1/2-finals" / "semi-finals" → "Semi-finals" (order 4)
    - "final" → "Final" (order 5)
  - **UX**: Removed nested scroll on matchday fixtures panel; fixtures now use page scroll
  - **RoundToggle navigation**: Unified prev/next controls for matchday/round navigation
    - Component: `client/src/components/shared/round-toggle.tsx`
    - Interface: `RoundInfo { key, label, startDate?, endDate?, matchesCount }`
    - Props: `labelType` ("Matchday" or "Matchweek"), `rounds`, `value`, `onChange`
    - Helper: `pickDefaultRound(rounds, latestRoundKey)` - prioritizes latestRoundKey, falls back to last round
    - Data-testid: `round-toggle`, `button-round-prev`, `button-round-next`, `text-round-label`
- **League Tables (Tables > Leagues tab)**:
  - API: `/api/league/:slug?season=YYYY/YYYY`
  - Returns: `{ standings, rounds, matchesByRound, latestRoundKey, latestScheduledRoundKey, latestActiveRoundKey }`
  - **Round Navigation**: Only Premier League (leagueId: 1204) shows matchweek-based navigation
    - PL: Full RoundToggle with "Matchweek X" navigation
    - Other leagues (Championship, League One, League Two, etc.): Simple chronological fixtures list with "Upcoming Fixtures" and "Recent Results" cards
  - Backend returns null for round metadata (latestRoundKey, defaultMatchweek, etc.) for non-PL leagues
  - Non-PL leagues: all fixtures in single "all" bucket instead of matchweek groupings
  - **Matchweek numbering** (Premier League only): Always 1-indexed (MW1, MW2, etc., never MW0)
    - Backend detects 0-indexed feeds and shifts all rounds by +1
    - Round parsing handles various formats: "2", "Matchweek 2", "Round 0", "MW5"
  - **Default selection algorithm** (cluster-around-now scoring):
    - Scoring window: now - 24h to now + 72h
    - Each round scored: (liveCount × 1000) + (inWindowCount × 10)
    - Postponed matches excluded from scoring
    - Tie-breaker: nearest kickoff to now wins
    - Fallbacks: next upcoming match across all rounds, then last round
    - This prevents single postponed fixtures weeks/months away from forcing early matchweeks
  - **URL sync**: Round changes update `?round=MWX` query parameter
  - **Date range display**:
    - Same day: show single date (e.g., "1 Feb")
    - Span ≤ 3 days: show range (e.g., "31 Jan – 2 Feb")
    - Span > 3 days: show "Various dates" (handles EFL rearranged fixtures)
  - **Scheduled status detection**: includes "scheduled", "ns", "notstarted", "fixture", "tbd", "time tbd", time formats
  - **Postponed status detection**: pstp, postponed, postp, susp, suspended, cancelled, canceled, abandoned, abn
  - **Status pills**: LIVE (with minute), HT, FT, PSTP only - scheduled matches show kickoff time instead
- **Transfers**: Rumor tracking with reliability tiers (A-D) and source attribution
- **Injuries**: Player injury status (OUT/DOUBTFUL/FIT) with expected return dates
- **Follows**: User-team relationships for personalized feeds
- **Posts/Comments**: Community content with reactions
- **Products/Orders**: E-commerce for merchandise
- **Subscribers**: Newsletter subscriptions with tags

### Build System
- **Development**: `tsx` for running TypeScript directly, Vite dev server with HMR
- **Production**: Custom build script using esbuild for server, Vite for client
- **Output**: Server bundle to `dist/index.cjs`, client assets to `dist/public/`

## External Dependencies

### Database
- PostgreSQL database required (provisioned via Replit)
- Connection string must be set in `DATABASE_URL` environment variable
- Schema migrations handled via `drizzle-kit push`

### Authentication
- Replit Auth via OpenID Connect
- Requires `ISSUER_URL`, `REPL_ID`, and `SESSION_SECRET` environment variables
- User sessions stored in PostgreSQL `sessions` table

### Third-Party Libraries
- **UI**: Radix UI primitives, Lucide icons, react-icons
- **Data**: date-fns for date formatting, embla-carousel for carousels
- **Forms**: react-hook-form with @hookform/resolvers

### Design System
- Font: Inter (loaded via Google Fonts)
- Color scheme: HSL-based CSS variables with primary green accent
- Responsive breakpoints following Tailwind defaults
- Custom elevation/shadow system for interactive states

### LOCKED: Player Availability Color Rules
**Medical Status (Treatment Room):**
- Returning Soon (75%) → AMBER
- Coin Flip (50%) → ORANGE
- Doubtful (25%) → RED
- Out (0%) → RED

**Additional Rules:**
- Suspended → RED
- Loaned/Transferred → GREY
- GREEN (100%) must NEVER appear in Treatment Room

**Color Meaning:**
- Red = unavailable
- Grey = informational only

### Ghost CMS Webhook Configuration
To enable automatic syncing when Ghost posts are published/updated:

1. **Environment Variables**:
   - `GHOST_WEBHOOK_SECRET` - Secret key for HMAC signature verification (set in Ghost webhook config)
   - `GHOST_WEBHOOK_ALLOW_INGEST_SECRET_FALLBACK` - Set to "true" to allow fallback to x-ingest-secret header

2. **Ghost Admin Setup**:
   - Go to Ghost Admin > Settings > Integrations > Add custom integration
   - Create webhook with:
     - Name: "Football Mad Sync"
     - Event: post.published (also add post.published.edited, post.unpublished, post.deleted)
     - Target URL: `https://your-domain.replit.app/api/webhooks/ghost`
     - Secret: Generate a secret and set it as GHOST_WEBHOOK_SECRET env var

3. **Supported Events**:
   - `post.published` - New post published
   - `post.published.edited` - Published post updated
   - `post.unpublished` - Post unpublished
   - `post.deleted` - Post deleted

4. **Manual Sync** (for testing/backfill):
   ```bash
   curl -X POST https://your-domain.replit.app/api/admin/sync/ghost \
     -H "x-ingest-secret: $INGEST_SECRET"
   ```