## Team Hub Navigation Prompt

"Update team navigation so the URL is the single source of truth.
Latest should route to /teams/[slug] and correctly highlight tab state
when navigating from /injuries or /transfers."

## News Page – URL-driven Filters

Make URL parameters the single source of truth for the /news page.
- Sync teams, content type, time range, and competition to the URL
- Competition tabs should only update `comp` and preserve other filters
- Team selection should work with "My Teams" enabled and fall back to manual selection
- Show active filter chips with individual removal
- Clear filters should preserve current competition
- Backend must accept team slugs and resolve to IDs
- SEO: filtered views should be noindex, canonical points to base competition

## News UX Improvements

- Improve visual hierarchy of news cards
- Make filters clearer on mobile and desktop
- Ensure selected filters are visible and removable
- Keep interactions fast and URL-consistent

## Article Social Sharing

Add share buttons to article pages:
- WhatsApp
- X (Twitter)
- Facebook
- Copy Link

Buttons should:
- Use the canonical article URL
- Work on desktop and mobile
- Sit below article content, above related articles

## Elite UI Upgrade

Apply subtle but premium UI upgrades:
- Stronger buttons with hover + lift
- Slightly bolder colours where appropriate
- Maintain clean, modern football aesthetic
- No visual clutter

## Team Hub Pages

Create team hub pages at:
- /teams/[slug]

Include:
- Header with team name, stadium, manager, founded year
- Follow + Subscribe actions
- Default "Latest" feed pulling from news logic

## Team Hub Sub Navigation

Add tabs under team header:
- Latest (default)
- Injuries
- Transfers
- Matches
- Fans

Routes:
- /teams/[slug]
- /teams/[slug]/injuries
- /teams/[slug]/transfers
- /teams/[slug]/matches
- /teams/[slug]/fans

## Team Hub Routing Fix – Latest Tab

Problem:
- Navigating away from Latest made it impossible to return
- URL changed but tab state + content did not update

Fix:
- Stop relying on useParams for tab state
- Use useLocation and derive active tab from pathname
- URL must be the single source of truth

Outcome:
- Clicking "Latest" always routes to /teams/[slug]
- Tab highlight and content always stay in sync

## SEO Decision – No /latest Route

- Latest is the default hub state
- No /latest route created
- Cleaner URLs
- Avoids duplicate content
- Canonical remains /teams/[slug]

---

# Prompts — Day 2

## FPL Injury Ingestion
Build an ingestion job using the official FPL bootstrap-static API.
Store chance_of_playing_this_round, chance_of_playing_next_round, injury news, and timestamps.
Mirror FPL logic exactly.
Prioritise next round chance where relevant.
Do not invent percentages.

---

## Injury UI Refactor
Replace percentage badges with player avatar initials.
Show percentage only once in the injury text.
Apply FPL-style colour coding.
Group players into Returning Soon, Coin Flip, Out, Loans/Transfers.

---

## Injury Filtering UX
Remove “Lowest %” sorting.
Implement tabs:
- Overview
- Coin flip (50%)
- Doubtful (25%)
- Out (0%)
- Suspended
- Loans / Transfers
Each tab must update counts dynamically.

---

## Team Metadata Sync
Create a secure job to fetch manager and stadium data from Wikidata.
Only fill missing fields.
Do not overwrite manually curated data.
Allow future manual overrides per team.

---

## Stadium Naming Overrides
Apply manual overrides for:
- Vitality Stadium (Bournemouth)
- Gtech Community Stadium (Brentford)
- American Express Stadium (Brighton)

---

## Crash Fix Prompt
Fix runtime error caused by unsafe string indexing in team hub.
Add null-safe helper for team initials.
Ensure back navigation never crashes even during hydration/loading.

---

## Guiding Principle
If Football Mad disagrees with FPL or official club reality, Football Mad is wrong.
Match fan expectations first.

---

# Prompts — Day 3

## Matchday Page – Core Structure (Pre / Post Match)

You are building a Matchday page for Football Mad.

Each Matchday page must support two states:
- Pre-match (fixture-focused)
- Post-match (result-focused)

The page should dynamically switch based on whether kickoff has passed.

Pre-match state should prioritise:
- Predicted lineups
- Formation shapes
- Injuries & suspensions
- Kickoff time and venue

Post-match state should prioritise:
- Final score and result
- Goals, assists, cards
- Confirmed lineups
- Key stats and momentum

Design with a modular layout so additional blocks can be added later without restructuring the page.

---

## Lineups – Two-Team, Side-by-Side Concept

Create a Predicted Lineups section with two teams displayed side by side.

Layout concept:
- Left side: Home team
- Right side: Away team

Each team should show:
- Team badge + formation
- Starting XI (list format)
- Substitutes listed beneath

Lineup rows must be clickable and link to a full matchday lineup view.

---

## Lineups – Four-Column Desktop Layout (Early Iteration)

Desktop layout requirement for predicted lineups:

Four columns across the page:
[Home team list] [Home pitch graphic] [Away pitch graphic] [Away team list]

Each pitch graphic should:
- Be portrait orientation
- Match the height of the 11-player list
- Show correct formation spacing

This layout is desktop-only and may collapse differently on mobile.

---

## Lineups – Refined Three-Column Layout (Final Direction)

Refactor predicted lineups into a three-column layout.

Desktop:
[Home XI list] [Full pitch view with both teams] [Away XI list]

Rules:
- Home team appears at the TOP of the pitch
- Away team appears at the BOTTOM of the pitch
- Pitch is the visual divider between teams
- All three columns must be equal height within the section container

The pitch must not exceed the height of the team lists or substitutes.

---

## Text Alignment & Visual Boundaries (Away Team)

Improve visual balance of the away team lineup list.

Requirements:
- Away team player names must be right-aligned
- Shirt numbers must appear on the RIGHT of player names
- Shirt numbers should form a clean vertical visual boundary
- Avoid text appearing too close to the pitch column

---

## Goalkeeper Position Logic (Important Rule)

Important lineup logic rule:

Goalkeepers must always be rendered in the goalkeeper position on the pitch graphic, regardless of shirt number.

Do NOT assume the goalkeeper wears shirt number 1.
Position placement must be driven by role (GKP), not shirt number.

---

## Responsive Behaviour – Mobile Layout

Define responsive behaviour for predicted lineups.

Desktop:
[Home XI] [Pitch View] [Away XI]

Mobile:
- Combine Home XI and Away XI into a single card
- Home team on the left, Away team on the right
- Pitch view displayed either ABOVE or BELOW the combined XI card

Ensure spacing, alignment, and hierarchy remain clear on small screens.

---

## Pitch View Constraints & Scaling

Pitch view constraints:

- Pitch height must NEVER exceed the height of the surrounding lineup lists
- Pitch must stretch to fill the vertical space of the section container
- Avoid pitch overflow that pushes substitutes out of view
- Pitch should feel like a divider, not the dominant element

---

## Player Headshots (Lineups + Injuries)

Enhancement request: add player headshots.

Requirements:
- Circular headshots
- Used in:
  - Pitch lineup view
  - Injury cards
- Fallback to initials if no headshot is available
- Headshots must not break alignment or spacing
- Prioritise clarity over size (small but recognisable)

---

## Global Injuries Page (Treatment Room)

You are building Football Mad (React + Tailwind).

Create a GLOBAL injuries page linked from the main header nav item "Injuries".

Rules:
- Keep navigation label as "Injuries"
- Page H1 must be "Treatment Room"
- Subtitle: "Player injuries and expected returns (FPL-powered)"

Data:
- Reuse the same Fantasy Premier League (FPL) feed and logic used in the Team Hub Injuries tab
- Aggregate injuries across ALL teams
- Single source of truth for player availability

UI:
- Filters: All, Out, Doubtful, Fit
- Team dropdown (default: All Teams)
- Injury cards reused from Team Hub design

Sorting:
- Default order: Out → Doubtful → Returning Soon → Fit

---

## Internal Guiding Principle (Implicit Prompt)

If a feature reaches ~90–95% quality but the remaining issues are visual precision rather than logic, pause iteration and plan to hand off to a developer for refinement.

---

# Football Mad – Day 4 Prompt Log (Summary)

Below is a consolidated list of prompts used or prepared on Day 4:

Treatment Room taxonomy split (Medical vs Discipline vs Transfers)

Colour logic correction (75% ≠ green)

Overview sorting logic (availability-first)

Navigation hierarchy (tabs vs filters)

Team dropdown deduplication & PL-only filtering

Header icon consistency (News & Teams)

Mobile scrollable sub-navigation implementation

URL taxonomy implementation (site-wide)

News routing logic (Option A – entity vs article resolution)

Slug collision prevention logic

Central URL helper module creation (urls.ts)

(All prompts were consolidated into final “single source of truth” prompts where applicable.)

---

====================================
DAY 4 – PROMPT LOG (FULL)
====================================

------------------------------------
1) TREATMENT ROOM TAXONOMY (LOCK)
------------------------------------
We need to lock and implement a final availability taxonomy across Football Mad using the existing FPL feed.

GOAL
- Treatment Room must be medical-only.
- Overview count must always equal the sum of medical states.
- Loaned / Transferred must be removed from Treatment Room and moved to Transfers.
- Suspended must be removed from Treatment Room and moved to a new Discipline tab.

FINAL TAXONOMY
Medical (Treatment Room):
- Returning Soon (75%)
- Coin Flip (50%)
- Doubtful (25%)
- Out (0%)

Discipline:
- Suspended (v1 only)

Squad:
- Loaned / Transferred (Transfers tab)

IMPLEMENTATION
- Update Team Hub Injuries tab to show only the 4 medical states + Overview.
- Add Discipline tab showing Suspended players.
- Ensure Treatment Room Overview reconciles exactly.
- Apply same logic to global /injuries page (H1 = Treatment Room).

------------------------------------
2) COLOUR LOGIC FIX (PL-ALIGNED)
------------------------------------
BUG / REGRESSION FIX – Treatment Room colours

LOCKED COLOUR MAPPING:
- Returning Soon (75%) → AMBER
- Coin Flip (50%) → ORANGE
- Doubtful (25%) → RED
- Out (0%) → RED
- Suspended → RED
- Loaned / Transferred → GREY

RULES:
- Green (100%) must NEVER appear in Treatment Room.
- Red always means unavailable.
- Grey is informational only.

Apply consistently across:
- Team Hub → Treatment Room
- Global /injuries page

------------------------------------
3) OVERVIEW SORTING LOGIC
------------------------------------
UPDATE: Treatment Room – Overview ordering

Goal:
Overview should show players closest to returning first (FPL-first logic).

Default sorting on Overview:
1) Availability DESC:
   - 75% → 50% → 25% → 0%
2) expected_return_date ASC (earliest first)
3) updated_at DESC
4) player_name ASC (fallback)

This logic applies only to Overview.
Individual tabs retain their own natural ordering.

------------------------------------
4) FILTER & SORT LOGIC CLEANUP
------------------------------------
Update Treatment Room filters and sorting.

- Rename “Most relevant” → “Closest return”.
- Make “Closest return” the DEFAULT sort option.
- Keep sort options:
  - Closest return
  - Last updated
  - Highest confidence
  - Lowest confidence

Tabs define STATE.
Sort dropdown defines ORDER.
Do not duplicate responsibilities.

------------------------------------
5) TEAM FILTER CLEANUP (PL ONLY)
------------------------------------
Clean Team dropdown to remove duplicates and non-Premier League clubs.

Allow ONLY the following (CODE – Name):
- ARS – Arsenal
- AVL – Aston Villa
- BOU – Bournemouth
- BRE – Brentford
- BHA – Brighton
- BUR – Burnley
- CHE – Chelsea
- CRY – Crystal Palace
- EVE – Everton
- FUL – Fulham
- LEE – Leeds
- LIV – Liverpool
- MCI – Man City
- MUN – Man Utd
- NEW – Newcastle
- NFO – Nottingham Forest
- SUN – Sunderland
- TOT – Tottenham
- WHU – West Ham
- WOL – Wolves

Implementation:
- Add canonical team mapping layer.
- Deduplicate all aliases (e.g. “Brighton and Hove Albion”).
- Exclude Championship and relegated teams.

------------------------------------
6) HEADER ICON CONSISTENCY
------------------------------------
UI consistency fix for main navigation pages.

Problem:
News and Teams pages are missing header icons.

Requirements:
- Add newspaper/article icon to News header.
- Add shield/squad icon to Teams header.
- Match size, alignment, colour, and spacing used on other pages.
- Icons must be decorative (aria-hidden).

------------------------------------
7) MOBILE SUB-NAVIGATION (SCROLLABLE)
------------------------------------
Refine Treatment Room navigation layout.

Mobile (<=768px):
- Sub-navigation tabs must be ONE horizontal row.
- Tabs must scroll horizontally (no wrapping).
- Use flex + overflow-x: auto.
- Active tab must remain clearly highlighted.
- Optional fade gradient to hint scroll.

Desktop:
- Keep current layout unchanged.

------------------------------------
8) FILTER PLACEMENT & ALIGNMENT
------------------------------------
Navigation hierarchy update.

Desktop:
- Tabs left-aligned.
- Filters right-aligned on SAME horizontal row.

Mobile:
- Tabs first.
- Filters stacked below tabs.
- Filters must be full-width and match nav container width.

------------------------------------
9) CENTER “ALL TEAMS” DROPDOWN TEXT
------------------------------------
UI polish request.

- Center-align “All Teams” text horizontally and vertically.
- Keep caret icon right-aligned.
- Maintain layout consistency across desktop and mobile.

------------------------------------
10) FINAL URL TAXONOMY (SITE-WIDE)
------------------------------------
Implement final Football Mad URL structure (pre-launch).

CANONICAL ROUTES

/news
/news/:slug        (entity OR article)

/teams
/teams/:teamSlug
/teams/:teamSlug/injuries
/teams/:teamSlug/discipline
/teams/:teamSlug/transfers
/teams/:teamSlug/matches
/teams/:teamSlug/fans
/teams/:teamSlug/squad

/players/:playerSlug

/matches
/matches/:competitionSlug      (listing only)
/matches/:matchSlug            (home-vs-away-YYYY-MM-DD)

/injuries
/transfers
/fpl
/community
/shop
/shop/:teamSlug

------------------------------------
11) NEWS ROUTING LOGIC (OPTION A)
------------------------------------
Use flat URLs for News entity pages.

Routing for /news/:slug:
- If slug matches known entity (team or competition):
    → render NewsEntityIndexPage
- Else:
    → render NewsArticlePage

Slug collision prevention:
- Maintain reservedSlugs set:
  - All entity slugs
  - System words (search, page, rss, feed, amp, category)
- If article slug collides, append “-news” or “-report”.

------------------------------------
12) SLUG RULES & HELPERS
------------------------------------
Slug rules:
- Team: fan-friendly, lowercase, hyphenated
  Examples:
    man-city
    man-utd
    nottingham-forest
    wolves
- Player: bukayo-saka
- Match: home-vs-away-YYYY-MM-DD

Create central URL helper module (urls.ts):
- newsIndex()
- newsEntity(slug)
- newsArticle(slug)
- teamsIndex()
- teamHub(teamSlug)
- teamSection(teamSlug, section)
- playerProfile(playerSlug)
- matchesIndex()
- matchesCompetition(slug)
- matchDetail(home, away, date)
- injuriesGlobal()
- transfersGlobal()
- fplHub()
- communityHub()
- shopHub()
- shopTeam(teamSlug)

Replace all hardcoded links with helpers.

====================================
END – DAY 4 PROMPTS
====================================

---

