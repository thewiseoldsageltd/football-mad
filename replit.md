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