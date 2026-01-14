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

# Football Mad – Day 4 Build Log (FULL)

Day: 4
Focus: Treatment Room (Global Injuries), Navigation polish, URL taxonomy, SEO foundations
Status: Completed

## Overview

Day 4 focused on locking availability taxonomy, perfecting the Treatment Room UX, and defining the final URL structure for the entire platform before launch. This was a foundational day with long-term SEO, scalability, and FPL relevance in mind.

The session moved from data correctness → UX hierarchy → navigation polish → URL architecture → publishing workflow alignment.

## Key Areas Worked On

### Treatment Room Taxonomy (Locked)

- Confirmed medical-only Treatment Room logic.
- Final medical states:
- Returning Soon (75%)
- Coin Flip (50%)
- Doubtful (25%)
- Out (0%)
- Overview tab must always reconcile exactly to the sum of the four states.

Explicit exclusions:
- Loaned / Transferred → Transfers tab
- Suspended → Discipline tab (separate availability pillar)

### Colour System (Premier League aligned)

- Returning Soon (75%) → Amber
- Coin Flip (50%) → Orange
- Doubtful (25%) → Red
- Out (0%) → Red
- Suspended → Red
- Loaned / Transferred → Grey
- Green (100%) explicitly banned from Treatment Room

### Overview Sorting Logic (Global Injuries)

- Default ordering changed to match Team Hub logic.
- Sorted by usefulness to FPL managers, not severity.

Locked order:
- Returning Soon (75%)
- Coin Flip (50%)
- Doubtful (25%)
- Out (0%)

Secondary sorting:
- Expected return date (earliest first)
- Last updated
- Alphabetical fallback

### Navigation & Filters UX

- Sub-navigation (Overview / Returning / Coin Flip / Doubtful / Out) confirmed as primary navigation.
- Filters confirmed as secondary modifiers, not state selectors.

Changes made:
- “Most relevant” renamed to “Closest return”
- Default sort set to “Closest return”
- Filters moved onto the same horizontal row as sub-nav on desktop.

On mobile:
- Sub-nav is single-line, horizontally scrollable
- Filters stacked below nav
- Filters are full-width and aligned to nav container

### Team Filter Data Hygiene

- Deduplicated team list.
- Removed non–Premier League clubs.
- Removed long-name duplicates (e.g. “Brighton and Hove Albion”).
- Canonical short, fan-friendly names locked.

### Header Consistency

- Added missing header icons for:
- News
- Teams
- All main navigation pages now have a consistent visual header language.

### URL Taxonomy (Major Foundation Work)

- Confirmed site is pre-launch / not indexed, allowing URL changes without redirects.
- Designed and implemented final URL structure across the entire platform.
- Removed internal logic (gameweeks, IDs) from URLs.
- Adopted entity-first, canonical URLs.

### News Publishing Workflow (PA Media)

- Confirmed existing PA Media → Ghost automation remains valid.
- Articles published once at a single canonical URL.
- Categories/entities act as indexes, not URL parents.
- No category paths added to article URLs.

## Day 4 Outcome

- Treatment Room UX and logic fully locked.
- Navigation hierarchy refined and polished.
- URL architecture finalised and implemented.
- Publishing workflow preserved with zero rewrite.
- Platform now has a stable, scalable foundation for launch.

---

