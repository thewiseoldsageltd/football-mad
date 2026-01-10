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
- **Matches**: Fixtures with home/away teams, scores, status
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