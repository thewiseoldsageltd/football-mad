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

# Day 5 – Prompt Log (All)

## Navigation Consistency Prompt

- Standardise sub-navigation styling and behaviour across all primary sections.
- Align filter placement with Injuries page.

## News Mobile Refinement Prompt

- Expand abbreviated competition labels.
- Remove left-side fade from scrollable sub-nav.
- Simplify filter categories to match real data capabilities.

## Entity Pill Refactor Prompt

- Restrict News card pills to:
- - Competition
- - Team
- - Player
- Remove all legacy category pills.
- Preserve full pill set on article pages.

## Mobile Filter UX Prompt

- Prevent keyboard auto-focus on filter open.
- Remove confirmation CTA (“Show X articles”).
- Ensure smooth single-scroll experience.

## Final Cleanup Prompt

- Identify and remove remaining legacy “Trending” pill.
- Verify mobile stability post-fix.


# Day 5 - Prompts in Full 

## Global Navigation & Sub-Navigation Consistency (Desktop)

- Prompt

You are designing a football media website called Football Mad.

Standardise the sub-navigation system across all main sections:
News, Matches, Teams, Transfers, Injuries, FPL, Community, Shop.

Desktop rules:
- Sub-navigation uses a grey background bar
- Tabs are horizontally aligned
- The active tab is highlighted using a rounded lozenge
- Typography, spacing, and height must be identical across all sections
- The Injuries page is the reference implementation

Remove any section-specific variations and ensure the pattern is reusable as a shared component.

--- 

## Count Indicator Standardisation

- Prompt

Standardise how counts are displayed in sub-navigation tabs across the site.

Currently, some sections use:

- Bracketed counts (e.g. Overview (108))
- Green notification bubbles

Choose one consistent approach and apply it everywhere:

- News
- Matches
- Transfers
- Injuries
- FPL

The count must feel informational, not like a notification alert.

--- 

## Filters – Desktop Alignment & Placement

- Prompt

Refactor all filter controls so they sit on the same horizontal row as the sub-navigation, aligned to the right-hand side.

Rules:

- No floating or detached filter buttons
- Filters must visually belong to the sub-navigation system
- Spacing and alignment must match the Injuries page exactly

Apply this pattern consistently across:

- News
- Matches
- Transfers
- Injuries
- FPL

---

## Mobile Sub-Navigation Behaviour

- Prompt

Update mobile sub-navigation behaviour site-wide.

Rules:

- Sub-navigation must scroll horizontally (left → right)
- Use the same lozenge active state as desktop
- Do NOT abbreviate labels (e.g. use “Premier League”, not “PL”)
- Tabs should size naturally based on content

Visual affordance:

- Keep fade-out on the right side only
- Remove fade-out on the left side, as the default position cannot scroll left
- Use the Injuries page mobile implementation as the reference.

---

## News – Category Model Refactor (Core Day 5 Decision)

- Prompt

Refactor the News section to be driven by real football entities, not editorial categories.

Navigation model:

- Competition = sub-navigation (Premier League, Championship, etc.)
- Team = filter drawer
- Player = filter search input

Remove / hide the following filters for now:

- Content Type
- Time Range
- Sort By

Reasoning:

- These filters are not yet functionally supported
- News discovery should mirror the existing Football Mad tag system powered by PA Media

The UI should not expose non-functional options.

---

## News – Mobile Filter Flyout UX Fix

- Prompt

Fix the mobile News filter flyout UX.

Current issues:

- Keyboard auto-opens when filter opens
- This collapses the team list and creates a scroll-within-scroll experience

Required behaviour:

- Filter drawer opens without triggering the keyboard
- Team list is scrollable and usable before typing
- Search input only focuses when explicitly tapped

Ensure a single, smooth vertical scroll experience.

---

## News – Filter Confirmation Logic

- Prompt

Remove the “Show X articles” confirmation button from the News filter drawer.

New behaviour:

- Filters apply immediately on selection
- Content updates reactively as Competition / Team / Player filters change

This should feel like sorting, not a form submission.

---

## News – Pills (Card View vs Article View)

- Prompt

Implement strict rules for category pills in the News section.

Card view:

- Display a maximum of 3 pills

Pills must only represent:

- Competition
- Team
- Player

Article view:

- Display all pills associated with the article
- Pills are sourced from PA Media tag matching

Pills must be clickable and consistent across views.

---

## Remove Legacy Editorial Pills

- Prompt

Remove all legacy editorial pills from News cards and headers, including:

- Trending
- Pick
- Breaking
- Analysis
- Transfers (as a category)

These should not appear as navigational pills.

Editorial status may still exist internally, but must not surface as UI categories.

---

## News – Breaking Badge Cleanup

- Prompt

Remove the standalone “Breaking” lozenge that appears below the sub-navigation on the News page.

Breaking status should be expressed only within article cards, not as a persistent UI element.

---

## Final News Cleanup Pass

- Prompt

Perform a final audit of the News section and remove any remaining legacy UI elements, including:

- Residual “Trending” pills
- Mixed pill styles
- Inconsistent tag ordering

Ensure all News cards strictly follow the new entity-driven model.

---

## Forward-Looking Data Note (Non-Blocking)

- Prompt

Note for future iteration:

- League and team lists will later be driven by the Goalserve Soccer Data Feed
- Current static lists are acceptable placeholders
- UI should be flexible enough to support deeper competition hierarchies

---

# DAY 6 – PROMPT LOG

## Matches UX Refinement
Prompt used to:
- Reorder filters (Competition → Kick-off time → Search team).
- Align desktop vs mobile behaviour consistently.
- Preserve Goalserve-ready structure.

## Navigation Consistency Audit
Prompt used to:
- Standardise sub-navigation alignment rules.
- Fix mobile vs desktop inconsistencies.
- Remove conflicting icons and font discrepancies.

## Teams Page Structure Update
Prompt used to:
- Add competition sub-navigation.
- Default to “All”.
- Simplify labels for mobile UX.

## Transfers Strategy Exploration
Prompt used to:
- Analyse user priorities on the Transfers page.
- Identify information hierarchy issues.
- Evaluate global vs FPL separation.

## Tables Tab Scaffold
Prompt used to:
- Add Tables to main navigation.
- Create Leagues / Cups / Europe sub-nav.
- Build responsive table layout with placeholders.
- Match existing navigation and filter patterns.

# Cart Indicator (Shop)
Prompt used to:
- Add global cart badge indicator.
- Sync with cart state.
- Update in real time across desktop and mobile.
- Optional toast feedback on add-to-cart.

Status:
- All prompts executed cleanly.
- Reusable prompt patterns established for future tabs (FPL, Community, Shop).

---

# DAY 6 — FULL PROMPT LOG

## Navigation Consistency (Site-wide Audit & Fix)

You are updating the Football Mad web app.

TASK:
Standardise navigation, sub-navigation, and filter behaviour across all tabs:
News, Matches, Teams, Transfers, Injuries.

GLOBAL RULES:
- Desktop:
  - Sub-navigation left-aligned
  - Filters right-aligned
  - No filter stacking
- Mobile:
  - Sub-navigation scrollable left → right where overflow exists
  - Remove left fade on initial state (only show right fade)
  - Filters stacked full-width and centre-aligned
  - No autofocus on inputs

FIXES TO APPLY:
- Ensure filter text, font size, and spacing are consistent across pages
- Remove icons where they cause layout breakage (e.g. Injuries “Closest return”)
- Ensure search inputs visually match dropdown filters
- Ensure icon + text filters never stack on desktop

DO NOT:
- Change navigation structure
- Redesign components
- Alter data logic

GOAL:
Achieve visual and behavioural consistency across all tabs.

---

## Matches Page — Filter Order & UX Polish

You are refining the Matches page UI.

TASK:
Reorder filters and lock consistent behaviour across desktop and mobile.

FILTER ORDER (ALL BREAKPOINTS):
1. Competition
2. Kick-off time
3. Search team

REQUIREMENTS:
- Desktop:
  - Filters right-aligned
  - No vertical stacking
- Mobile:
  - Filters stacked
  - Centre-aligned text
  - Search icon aligned right

DO NOT:
- Change existing card layout
- Change match ordering logic
- Add new filters

GOAL:
Align filter order with user mental model:
Context → Time → Precision.

---

## Teams Page — Competition Structure & Defaults

You are updating the Teams page.

TASK:
Align Teams navigation with News-style competition structure.

IMPLEMENT:
- Add competition sub-navigation (same style as News)
- Remove competition dropdown filter
- Default state: “All”
- Change label from “All Competitions” → “All”

DESKTOP:
- Sub-navigation left-aligned
- Search teams filter right-aligned

MOBILE:
- Sub-navigation scrollable
- Search teams input centre-aligned
- Search icon aligned right

DO NOT:
- Change team cards
- Add new filters

GOAL:
Make Teams navigation consistent with the rest of the site and mobile-friendly.

---

## Transfers Strategy — Global vs FPL Separation (Structural)

You are reviewing Transfers and Injuries placement.

TASK:
Do NOT move Transfers or Injuries under FPL.

DEFINE:
- Transfers & Injuries are GLOBAL features
- FPL consumes filtered views (Premier League only)

RULES:
- Same data structures
- Same card components
- Only filters and emphasis change inside FPL

DO NOT:
- Duplicate logic
- Fork components
- Hide global content

GOAL:
Football-first architecture with FPL as an interpretation layer.

---

## Transfers Page — UX Simplification & Crest Introduction

You are redesigning the GLOBAL Transfers page.

GOAL:
Simplify information hierarchy and improve scanability.

PRIMARY SIGNALS (IN ORDER):
1. Status (Confirmed / Rumour)
2. Player name
3. From → To
4. Move type (Loan / Permanent)
5. Confidence (rumours only)
6. Source
7. Fee / Date (secondary)

IMPLEMENT:
- Remove green tick/check icons entirely
- Use ONE status pill only
- Show confidence bars ONLY for rumours
- Group move type + fee together
- Move source to footer in muted style

ADD:
- Team crests next to club names
- Neutral card backgrounds
- No club-colour cards

OPTIONAL:
- Subtle destination club accent (2–3px left border, low opacity)

DO NOT:
- Add rumour logic to Goalserve data
- Overuse colour

GOAL:
Reduce noise, increase trust, and improve scanning speed.

---

## Tables Tab — Initial Scaffold (Main Nav Addition)

You are adding a new main navigation tab: TABLES.

ROUTE:
- /tables

TOP-LEVEL SUB-NAV:
- Leagues
- Cups
- Europe

DEFAULT:
- Leagues → Premier League

FILTERS:
- Season (default current)
- View (Overall / Home / Away)

DESKTOP:
- Sub-nav left-aligned
- Filters right-aligned

MOBILE:
- Sub-nav scrollable
- Filters stacked and centre-aligned

TABLE UI:
- Desktop: Pos, Team, P, W, D, L, GF, GA, GD, Pts
- Mobile: Pos, Team, Pts (secondary: P, GD)

REMOVE:
- “All” competition option

USE:
- Mock data only
- Goalserve-ready structures

GOAL:
Create a production-ready scaffold without live data.

---

## Tables Refinement — Desktop vs Mobile Density

You are refining the Tables tab.

TASK:
Differentiate desktop and mobile data density.

DESKTOP:
- Show full statistical columns
- Highlight Europe qualification and relegation subtly

MOBILE:
- Show minimal essential columns
- Keep layout scannable and vertical

REMOVE:
- “All” competition option entirely

DEFAULT:
- Premier League

DO NOT:
- Change navigation structure
- Add advanced toggles

GOAL:
Optimise readability per device.

---

## Shop — Cart Indicator UX

You are updating the Shop experience.

PROBLEM:
No visual feedback when items are added to cart.

TASK:
Add global cart indicator in header.

IMPLEMENT:
- Badge on cart icon showing item count
- Hide badge when count = 0
- Show “99+” when count > 99
- Update in real time
- Persist across refresh

OPTIONAL:
- Toast: “Added to cart” with “View cart” link
- Auto-dismiss after 2 seconds

DO NOT:
- Redesign header
- Change navigation

GOAL:
Provide immediate feedback and improve conversion UX.

---

# DAY 7 — FULL PROMPT LOG

Create a new file at server/integrations/goalserve/client.ts

Requirements:
- Read GOALSERVE_FEED_KEY from process.env
- Base URL must be: https://www.goalserve.com/getfeed/
- Export:
  async function goalserveFetch(feedPath: string): Promise<any>

Behavior:
- Construct URL as:
  https://www.goalserve.com/getfeed/${GOALSERVE_FEED_KEY}/soccer/${feedPath}?json=1
- Log the final URL with the key REDACTED (replace the key portion with "***")
- Fetch the URL
- If response status is not 200, throw an Error including status code
- Parse JSON and return it
- Do NOT write to database
- Do NOT modify any other files

After creating the file:
- Show the full contents of client.ts

---

Modify server/routes.ts ONLY.

1) Add an import at the top:
import { testGoalserveConnection } from "./jobs/test-goalserve";

2) Inside registerRoutes(), near the existing "Server Jobs" section,
add a new route:

POST /api/jobs/test-goalserve

- Middleware: requireJobSecret("GOALSERVE_SYNC_SECRET")
- Handler:
  - Call await testGoalserveConnection()
  - Return the result as JSON

3) Do NOT remove, reorder, or change any existing routes.

After making the change:
- Show ONLY the diff for server/routes.ts
- Run npm run dev briefly and confirm the server starts

---

Update server/integrations/goalserve/client.ts to handle non-JSON responses safely.

Changes required:
1) After fetching, read the body as text first:
   const text = await response.text();

2) If response.status is not 200:
   - throw an Error that includes:
     - status code
     - first 300 chars of text (trimmed)
   - Do NOT include the full URL with key

3) Attempt to parse JSON:
   - try { return JSON.parse(text); }
   - catch:
       throw new Error(
         "Goalserve returned non-JSON or invalid JSON. First 300 chars: " + text.slice(0,300)
       )

4) Keep the existing redacted URL log.
5) Do not modify other files.

After update:
- show the full contents of client.ts

---

Update server/integrations/goalserve/client.ts to stop hardcoding "/soccer/".

New required behavior:
- goalserveFetch(feedPath: string) should build:
  https://www.goalserve.com/getfeed/${GOALSERVE_FEED_KEY}/${feedPath}
- feedPath might include query params already.
- Always ensure json=1 is present:
  - If feedPath already contains "?", append "&json=1"
  - Otherwise append "?json=1"

Also:
- Keep redacted logging (replace the key with "***")
- Keep the existing "read as text then JSON.parse()" logic and helpful error snippet
- Throw clear error if GOALSERVE_FEED_KEY missing
- Do not modify other files

After updating, show the full contents of client.ts.

---

Update server/jobs/test-goalserve.ts:

- Change the fetch call from goalserveFetch("scores") to:
  goalserveFetch("soccernew/home")

- Update the returned feed string to "soccernew/home"

Do not modify anything else.
After updating, show the full contents of server/jobs/test-goalserve.ts

---

Create a new job file at server/jobs/sync-goalserve-competitions.ts.

It must export:
export async function syncGoalserveCompetitions(): Promise<{ ok: boolean; upserted: number; error?: string; sample?: any }>

Behavior:
- Use goalserveFetch from server/integrations/goalserve/client
- Fetch the Goalserve soccer competitions list feed (use the same “family” as the working test feed you confirmed)
- Parse out competitions into a normalized array of:
  { goalserveCompetitionId: string, name: string, country?: string, type?: string }
- Upsert into the competitions table (Drizzle) matching on goalserveCompetitionId
- Return { ok: true, upserted } on success
- On failure return { ok: false, upserted: 0, error, sample } where sample is the first 300 chars or first object seen (no secrets)

Do not modify any existing files yet. Only create this new file.
After creating, show me the full contents of server/jobs/sync-goalserve-competitions.ts.

---

Modify server/routes.ts.

Add a new job endpoint near the existing Goalserve jobs section:

POST /api/jobs/sync-goalserve-competitions

Middleware:
- requireJobSecret("GOALSERVE_SYNC_SECRET")

Handler behavior:
- Import syncGoalserveCompetitions from server/jobs/sync-goalserve-competitions
- Call the function
- Return the result as JSON

Rules:
- Do NOT remove or reorder existing routes
- Keep file organization consistent
- Only add what is necessary

After editing:
- Show me a diff of server/routes.ts
- Start the server briefly to confirm it boots without runtime errors

---

Modify server/integrations/goalserve/client.ts to correctly handle gzipped responses.

Requirements:
- Add request headers:
  - "Accept-Encoding": "identity"
  - "User-Agent": "FootballMad/1.0"
- Read the response body as raw bytes (arrayBuffer), not response.text()
- If the first two bytes are gzip (0x1f, 0x8b), gunzip it using node:zlib
- Convert the resulting bytes to a UTF-8 string
- For non-200 responses:
  - throw Error including status and the first 300 chars of the decoded body (trimmed)
- For 200 responses:
  - attempt JSON.parse(decodedText)
  - on parse error, throw Error showing first 300 chars of decodedText
- Do not log the feed key, keep the redacted URL logging

After editing:
- show full updated contents of server/integrations/goalserve/client.ts

---

