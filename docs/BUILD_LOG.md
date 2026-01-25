# Football Mad – Build Log

## Day 1 – Core Platform & Team Hub Foundations
Focus: News UX, URL architecture, Team Hub pages, routing stability

---

## News Platform

### URL-Driven Filter System
- URL parameters are the single source of truth for all `/news` filters
- Filters supported:
  - Teams
  - Competition
  - Content type
  - Time range
- Competition tabs update only the `comp` parameter
- Active filters persist when switching competitions
- Filter drawer syncs correctly with URL state
- Backend accepts team slugs and resolves them to database IDs
- Filtered views are set to `noindex`
- Canonical URLs point to base competition pages

Outcome:
A scalable, SEO-safe news system supporting deep linking and personalisation.

---

## News UX Improvements
- Improved news card spacing and hierarchy
- Clear visual distinction for:
  - Breaking
  - Editor’s Pick
  - Trending
- Improved mobile and desktop filter UX
- Added removable filter chips

---

## Article Social Sharing
- Added social share buttons to article pages:
  - WhatsApp
  - X (Twitter)
  - Facebook
  - Copy Link
- Share URLs use canonical article links
- Placement below article content and above related articles
- Verified functionality across platforms

---

## UI Polish (Elite Pass)
- Added subtle button lift and hover states
- Strengthened primary CTAs
- Maintained clean, modern football aesthetic

---

## Team Hub Pages

### Initial Team Hub Implementation
- Created team hub routes:
  - `/teams/[slug]`
- Header includes:
  - Team name
  - Stadium
  - Manager
  - Founded year
- Added Follow and Subscribe CTAs
- Default “Latest” feed pulls from main news logic

---

### Team Hub Sub-Navigation
Tabs added:
- Latest (default)
- Injuries
- Transfers
- Matches
- Fans

Routes:
- `/teams/[slug]`
- `/teams/[slug]/injuries`
- `/teams/[slug]/transfers`
- `/teams/[slug]/matches`
- `/teams/[slug]/fans`

---

### Routing Bug Fix – Latest Tab
Issue:
- Navigating away from Latest made it impossible to return
- URL updated but tab state and content did not

Fix:
- Removed reliance on `useParams`
- Derived active tab from `useLocation().pathname`
- URL is now the single source of truth

Result:
- Clicking “Latest” always routes to `/teams/[slug]`
- Tab highlight and content stay in sync

---

## SEO & URL Structure
- No `/latest` route created
- Latest is the default state of `/teams/[slug]`
- Prevents duplicate content
- Cleaner canonical URLs

---

## Day 1 Outcome
- Robust URL-first news system
- Fully functional Team Hub architecture
- Stable navigation across nested routes
- Strong SEO foundations

---

# Build Log — Day 2

## Scope
Team Hub (Injuries & Availability), FPL ingestion, Team metadata, Teams index polish, UI/UX consistency.

---

## Completed

### FPL Injury & Availability System
- Integrated FPL bootstrap-static API
- Ingested:
  - chance_of_playing_this_round
  - chance_of_playing_next_round
  - injury news + timestamps
- Normalised availability logic to mirror FPL website behaviour
- Prioritised *next round* chance where applicable

### Injury UI (Team Hub)
- Removed circular percentage badge
- Replaced with player avatar initials for consistency across site
- Percentage shown once in text only
- Implemented FPL-style colour coding:
  - 75% → Amber
  - 50% → Amber
  - 25% → Red
  - 0% → Red
- Added section grouping:
  - Returning soon (75%)
  - Coin flip (50%)
  - Out (0%)
  - Loans / Transfers
- Added filter tabs:
  - Overview
  - Coin flip (50%)
  - Doubtful (25%)
  - Out (0%)
  - Suspended
  - Loans / Transfers

### FPL Accuracy Fix
- Fixed mismatch where players showed 100% when FPL showed 75%
- Root cause: fallback logic when chance_of_playing_this_round was null
- Now aligned with official FPL display

---

## Team Metadata
- Updated Premier League teams for correct season:
  - Removed: Ipswich, Leicester, Southampton
  - Added: Burnley, Leeds, Sunderland
- Standardised display names (e.g. Bournemouth instead of AFC Bournemouth)
- Confirmed canonical slugs for all teams

### Stadium Naming (Sponsorship Fixes)
- Dean Court → Vitality Stadium
- Brentford Community Stadium → Gtech Community Stadium
- Brighton Community Stadium → American Express Stadium

### Manager & Stadium Sync
- Implemented Wikidata-powered team metadata sync job
- Sync only fills missing fields (does not overwrite)
- Manual overrides allowed where Wikidata lags or context differs

---

## Bugs Fixed
- Back-navigation crash on Team Hub:
  - `Cannot read properties of undefined (reading '0')`
  - Caused by unsafe string indexing on `team.name[0]`
  - Resolved with null-safe helper for team initials

---

## Status
✔ Rolled out across all Team Hub pages  
✔ Injuries tab now production-grade and FPL-consistent  
➡ Ready for Day 3 (Matches, Lineups, FPL overlays, SEO)

---

# BUILD LOG — Day 3

- Focus: Injuries system consolidation + global availability view
- Status: Core functionality complete, polish queued for Day 4

## What was built

- Implemented a global Injuries page in the main header using the same FPL feed and data logic already powering the Team Hub Injuries tab.
- Successfully aggregated all teams’ injury/availability data into a single consolidated view.
- Reused the existing injury card UI pattern (status badge, injury type, expected return, confidence bar, last updated).
- Maintained factual, feed-driven integrity — no editorial or inferred data added.
- Navigation label remains “Injuries” while page header was intentionally renamed to “Treatment Room”.

## What’s working well

- FPL feed ingestion is stable and scalable.
- Injury status filtering logic (Out / Doubtful / Fit etc.) behaves consistently across Team Hub and global view.
- Visual consistency between Team Hub Injuries and global Injuries page is strong.
- This establishes a single source of truth for injuries across the site.

## Known follow-ups (Day 4)

- UI polish and spacing refinements.
- Potential enhancements to sorting priority and grouping logic.
- Headshots integration (players + injuries) to improve visual scanning.
- Performance checks once data volume increases

---

# Day 5 – Build Log (All)

## Global Navigation & Sub-Navigation

### Standardised sub-navigation pattern site-wide:
- Grey background
- Tab-style items
- Active tab highlighted with a lozenge

### Confirmed Injuries as the gold-standard reference for:
- Layout
- Alignment
- Behaviour (desktop + mobile)

### Fixed News sub-navigation active lozenge bug (active state now renders correctly).

## Count Indicators

### Aligned count logic across sections:
- Moved away from mixed styles (green bubbles vs brackets).
- Counts now follow a single consistent convention across tabs.

## Filters (Desktop)

### Moved filters inline with sub-navigation across all applicable pages.

### Right-aligned filters to match Injuries pattern.

### Removed floating / detached filter UI.

### Ensured visual and behavioural consistency across:
- News
- Matches
- Transfers
- Injuries
- FPL

## Filters (Mobile)

### Sub-navigation now:
- Scrolls horizontally
- Uses full competition names (no abbreviations)
- Matches desktop lozenge styling

### Removed left-side fade from scrollable sub-nav (right fade retained).

### Filters and search now:
- Span full mobile width
- Match Injuries page behaviour

## News – Category & Tag System

### Refactored News cards to support entity-driven pills only:
- Competition
- Team
- Player

### Enforced max 3 pills on card view.

### Full article view now shows all matched pills.

### Removed legacy pills from News cards:
- Trending
- Transfers
- Pick
- Breaking
- Analysis

### Ensured PA Media tag matching flows cleanly into UI.

## Mobile Filter Flyout (News)

### Fixed keyboard auto-focus bug on open.

### Prevented scroll-collapse when keyboard appears.

### Simplified filter model:
- Removed Content Type, Time Range, Sort By (for now).
- Focused on:
- - Competition (via sub-nav)
- - Teams (filter drawer)
- - Player (future search input)

### Removed “Show X articles” confirmation pattern in favour of instant filtering.

## Cleanup & Polish

### Removed remaining legacy “Trending” pill from News cards.

### Confirmed mobile behaviour is stable and usable.

### Deferred league/team list refinement to Goalserve data feed integration.

--- 

# DAY 6 – BUILD LOG

Focus:
Navigation consistency, Matches UX polish, Transfers strategy, and introduction of the Tables section.

Completed Work:

## Navigation & UI Consistency (Site-wide)
- Audited News, Matches, Teams, Transfers, Injuries across desktop and mobile.
- Standardised:
  - Sub-navigation alignment rules (left-aligned on desktop, scrollable on mobile where applicable).
  - Filter positioning (right-aligned on desktop, centre-aligned on mobile).
  - Filter text alignment, font size, and icon usage.
- Removed inconsistent icons where they caused layout breakage (e.g. Injuries “Closest return” filter on desktop).
- Confirmed central alignment as preferred mobile scanning pattern.

## Matches Page
- Finalised filter order:
  - Competition → Kick-off time → Search team.
- Locked desktop vs mobile behaviour.
- Confirmed UX logic for live, upcoming, and completed fixtures.
- Placeholder data validated as structurally correct for Goalserve integration.

## Teams Page
- Added competition sub-navigation (mirroring News structure).
- Default state changed to “All” instead of “Premier League”.
- Simplified label from “All Competitions” → “All” for mobile clarity.
- Standardised search field styling across mobile and desktop.

## Transfers Strategy (Global vs FPL)
- Defined conceptual separation:
  - Global Transfers & Injuries = worldwide football data.
  - FPL Transfers & Injuries = Premier League–only, FPL-optimised view.
- Decided to park final placement until Goalserve + FPL data can be reviewed side by side.
- Identified UX issues on Transfers page:
  - Too many competing indicators (ticks, pills, confidence bars, sources).
  - Need to clarify hierarchy of information for users.

## Tables (New Main Navigation Tab)
- Added “Tables” as a main nav item.
- Built initial structure with:
  - Sub-nav: Leagues | Cups | Europe
  - Competition selector
  - Season selector
  - View selector (Overall / Home / Away etc.)
- Designed responsive table:
  - Desktop shows full columns (P, GD, Pts).
  - Mobile shows reduced essential columns.
- Removed redundant “All” stacking concept for leagues.
- Validated structure ahead of Goalserve standings data.

## Shop UX
- Identified missing cart feedback.
- Defined solution for global cart indicator badge + real-time updates.

Status:
- Navigation structure locked.
- Matches, Teams, Injuries UX locked.
- Transfers and FPL integration parked pending data review.
- Tables tab successfully scaffolded and ready for data.

---

# DAY 7 – BUILD LOG

## Goalserve API Foundation Layer

Goalserve (API)
   ↓
goalserveFetch()        ← ✅ DONE (pure fetch client)
   ↓
Normalisers / Parsers   ← NEXT
   ↓
Upserts into DB         ← AFTER
   ↓
Article/entity linking  ← LATER

---


## Championship Standings Integration

Championship standings now use the same live-refresh pipeline as Premier League.

### Dev Verification Steps
1. Go to `/tables` → click "Championship" tab
2. Open Network tab → confirm request URL includes:
   - `leagueId=1205`
   - `season=YYYY%2FYYYY` (e.g., `2025%2F2026`)
   - `autoRefresh=1`
3. (Optional) Trigger ingestion manually:
   ```
   curl -X POST "http://localhost:5000/api/jobs/upsert-goalserve-standings?leagueId=1205" \
     -H "x-sync-secret: YOUR_SECRET"
   ```
4. Table should populate or show "No standings snapshot found" if Goalserve has no data yet.

---


## League One & League Two Standings Integration

League One and League Two standings now use the same live-refresh pipeline as Premier League and Championship.

**goalserveLeagueId values (from `client/src/lib/league-config.ts`):**
- League One: `1206`
- League Two: `1197`

### Zones Configuration
- **League One:** Automatic Promotion (1-2), Playoffs (3-6), Relegation (21-24)
- **League Two:** Automatic Promotion (1-3), Playoffs (4-7), Relegation (23-24)

### Dev Purge + Force Re-ingest Commands

If you need to clear bad data and force a fresh ingest:

```bash
# League One - Purge
curl -sS -X POST \
  -H "x-sync-secret: $GOALSERVE_SYNC_SECRET" \
  "https://<replit-domain>/api/jobs/purge-standings?leagueId=1206&season=2025/2026"

# League One - Force reingest
curl -sS -X POST \
  -H "x-sync-secret: $GOALSERVE_SYNC_SECRET" \
  "https://<replit-domain>/api/jobs/upsert-goalserve-standings?leagueId=1206&force=1"

# League Two - Purge
curl -sS -X POST \
  -H "x-sync-secret: $GOALSERVE_SYNC_SECRET" \
  "https://<replit-domain>/api/jobs/purge-standings?leagueId=1197&season=2025/2026"

# League Two - Force reingest
curl -sS -X POST \
  -H "x-sync-secret: $GOALSERVE_SYNC_SECRET" \
  "https://<replit-domain>/api/jobs/upsert-goalserve-standings?leagueId=1197&force=1"
```

### Dev Verification Steps
1. Go to `/tables` → click "League One" or "League Two" tab
2. Open Network tab → confirm request URL includes:
   - `leagueId=1206` (L1) or `leagueId=1197` (L2)
   - `season=YYYY%2FYYYY` (e.g., `2025%2F2026`)
   - `autoRefresh=1`
3. Confirm legend shows: Automatic Promotion, Playoffs, Relegation (no Champions League / Europa)
4. Confirm left stripe colors match zone positions

---

## National League Support

National League (5th tier of English football) is now added to the Tables page.

**goalserveLeagueId:** `TODO_GOALSERVE_ID` (use preview endpoint to find correct ID)

### Zones Configuration
- **Promoted:** Position 1 (emerald)
- **Playoff Semi-final:** Positions 2-3 (amber)
- **Playoff Quarter-final:** Positions 4-7 (orange)
- **Relegation:** Positions 21-24 (red)

### Dev Preview Endpoint

Use this endpoint to verify Goalserve league metadata before ingesting:

```bash
# Preview standings metadata for a leagueId
curl -sS -H "x-sync-secret: $GOALSERVE_SYNC_SECRET" \
  "https://football-mad.replit.app/api/dev/goalserve/standings-preview?leagueId=XXXX"

# Expected response:
# {
#   "ok": true,
#   "leagueId": "XXXX",
#   "country": "England",
#   "leagueName": "National League",
#   "season": "2025/2026",
#   "stageCount": 1,
#   "teamCount": 24
# }
```

### Finding the Correct National League ID

1. Try candidate IDs using the preview endpoint
2. Look for: `country: "England"`, `leagueName: "National League"`, `teamCount: 24`
3. Once found, update `league-config.ts` with the correct ID

---

## Dev Competitions Search Endpoint

Search our synced competitions table to find Goalserve league IDs.

**Endpoint:** `GET /api/dev/competitions/search`

**Query params:**
- `q` - Name substring (case-insensitive)
- `country` - Country substring filter
- `limit` - Max results (default 50, max 100)

**Example:**

```bash
# Find National League in England
curl -sS "https://football-mad.replit.app/api/dev/competitions/search?q=national%20league&country=england"

# Find all English leagues
curl -sS "https://football-mad.replit.app/api/dev/competitions/search?country=england&limit=20"
```

**Response format:**

```json
[
  {
    "id": "...",
    "name": "National League",
    "country": "England",
    "goalserveCompetitionId": "1234",
    "type": "league"
  }
]
```

---

## Big Euro Leagues Standings

Added support for 4 major European leagues on the Tables page.

### Goalserve IDs Discovered

| League | Goalserve ID | Source Name |
|--------|--------------|-------------|
| La Liga | 1399 | Primera (Spain) |
| Serie A | 1269 | Serie A (Italy) |
| Bundesliga | 1229 | Bundesliga (Germany) |
| Ligue 1 | 1221 | Ligue 1 (France) |

### Zone Configurations

- **La Liga / Serie A**: CL 1-4, EL 5, ECL 6, Relegation 18-20
- **Bundesliga**: CL 1-4, EL 5, ECL 6, Relegation PO 16, Relegation 17-18
- **Ligue 1**: CL 1-3, EL 4, ECL 5, Relegation PO 16, Relegation 17-18

---

## FA Cup Support (Cups Tab)

Added FA Cup support under the "Cups" tab on `/tables`.

### Configuration

- Cup slug: `fa-cup`
- Goalserve Competition ID: `1198`
- Country: England

### API Endpoint

`GET /api/cup/progress?competitionId=1198&season=2025/2026`

Returns fixtures grouped by round:
```json
{
  "competitionId": "1198",
  "rounds": [
    {
      "name": "Third Round",
      "order": 3,
      "matches": [
        {
          "id": "...",
          "home": { "name": "Arsenal" },
          "away": { "name": "Bolton" },
          "score": { "home": 3, "away": 0 },
          "status": "FT"
        }
      ]
    }
  ]
}
```

### Verification

```bash
curl -sS "$DOMAIN/api/cup/progress?competitionId=1198&season=2025/2026" | head -n 80
```

---
