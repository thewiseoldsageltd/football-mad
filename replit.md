# Football Mad - Replit Agent Guide

## Overview
Football Mad is a comprehensive fan platform providing news, match coverage, team/player hubs, transfer rumors, injury tracking, Fantasy Premier League content, community features, and merchandise shopping. Its core purpose is to be a daily destination for football enthusiasts, emphasizing personalization, trustworthy information, and interconnected content. The project aims for a highly engaging and dynamic user experience, becoming a go-to platform for football fans.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 (TypeScript, Vite)
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: Shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS (custom design tokens, light/dark themes)

### Backend
- **Runtime**: Node.js (Express.js, TypeScript)
- **API Design**: RESTful (`/api/`)
- **Authentication**: Replit Auth (OpenID Connect, Passport.js)
- **Session Management**: PostgreSQL-backed sessions (`connect-pg-simple`)

### Data Layer
- **ORM**: Drizzle ORM (PostgreSQL dialect)
- **Schema**: Defined in `shared/schema.ts`
- **Validation**: Zod schemas (generated from Drizzle)
- **Database**: PostgreSQL

### Key Features and Data Models
- **Teams, Players, Articles**: Core entities for content and personalization.
- **Matches**: Fixtures with detailed status, supporting various statuses (live, scheduled, full-time). Prioritizes UK and top European leagues.
- **Cup Progress (FA Cup, EFL Cup, DFB Pokal)**: Standardized handling of cup competitions, mapping Goalserve data to canonical round systems (e.g., FA Cup's 14 rounds, EFL Cup's 7 rounds). Features accordion UI with round status and default opening logic.
- **Europe Competitions (UCL, UEL, UECL)**: Handles new league-phase formats for UCL, with structured standings and knockout round mapping. Features unified round navigation.
- **League Tables**: Displays league standings with matchweek-based navigation for Premier League, and chronological fixtures for other leagues. Includes sophisticated default matchweek selection based on activity and URL synchronization.
- **Transfers & Injuries**: Tracks rumors (reliability tiers) and player medical status with specific color-coding rules (e.g., Red for unavailable, Green never in Treatment Room).
- **News Sync**: Integrates with Ghost CMS via webhooks for automatic content updates and includes a background catch-up sync job for robustness.
- **Pagination**: Cursor-based pagination for news feeds using `sortAt|id` for efficient loading.

### Build System
- **Development**: `tsx` for backend, Vite for frontend (HMR).
- **Production**: esbuild for server, Vite for client.

## External Dependencies

### Database
- PostgreSQL (via `DATABASE_URL` environment variable).
- Drizzle Kit for migrations.

### Authentication
- Replit Auth (OpenID Connect).
- Environment variables: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`.

### Third-Party Libraries
- **UI**: Radix UI, Lucide icons, react-icons.
- **Data**: date-fns, embla-carousel.
- **Forms**: react-hook-form, @hookform/resolvers.

### Content Management
- **Ghost CMS**: For news and article content.
  - Webhook integration requires `GHOST_WEBHOOK_TOKEN` for authentication.
  - Supports `post.published`, `post.published.edited`, `post.unpublished`, `post.deleted` events.

### Design System
- **Font**: Inter (Google Fonts).
- **Color Scheme**: HSL-based CSS variables, primary green accent.
- **Responsiveness**: Tailwind CSS breakpoints.