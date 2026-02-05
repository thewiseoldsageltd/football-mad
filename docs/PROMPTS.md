## ⚠️ REPLIT EXECUTION RULES (MUST FOLLOW)

This project is cost-sensitive on Replit credits.

DO NOT:
- run end-to-end/regression testing (Playwright/Cypress/Puppeteer)
- generate videos/screenshots
- use “Testing your app”
- run lighthouse audits
- run broad automated UI checks

Allowed verification:
- max ONE curl request to a relevant API endpoint
- OR confirm server starts without errors

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

Update server/jobs/sync-goalserve-competitions.ts to fetch competitions from Goalserve using the endpoint:

soccerfixtures/data/mapping

(replace the old soccernew/league_list call)

Then update the parsing logic to be robust to different JSON shapes:
- Traverse the response and collect any objects that look like leagues (have an id and a name, or league_id and league_name)
- Normalize into { goalserveCompetitionId, name, country?, type? }
- Upsert into competitions by competitions.goalserveCompetitionId (same as before)
- Keep slugify behavior for inserts

Make sure NO secrets are logged.

After changes:
1) show the full contents of server/jobs/sync-goalserve-competitions.ts
2) run npm run dev briefly to ensure server boots
Do not change any other files.

---

Update server/jobs/sync-goalserve-competitions.ts so extractLeagues() can read XML-to-JSON attribute shapes.

Specifically:

When looking for an id, also accept: obj["@id"], obj["@league_id"], obj["@competition_id"], and obj.$?.id, obj.$?.league_id, obj.$?.competition_id

When looking for a name, also accept: obj["@name"], obj["@league_name"], obj["@competition_name"], and obj.$?.name, obj.$?.league_name, obj.$?.competition_name

For country, also accept obj["@country"] and obj.$?.country

Keep the recursive traversal and dedupe logic exactly as-is.

Also improve the “No leagues found” return so sample includes a preview of the fixtures structure:

sample: JSON.stringify(response?.fixtures).slice(0, 500)

Do not modify any other files.
After editing, show the full updated contents of server/jobs/sync-goalserve-competitions.ts.
Then re-run the curl to POST /api/jobs/sync-goalserve-competitions (using localhost:5000) and show the JSON response.

---

Update server/jobs/sync-goalserve-competitions.ts to avoid the unique constraint error on competitions.name.

Rules:

When inserting/updating, compute:

displayName = comp.name

If comp.country exists, set displayName = \${comp.name} (${comp.country})``

Else set displayName = \${comp.name} [${comp.goalserveCompetitionId}]``

Use displayName for:

competitions.name

slugify(displayName) for competitions.slug

Keep goalserveCompetitionId as the true identity key (matching logic stays the same).

Do not change any other files.

After editing, show the full updated file contents.
Then re-run the curl test and show the JSON response.

---

Create a new file: server/jobs/sync-goalserve-teams.ts

It must export:
export async function syncGoalserveTeams(leagueId: string): Promise<{
  ok: boolean;
  leagueId: string;
  goalserveTeams: number;
  matched: number;
  updated: number;
  unmatchedSample: { id: string; name: string }[];
  error?: string;
}>

Behavior:
- Fetch Goalserve: goalserveFetch(`soccerleague/${leagueId}`)
- Extract Goalserve teams from response.league.team (handle array OR single object)
- For each Goalserve team, read:
  - goalserveTeamId = String(team["@id"] ?? team.id)
  - name = String(team["@name"] ?? team.name ?? "")
- Load DB teams: select id, name, slug, shortName, goalserveTeamId from teams
- Build matching strategy in this order:
  1) If a DB team already has goalserveTeamId equal to the Goalserve id => match it
  2) Else match by slug using slugify(goalserveName) == db.slug
  3) Else match by case-insensitive name equality (db.name == goalserveName)
  4) Else match by case-insensitive shortName against known abbreviations derived from goalserveName:
     - Take first 3 letters of each word joined, e.g. "Manchester City" => "MCI"
     - Also take first 3 letters of the whole name with spaces removed
- When matched:
  - If db.goalserveTeamId is missing or different, update teams.goalserveTeamId to the Goalserve id
  - Count updated only when an UPDATE happens
- Collect unmatched goalserve teams (id+name) and return the first 15 as unmatchedSample
- Do NOT log or return any secrets

Also update server/routes.ts:

1) Add an import near the other job imports:
import { syncGoalserveTeams } from "./jobs/sync-goalserve-teams";

2) Add a new endpoint near the existing Goalserve job routes (keep organization consistent):

// ========== GOALSERVE TEAMS SYNC ==========
app.post(
  "/api/jobs/sync-goalserve-teams",
  requireJobSecret("GOALSERVE_SYNC_SECRET"),
  async (req, res) => {
    const leagueId = String(req.query.leagueId || "1204");
    const result = await syncGoalserveTeams(leagueId);
    res.json(result);
  }
);

Do NOT remove or reorder existing routes.

After edits:
- show full contents of server/jobs/sync-goalserve-teams.ts
- show a diff of server/routes.ts
- run npm run dev briefly to ensure server boots (stop after it starts)

---

psql "$DATABASE_URL" -c "
update teams set goalserve_team_id = '9260'
where slug = 'manchester-united';
"

---

psql "$DATABASE_URL" -c "
update teams set goalserve_team_id = '9297'
where slug = 'nottingham-forest';
"

---

PROMPT 3 — Sync Goalserve Players (Premier League)

Create a new file at: server/jobs/sync-goalserve-players.ts

It must:

Fetch soccerleague/<leagueId> from Goalserve using goalserveFetch

Extract each team’s squad players

For each player, attempt to match to an existing DB player by:

player.teamId (must match the correct club in DB via the team’s goalserve_team_id)

and either:

exact case-insensitive name match, OR

slug match (use the same slugify rules used elsewhere)

If matched and players.goalservePlayerId is empty or different, update it.

Return JSON summary:

{
  ok: boolean,
  leagueId: string,
  goalservePlayers: number,
  matched: number,
  updated: number,
  unmatchedSample: { teamName: string; goalserveTeamId: string; playerId: string; playerName: string }[],
  error?: string
}


Do not log secrets. Do not dump full payloads.

Modify server/routes.ts:

Add import:
import { syncGoalservePlayers } from "./jobs/sync-goalserve-players";

Add endpoint near the other Goalserve jobs:
POST /api/jobs/sync-goalserve-players

middleware: requireJobSecret("GOALSERVE_SYNC_SECRET")

reads leagueId from query string default "1204"

returns await syncGoalservePlayers(leagueId)

After changes:

show full contents of server/jobs/sync-goalserve-players.ts

show diff of server/routes.ts

confirm server boots (npm run dev starts)

---

Prompt: Upsert Goalserve players into DB

Create a new file at: server/jobs/upsert-goalserve-players.ts

Requirements:

Use goalserveFetch from server/integrations/goalserve/client

Use db from server/db

Use players and teams from @shared/schema

Use drizzle eq from drizzle-orm

Function to export:
export async function upsertGoalservePlayers(leagueId: string): Promise<{ ok: boolean; leagueId: string; totalFromGoalserve: number; inserted: number; updated: number; skippedNoTeamMapping: number; error?: string; sample?: any }>

Behavior:

Fetch Goalserve feed: soccerleague/${leagueId}

Parse response.league.team (array or single)

For each team, read team["@id"] as goalserveTeamId, and team.squad.player (array or single)

For each player, read:

player id from player["@id"]

player name from player["@name"]

Find the DB team by teams.goalserveTeamId == goalserveTeamId.

If not found, increment skippedNoTeamMapping and continue.

Upsert into players:

First look up by players.goalservePlayerId == goalservePlayerId

If found: update name, slug, teamId, goalservePlayerId

If not found: insert new row with at least name, slug, teamId, goalservePlayerId

Slugify should be simple: lowercase, replace non-alphanumerics with -, trim -

Do NOT log secrets or full responses.

Return totals. On error return { ok:false, ... } and include a small sample string with first ~300 chars of the error.

Then modify server/routes.ts:

Add import near existing Goalserve jobs:
import { upsertGoalservePlayers } from "./jobs/upsert-goalserve-players";

Add a new endpoint near the other Goalserve job endpoints (keep organization):
POST /api/jobs/upsert-goalserve-players

middleware: requireJobSecret("GOALSERVE_SYNC_SECRET")

reads leagueId from req.query.leagueId default "1204"

calls upsertGoalservePlayers(leagueId) and returns JSON result

Do NOT remove or reorder existing routes.

After edits:

show full contents of server/jobs/upsert-goalserve-players.ts

show a diff of server/routes.ts

run npm run dev briefly to ensure server boots (stop after it starts)

---

We have Goalserve working in this Replit project.

Context:
- Node + Express backend
- goalserveFetch helper exists at: server/integrations/goalserve/client.ts
- Competitions, teams and players jobs already work.
- Goalserve test job POST /api/jobs/test-goalserve returns scores successfully.

Request:
Create a NEW job endpoint:
POST /api/jobs/preview-goalserve-matches?feed=soccernew/home

Rules:
- This is a DRY RUN: do NOT write to the database.
- It should call goalserveFetch(feed) exactly as given (no adding soccernew/ inside the job).
- Parse Goalserve response at response.scores.category[].matches.match[]
- Return JSON:
  {
    ok: true,
    feed,
    categoriesCount,
    matchesCount,
    sample: [
      { id, staticId, formattedDate, timeOrStatus, home: { id, name, score }, away: { id, name, score } }
    ]
  }
- Handle Goalserve returning a single object vs array for category and match.
- If scores/category/matches is missing, return ok:false with top-level keys and sample of response.

Implementation notes:
- Put code in server/jobs/preview-goalserve-matches.ts
- Wire the route in server/routes.ts using requireJobSecret("GOALSERVE_SYNC_SECRET")
- Keep this job isolated (do not reuse players job).
- After implementation, tell me the exact curl command to test it.

---

We want to ingest global matches from Goalserve (soccernew/home) and map teams later.

We already have:
- goalserveFetch(feedPath) working
- preview endpoint POST /api/jobs/preview-goalserve-matches?feed=soccernew/home working
- DB tables for competitions, teams, players exist and working.

Now implement global matches ingestion:

1) Schema updates (only if needed):
- In @shared/schema.ts, ensure matches table has these nullable columns:
  - homeGoalserveTeamId (text)
  - awayGoalserveTeamId (text)
- Ensure homeTeamId and awayTeamId are nullable (so we can store matches before teams are mapped).
- If matches.raw exists use it; otherwise use matches.timeline for raw JSON storage.
- Provide the exact command to push schema changes (drizzle).

2) Job:
Create server/jobs/upsert-goalserve-matches.ts and wire route:
POST /api/jobs/upsert-goalserve-matches?feed=soccernew/home
Protected by requireJobSecret("GOALSERVE_SYNC_SECRET")

Rules:
- Call goalserveFetch(feed) exactly. Do NOT prefix soccernew/ inside the job.
- Parse response.scores.category[].matches.match[] (handle array/object).
- For each match:
  - goalserveMatchId = match["@id"] required; if missing -> skippedNoMatchId++
  - goalserveStaticId optional
  - homeGsId/awayGsId from match.localteam["@id"] and match.visitorteam["@id"] (fallback home/away)
  - Always store homeGoalserveTeamId/awayGoalserveTeamId
  - Attempt to map to teams.id via teams.goalserveTeamId; if found set homeTeamId/awayTeamId else leave null
  - kickoffTime: parse dd.mm.yyyy from match["@formatted_date"] or category.matches["@formatted_date"]
    time from match["@time"] or if match["@status"] is HH:MM use that
    if date parse fails -> skippedNoKickoff++ and skip record (kickoffTime required)
  - status normalization (scheduled/live/finished/postponed) similar to earlier approach
  - scores nullable
  - venue optional
  - slug = `gs-${goalserveMatchId}`
  - store compact raw payload in raw/timeline

- Upsert idempotently by matches.goalserveMatchId (unique).

Return JSON:
{
  ok: true,
  feed,
  totalFromGoalserve,
  inserted,
  updated,
  skippedNoMatchId,
  skippedNoKickoff,
  mappedTeams,
  unmappedTeams
}

3) After implementing:
- Provide the exact curl command to run the job.
- Provide one verification command to confirm rows exist (either SQL via psql if available, or a small debug endpoint).

---

We now have global matches ingest working and verified.

Next: implement a DRY-RUN preview endpoint for Premier League standings.

Create:
POST /api/jobs/preview-goalserve-table?leagueId=1204

Requirements:
- Do NOT write to DB.
- Use goalserveFetch with the correct Goalserve feed path for league standings for the given leagueId.
  (Try likely feed families like soccerleague/<leagueId> or a standings/table feed if needed.)
- Return JSON:
{
  ok: true,
  leagueId,
  feedUsed,
  topLevelKeys: string[],
  standingsKeys: string[],
  rowsCount: number,
  sampleRows: [
    { position, teamGoalserveId, teamName, played, wins, draws, losses, goalsFor, goalsAgainst, goalDiff, points }
  ]
}

Robustness:
- Handle object vs array.
- If the expected standings nodes are missing, return:
  { ok:false, leagueId, feedUsed, topLevelKeys, responseSample: first 800 chars }
- The key goal is to identify the correct node path for the standings rows reliably.

Implementation:
- server/jobs/preview-goalserve-table.ts
- Wire route in server/routes.ts protected by requireJobSecret("GOALSERVE_SYNC_SECRET")
- After implementing, provide the exact curl command to test it.

---

Update server/jobs/preview-goalserve-table.ts so we stop guessing.

Right now it returns feedUsed=soccerleague/1204 with squads data. We need full diagnostics for every attempted feed.

Make these changes:

1) Maintain an array attemptedFeeds: { feed: string, ok: boolean, status?: number, error?: string, topLevelKeys?: string[] }[].

2) Try feeds in this exact order:
- soccerleague/{leagueId}/standings
- soccerleague/{leagueId}/table
- soccerstandings/{leagueId}
- soccer/{leagueId}/standings
- soccer/{leagueId}/table
- soccerleague/{leagueId}  (LAST fallback)

3) For each feed attempt:
- call goalserveFetch(feed)
- on success, push {feed, ok:true, topLevelKeys:Object.keys(response)}
- if standings rows found, return ok:true with feedUsed + sampleRows.
- if response looks like squads (league.team[].squad.player[]), DO NOT accept it; continue to next feed.
- If goalserveFetch throws (e.g. 500 HTML), catch it and push {feed, ok:false, error: err.message.slice(0,200)} and continue.

4) If no standings rows found after all attempts, return:
{
  ok:false,
  leagueId,
  feedUsed:lastTriedFeed,
  attemptedFeeds,
  topLevelKeys,
  nestedKeys (limited),
  responseSample (first 800 chars),
  message
}

5) Ensure the route POST /api/jobs/preview-goalserve-table still calls this updated function.

After implementing, provide the curl command to test (one-line).

---

We have server/jobs/preview-goalserve-table.ts but it is currently returning squads because it uses soccerleague/{leagueId}.

Stop guessing feeds. Use the endpoint list from our feed docs:
- League standings endpoint is: standings/<leagueId>.xml (example: standings/1204.xml)

TASK:
Update server/jobs/preview-goalserve-table.ts so it tries standings FIRST.

Implementation requirements:
1) The feed candidates list must start with:
   - `standings/${leagueId}.xml`
   - then optionally `standings/${leagueId}` as a fallback
2) Keep soccerleague/{leagueId} only as a LAST fallback (it’s squads, not standings)
3) Update the parsing logic to look for standings rows under nodes typically returned by standings feeds:
   - response.standings
   - response.standings.team
   - response.standings.league.team
   - response.league?.standings?.team
   - Any array of rows where each row has team name/id and points/position/played
4) If the response contains league.team[].squad.player[] and does not contain points/position/played, treat it as squads and do NOT return success.
5) Keep the existing route:
   POST /api/jobs/preview-goalserve-table?leagueId=1204
   protected by requireJobSecret("GOALSERVE_SYNC_SECRET")

After implementing, provide the exact one-line curl command to test.

---

The preview job confirms standings/1204.xml returns topLevelKeys ["?xml","standings"], but our parser can't locate rows.

Add a diagnostic mode to preview-goalserve-table:

If query param debug=1 is present:
- fetch ONLY standings/{leagueId}.xml
- return:
  {
    ok:true,
    leagueId,
    feedUsed,
    standingsTopKeys: Object.keys(response.standings),
    nestedKeysUnderStandings: a flattened list of keys under response.standings (max 200 keys),
    responseSample: JSON.stringify(response.standings).slice(0, 2000)
  }

Do not change any DB or other routes.
Keep existing endpoint:
POST /api/jobs/preview-goalserve-table?leagueId=1204&debug=1

---

Update server/jobs/preview-goalserve-table.ts parsing using the confirmed structure from debug mode.

Confirmed structure for standings/1204.xml:
- response.standings.tournament.team is the standings rows array
- season is response.standings.tournament["@season"]
- league name is response.standings.tournament["@league"] or standings.tournament["@league"]

Implement parsing like:
const tournament = response.standings?.tournament
const teamRows = tournament?.team (array or object)
Rows fields:
- position: team["@position"]
- teamGoalserveId: team["@id"]
- teamName: team["@name"]
- played: team.overall["@gp"]
- wins: team.overall["@w"]
- draws: team.overall["@d"]
- losses: team.overall["@l"]
- goalsFor: team.overall["@gs"]
- goalsAgainst: team.overall["@ga"]
- goalDiff: team.total["@gd"]
- points: team.total["@p"]

Return normal success response (non-debug):
{
  ok:true,
  leagueId,
  feedUsed:"standings/{leagueId}.xml",
  season,
  rowsCount,
  sampleRows:[...]
}

Keep debug=1 behaviour as-is.

After updating, provide the curl command to test normal mode (no debug).

---

We have a working standings preview:
POST /api/jobs/preview-goalserve-table?leagueId=1204
It uses goalserveFetch("standings/1204.xml") and parses response.standings.tournament.team.
It returns season "2025/2026" and 20 rows.

Now implement DB persistence for standings.

1) Add a new Drizzle table in @shared/schema.ts:
Table name: standings

Columns:
- id: uuid primary key
- leagueId: text NOT NULL
- season: text NOT NULL
- teamGoalserveId: text NOT NULL
- teamId: uuid nullable (FK to teams.id; map via teams.goalserveTeamId if available)
- teamName: text NOT NULL
- position: int NOT NULL
- played: int NOT NULL
- wins: int NOT NULL
- draws: int NOT NULL
- losses: int NOT NULL
- goalsFor: int NOT NULL
- goalsAgainst: int NOT NULL
- goalDiff: int NOT NULL
- points: int NOT NULL
- updatedAt: timestamp default now NOT NULL
- raw: jsonb nullable (store original team node)

Constraints/indexes:
- unique(leagueId, season, teamGoalserveId)
- index on (leagueId, season)
- index on teamGoalserveId

2) Create job:
POST /api/jobs/upsert-goalserve-table?leagueId=1204
Protected by requireJobSecret("GOALSERVE_SYNC_SECRET")

Job behavior:
- Fetch via goalserveFetch(`standings/${leagueId}.xml`)
- Parse tournament + team rows exactly as preview does
- Upsert rows by (leagueId, season, teamGoalserveId)
- Attempt to map teamId by joining teams.goalserveTeamId to teamGoalserveId
- Return JSON:
{
  ok:true,
  leagueId,
  season,
  rowsFromGoalserve,
  inserted,
  updated,
  mappedTeams,
  unmappedTeams
}

3) Provide:
- command to push schema changes (npm run db:push)
- curl command to run the upsert job
- psql verification query to show top 10 ordered by position.

---

We now have:
- matches table ingesting global matches
- standings table for PL

Next: implement read endpoints to power the UI tabs using the matches table only (no Goalserve calls).

Add these endpoints in server/routes.ts:

1) GET /api/matches/fixtures?days=7&competitionId=&teamId=
- Default days=7
- Return matches with status='scheduled' AND kickoff_time between now and now + days
- If competitionId is provided, filter matches.goalserveCompetitionId = competitionId (or the correct column name)
- If teamId is provided, include matches where homeTeamId=teamId OR awayTeamId=teamId
- Order by kickoff_time asc
- Limit 200 (configurable)

2) GET /api/matches/results?days=7&competitionId=&teamId=
- Default days=7
- Return matches with status='finished' OR (homeScore not null AND awayScore not null AND kickoff_time < now)
- Filter by competitionId/teamId same as above
- kickoff_time between now - days and now
- Order by kickoff_time desc
- Limit 200

3) GET /api/matches/live?competitionId=&teamId=
- Return matches with status='live'
- Filter by competitionId/teamId same as above
- Order by kickoff_time asc

Response shape:
Return an array of objects containing:
{
  id,
  slug,
  kickoffTime,
  status,
  homeScore,
  awayScore,
  venue,
  goalserveMatchId,
  homeTeam: { id, name, slug } OR if homeTeamId is null include { goalserveTeamId, nameFromRaw }
  awayTeam: { id, name, slug } OR if awayTeamId is null include { goalserveTeamId, nameFromRaw }
}

Implementation:
- Use Drizzle ORM and db from server/db
- Join teams table when homeTeamId/awayTeamId exist
- If not mapped, read names from matches.timeline/raw (whatever field stores the compact raw match)
- Keep endpoints public (no job secret)

After implementing, provide curl commands to test each endpoint.

---

We want to wire real fixtures data into the Matches page.

Target file:
client/src/pages/matches.tsx

Context:
- There is already a Matches page showing “Premier League fixtures and results”
- Backend endpoint exists:
  GET /api/matches/fixtures?days=7

Task:
Update client/src/pages/matches.tsx so the Fixtures section uses live data from the backend instead of any mock/static data.

Implementation requirements:

1) On page load, fetch:
   /api/matches/fixtures?days=7

2) Add a simple days selector for fixtures:
   - 7 / 14 / 30
   - When changed, refetch with ?days=X

3) Render fixtures list with:
   - kickoffTime formatted to local date + time
   - Home team vs Away team
   - Team name logic:
     - If mapped: homeTeam.name / awayTeam.name
     - Else: homeTeam.nameFromRaw / awayTeam.nameFromRaw
   - Status badge/text (scheduled / live)

4) Loading + empty states:
   - “Loading fixtures…”
   - “No upcoming fixtures in the next X days.”

5) Do NOT break existing Results logic in matches.tsx.
   - Only replace the Fixtures data source.
   - Keep styling consistent with existing markup/components.

6) No backend changes.

After implementing:
- Tell me exactly what changed in matches.tsx
- Confirm how to test it in the browser.

---

Small improvement to client/src/pages/matches.tsx (Fixtures only).

Task:
Harden the React Query usage for fixtures.

Make these changes ONLY in the fixtures query logic:

1) Ensure the React Query key includes the days value:
   Use:
   queryKey: ["fixtures", fixtureDays]

2) Ensure the fetch throws on non-OK responses:
   Example pattern:
   const res = await fetch(`/api/matches/fixtures?days=${fixtureDays}`);
   if (!res.ok) {
     throw new Error("Failed to load fixtures");
   }
   return res.json();

3) Do NOT change:
   - UI layout
   - Results tab logic
   - Match transformation logic
   - Any backend code

After implementing:
- Confirm the file change

---

Please update `client/src/pages/matches.tsx` so the competition badge shown on each fixture card is data-driven instead of hardcoded to “Premier League”.

Requirements:
1. Replace the hardcoded "Premier League" badge text wherever it appears on a match card.
2. Use this fallback order for the badge label:
   - match.competition (string), if present
   - match.competitionName, if present
   - "Other Competition" as a final fallback
3. Do NOT change any layout, styling, spacing, or component structure — only change where the text comes from.
4. If TypeScript types in this file need updating to support the new field(s), update them locally in the same file.
5. Ensure there are no TypeScript or runtime errors.
6. Everything else on the Matches page must continue to behave exactly as it does now.

Sanity check:
Fixtures that are not Premier League games should no longer display a “Premier League” badge. They should display the correct competition name when available, or “Other Competition” otherwise.

---

Fix Goalserve match ingestion so `matches.competition` is set using our `competitions` table rather than the soccernew feed label.

Context:
- Competitions are already synced into the DB (991 rows).
- In `server/jobs/upsert-goalserve-matches.ts`, we currently set `competition` from `cat["@name"]`, but it’s incorrectly coming through as "Premier League" for many non-PL matches.
- The soccernew feed categories include a competition id in `cat["@id"]`.

Task:
1) In `server/jobs/upsert-goalserve-matches.ts`, load a lookup map before looping:
   - Query the competitions table and build `Map<string, string>` from `goalserveCompetitionId -> name`.
2) When building the match payload:
   - Extract `competitionId = String(cat?.["@id"] ?? cat?.id ?? "")`
   - Set `competitionName = competitionsMap.get(competitionId) || String(cat?.["@name"] ?? cat?.name ?? "Unknown")`
   - Use `competition: competitionName`
   - Keep also storing `goalserveCompetitionId: competitionId || null` (already present)
3) Do not change any routes or frontend code.

After applying, run:
curl -sS -X POST "http://localhost:5000/api/jobs/upsert-goalserve-matches?feed=soccernew/home" -H "x-sync-secret: $GOALSERVE_SYNC_SECRET"

Then verify:
curl -sS "http://localhost:5000/api/matches/fixtures?days=7" | head -c 1200

Expected:
Non-Prem matches should show their real competition name (not "Premier League").

---

We found a critical schema issue in Postgres:

- `matches.competition` currently has a DEFAULT of 'Premier League' (verified via `\d matches`).
- `matches` does NOT currently have a `goalserve_competition_id` column (so filtering/mapping is fragile).
- We already fixed UI to show `match.competition` and fixed ingestion to compute `competitionName`, but we must harden the schema + ingestion so we never silently stamp “Premier League” again.

TASK: Implement ALL fixes end-to-end (DB + backend) with no manual file editing.

A) DATABASE FIXES (run via SQL / psql from Replit)
1) Remove the bad default:
   ALTER TABLE matches ALTER COLUMN competition DROP DEFAULT;

2) Add a new column for competition id:
   ALTER TABLE matches ADD COLUMN IF NOT EXISTS goalserve_competition_id text;

3) Add an index for filtering:
   CREATE INDEX IF NOT EXISTS matches_goalserve_competition_id_idx ON matches(goalserve_competition_id);

B) BACKEND FIXES (server/jobs/upsert-goalserve-matches.ts)
1) Ensure we IMPORT competitions from schema if needed.
2) Build a competitions lookup map once:
   Map<string, string> from competitions.goalserveCompetitionId -> competitions.name
3) For each match category:
   - Extract competitionId = String(cat?.["@id"] ?? cat?.id ?? "")
   - Resolve competitionName:
       competitionsMap.get(competitionId) || String(cat?.["@name"] ?? cat?.name ?? "Unknown")
4) Write BOTH fields on insert AND update:
   - competition: competitionName
   - goalserveCompetitionId (existing camelCase field, if present in schema) OR goalserve_competition_id (new DB column)
   IMPORTANT: Our DB column is snake_case: goalserve_competition_id.
   So update Drizzle/schema mapping accordingly:
   - If schema uses camelCase property, map it to the snake_case DB column using drizzle `text("goalserve_competition_id")`.
   - Then set that field in insert/update payload.

C) BACKEND ROUTE FIXES (server/routes.ts)
1) In the fixtures/results/live endpoints, update competition filtering to use the ID column:
   - Accept query param `competitionId`
   - Filter by matches.goalserveCompetitionId / matches.goalserveCompetitionId field mapped to `goalserve_competition_id`
   - Do NOT filter by match.competition name anymore.
2) Keep returning `competition: match.competition` in API response (already done).
3) Also include `goalserveCompetitionId` in the API response so frontend can filter later if needed.

D) MIGRATION / RE-INGEST
1) After schema + code changes, run:
   curl -sS -X POST "http://localhost:5000/api/jobs/upsert-goalserve-matches?feed=soccernew/home" -H "x-sync-secret: $GOALSERVE_SYNC_SECRET"
2) Verify competitions are diverse and default is gone:
   - psql query:
     SELECT competition, COUNT(*) FROM matches GROUP BY competition ORDER BY COUNT(*) DESC LIMIT 20;
   - psql query:
     SELECT COUNT(*) FROM matches WHERE competition='Premier League' AND goalserve_competition_id IS DISTINCT FROM '1204';
3) Verify fixtures endpoint filter works by ID:
   curl -sS "http://localhost:5000/api/matches/fixtures?days=7&competitionId=1204" | head -c 1200

OUTPUT REQUIRED:
- Tell me exactly which files were changed.
- Tell me exactly which SQL statements were executed.
- Provide the exact curl + psql verification commands again.

---

Add a competition filter dropdown to the Fixtures tab in:
client/src/pages/matches.tsx

Context:
- Fixtures are fetched via React Query from /api/matches/fixtures?days=${fixtureDays}
- API response now includes:
  - competition (string | null)
  - goalserveCompetitionId (string | null)

Task:
1) Add local state: selectedCompetitionId (string), default "" meaning "All competitions".
2) Update the fixtures fetch URL:
   - If selectedCompetitionId is "", use:
     /api/matches/fixtures?days=${fixtureDays}
   - Else use:
     /api/matches/fixtures?days=${fixtureDays}&competitionId=${selectedCompetitionId}
3) Build dropdown options from the currently fetched fixtures data (when available):
   - Derive unique competitions using goalserveCompetitionId + competition name
   - Exclude items where goalserveCompetitionId is null
   - Sort options alphabetically by competition name
4) UI:
   - Show a <select> or existing Select component above the fixtures list (Fixtures tab only)
   - First option: "All competitions"
   - Then the derived competition options
5) Keep existing 7/14/30 day buttons working.
   - Changing days should refetch and also refresh the available dropdown options.
6) Keep styling consistent with existing UI.
7) Do NOT change Results tab logic.

After implementing:
- Tell me exactly what changed in matches.tsx
- Confirm how to test: pick a competition and verify fixtures list changes.

---

You are working in Football Mad (Replit). We need to fix the Matches page UI + polish competition display.

GOAL
1) Remove the duplicate “competitions” dropdown (we should only have ONE).
2) Stop showing the competitionId in the dropdown labels and in the match “competition pill”.
3) Replace “(Country)” text with a small country flag icon (or a simple fallback icon if unknown).
4) Answer: do club crests exist in Goalserve feeds? If not, implement a clean path forward without breaking UI.

CONTEXT (what I’m seeing)
- There are TWO dropdowns next to each other:
  - One says “All competitions” (lowercase) and is the one with the populated list (this is the NEW one we just added).
  - Another says “All Competitions” (title case) (this is the OLD existing one).
- Competition is currently displayed like: “Catarinense (Brazil) [1140]” both in the dropdown and on the match pill.

TASK A — REMOVE THE DUPLICATE DROPDOWN
- Open: client/src/pages/matches.tsx
- Find the existing/old competition dropdown (the one that renders “All Competitions”) and REMOVE it from the layout.
- Keep ONLY the new Select-based competition dropdown we added (the one that is populated from API data).
- Do not remove the “Kick-off time” dropdown or the search input.

TASK B — CLEAN COMPETITION DISPLAY (NO ID IN UI)
In client/src/pages/matches.tsx:
1) Add helper functions near the top:
   - parseCompetitionLabel(competition: string | null | undefined) -> { name: string; country?: string; id?: string }
     Rules:
     - If it matches: "<NAME> (<COUNTRY>) [<ID>]" extract all three.
       Example: "Catarinense (Brazil) [1140]" => name="Catarinense", country="Brazil", id="1140"
     - If it matches: "<COUNTRY>: <NAME>" extract country + name
       Example: "Libya: Premier League" => country="Libya", name="Premier League"
     - Else: name = original string
2) Add displayCompetitionName(competition: string | null | undefined) that returns ONLY the readable name (no country, no [id]).
   Examples:
   - "Catarinense (Brazil) [1140]" => "Catarinense"
   - "Premier League (Jamaica) [1270]" => "Premier League"
   - "Libya: Premier League" => "Premier League"
3) Update:
   - competitionOptions labels in the dropdown to use displayCompetitionName(...)
   - Match “competition pill” to use displayCompetitionName(match.competition)

TASK C — COUNTRY FLAG ICON (REPLACE “(Brazil)” TEXT)
Still in client/src/pages/matches.tsx:
1) Add getFlagEmoji(countryName: string) -> string | null
   - Implement a small mapping for common countries we’ll see (at least):
     Brazil, Argentina, England, Scotland, Wales, Ireland, Northern Ireland, France, Germany, Spain, Italy, Portugal, Netherlands, Belgium,
     USA, Mexico, Uruguay, Colombia, Chile, Peru, Ecuador, Paraguay, Bolivia, Venezuela,
     Jamaica, Egypt, Iraq, Qatar, Saudi Arabia, UAE, Morocco, Algeria, Tunisia, Libya, South Africa
   - Return an emoji flag (e.g. Brazil -> 🇧🇷). If unknown return null.
2) In both:
   - the dropdown item render
   - and the match competition pill render
   Show:
   - a tiny flag (emoji is fine) BEFORE the competition name when we have a country
   - fallback icon (e.g. 🌍) if country exists but not mapped
   - if no country, show nothing extra
3) IMPORTANT: The UI should NOT show country as text anymore (no “(Brazil)”).

TASK D — TEAM CRESTS (WHAT’S POSSIBLE NOW)
Implement the safest incremental solution:
1) Confirm in code comments and a short console note:
   - Goalserve match feed provides team ids/names but DOES NOT reliably provide crest image URLs.
2) Add a TODO path forward (no breaking changes):
   - If the Team object from mapped teams already has a crest/logo field (check existing Team type usage), then render it.
   - Otherwise keep the letter avatar.
3) In Matches list rendering:
   - If homeTeam has a usable crest/logo URL field (common names to check: crestUrl, logoUrl, badgeUrl, imageUrl), render <img> in the avatar slot.
   - Else render current letter badge.

DELIVERABLES
- Only edit client/src/pages/matches.tsx for UI changes.
- Keep the API contract as-is.
- After changes, the top filter row should show:
  [days buttons] [ONE competitions dropdown] [Kick-off time dropdown] [Search]
- Dropdown options should be clean like “🇧🇷 Catarinense” (no id, no (Brazil))
- Match pills should be clean like “🇧🇷 Catarinense” as well.

TEST STEPS (run mentally + quick manual check)
- Load Matches page.
- Confirm only one competitions dropdown exists and it’s populated.
- Selecting a competition filters fixtures.
- No “[1140]” visible anywhere in UI.
- No “(Brazil)” text visible; we see a flag emoji instead.
- Team avatars still render letters, but will render images if a logo/crest URL exists on mapped teams.

Go implement now and report back exactly what you removed/changed (brief bullet list) plus a screenshot if possible.

---

We have NO fixtures coming back from:
GET /api/matches/fixtures?days=7
It returns [].

Goal:
Fix the backend fixtures/results/live endpoints so they return matches correctly based on kickoff_time and real Goalserve status values.

Constraints:
- Only change server/routes.ts (and helper/query code if needed).
- Do NOT change ingestion jobs right now.
- Keep response shape the same.
- Must remain fast (use indexes already present on kickoff_time).

Step A — Diagnose quickly in code
1) Find the handlers for:
   GET /api/matches/fixtures
   GET /api/matches/results
   GET /api/matches/live
2) Identify current filters for status and time window.

Step B — Make the fixtures endpoint robust
Fixtures should include matches that have kickoff_time within the next N days AND are not finished.
Because Goalserve statuses vary, treat these statuses as “upcoming”:
- scheduled
- not_started
- ns
- postponed
- delayed
- TBD / TBA (if present)
Also, some feeds may use empty status for scheduled — handle that too.

Implement fixtures filter as:
- kickoff_time >= NOW()  (server time)
- kickoff_time < NOW() + interval '${days} days'
- status NOT IN ('finished', 'ft', 'full_time', 'ended', 'final')  (case-insensitive)
This is safer than only checking status='scheduled'.

Step C — Make results endpoint robust
Results should include matches within past N days AND are finished.
Treat these as “finished”:
- finished
- ft
- full_time
- ended
- final

Filter:
- kickoff_time >= NOW() - interval '${days} days'
- kickoff_time < NOW()
- status IN finished set (case-insensitive)

Step D — Live endpoint robust
Live matches:
Statuses often look like:
- live
- inplay
- in_play
- 1h / 2h
- halftime / ht
- extra_time / et
- penalties / pen
Implement a case-insensitive live status set OR numeric minute-based status if present.
If we don’t have minute statuses stored, at least match:
live/inplay/in_play/ht/halftime/et/extra_time/pen/penalties

Step E — Timezone sanity
kickoff_time is timestamp without time zone.
Ensure comparisons use consistent server time.
If the app runs in UTC but kickoff_time is effectively UTC, NOW() is fine.
If mismatch is suspected, use NOW() AT TIME ZONE 'UTC' for comparisons.
Pick ONE approach and apply consistently across fixtures/results/live.

Step F — Add temporary debug switch (so we can verify quickly)
If query param debug=1 is present on /api/matches/fixtures,
return extra fields:
- nowServer
- nowUtc
- days
- countFutureAll (count of matches with kickoff_time >= now)
- sampleNext5 (kickoff_time + status + competition for next 5 matches ordered by kickoff_time)

Step G — Verification steps (output in summary)
After changes, these should work:
1) curl -sS "http://localhost:5000/api/matches/fixtures?days=7&debug=1" | head -c 1200
2) curl -sS "http://localhost:5000/api/matches/fixtures?days=30" | head -c 400
3) curl -sS "http://localhost:5000/api/matches/results?days=7" | head -c 400

Deliverables:
- Give me the exact diff/summary of the code change.
- Explain which filter was causing [].

---

You are Replit AI working inside the Football Mad codebase. Make the following changes end-to-end (backend + frontend) and keep it safe/idempotent. Prefer small, focused diffs.

GOAL
Update the Matches page “Results” UX:
1) Replace the Results time controls to be user-friendly:
   - Yesterday
   - This Week
   - Last 30 Days
2) Add a “Browse” mode stub for FPL-style browsing:
   - Toggle: Quick | Browse
   - Browse UI: Competition dropdown + Round/Matchday dropdown (UI can be stubbed until round data exists)
3) Add round/matchday ingestion + API support so Browse can work:
   - Store a round identifier on matches from Goalserve feed
   - Expose it in the API
   - Allow filtering results by competitionId + round

IMPORTANT CONSTRAINTS
- Do NOT break existing fixtures UI.
- Do NOT duplicate competition dropdowns (there is currently a duplicate — remove the old one).
- Keep the existing endpoints working.
- Implement with minimal UI disruption and clear defaults.
- Add debug/diagnostic helpers where useful.

========================================================
BACKEND CHANGES
========================================================

A) Schema: add a round field to matches
- In shared/schema.ts (matches table), add:
  - goalserveRound: text("goalserve_round")
- Add an index on it:
  - matches_goalserve_round_idx on (goalserve_round)
- Do NOT add defaults.
- Apply DB migration via SQL (since drizzle-kit prompts):
  - ALTER TABLE matches ADD COLUMN IF NOT EXISTS goalserve_round text;
  - CREATE INDEX IF NOT EXISTS matches_goalserve_round_idx ON matches(goalserve_round);

B) Ingest: upsert-goalserve-matches should populate goalserve_round
File: server/jobs/upsert-goalserve-matches.ts

We already parse response.scores.category[].matches.match[] and store timeline/raw.

1) Determine where “round / matchday” exists in the Goalserve soccernew feed.
   Implement a robust extractor that checks common places:
   - match["@round"], match["@matchday"], match["@week"], match["@round_id"], match["round"], match["matchday"]
   - category["@round"], category["@name"] patterns if round is embedded, category["round"] fields
   - response.scores["@round"] etc (if present)
2) Add helper:
   - function extractRound(match: any, category: any): string | null
   - return string values only, trimmed, or null
3) Include goalserveRound in both INSERT and UPDATE statements:
   - goalserveRound: extractedRound
4) Keep upsert idempotent (still keyed by goalserve_match_id).
5) Add to job response a small diagnostic count:
   - withRound / withoutRound

C) API: include round in match responses and allow filtering
File: server/routes.ts

We already have:
- GET /api/matches/fixtures
- GET /api/matches/results
- GET /api/matches/live

1) Update the common formatter (formatMatchResponse or equivalent) to include:
   - goalserveRound: match.goalserveRound (or null)
2) Results endpoint:
   - Add optional query param: round (string)
   - If provided, filter matches.goalserveRound == round
   - Keep existing “days” behavior but ensure it plays well with Yesterday/This Week/Last 30 Days:
     - Accept days as before, but frontend will set days to 1/7/30
3) Add a new helper endpoint (lightweight) for Browse dropdown options:
   - GET /api/matches/rounds?competitionId=<id>&days=30
   - Returns a sorted array of distinct non-null rounds available in that window
   - Shape:
     { ok: true, competitionId, days, rounds: string[] }
   - Sorting: try numeric sort if rounds are numeric; fallback lexicographic.

========================================================
FRONTEND CHANGES
========================================================

Target file: client/src/pages/matches.tsx

D) Remove duplicate competition dropdown
There are currently two competition dropdowns in the UI.
- Keep ONLY the one that is populated from fetched fixtures data and drives API filtering.
- Remove the old/hardcoded competition dropdown from MatchesFilters if it still exists.
- MatchesFilters should only handle:
  - Sort dropdown
  - Search input (if still needed)
(If you believe Search by team is low-value, do not remove it yet—just leave it for now unless it’s clearly redundant.)

E) Results UX: Quick vs Browse
On the Matches page, on the “Results” view:

1) Add a small toggle at the top of Results controls:
   - Quick | Browse
   Default: Quick

2) Quick mode:
   Replace 7/14/30 style with:
   - Yesterday (days=1)
   - This Week (days=7)
   - Last 30 Days (days=30)
   These buttons should only show on Results tab (not on fixtures).

3) Browse mode (FPL-style):
   - Show Competition dropdown (use the same Select component pattern)
   - Show Round dropdown (Select)
   - Round dropdown options should be fetched from backend:
     - /api/matches/rounds?competitionId=<selected>&days=30
   - When a round is selected:
     - Results query should include round=<round>
   - If no competition selected, disable the Round dropdown with a hint “Select a competition first”.

4) Results data source:
   - Stop using mock results.
   - Use API: /api/matches/results?days=<1|7|30>&competitionId=<optional>&round=<optional>
   - Query keys must include all inputs:
     - ["results", days, competitionId, round]

F) Fixtures UX alignment (do not break)
For fixtures:
- Keep Today / Tomorrow / This Week navigation if it exists.
- Ensure Today and Tomorrow are computed client-side from the fetched fixtures list:
  - Today: kickoff in local day (00:00–23:59 today)
  - Tomorrow: kickoff in local day tomorrow
  - This Week: kickoff within next 7 days (or Mon–Sun if that’s already used)
If Tomorrow count is showing 0 due to server-time issues, fix grouping on client using kickoffTime values.

G) Competition badge label cleanup
Currently competition strings may include “(Brazil) [1140]” etc.
- Implement a display helper:
  - parse “Name (Country) [ID]” => { name, country, id }
  - display as: flag icon + name
- Use a proper flag presentation:
  - Use emoji flags for now (small but acceptable) OR a simple CSS “flag pill” with emoji inside a rounded square.
  - Remove the trophy icon from the competition badge.
- Do NOT show “[ID]” in the pill or dropdown labels.
- Still keep the ID internally for filtering.

H) Team crests question (do not overreach)
Goalserve soccernew feed likely does NOT provide reliable crest URLs.
- Do NOT fake crests.
- Add a clear TODO comment + a graceful extension point:
  - If API later returns homeTeam.logoUrl / awayTeam.logoUrl, use it.
- Keep letter avatars for now.

========================================================
TESTING / ACCEPTANCE
========================================================

1) Re-ingest matches and verify rounds populate:
- Run:
  curl -sS -X POST "http://localhost:5000/api/jobs/upsert-goalserve-matches?feed=soccernew/home" -H "x-sync-secret: $GOALSERVE_SYNC_SECRET"
- Verify:
  psql "$DATABASE_URL" -c "SELECT COUNT(*) total, COUNT(goalserve_round) with_round FROM matches WHERE goalserve_match_id IS NOT NULL;"

2) API checks:
- Results quick:
  curl -sS "http://localhost:5000/api/matches/results?days=7" | head -c 400
- Rounds list:
  curl -sS "http://localhost:5000/api/matches/rounds?competitionId=1204&days=30"
  (Use any valid competitionId that exists in matches.)

3) UI checks:
- Results tab shows Quick/Browse toggle.
- Quick shows Yesterday/This Week/Last 30 Days and returns results from API.
- Browse shows Competition dropdown and Round dropdown (rounds fetched).
- No duplicate competition dropdowns on Fixtures.
- Competition pills show “🇧🇷 Cearense” style without “[1146]” and without trophy icon.
- Today/Tomorrow counts reflect client-side grouping of kickoffTime.

DELIVERABLES
- Provide the exact files changed with brief summaries.
- If any uncertainty about where round is in the feed, add logging in the upsert job to sample one match’s keys (redacting secrets) and implement the extractor defensively so it works across variants.

---

You are working in a Replit TypeScript + React app.

Goal: Clean up the Matches page UX to match Soccerway-style navigation and remove confusing filters.

Please implement the following changes (NO guesses, keep changes minimal and consistent with existing shadcn/ui patterns):

A) Matches page navigation
1) Replace the current top tabs (Today/Tomorrow/This Week/Results) with status tabs:
   - All
   - Live
   - Scheduled
   - Full-time
   These tabs should filter which endpoint we call (or which results we show) based on status.

2) Add a date picker control (single day is fine to start) with default = today (local user time).
   - The date picker controls the fixtures/results window.
   - Remove the 7/14/30 day buttons entirely.

3) Remove the “Search team…” input from the Matches page UI (we will rely on team hub pages for team-specific fixture browsing).

B) API usage (keep backend unchanged unless absolutely required)
1) For “Scheduled” and “All”, fetch from: GET /api/matches/fixtures
   - Add query params that represent the selected date.
   - If the backend only supports days today, implement a simple mapping:
     - selectedDate = today => days=1
     - selectedDate = tomorrow => days=2 and then client-filter to tomorrow only
     - Otherwise use a small range (days=7) and client-filter to selected date.
   Keep it reliable and avoid huge payloads.

2) For “Full-time”, fetch from: GET /api/matches/results
   - Use the same date selection approach.

3) For “Live”, fetch from: GET /api/matches/live

C) Competition dropdown cleanup
1) Ensure there is only ONE competition dropdown on the page.
2) Keep it inline in the same row as the date picker and sort control (not pushed to a second line).
3) Competition dropdown values should NOT show the [id] suffix.
   Example: show “Catarinense” not “Catarinense (Brazil) [1140]”.
   Also remove “(Country)” from the label if we’re showing a flag (see below).

D) Replace emoji flags with proper flag icons
1) Replace emoji flags in competition pills with a small flag icon badge (rounded square or circle, ~16–18px).
2) Implement a helper that maps country names from competition strings to ISO2 codes and uses flagcdn:
   - URL format: https://flagcdn.com/w20/{iso2}.png (lowercase)
3) If country is unknown, show a neutral globe icon badge instead.

E) Fixture card enhancements (only if data exists)
1) If the API response includes venue (match.venue), display it subtly under the date/time line.
2) If venue is null/undefined, do not render the venue row.

Implementation notes:
- Make changes in client/src/pages/matches.tsx and only touch other components if required to remove duplicated UI.
- Keep styling consistent with existing components.
- Do not add new heavy dependencies.
- After changes, the page should show “All/Scheduled/Full-time/Live” tabs, date picker, competition dropdown, sort dropdown, and the fixture list.

When finished:
- Provide a short summary of files changed and how to test manually in the browser.

---

You are working in this Replit project (Football Mad). I need you to fix the Matches page UX + data plumbing WITHOUT me manually editing files. Please implement the changes end-to-end and keep the UI working in both desktop + mobile.

GOALS
1) Date navigation must actually load fixtures for the selected date (currently “next day” shows 0 and the UI still says Today).
2) Desktop layout: all controls in ONE line (tabs + date nav + competition + sort). Mobile: stacked neatly.
3) Fixture ordering: prioritise UK leagues first, then “big 5” Europe, then everything else (still show everything).
4) Competition badge: keep the small flag icon + league name (no emoji, no “[id]”, no “(Country)” text).
5) Keep competition filter working (uses goalserveCompetitionId), and sort by kick-off time (default). Remove team search from this page.

BACKEND CHANGES (Express routes)
A) Add a new endpoint that is date-driven (this is the root fix):
GET /api/matches/day
Query params:
- date=YYYY-MM-DD (required)
- status=all|live|scheduled|fulltime (default all)
- competitionId=<goalserveCompetitionId> (optional)

Behavior:
- Compute start/end for that date in UTC day boundaries:
  start = date + "T00:00:00.000Z"
  end   = date + "T23:59:59.999Z"
- Filter matches.kickoff_time BETWEEN start and end (inclusive).
- Apply status filtering:
  - fulltime: LOWER(status) in FINISHED_STATUSES
  - live: LOWER(status) in LIVE_STATUSES OR numeric minute status
  - scheduled: exclude live + finished (or keep “scheduled” plus other pre-match states)
  - all: no status filter (but still within date window)
- Apply competitionId filter using matches.goalserve_competition_id
- Always ORDER BY kickoff_time asc (base ordering), but also return enough fields for client-side priority sorting.

B) Ensure the response shape includes:
id, slug, kickoffTime, status, homeScore, awayScore, venue, competition, goalserveCompetitionId,
homeTeam (mapped or nameFromRaw), awayTeam (mapped or nameFromRaw)

C) Do NOT break the existing endpoints; just add this new one and use it from the UI.

FRONTEND CHANGES (Matches page)
D) Replace current data fetching on Matches page to use /api/matches/day with the selected date + status tab + competitionId.
- Selected date defaults to today (user’s local date).
- Prev/Next buttons shift selected date by -1/+1 day.
- A “Today” button jumps back to today and is visually active only when selected date is today.
- The date label should be:
  - If selected date is today: “Today — Fri 23 Jan”
  - Otherwise: “Sat 24 Jan 2026” (no “Today” word).

E) Fix the “next day shows 0 matches” bug by ensuring the query actually uses the selected date (not now-based windows).

F) Desktop layout:
- Row 1 (single line): Tabs (All/Live/Scheduled/Full-time) on the left, then Date nav cluster, then Competition dropdown, then Sort dropdown.
- No second-line “Show: 7/14/30” controls. Remove those.
- Remove team search from this page entirely.

G) Mobile layout:
- Tabs on top (scrollable if needed).
- Date nav row.
- Competition + sort row stacked.

PRIORITY ORDERING (client-side, safe + quick)
H) Implement a priority score for competitions, then sort within the selected day:
- UK top priority (in this order): Premier League, Championship, League One, League Two, National League, FA Cup, EFL Cup.
- Next priority: La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie, Champions League, Europa League, Conference League.
- Everything else after.
Implementation detail:
- Use goalserveCompetitionId if possible (preferred), otherwise fallback to competition name matching.
- Keep kick-off time ordering within the same priority band.
So final sort: (priorityScore asc, kickoffTime asc).

FLAG ICONS + COMPETITION NAME CLEANUP
I) In the competition badge and competition dropdown:
- Show a small flag IMAGE (not emoji).
- Remove “(Country)” and “[1234]” from display.
- Keep the underlying filter value as goalserveCompetitionId.
Implementation idea:
- Parse competition strings like:
  - "Catarinense (Brazil) [1140]" => name="Catarinense", country="Brazil", id="1140"
  - "Premier League (Jamaica) [1270]" => name="Premier League", country="Jamaica", id="1270"
  - "Libya: Premier League" => country="Libya", name="Premier League"
- Maintain a small mapping from country name -> ISO2 and use a flag CDN image URL.
- If unknown country, show a neutral globe icon.

VENUE / STADIUM
J) If venue exists in the match record, show it subtly on the card (small text under date/time). If venue is null, show nothing (don’t invent).

DELIVERABLES
1) Implement the new backend endpoint /api/matches/day
2) Update Matches page to use it, fix date nav + layout, remove 7/14/30 + team search
3) Add priority ordering (UK + big Europe first)
4) Ensure competition dropdown is not duplicated and uses clean labels + flag images
5) Quick verification steps:
- curl a specific day: /api/matches/day?date=2026-01-23&status=all
- click next/prev day and confirm matches load
- confirm UK leagues appear at top when present
- competition filter works and shows clean names + flags

Please make the smallest clean set of changes across the relevant files and keep TypeScript types correct.

---

You are working in the Football Mad Replit project.

Goal: fix 3 UX issues on the Matches page:
1) Remove the green “Today” button (it’s redundant because the date picker already shows Today).
2) Implement proper priority ordering so UK leagues come first, then Big 5 European leagues, then UEFA comps, then everything else.
3) Fix date navigation so moving to tomorrow/other dates loads the FULL set of fixtures for that date (not a tiny subset / sometimes empty).

IMPORTANT CONSTRAINTS
- Do NOT change the database schema.
- Keep the existing Matches UI layout with everything on one line on desktop and stacked on mobile.
- Use the existing /api/matches/day endpoint (or adjust it) so the frontend is date-driven.

PART A — BACKEND: make /api/matches/day date-correct and sortable
1) Find the /api/matches/day route in server/routes.ts.
2) Ensure the endpoint filters by the selected calendar day reliably using the DB’s kickoff_time column (timestamp without time zone).
   - Accept query params:
     - date=YYYY-MM-DD (required; default to today in UTC if missing)
     - status=all|live|scheduled|fulltime (default all)
     - competitionId=optional
   - Build the day window as:
     - start = `${date} 00:00:00`
     - end   = `${nextDate} 00:00:00`
     - Compare using kickoff_time >= start AND kickoff_time < end
     - IMPORTANT: do not use NOW() for excluding earlier kickoffs within that day — if the user selects a date, return all matches for that date.
3) Status filtering rules (case-insensitive):
   - FINISHED_STATUSES: finished, ft, full_time, ended, final, aet
   - LIVE_STATUSES: live, inplay, in_play, ht, halftime, et, extra_time, penalties, pen, 1h, 2h
   - scheduled: anything NOT in finished statuses AND NOT in live statuses
   - fulltime: in finished statuses
   - live: in live statuses OR status looks like a minute number (regex ^[0-9]+$)
   - all: no status constraint other than being within the selected day
4) Add priority ordering server-side (so the API returns ordered results):
   - Create a helper normalizeCompetitionName() that strips country prefixes like “Country: ” and removes bracket IDs “ [1234]” and trims.
   - Create getCompetitionPriority(name) returning a low number for higher priority.
   - Priority groups (highest → lowest):
     A) UK: Premier League, Championship, League One, League Two, National League, FA Cup, EFL Cup/Carabao Cup
     B) Big 5: La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie
     C) UEFA: Champions League, Europa League, Conference League
     D) Everything else
   - Implement ordering as:
     (priority ASC), (kickoff_time ASC), (competition name ASC)
   - If competition is null, treat it as lowest priority.
5) Keep response shape unchanged (id, kickoffTime, status, scores, venue, competition, goalserveCompetitionId, team objects, etc.).
6) Add a debug=1 option that returns { date, start, end, status, competitionId, returnedCount, sampleFirst5 } to help verify the day window.

PART B — FRONTEND: remove Today button + ensure date navigation refetches
1) In client/src/pages/matches.tsx:
   - Remove the separate green “Today” button entirely (UI + state + handlers).
   - Keep the date picker and left/right arrows.
2) Ensure date changes trigger refetch:
   - selectedDate should be stored as a YYYY-MM-DD string.
   - The React Query key MUST include: ["matches-day", selectedDate, activeStatusTab, selectedCompetitionId]
   - The fetch URL must be: `/api/matches/day?date=${selectedDate}&status=${status}&competitionId=${selectedCompetitionId}`
     (omit competitionId when empty).
3) Fix the label:
   - When selectedDate == today: show “Today — Fri 23 Jan”
   - Otherwise: show “Sat 24 Jan 2026” (or similar), with no “Tomorrow” heading.
   - The page heading under filters should match the selected date label too.
4) Competition dropdown:
   - Ensure there is only ONE competition dropdown.
   - Options should be derived from the returned matches for that day (unique goalserveCompetitionId + competition name).
5) If the backend sorts, do NOT re-sort differently on the client. Just render in the order received.

PART C — VERIFICATION STEPS (run after changes)
1) Hit the API:
   - curl -sS "http://localhost:5000/api/matches/day?date=2026-01-23&status=all&debug=1" | head
   - curl -sS "http://localhost:5000/api/matches/day?date=2026-01-24&status=all&debug=1" | head
   Confirm returnedCount is > 0 for dates that have fixtures.
2) In the UI:
   - Confirm “Today” button is gone.
   - Clicking next day loads a different (non-empty where applicable) list.
   - UK leagues appear first when present, then Big 5, then UEFA, then the rest.

Deliverable:
- Make the minimum necessary code changes across server/routes.ts and client/src/pages/matches.tsx (and small shared helpers if needed) to satisfy the above.
- Explain briefly what you changed and where.

---

Modify the league priority ordering to support a "Euro nights override".

Current tiers remain the same (Tier 0, Tier 1, Tier 2) BUT apply this extra rule:

EURO NIGHTS OVERRIDE RULE
- For the selected date, first detect if there are any matches whose competition is:
  - UEFA Champions League
  - UEFA Europa League
  - UEFA Europa Conference League
- If YES, then force these UEFA competitions to rank above all domestic competitions for that date,
  while keeping their internal order:
  1) Champions League
  2) Europa League
  3) Conference League
- If NO UEFA matches exist on that date, then normal tier ordering applies (Premier League etc can be top).

Example behavior (important):
- Tue/Wed/Thu with UCL + Premier League: UCL matches appear above Premier League matches.
- Sat with UCL only: UCL is top anyway.
- Sat with no UEFA: Premier League/Championship lead the list.

Implementation notes:
- This should be applied inside /api/matches/day ordering logic BEFORE the rest of tier sorting.
- Continue to enforce the “NO youth/reserves matching” rule (U21/PL2/etc must not match tiers).
- Order within each competition by kickoff_time asc.

Add debug=1 output field:
- hasUefa: boolean
- uefaCounts: { ucl: number, uel: number, uecl: number }
- plus existing startUtc/endUtc/sampleFirst5.

Do not change the UI other than continuing to support sort=kickoff|competition as previously specified.

---

We need to fix Matches page data completeness, ordering, and results accuracy.

====================================================
A) COMPETITION PRIORITY (EXPLICIT + DETERMINISTIC)
====================================================

Implement strict, explicit competition ordering in `/api/matches/day`.

1) Define an explicit priority map (lowest number = highest priority):

Tier 0 (must always be top):
- UEFA Champions League
- UEFA Europa League
- UEFA Europa Conference League
- Premier League (England)
- Championship (England)
- League One (England)
- League Two (England)
- National League (England)
- FA Cup (England)
- EFL Cup (England) / Carabao Cup (England)

Tier 1 (Big 5):
- La Liga (Spain)
- Serie A (Italy)
- Bundesliga (Germany)
- Ligue 1 (France)
- Eredivisie (Netherlands)

Tier 2:
- Scottish Premiership
- Scottish Championship
- Scottish Cup

All other competitions:
- Alphabetical order AFTER the above tiers

2) Add a hard demotion rule for youth / reserve competitions.

Create a helper:
isYouthOrReserveCompetition(name: string)

Return true if competition name contains ANY of:
- U21
- U23
- U19
- U18
- Youth
- Reserve
- Reserves
- Premier League 2
- Premier League Cup

If true:
- Force priorityRank = 9000 (or similar)
- These must NEVER outrank senior Tier 0 / Tier 1 leagues

This fixes Premier League 2 / U21 pollution.

====================================================
B) EURO NIGHTS OVERRIDE (UEFA LOGIC)
====================================================

If the selected date contains ANY UEFA matches:
- UEFA Champions League
- UEFA Europa League
- UEFA Europa Conference League

Then:
- UEFA competitions must float ABOVE all domestic leagues
- Internal UEFA order remains:
  UCL → UEL → UECL

IMPORTANT:
- Do NOT treat CAF / AFC / CONCACAF Champions League as UEFA
- Match must explicitly start with "UEFA"

Example:
- Tuesday/Wednesday/Thursday with UEL → UEL above Premier League
- Saturday with UCL night → UCL above Premier League
- No UEFA matches → default domestic priority applies

====================================================
C) SORTING MODES (BACKEND + FRONTEND)
====================================================

Support query param: `sort=competition|kickoff`

Default: sort=competition

Sorting rules:

sort=competition:
1) priorityRank
2) competitionName (alphabetical)
3) kickoffTime

sort=kickoff:
1) kickoffTime
2) priorityRank
3) competitionName

Frontend:
- Restore Sort dropdown
- Options:
  - Competition (default)
  - Kick-off time
- Send `sort` param to `/api/matches/day`

====================================================
D) FIX MISSING FINAL SCORES (RESULTS BUG)
====================================================

Issue:
Finished games are showing "-" instead of scores.

Fix in Goalserve ingest:

1) When status is FT / finished:
- Parse final scores from correct Goalserve fields
- Persist homeScore and awayScore

2) Never overwrite non-null final scores with null
- If a later ingest has no score fields, skip score update

3) Add minimal logging:
- Count FT matches ingested with scores
- Count FT matches missing scores

This fixes Thursday results showing no scores.

====================================================
E) FIX MISSING FUTURE FIXTURES (SATURDAY BUG)
====================================================

Root cause:
Only ingesting `soccernew/home` → does NOT contain full future schedules.

Required feeds to ingest:

1) Continue:
- soccernew/home (today snapshot)
- soccernew/live (live updates)

2) ADD scheduled ingests:
- soccernew/d-1   → yesterday results
- soccernew/d1    → tomorrow fixtures
- soccernew/d2..d7 → next 7 days fixtures

Recommended cadence:
- home + live: every 5–10 minutes
- d1..d7: hourly
- d-1: hourly or daily

This ensures:
- Saturday shows FULL fixture list (Premier League first)
- Tomorrow is not limited to 5 obscure matches

(Optional hardening)
For Tier 0 / Tier 1 leagues:
- Periodically ingest `soccerfixtures/leagueid/{leagueId}`
- Guarantees long-range schedules beyond 7 days

====================================================
F) ACCEPTANCE CHECKS
====================================================

✅ Today:
- No Premier League 2 / U21 at the top
- Senior competitions only in Tier order

✅ Thursday (results):
- UEFA Europa League first
- Final scores visible (not "-")

✅ Saturday (fixtures):
- Full schedule visible
- Premier League first, then Championship, etc.

✅ UI:
- Sort dropdown present
- sort=competition and sort=kickoff both work

====================================================
END

---

Replit AI Prompt — Fix TODAY page: (1) double date picker overlay, (2) Polish Championship incorrectly prioritised

Context
On /matches, clicking the date opens TWO calendar popovers at once (see screenshot). Also league priority ordering is still wrong: “Polish Championship” is appearing above “Championship (England)”.

Goal
1) Date picker: ensure ONLY ONE calendar popover can open at a time.
2) Priority ordering: make “Championship (England)” rank in Tier 0, but “Polish Championship” must NOT be treated as Tier 0.
3) Keep existing layout (inline desktop, stacked mobile), keep current tabs, keep “All competitions”, keep sort dropdown.

Part 1 — Fix the DOUBLE date picker
Likely cause: the date control is rendered twice (desktop + mobile) without responsive hiding, OR we have two Popovers wired to the same trigger, OR we accidentally mount two Calendar components (one in a header, one in a filter bar).

Tasks
A) Locate the date picker UI in:
- client/src/pages/matches.tsx (most likely)
and/or
- client/src/components/matches/* (if extracted)

B) Search for duplicate calendar/popover usage:
- Look for <Popover> / <Calendar> / <DatePicker> / <DayPicker> / <PopoverTrigger>
- If there are TWO instances (desktop + mobile), enforce responsive rendering:
  - Desktop instance should be wrapped with `hidden md:flex` (or `hidden lg:flex`)
  - Mobile instance should be wrapped with `flex md:hidden`
  so only one is mounted at any viewport width.

C) If there’s only one instance, the issue may be event bubbling / nested triggers:
- Ensure ONLY ONE <PopoverTrigger asChild> wraps the clickable date button.
- Ensure the date button does NOT contain another nested trigger element.
- Ensure we don’t render a second <Calendar> inside another PopoverContent nearby.

D) Confirm fix:
- Click date => exactly one calendar appears.
- Clicking outside closes it.
- Changing date updates fixtures.

Part 2 — Fix league ordering: Polish Championship above English Championship
Root cause: the priority matcher is still using loose substring checks (e.g. `includes("championship")`) or a non-country-aware mapping, so “Polish Championship” gets matched as “Championship”.

Tasks
A) Backend ordering (server/routes.ts or wherever /api/matches/day sorting lives)
1) Identify the function that calculates “priority score” for a match/competition.
2) Replace ANY broad checks like:
   - name.includes("championship")
   - name.includes("premier league")
with strict, country-aware matching.

B) Implement strict parsing + strict keys
1) Add a parser:
   parseCompetitionParts(raw: string) => { name: string, country: string | null }
   Support formats you currently have:
   - "Championship (England) [xxxx]"
   - "ENGLAND: Championship"
   - "UEFA Europa League (Eurocups) [1007]" => country = "UEFA"
2) Normalize:
   - nameNormalized = lowercased, trimmed, remove extra punctuation, remove bracketed [id]
   - countryNormalized = lowercased, trimmed
3) Build strict key:
   key = `${countryNormalized}|${nameNormalized}`
   Examples:
   - "england|championship"
   - "poland|championship"
   - "uefa|champions league"

C) Priority map MUST use strict keys
Tier 0 examples (exact):
- uefa|champions league
- uefa|europa league
- uefa|conference league
- england|premier league
- england|championship
- england|league one
- england|league two
- england|national league
- england|fa cup
- england|efl cup
- england|carabao cup

Important rule:
If name is ambiguous (“premier league”, “championship”), DO NOT assign Tier 0 unless country is England/UEFA as appropriate.
So:
- "poland|championship" must NOT map to Tier 0.
- "premier league (jamaica)" must NOT map to Tier 0.
If country is missing for an ambiguous name, treat as “other” (don’t over-prioritise).

D) Youth/reserve demotion stays
Ensure any league name containing:
u21/u20/u19/u18, reserve(s), youth, academy, “premier league 2”, development
=> priority = 9000 (unless UEFA senior comps).

E) Verify with quick SQL + UI
1) UI: Today should show “Championship (England)” above “Polish Championship”.
2) Add a temporary debug output for /api/matches/day?debug=1 that returns:
- top 15 competitions in returned order with their computed priority keys
Remove debug once verified.

Deliverables
- Fix double date picker (single popover)
- Fix strict competition priority keys so England Championship outranks Polish Championship
- No layout regressions

Now implement these changes end-to-end and provide a short summary of which files you edited and how to test.

---

You are working in a Node/TS backend for Football Mad. We need to fix Matches page ordering by making the /api/matches/day debug output useful and by hardening priority sorting so only exact (country, league) matches can land in Tier 0/1/2.

CONTEXT:
- Current endpoint: GET /api/matches/day?date=YYYY-MM-DD&status=all|live|scheduled|fulltime&sort=competition|kickoff&debug=1
- Right now debug=1 replaces the response with metadata only (date/start/end/returnedCount/sampleFirst5). There is no topSamples.
- The UI ordering is still wrong (e.g. "Championship" from non-England sometimes appears top).
- We need to be explicit: Tier 0 includes UEFA comps + England leagues/cups; Tier 1 big 5; Tier 2 Scotland. Youth/reserve must be demoted.

GOALS:
1) Change debug behavior: debug=1 should NOT replace the response. It should return the normal response (matches array) PLUS a "debug" object.
2) Add "debug.topSamples" containing the first 50 matches AFTER sorting, but each entry should include:
   - id, kickoffTime, status, competition (raw), goalserveCompetitionId
   - parsedCountry, parsedLeague (from competition string)
   - leagueKey used for priority lookup
   - priority number
   - sortKey tuple (priority, compName, kickoffTime) used in comparator
3) Add "debug.leagueSummary": counts per leagueKey for the day (top 30) to see what leagues exist and their computed priorities.
4) HARDEN parsing + priority:
   - NEVER default missing country to "England"
   - Normalize country + league names to lowercase, trimmed
   - leagueKey MUST be `${countryNorm}|${leagueNorm}` when country is present
   - If country cannot be parsed, set countryNorm="unknown"
   - If leagueNorm is ambiguous (e.g. "championship", "premier league", "league one", "league two", "national league") and countryNorm="unknown", force priority to 9000 (bottom) to avoid incorrect Tier 0 matches.
5) Implement explicit tier map (exact key matches only):
   Tier 0 (0-100):
     uefa|champions league
     uefa|europa league
     uefa|conference league
     england|premier league
     england|championship
     england|league one
     england|league two
     england|national league
     england|fa cup
     england|efl cup
     england|carabao cup  (treat as same as efl cup)
   Tier 1 (200-299):
     spain|la liga
     italy|serie a
     germany|bundesliga
     france|ligue 1
     netherlands|eredivisie
   Tier 2 (300-399):
     scotland|premiership
     scotland|championship
     scotland|scottish cup
   Defaults:
     - unknown leagues: 1000
     - youth/reserve/u21/u19/u18/u23/reserve/academy/friendly competitions: 9000
   IMPORTANT: Youth demotion must trigger if the competition name includes: "u21","u23","u19","u18","youth","reserve","reserves","academy","premier league 2","premier league cup"
6) Sorting modes:
   - sort=competition: primarily by (priority asc), then (competitionDisplayName asc), then kickoffTime asc
   - sort=kickoff: primarily by kickoffTime asc, then priority asc, then competitionDisplayName asc
   Ensure priorities are numbers and comparator is stable.

IMPLEMENTATION DETAILS:
- Edit server route handler for /api/matches/day in server/routes.ts (or whichever file defines it).
- There is already competition parsing logic; replace it with a single helper:
   parseCompetition(competitionString) -> { countryNorm, leagueNorm, competitionDisplayName }
   It should handle:
     "Name (Country) [ID]" => league=Name, country=Country
     "Country: Name" => league=Name, country=Country
     "UEFA Europa League" => country=UEFA, league=Europa League (treat countryNorm="uefa")
   If no country present -> countryNorm="unknown"
- Add helpers:
   isYouthCompetition(competitionLower)
   getPriority(countryNorm, leagueNorm, competitionLower)
- Make sure the endpoint always returns:
   { matches: MatchDTO[], ...existing fields if any..., debug?: {...} }
   If you currently return an array, wrap it in an object so we can include debug.
   Update frontend fetch accordingly ONLY IF needed (but prefer to keep response shape consistent with existing non-debug call).
   If changing shape is risky, then:
     - keep existing response for non-debug
     - for debug only, return { matches, debug, ...meta }
- Add tests or at least a quick local verification:
   curl ".../api/matches/day?date=2026-01-23&status=all&sort=competition&debug=1"
   should include debug.topSamples with computed priorities.

DELIVERABLES:
- Commit-ready code changes.
- A brief note in the response: exactly where to look in the debug payload to see computed priorities, and how to confirm "england|championship" is not being applied to Indonesia/Poland "Championship".

DO NOT:
- Do not use jq.
- Do not install new dependencies.
- Do not handwave; implement actual code and ensure it compiles.

---

We have confirmed backend priority sorting is correct via debug.topSamples:

- england|championship priority=5 appears FIRST
- indonesia|championship priority=1000 is far lower

So if the UI still shows Polish/Indonesia above English Championship, the issue is FRONTEND: either it isn't calling /api/matches/day, it is re-sorting client-side, or React Query caching is mixing results.

Please do ALL of the following, minimally and safely:

1) In client/src/pages/matches.tsx, locate the React Query call(s) that fetch matches for the "Today" view.
   - Ensure Today view uses ONLY /api/matches/day with parameters:
     date=YYYY-MM-DD (selected date)
     status=<tab status> (all/live/scheduled/fulltime)
     sort=<selected sort> (competition|kickoff)
     competitionId=<selected competitionId or omitted>
   - Remove any remaining usage of:
     /api/matches/fixtures
     /api/matches/results
     /api/matches/live
     OR any mock matches for the main Matches page.

2) Ensure React Query key includes EVERY parameter that affects results:
   ["matches-day", dateISO, status, sort, competitionId]
   (no generic keys like ["matches"] or ["fixtures"]).

3) Remove any client-side sorting that reorders the list after fetch.
   - Search for .sort( or orderBy or applyFilters() in matches.tsx and delete or disable it.
   - The UI should render matches in the exact order returned by the API.

4) Add a temporary DEV debug banner at the top of the Matches page (only in development):
   - Show the exact URL being fetched
   - Show first 3 returned competitions in order
   Example:
     Fetching: /api/matches/day?date=...&status=...&sort=...
     First: Championship (England) [1205]
     Second: Serie A (Italy) [1269]
     Third: Bundesliga (Germany) [1229]

This will prove the UI is using the correct endpoint and not overriding ordering.

Return the exact file diffs and confirm the Matches page compiles.

---

We have a Matches page ordering bug that is actually caused by FRONTEND grouping, not backend sorting.

Evidence:
- Backend /api/matches/day?date=2026-01-23&status=all&sort=competition returns correct ordering (debug banner shows first = "Championship (England) [1205]").
- UI shows 2 Indonesian "Championship" fixtures above the England Championship fixture because the UI groups competitions by a stripped display label ("Championship"), merging different leagues with the same name.

Task: Fix frontend grouping + display so different competitions are never merged.

Requirements:
1) Use a UNIQUE grouping key for competitions:
   - Prefer goalserveCompetitionId (string) as group key.
   - If missing, fallback to the raw competition string (including country + [id]) or a derived leagueKey.
   - Do NOT use competitionDisplayName as group key.

2) Keep a display label, but ensure it does not cause collisions:
   - Build competitionDisplayName for the pill (e.g. strip "[id]" suffix).
   - Detect collisions on the current page: if more than one competition shares the same display label, show disambiguated labels including country (e.g. "Championship (England)" vs "Championship (Indonesia)").

3) Ensure rendering order stays exactly the server order:
   - Do NOT sort matches client-side (unless explicitly in "sort=kickoff" mode, but even then rely on server).
   - When grouping for display, preserve the FIRST OCCURRENCE order of competition groups based on the match array order.

Files likely involved:
- client/src/pages/matches.tsx (grouping logic)
- apiMatchToMockMatch mapper (ensure goalserveCompetitionId is available on the object used to render)
- EnhancedMatchCard / competition pill rendering (label disambiguation)

Acceptance criteria:
- On 2026-01-23, the England Championship fixture (Derby vs West Brom) appears before the Indonesian Championship fixtures in Competition sort mode.
- If multiple "Championship" leagues exist, the pill shows "Championship (England)" and "Championship (Indonesia)" (or equivalent), not both as just "Championship".
- The debug banner first/second/third competitions match what appears at the top of the list visually.

---

PROMPT — Matches page finishing polish (remove debug, clarify sort label, prioritise competition dropdown, fix 1-game desktop layout)

Context
- Football Mad Matches page
- Debug banner was added to verify backend order; grouping bug fixed by grouping with goalserveCompetitionId and preserving server order via Map.
- Now we want UI polish:
  1) Remove debug banner
  2) Rename the sort dropdown label so it doesn’t clash with “All competitions”
  3) Apply the same priority logic to the “All competitions” dropdown ordering (Tier 0/Tier 1/Tier 2 then alphabetical)
  4) Handle desktop 2-column layout when there’s only one match (avoid awkward empty column)

Tasks

A) Remove the debug banner (DEV DEBUG)
- In client/src/pages/matches.tsx remove the “DEV DEBUG – API Ordering Check” banner entirely.
- Remove any related useMemo/consts used only for that banner (e.g., debugInfo, isDev).
- Ensure no debug UI renders in any environment.

B) Rename “Competition” sort dropdown label to avoid clash with “All competitions”
- Keep the sort dropdown functionality (competition vs kickoff).
- Change the displayed placeholder/label from “Competition” to “Sort by” (preferred) or “Order by”.
- Options should read:
  - “Sort by: Competition”
  - “Sort by: Kick-off time”
  (Or equivalent, but make it obvious this is sorting, not filtering.)
- Ensure the filter dropdown remains “All competitions” and is clearly a filter.

C) Prioritise the “All competitions” dropdown using the same tier logic as match ordering
Goal
- The competition filter list should not be purely alphabetical; it should surface Tier 0 leagues first, then Tier 1, Tier 2, then everything else alphabetical.
- Keep “All competitions” at the top.

Implementation detail
- Build the competition list from matchesData (unique competitions), using goalserveCompetitionId as the unique key.
- For each competition option, compute a sortKey using the SAME parsing + priority logic as the backend:
  - Use rawCompetition if present; else use competition string.
  - Parse “League (Country)” and “UEFA …” correctly.
  - Produce a leagueKey like `england|championship`, `uefa|europa league`, etc.
  - Assign a numeric priority (Tier 0 first, Tier 1, Tier 2, then default 1000, youth/reserve 9000).
- Then sort competition options by:
  1) priority asc
  2) display name asc (within same priority)
- IMPORTANT: disambiguate duplicate display names in the dropdown the same way we do in the match badges:
  - If two competitions share the same display name, show “Name (Country)” for both.
  - But if already “Name (Country)” don’t double-wrap.

Where to implement
- Whatever file currently builds the competition dropdown options (likely matches.tsx or MatchesFilters component).
- Keep it local to the Matches page for now (no premature abstraction), but avoid duplicating logic if there’s already a client helper.

D) Desktop layout when only one match is playing
Goal
- If a competition group has only 1 match, it should render as a single full-width card (not a 2-column grid with an empty gap).
- If there are 2+ matches, keep the 2-column grid on desktop.
- On mobile remain single column always.

Implementation suggestion
- In the component that renders match cards for a group:
  - If groupMatches.length === 1:
    - render a single card inside a full-width container
  - else:
    - render grid with md:grid-cols-2 (or equivalent)
- Ensure spacing stays consistent between groups.

Acceptance checks
- No debug banner visible.
- Sort dropdown label reads “Sort by” (or “Order by”) and doesn’t look like a competition filter.
- Competition filter dropdown shows Tier 0 (UEFA + England) first, then Big 5, then Scotland, then rest.
- Duplicate competition names are disambiguated in dropdown list.
- A competition day with only one match shows a single centred/full-width card on desktop with no empty column effect.

Notes
- Do NOT change backend endpoints or data ingest in this task; purely UI polish.
- Keep existing functionality working: tabs, date nav, competition filter, sort mode.

---

Update the Matches page UI labels and dropdown behavior:

1) Rename the dropdown labels to be explicit:
- Change the competition dropdown label/placeholder from "All competitions" (and any ambiguous label like "Competition") to:
  - Label: "Filter by:"
  - Placeholder/default option text: "All competitions"
- Change the ordering dropdown label/placeholder from "Competition" to:
  - Label: "Sort by:"
  - Default option text: "Competition"

2) Filter dropdown contents:
- The "Filter by" dropdown should list ONLY competitions that have at least 1 match on the selected day (i.e. from the currently fetched matches payload for that date/status).
- Keep the options ordered using the same priority logic as the matches list (Tier 0 first, then Tier 1, Tier 2, then the rest).
- Continue showing the country flag + competition label in the dropdown items.

3) Sort dropdown contents:
- The "Sort by" dropdown should have ONLY two options:
  - "Competition" (default) -> uses server ordering /api/matches/day?sort=competition
  - "Kick-off time" -> uses /api/matches/day?sort=kickoff
- Ensure changing Sort does NOT reset the selected Filter (and vice versa).

4) Keep everything else unchanged:
- Do not reintroduce the removed “Today” button.
- Do not add client-side sorting of matches; render in server order.
- Ensure the two dropdowns remain aligned on desktop and stack neatly on mobile.

Implement the changes in the Matches page components (and any dropdown components they use), then run the app and sanity-check:
- Default view shows Filter by: All competitions, Sort by: Competition
- Filter options reflect only today’s competitions
- Sort toggles between competition grouping and kickoff ordering correctly.

---

Fix the Matches page dropdown UX so the labels are INSIDE the dropdown triggers (not separate text next to them), and restore desktop nav consistency.

Goal:
- The top nav row should be: [status tabs] … [date nav] [Filter dropdown] [Sort dropdown]
- No standalone "Filter by:" or "Sort by:" text sitting outside the dropdowns.

What to change:

1) Dropdown trigger text (collapsed state)
- Filter dropdown trigger should display: "Filter by…"
  - If a competition is selected, display: "Filter by… <Competition Name>"
  - If none selected (all), display: "Filter by… All competitions"
- Sort dropdown trigger should display: "Sort by…"
  - Display selected mode in the trigger, e.g. "Sort by… Competition" or "Sort by… Kick-off time"

2) Dropdown menu items (expanded state)
Filter menu:
- First item: "All competitions" (selects none)
- Then list ONLY competitions available for that day, ordered by the same priority logic as the matches list
- Items should still show the flag + label

Sort menu:
- Two items only:
  - "Competition"
  - "Kick-off time"

3) Layout / alignment
- Remove the external label elements ("Filter by:" and "Sort by:") from the layout entirely.
- Ensure both dropdown triggers share the same sizing/height as the date picker controls and sit on the same line on desktop.
- On mobile, they can stack under the date picker but maintain consistent spacing.

4) Do NOT change behavior
- Filter list remains “only competitions on this day”
- Sort changes the API sort param (competition/kickoff)
- No client-side sorting of matches

Deliverable:
- Update the Matches page JSX so the triggers contain the “Filter by…” / “Sort by…” text.
- Remove the outside labels that currently break alignment.
- Verify visually on desktop: date picker + both dropdowns align in one row.

After implementing, share a screenshot of the updated top control row (desktop width) showing the triggers reading:
- "Filter by… All competitions"
- "Sort by… Competition"

---

IMPORTANT EXECUTION RULES (READ FIRST)

- Make ONE implementation pass only.
- DO NOT run automated tests.
- DO NOT re-test, re-run, or iterate.
- DO NOT refactor unrelated code.
- DO NOT “double-check”, “validate again”, or loop.
- After changes compile, STOP.

You are working in the Football Mad frontend (Vite + React).
Frontend UI/layout changes ONLY. No backend changes.

--------------------------------------------------
GOALS
--------------------------------------------------

1) MOBILE LAYOUT — STACKED CONTROLS
On mobile ONLY:
- Controls must be stacked vertically in this order:
  1. Date navigation row (already correct)
  2. Filter dropdown (full width)
  3. Sort dropdown (full width, BELOW filter)

On desktop:
- Keep current layout (Filter + Sort inline to the right of date picker).

Implementation note:
- Use responsive utility classes only (e.g. Tailwind breakpoints).
- Do NOT duplicate components.

--------------------------------------------------

2) REMOVE “(Country)” TEXT EVERYWHERE
- Remove country names in brackets from ALL competition labels.
- This includes:
  - Match cards
  - Filter dropdown options
  - Selected filter labels

Rules:
- Country identification must rely ONLY on the flag pill.
- Keep competitions separated by competitionId (already implemented).
- DO NOT add new text-based disambiguation.
- If two leagues share the same name, the flag alone is sufficient.

--------------------------------------------------

3) CENTER COMPETITION PILL ABOVE KICKOFF TIME
- In match cards:
  - Center the competition pill (flag + league name)
  - Position it ABOVE the kickoff time
  - Align centrally with the time column

- Team layout stays unchanged.
- Applies to both mobile and desktop.

--------------------------------------------------
CONSTRAINTS
--------------------------------------------------

- No new libraries.
- No backend changes.
- No new state management.
- Keep existing filtering, sorting, grouping logic.
- Keep dropdown placeholders:
  - “Filter by…”
  - “Sort by…”

--------------------------------------------------
LIKELY FILES
--------------------------------------------------

- Matches page layout:
  client/src/pages/matches.tsx

- Match card UI:
  client/src/components/EnhancedMatchCard.tsx (or similar)

- Filter dropdown option rendering:
  Matches page or related component

--------------------------------------------------
STOP CONDITION
--------------------------------------------------

Once:
- UI compiles
- Layout matches screenshots
- No “(Country)” text appears
→ STOP immediately and report changes made.

Do NOT continue testing.

---

You are working in the Football Mad repo. We need **UI-only fixes** on /matches. DO NOT go into long test loops. Make the changes, run only:
- `npm run typecheck` (or `pnpm typecheck` depending on repo)
- a quick manual smoke check in the browser (mobile + desktop)
No e2e suites, no repeated re-testing.

GOALS (based on screenshots):
1) DESKTOP — Restore the “classic” horizontal alignment:
   - Home team crest + name on the left, away team crest + name on the right, kickoff time centered on the same horizontal line as team names/crests.
   - The country/league pill must NOT push the kickoff time down. We want the pill **above** the kickoff time, but the kickoff time stays aligned with teams.
2) MOBILE —
   - Filters already stack vertically (good). Now **center** the text inside the dropdown triggers (“Filter by…”, “Sort by…”).
   - Fix pill/time collision: pill must not squash into kickoff time.
   - Fix team spacing/truncation: ensure both team names truncate nicely and do not overlap. Away team must not “bleed” off the right edge.
3) LEAGUE LABELS — Remove “(Country)” brackets in the league pill and in the Filter dropdown options.
   - We already have the country flag in the pill; that’s enough.
   - Exception handling: if there’s a collision (same league display name from multiple countries in the same list), do NOT use brackets. Instead, show the **flag + league name** and (only when collision) append a subtle “• <Country>” (not in brackets), or show a second small muted line with country. But default should be NO country text.

IMPLEMENTATION NOTES (important):
A) Fix the match card layout using a 2-row grid so pill sits in row 1 (center only) and the “main line” sits in row 2:
   - Outer card body: `grid` with 3 columns (home | center | away).
   - `grid-rows-[auto_auto]`
   - Row 1: center column contains the competition pill.
   - Row 2: home, kickoff time, away (all aligned).
   - Home/away content should be placed explicitly in row 2 so kickoff time aligns with team names/crests.
B) Prevent overflow/bleed on mobile:
   - Add `min-w-0` to grid children that contain text.
   - Apply `truncate` + `overflow-hidden` to team name text spans.
   - Ensure card container uses `overflow-hidden`.
   - Right side team name should be `text-right truncate`.
C) Center the trigger text on mobile only:
   - On the Filter/Sort SelectTrigger (or equivalent component), add responsive classes like:
     - `justify-center text-center` for base
     - then override for desktop with `sm:justify-between sm:text-left` if needed
   - Keep desktop looking the same as before.
D) Remove “(Country)” from league pill and dropdown labels:
   - Find where `competitionLabel` / disambiguation is created.
   - Change default label to league name only.
   - Only add extra country indicator on collisions and do it as “• Country” (no brackets), ideally muted.

FILES LIKELY INVOLVED (adjust as needed):
- `client/src/components/MatchesList.tsx` (grouping + label building)
- `client/src/components/EnhancedMatchCard.tsx` (layout)
- `client/src/pages/matches.tsx` (filter/sort triggers layout/classes)
- Any shared select UI component used for triggers.

DELIVERABLE:
- Make the UI match the goals above.
- Post a short summary of the exact files changed and what you changed.
- Do NOT add new features or refactor unrelated code.

---

We have a few final UI tweaks on /matches. Keep this tight: implement + typecheck + quick manual check. NO long test loops.

A) DESKTOP — One fixture per row + faint divider between competitions
1) Change the matches grid/list so desktop is SINGLE column (1 card per line), not 2-column.
   - If there is a grid like `md:grid-cols-2` / `lg:grid-cols-2`, remove it and keep `grid-cols-1` always.
2) Add a subtle divider between competition groups:
   - When rendering grouped competitions in `MatchesList.tsx`, insert a thin divider between groups (not between each match).
   - Use Tailwind like: `border-t border-gray-200/60 dark:border-white/10 my-6` or equivalent.
   - Do NOT add heavy headings; keep it faint and clean.

B) MOBILE — Center text, arrow right aligned in dropdown triggers (consistent with site)
Currently we centered the whole trigger which also centers the chevron. Fix:
1) For Filter and Sort triggers, keep:
   - text centered
   - chevron icon pinned to the right
2) Implement by making trigger `relative` and absolutely positioning chevron:
   - Trigger: `relative`
   - Text container: `w-full text-center`
   - Chevron: `absolute right-3 top-1/2 -translate-y-1/2`
3) Apply on mobile only (base), preserve desktop default with `sm:` overrides if necessary.

C) REMOVE ALL “(Country)” BRACKETS EVERYWHERE (pill + dropdown + cards)
We should never show “(England)” (or any country) in brackets.
1) Find label builder (likely in `MatchesList.tsx` disambiguation logic):
   - Default label must be JUST league name (e.g. “Championship”).
2) Collision case (same league name appears for multiple countries in the current list):
   - Still no brackets.
   - Use: “Championship • England” (muted bullet separator) OR a second muted line with the country.
   - Keep pill flag visible either way.
3) Ensure this applies both to:
   - Match cards’ competition pill
   - Filter dropdown options

D) MOBILE — Reduce team-name truncation by aligning names closer to kickoff time
Goal: maximize usable width for both team names on mobile.
1) In the match card layout on small screens:
   - Put home crest + name in a left block that ends near the center.
   - Put away crest + name in a right block that starts near the center.
   - Kickoff time stays centered.
2) Practical approach (small screen):
   - Use 3-column grid: `grid-cols-[1fr_auto_1fr]` for the “main row”.
   - Home block: `min-w-0 flex items-center gap-2 justify-end` (name hugs center)
   - Away block: `min-w-0 flex items-center gap-2 justify-start` (name hugs center)
   - Keep truncate on names, but this will give them more room.
   - Ensure away side still doesn’t overflow: add `min-w-0` + `truncate` + `overflow-hidden`.

FILES TO CHANGE (likely):
- `client/src/components/MatchesList.tsx`
  - force single-column
  - add divider between competition groups
  - remove bracketed country in labels (and implement collision formatting without brackets)
- `client/src/components/EnhancedMatchCard.tsx`
  - mobile layout tweaks for name alignment (hug center)
- `client/src/pages/matches.tsx` (or shared Select component)
  - trigger layout: centered text + chevron right aligned on mobile

VALIDATION (do only this):
- run `npm run typecheck` (or repo equivalent)
- quick manual check:
  - desktop: one card per row + subtle divider between competitions
  - mobile: centered text, chevron right, no “(Country)” anywhere, improved name spacing, no bleed/overflow

Return a short summary of what changed + which files.

---

Fix D) mobile truncation in match cards by changing the small-screen layout to a true 3-column grid: [home | kickoff | away], with home/away names hugging the kickoff time (towards centre), not the outer edges.

CONSTRAINTS:
- Do NOT change data fetching, sorting, grouping, or backend.
- Do NOT rework desktop layout unless needed; scope changes to mobile (base) with `sm:`/`md:` overrides.
- No long test loops: make changes, run typecheck once, quick manual visual check only.

WHAT TO CHANGE
1) Find the match card component used in /matches list (likely `client/src/components/EnhancedMatchCard.tsx`).
   Locate the section that renders:
   - home crest + home name (left)
   - kickoff time (centre)
   - away name + away crest (right)

2) On MOBILE (base classes), implement this structure:
   - Wrap the “main row” in:
     `grid grid-cols-[1fr_auto_1fr] items-center gap-3`
   - HOME column (left):
     `min-w-0 flex items-center justify-end gap-2`
     (IMPORTANT: justify-end makes the name hug the centre)
     Inside it:
       crest (fixed size)
       name with `min-w-0 truncate text-left` (or text-right if you prefer, but must truncate correctly)
   - KICKOFF column (middle):
     `flex flex-col items-center justify-center`
     include the competition pill above time if currently there, but ensure it does NOT affect the row’s width:
       - pill should be centered and `max-w-full`
       - time stays centered
   - AWAY column (right):
     `min-w-0 flex items-center justify-start gap-2`
     Inside it:
       name with `min-w-0 truncate text-right` (or text-left, but truncate correctly)
       crest (fixed size)

3) Ensure NO OVERFLOW / BLEED:
   - Apply `min-w-0` to both home and away containers AND the name span.
   - Names must use `truncate overflow-hidden whitespace-nowrap`.
   - Crests must be fixed: e.g. `shrink-0 w-10 h-10` (whatever you currently use).

4) Keep DESKTOP behaviour as-is:
   - Use `sm:` or `md:` to restore the existing desktop flex layout if needed.
   Example pattern:
   - Mobile: grid (as above)
   - `sm:flex sm:items-center sm:justify-between` for your current desktop row

ACCEPTANCE CHECKS (manual, quick):
- On mobile, Derby and West Brom should display far less truncation (ideally full on common names).
- Home/away names should visually “hug” the centre time.
- No horizontal scrolling; away team must not bleed off-screen.

After implementation:
- run `npm run typecheck` (or repo equivalent) once.
- reply with the exact file(s) changed and what classes/structure you used.

---

You are working in the Football Mad Replit codebase. Make **targeted UI-only changes** (no refactors, no long test loops). Do **NOT** run lengthy E2E suites or “test/retest” loops — only do: `pnpm lint` (or equivalent) + a quick manual smoke check in the browser.

GOAL: Fix the Matches page layout regressions and mobile truncation issues.

--------------------------------------------
A) Revert the “hug the centre” layout on desktop
--------------------------------------------
Desktop looked better previously with natural spacing. Undo any recent changes that centered/hugged team names + crests toward the middle on desktop.

Acceptance:
- On desktop: home team/crest stays left, away team/crest stays right, kickoff time is centered between them (classic layout).
- No “compressed” center-hugging look.

--------------------------------------------
B) Make the competition pill SHORT again (remove country text everywhere)
--------------------------------------------
The pill should NOT include country in brackets or in any “• England” / “(England)” style.

Rules:
- The pill should display the competition/league name ONLY (e.g. “Championship”, “Serie A”, “Bundesliga 2”).
- The flag in the pill already conveys the country — no country name text appended in any format.
- This applies BOTH in match cards and in dropdown options.

Implementation hint:
- Find where `competitionLabel` (or any “disambiguated label”) is being built and remove the country suffix logic.
- Keep the country flag icon logic as-is.

Acceptance:
- No pills show “(England)” or “• England” or any country text.
- “Championship” remains “Championship” (flag still shows).

--------------------------------------------
C) Mobile: Stop team-name truncation + overflow (Derby/West Brom showing as “D…” / “W..”)
--------------------------------------------
Problem: a long pill is starving horizontal space, causing extreme truncation and even overflow off-screen.

Fix strategy (mobile-first):
1) On mobile, place the competition pill on its **own row at the top** of the card (full-width, centered).
2) The teams + kickoff row underneath should be a **3-column grid**:
   - Left column: home crest + home name (allow more width)
   - Middle: kickoff time (fixed width / does not wrap)
   - Right column: away name + away crest (allow more width)
3) Ensure text truncation is sensible (e.g. `truncate`), but names should generally show much more than 1 character.
4) Ensure NOTHING bleeds outside the card:
   - Add `min-w-0` to grid children where needed
   - Use `overflow-hidden` on the card content container if required

Desktop should remain the classic single-row layout (pill should NOT push kickoff time down on desktop):
- On desktop, pill should sit above the teams/time row OR be positioned so the kickoff time stays aligned with team names/crests (no vertical push that breaks alignment).

Acceptance:
- On mobile: “Derby” and “West Brom” show materially more characters (not just “D…” / “W..”).
- No horizontal overflow off the right edge.
- Kickoff time stays centered and readable.

--------------------------------------------
D) Desktop: “one fixture per line” (no 2-column grid) + faint divider between competition groups
--------------------------------------------
Change desktop layout so matches render as a single column list (one match card per row).
Add a subtle divider line between competition groups (when the competition changes) — faint, consistent with existing UI.

Acceptance:
- Desktop: never shows 2 matches side-by-side on Matches list.
- A faint divider appears between competition sections.

--------------------------------------------
E) Filters UX (mobile)
--------------------------------------------
You already have “Filter by…” and “Sort by…” placeholders — keep that.
On mobile:
- Center the placeholder text
- Keep the dropdown chevron aligned right (consistent with the rest of the site)

Acceptance:
- On mobile: “Filter by…” is visually centered; chevron is right-aligned within the select.

--------------------------------------------
FILES (likely)
- `client/src/components/MatchesList.tsx` (grouping + divider insertion)
- `client/src/components/EnhancedMatchCard.tsx` (layout/pill rendering)
- `client/src/pages/matches.tsx` (filter selects styling/props)

--------------------------------------------
CONSTRAINTS
- Do not rework backend or sorting logic — UI only.
- Do not introduce new libraries.
- Minimal code changes; no massive refactors.
- Avoid long-running tests. Only quick lint + manual check.

DELIVERABLE
1) Implement the changes.
2) Provide a concise summary of what changed and where (file + key edits).
3) Confirm acceptance criteria items A–E.

---

You are working in the Football Mad repo (React + Tailwind). Do NOT run long test loops. Make only targeted changes and do a single quick manual sanity check by running the dev server and visually inspecting /matches.

Goal: Fix match card spacing/alignment on desktop + mobile so crests don’t drift with team-name length, spacing feels balanced on desktop, and truncation is consistent.

Requirements:
1) Update the match card layout (likely EnhancedMatchCard.tsx / MatchCard component) to use a consistent 3-column grid for the main row:
   - Left: Home team block (crest + name)
   - Middle: Competition pill (top) + kickoff time (below)
   - Right: Away team block (name + crest)
2) Inside each team block, use a 2-column layout with fixed crest width and a flexible name column:
   - Crest column fixed width (e.g., w-10 or w-11)
   - Name column uses min-w-0 and truncate
   - Home team: crest then name
   - Away team: name then crest (mirror)
3) Desktop: prevent teams being pushed to far edges.
   - The internal “main row” grid should be centered and capped with a max width (e.g., max-w-[820px] mx-auto w-full) while the card can remain full width.
4) Mobile: keep the same structure but ensure it stacks nicely within the card and doesn’t cause overflow.
   - Middle column (kickoff) should have a sensible min-width (e.g., min-w-[72px]) so names don’t squeeze it unpredictably.
   - Ensure no horizontal overflow; apply overflow-hidden where needed.
5) Keep the competition pill above the kickoff time in the middle column.
6) Do not reintroduce country text into the pill label. The pill should remain just the league name (flag already indicates country).
7) After change, do ONE quick check:
   - /matches on mobile viewport shows “Derby” and “West Brom” fully (or at least far less truncated than before) and crests aligned.
   - Desktop spacing feels balanced (teams not hugging center weirdly, not stretched to far edges).

Implementation notes:
- Prefer Tailwind utility classes. Use CSS grid and min-w-0 + truncate.
- Keep existing data/model logic unchanged; this is a layout-only change.

Deliverable:
- Provide the minimal code diff with the updated component(s).
- No lengthy automated test loops. One manual visual sanity check only.

---

You are working in the Football Mad codebase (Replit). DO NOT go into long test loops. Make ONLY the changes requested, run at most: `npm test` (or `pnpm test`) once if it’s fast, otherwise skip tests and do a quick manual check in the browser.

GOAL: Fix match-card alignment + mobile spacing + venue text corruption, without reworking unrelated UI.

-----------------------------
A) MATCH CARD LAYOUT (DESKTOP + MOBILE)
-----------------------------
Problem:
- We lost the clean horizontal alignment of: crest + team name + KO time + away name + away crest.
- Pills and long labels have been impacting name truncation.
- Mobile has inconsistent crest/name positioning and truncation.

Fix:
1) Update the match card component (where each fixture row is rendered — likely `EnhancedMatchCard.tsx` or similar) to use a stable CSS Grid layout with fixed columns.

DESKTOP (>= md):
- Use a single-row grid:
  [home crest] [home name] [center column] [away name] [away crest]
- Keep the KO time in the center column.
- Put the competition pill ABOVE the KO time in the center column but it must NOT push the whole card out of alignment. (It can be a small stacked column inside the center cell.)

Suggested grid:
- container: `grid items-center`
- columns (desktop): `grid-cols-[44px_minmax(0,1fr)_140px_minmax(0,1fr)_44px]`
- center cell: `flex flex-col items-center leading-none`
- home/away name: `truncate` and align toward the center:
  - home name: `text-right justify-self-end`
  - away name: `text-left justify-self-start`

MOBILE (< md):
- Still keep 5 columns, but tighten:
  - columns: `grid-cols-[44px_minmax(0,1fr)_96px_minmax(0,1fr)_44px]`
- Ensure the home/away names are aligned toward the KO time (home right-aligned, away left-aligned).
- Reduce pill width impact:
  - Pill should be SHORT: show flag + league name ONLY (NO country in brackets, NO “• England”, nothing).
  - If you still need disambiguation, only apply it in the competition FILTER dropdown, not on the card pill.

PILL RULE:
- Match card pill text = league name only (e.g., “Championship”, “Serie A”, “Bundesliga Women”).
- Flag already communicates country; do not append country text anywhere in the pill on cards.

2) Ensure away team name never overflows outside the card:
- Use `min-w-0` on the name containers and `truncate` on the text span.

3) Restore the “one fixture per row” everywhere (no 2-column fixture grid on desktop).
- If there’s a parent layout using `grid-cols-2` at lg, remove it so fixtures are a single vertical list.

-----------------------------
B) FAINT DIVIDER BETWEEN COMPETITIONS (DESKTOP AND MOBILE)
-----------------------------
Add a subtle divider between competition groups (not between every match).
- In the matches list grouping component (`MatchesList.tsx` or equivalent), when rendering groups, add a divider (e.g., `border-t border-gray-200/60 dark:border-white/10 my-6`) between groups.
- Keep spacing subtle; don’t add giant headers unless already present.

-----------------------------
C) MOBILE FILTERS: CENTER TEXT, ARROW RIGHT-ALIGNED
-----------------------------
For the mobile Filter/Sort dropdown triggers:
- Text should be centered.
- Chevron icon should be right-aligned (consistent with rest of site).
Implementation:
- Wrap trigger content in `relative w-full`
- Put the label in an absolutely centered span: `absolute left-1/2 -translate-x-1/2`
- Keep chevron in a right-side container: `absolute right-3`
- Ensure accessibility (button still works, label still present).

Also: mobile filters should remain stacked (Filter on top of Sort). If they became inline at any breakpoint, fix the container to:
- `flex flex-col gap-3 md:flex-row` (or similar), so only desktop becomes horizontal.

Closed-state labels:
- Keep closed state showing only “Filter by…” and “Sort by…” (no selected value in the trigger). Selection still applies; just don’t show it in the trigger label.

-----------------------------
D) VENUE / STADIUM NAME CORRUPTION
-----------------------------
We are seeing HTML entities like `&amp;apos;` in venue names on mobile.
Fix by decoding entities before rendering venue text.
- Add a small helper (no new heavy deps):
  - simplest safe approach: create a browser decode helper:
    `const decodeHtml = (s) => { const t=document.createElement('textarea'); t.innerHTML=s; return t.value; }`
- Apply it to venue/stadium strings (and any competition string if needed) right before rendering.
- Guard for null/undefined.

(If this runs server-side during SSR, avoid DOM. But this is a Vite SPA, so DOM is fine.)

-----------------------------
E) DO NOT DO ENDLESS TESTING
-----------------------------
After changes:
- Do a quick manual check in Preview on:
  - desktop width
  - mobile width
- Confirm:
  - alignment restored (crest+name inline with KO)
  - pill above KO but not ruining row alignment
  - no country text appended in pill
  - names truncate gracefully but show more characters than before
  - venue text no longer shows `&amp;apos;` corruption
  - faint dividers appear between competition groups
  - Filter/Sort triggers: centered label + chevron right, stacked on mobile

Deliverables:
- Show me the exact files changed and the key className/grid changes you made (brief).
- No refactors outside these components.

---

Goal: Fix match card layout so crests + team names + kickoff time are ALWAYS aligned on one horizontal row, with competition pill on its own centered line above, and date on its own line below. Remove stadium name from match cards.

Implement this exact 3-line structure in the MatchCard / EnhancedMatchCard component:

Line 1 (centered): [Country flag + Competition name pill]  (NO country text like "(England)" or "• England" — flag is enough)
Line 2 (single horizontal row, always): [Crest A] [Team A] [Kickoff Time] [Team B] [Crest B]
Line 3 (centered, muted): [Date]

Layout requirements:
- Use a 5-column CSS grid for Line 2 so nothing shifts:
  - col1 fixed crest (e.g. w-10)
  - col2 team A name (flex), RIGHT aligned, truncate
  - col3 kickoff time fixed (e.g. min-w-[64px]), centered, no wrap
  - col4 team B name (flex), LEFT aligned, truncate
  - col5 fixed crest (w-10)
- Ensure crests never overlap text on mobile. Add min-widths and overflow hidden on the name columns.
- On desktop keep the same grid but allow more width (so truncation happens less).
- Remove stadium/venue line entirely from match cards (do not render it).
- Keep server ordering unchanged.

Also:
- If any code currently appends country in brackets/dot to the competition label for disambiguation, remove that in the pill label. Disambiguation should rely on the country flag in the pill only.

Do NOT run long test loops. Make the changes, run only:
1) Typecheck/build once
2) A quick UI check by starting dev server (no repeated retesting)

Files likely involved:
- client/src/components/matches/EnhancedMatchCard.tsx (or MatchCard)
- any helper that builds competition labels used by the pill

Acceptance:
- Mobile screenshot should show full “Derby” and “West Brom” when pill is “Championship” (flag only) and never reduce to single letters.
- No crest overlaps team names.
- Kickoff time remains perfectly aligned horizontally between the team names.

---

You are editing a Vite/Express + Drizzle app.

Goal: Fix /api/matches/day so that when the user navigates to yesterday/tomorrow (or d1–d7), the endpoint returns data by triggering a Goalserve sync when the DB has no rows for that date.

Context:
- Client calls: GET /api/matches/day?date=YYYY-MM-DD&status=...&sort=...&competitionId=...
- Server route exists in server/routes.ts around line ~693.
- There is a Goalserve ingestion job: server/jobs/upsert-goalserve-matches.ts exporting upsertGoalserveMatches(feed: string)
- Known Goalserve feeds already used elsewhere:
  - "soccernew/home" (today)
  - "soccernew/d-1" (yesterday)
  - "soccernew/d1" .. "soccernew/d7" (tomorrow -> 7 days ahead)

Make the smallest safe change to server/routes.ts:
1) Import upsertGoalserveMatches from "./jobs/upsert-goalserve-matches" near the top of server/routes.ts.
2) Add helper functions (can be placed near the /api/matches/day route or near other helpers):
   - ymdToUtcMs(ymd: string): number | null
   - goalserveFeedForDate(effectiveDateYmd: string): string | null
     - Determine offset days between effectiveDateYmd and today (both in UTC date, using Date.UTC).
     - Map: 0 -> "soccernew/home", -1 -> "soccernew/d-1", 1..7 -> `soccernew/d${n}`, else null.
3) In /api/matches/day handler:
   - Keep existing date parsing and the DB date window logic exactly as-is.
   - Change the initial `const results = await ...` to `let results = await ...`
   - Add: `const refresh = req.query.refresh === "1";`
   - Immediately after the first DB query, if (refresh || results.length === 0):
       - compute feed = goalserveFeedForDate(effectiveDate)
       - if feed exists: await upsertGoalserveMatches(feed) inside try/catch
       - then re-run the same DB query to update results
   - Do NOT change any sorting/grouping decisions already implemented.
4) Do not introduce new endpoints. Only patch /api/matches/day.

After changes, /api/matches/day should:
- Return existing DB results when available
- If empty, automatically populate from Goalserve (within supported window) and return results
- Support manual refresh via query param refresh=1

Apply the code changes directly.

---

You are editing server/jobs/upsert-goalserve-matches.ts.

Problem:
Finished matches are appearing in the UI, but homeScore/awayScore are often null even when the match is FT. This leads to cards showing "-" instead of the actual score.

Goal:
Improve score extraction from Goalserve so that for FT/finished matches we reliably capture scores. Goalserve can represent scores in different fields depending on competition/feed.

Requirements:
1) Add a small helper function near the top of the file:

   function extractScore(match: any, teamObj: any, side: "home" | "away"): number | null

   It should try multiple possible fields (in order), returning the first valid integer:
   - teamObj?.["@score"], teamObj?.score
   - teamObj?.["@goals"], teamObj?.goals
   - match?.[`@${side}score`], match?.[`${side}score`]
   - match?.[`@${side}_score`], match?.[`${side}_score`]
   - match?.[`@${side}TeamScore`], match?.[`${side}TeamScore`]
   - match?.result / match?.["@result"] patterns like "2-1" (split and pick correct side)
   - match?.score / match?.["@score"] patterns like "2-1"
   Return null if nothing parseable.

2) Replace the current score reads:
   const homeScore = localTeam["@score"] ?? localTeam.score;
   const awayScore = visitorTeam["@score"] ?? visitorTeam.score;

   With:
   const homeScore = extractScore(match, localTeam, "home");
   const awayScore = extractScore(match, visitorTeam, "away");

3) Ensure newHomeScore/newAwayScore are derived from those numbers:
   const newHomeScore = homeScore;
   const newAwayScore = awayScore;

4) Preserve the existing “never overwrite final scores with null” behaviour:
   finalHomeScore = newHomeScore !== null ? newHomeScore : existingMatch.homeScore
   finalAwayScore = newAwayScore !== null ? newAwayScore : existingMatch.awayScore

5) Make sure INSERTS write homeScore/awayScore correctly and UPDATES apply the finalHomeScore/finalAwayScore fields.

6) Do not change anything about kickoff parsing, round extraction, or the mapping logic beyond this score extraction improvement.

Apply the changes directly.

---

Add a new debug endpoint in server/routes.ts that is accessible from Preview and triggers Goalserve match ingestion.

Requirements:
1) In server/routes.ts, import upsertGoalserveMatches from "./jobs/upsert-goalserve-matches" if it is not already imported.
2) Add this route:

GET /api/debug/upsert-goalserve-matches

- Query param: feed (string). Default "soccernew/home"
- It should call: await upsertGoalserveMatches(feed)
- Return the result JSON with res.json(result)
- Wrap in try/catch and return 500 with { error: message } on failure.

3) Place this route near other /api routes (not after any catch-all static/SPA route).
4) Do NOT add any secret requirement. This is for development use in Replit Preview.

Apply the code changes directly.

---

Fix match score rendering on the Matches page.

Problem:
Backend now returns homeScore/awayScore for finished matches, but the match cards still show a dash (–) instead of the scoreline.

Goal:
In the match card component used by MatchesList (likely client/src/components/matches/EnhancedMatchCard.tsx, and possibly client/src/components/cards/match-card.tsx), update Line 2 to display:
- For finished matches: "HOME_SCORE–AWAY_SCORE" centered in the kickoff/score column
- For live matches: keep current live indicator behaviour (if any)
- For scheduled matches: keep kickoff time (HH:mm)

Rules:
- Keep the locked 3-line structure and the 5-column grid.
- Do not reintroduce venue/country text.
- Do not change sorting/filtering.
- If scores are null even when finished, fall back to "FT" badge only (do not crash).

Implementation details:
- Use match.status (MockMatch) to detect finished (status === "finished")
- Use match.homeScore and match.awayScore fields (numbers | null)
- Render scoreline when both scores are not null.
- If status finished but scores missing, render "FT" (as today).
- Ensure the kickoff/score column never wraps and stays centered.

Apply the minimal changes required in the correct component(s).

---

Make a small UI adjustment to the Matches match card Line 2 so that the score/time sits on the same horizontal line as the team names and crests.

Context:
- Match cards use the locked 3-line structure.
- Line 2 is a non-negotiable 5-column grid: [crestA][teamA][kickoff/score][teamB][crestB]
- Scores now render correctly for finished matches, but the score block is vertically misaligned (sits slightly higher than the team names).

Goal:
Ensure crest, team names, and score/time are perfectly aligned on the same horizontal baseline.

Implementation requirements:
1) Locate the component that renders the 5-column Line 2 (likely client/src/components/matches/EnhancedMatchCard.tsx).
2) In the grid row container for Line 2:
   - Add `items-center` (or `items-baseline` if it produces a better baseline alignment) to the grid container.
3) In the center (kickoff/score) cell:
   - Ensure it is a flex container with `flex items-center justify-center`.
   - Remove any `leading-*` or `mt-*` that shifts it vertically.
   - If the score text uses a different font size/weight than team names, add `leading-none` to the score/time text element so it doesn’t sit high.
4) Do NOT change the 3-line structure, do NOT change to flex layout for the row, do NOT change spacing rules.
5) Keep mobile behaviour identical.

Make the smallest possible changes to achieve clean “BBC Sport” alignment.
Apply changes directly.

---

Refine vertical alignment on Match Card Line 2 so all elements are visually centred on the same horizontal midline.

Context:
- This is the locked Line 2 of the Matches card.
- Structure: 5-column grid [crest][team][kickoff/score][team][crest]
- Everything should be visually centre-aligned: the midpoint of text aligns with the midpoint of the crests.

Requirements:
1) In the component rendering Line 2 (EnhancedMatchCard.tsx):
   - Ensure the grid container has `items-center`.

2) For EACH of the 5 grid columns:
   - Wrap contents in a `flex items-center` container.
   - Do not rely on baseline alignment.

3) Crests:
   - Must have a fixed height (e.g. h-10).
   - Their container should be `flex items-center justify-center`.

4) Team names:
   - Wrap text in `flex items-center`.
   - Apply `leading-none` to the text element.
   - Do NOT change font size or weight.

5) Kickoff time / score cell:
   - Must be `flex items-center justify-center`.
   - Apply `leading-none` to the text.
   - Remove any margin-top / margin-bottom / line-height utilities that affect vertical position.

6) Result:
   - The visual midpoint of crest, team name, and score/kickoff must align.
   - Mobile and desktop must behave identically.

7) Do NOT change:
   - The 3-line structure
   - The 5-column grid
   - Any spacing, truncation, or typography choices

Make the smallest changes necessary to achieve perfect visual centring.
Apply changes directly.

---

Fix timezone mismatch causing /api/matches/day to miss most fixtures for a given date.

Problem:
upsert-goalserve-matches.ts currently creates kickoffTime using new Date(year, month-1, day, hours, minutes) which interprets values in server local time. But /api/matches/day queries using UTC day boundaries (YYYY-MM-DDT00:00:00Z to next day). This mismatch causes fixtures to appear under the wrong day or not appear at all, especially for future dates.

Goal:
Store kickoffTime consistently in UTC when ingesting Goalserve matches.

Changes:
1) In server/jobs/upsert-goalserve-matches.ts, update parseKickoffTime():
   - Keep the formattedDate parsing logic.
   - When constructing the Date, use Date.UTC(...) and new Date(Date.UTC(...)) instead of new Date(...).
   Example:
     const utcMs = Date.UTC(year, monthIndex, day, hours, minutes, 0, 0);
     const date = new Date(utcMs);

2) Ensure hours/minutes parsing remains the same.

3) Do not change any other ingestion logic.

After applying this change, tomorrow's fixtures should fall into the correct UTC day bucket for /api/matches/day.

Apply the code changes directly.

---

Update client/src/pages/matches.tsx so the Matches page automatically refreshes while viewing Today's date.

Requirements:
- Only enable polling when selectedDate is today (isToday === true).
- Use react-query refetchInterval on BOTH queries:
  1) the main matches query (matchesData)
  2) the allMatchesData query (counts)
- Set refetchInterval to 30000 (30 seconds).
- Also set refetchOnWindowFocus: true for these queries.
- Do not change query keys, URLs, or any sorting/filter logic.

Apply minimal changes directly.

---

Add a lightweight server-side polling loop to keep today's match statuses and scores updated in the database.

Goal:
While the server is running, periodically ingest Goalserve feeds:
- soccernew/home every 60 seconds (live score + status changes)
- soccernew/d-1 every 10 minutes (late score corrections)

Implementation:
1) In server/index.ts (or wherever the Express app is started), import upsertGoalserveMatches from server/jobs/upsert-goalserve-matches.
2) After the server starts listening, add setInterval tasks:
   - setInterval(() => upsertGoalserveMatches("soccernew/home").catch(() => {}), 60_000)
   - setInterval(() => upsertGoalserveMatches("soccernew/d-1").catch(() => {}), 600_000)
3) Add a simple guard so this only runs when process.env.ENABLE_LIVE_POLLING === "1".
4) Log one line when polling is enabled (e.g. "[LivePolling] enabled").

Do not change any existing routes. Apply minimal changes.

---

Add a minimal debug endpoint to identify why "Bournemouth (Championship)" appears.

Create POST /api/jobs/debug-team-anomaly?query=Bournemouth

- Guard it with requireJobSecret("GOALSERVE_SYNC_SECRET") (same pattern as other Goalserve jobs).
- In the handler, query the DB and return JSON:

A) teamsLike:
Select from teams where name ILIKE %query%
Return: id, name, slug (if exists), goalserveTeamId, competitionId (if exists), createdAt (if exists)

B) matchesLike:
Select from matches where:
- homeTeamName ILIKE %query% OR awayTeamName ILIKE %query% (only if those fields exist)
OR homeTeamId/awayTeamId belongs to any team in teamsLike.
Return a sample (limit 50): id, slug, kickoffTime, status, competitionName (or competitionId), homeTeamId, awayTeamId, homeScore, awayScore

C) If possible, also join teams table for homeTeamId/awayTeamId to return homeTeamNameFromTeams + awayTeamNameFromTeams.

Do NOT change schema. Keep it minimal. Return:
{ teamsLike: [...], matchesLike: [...] }

---

Create a secure one-off job endpoint to merge duplicate teams and fix the Bournemouth anomaly.

Context:
- There are two teams:
  - keepTeamId = "8f3a7a04-3cc0-409e-9511-0ddb48efcc82"  (name "Bournemouth", slug "afc-bournemouth", goalserveTeamId null, league "Premier League")
  - removeTeamId = "531428c1-57c8-4210-a38e-a0143ddaf9ca" (name "Bournemouth (Championship)", slug "bournemouth", goalserveTeamId "9053", league "Championship")
- Matches are incorrectly linked to removeTeamId because it’s the only one with goalserveTeamId=9053.

Requirements:
1) Add POST /api/jobs/merge-teams protected by requireJobSecret("GOALSERVE_SYNC_SECRET").
2) The endpoint accepts JSON body: { keepTeamId: string, removeTeamId: string, deleteRemoved?: boolean }
   - deleteRemoved defaults to true.
3) In a DB transaction:
   - Read both teams.
   - If keepTeam.goalserveTeamId is null/empty and removeTeam.goalserveTeamId exists, copy it onto keepTeam.
   - Update matches:
     - set homeTeamId = keepTeamId where homeTeamId = removeTeamId
     - set awayTeamId = keepTeamId where awayTeamId = removeTeamId
   - Also normalize stored names on affected matches so UI is correct even if it uses match.homeTeamName/awayTeamName:
     - where homeTeamId moved, set homeTeamName = keepTeam.name
     - where awayTeamId moved, set awayTeamName = keepTeam.name
   - If deleteRemoved is true:
     - delete the removeTeam row from teams.
     - If deletion fails due to constraints, instead set removeTeam.goalserveTeamId = null and rename it to "[DEPRECATED] " + existing name.
4) Return JSON with counts:
   { ok: true, keepTeamId, removeTeamId, movedHomeCount, movedAwayCount, updatedKeepGoalserveId: boolean, removedDeleted: boolean, removedDeprecationApplied: boolean }

After implementing, do NOT run it automatically.

Then I will run:
curl -s -X POST -H "x-sync-secret: $GOALSERVE_SYNC_SECRET" -H "content-type: application/json" \
  -d '{"keepTeamId":"8f3a7a04-3cc0-409e-9511-0ddb48efcc82","removeTeamId":"531428c1-57c8-4210-a38e-a0143ddaf9ca","deleteRemoved":true}' \
  "https://<my-domain>/api/jobs/merge-teams"

---

Fix the /api/jobs/merge-teams job to respect the unique constraint on teams.goalserveTeamId.

Problem:
Currently it tries to set keepTeam.goalserveTeamId to removeTeam.goalserveTeamId while removeTeam still holds that value, causing:
duplicate key value violates unique constraint "teams_goalserve_team_id_unique"

Required changes:
1) In the transaction, if we are transferring removeTeam.goalserveTeamId -> keepTeam:
   a) FIRST set removeTeam.goalserveTeamId = null (and optionally rename it "[DEPRECATED] ...") so the unique value is freed.
   b) THEN set keepTeam.goalserveTeamId = the transferred value.
2) Add a safety check:
   - If any OTHER team (id not in {keepTeamId, removeTeamId}) already has that goalserveTeamId, return 409 with a helpful JSON error:
     { error: "goalserveTeamId already in use", goalserveTeamId, conflictingTeamId }
   - Do not proceed with match updates in that case.
3) Keep everything else the same (moving match homeTeamId/awayTeamId and updating match names, deleting or deprecating removed team).
4) Do not change route paths or auth. Keep requireJobSecret("GOALSERVE_SYNC_SECRET").

Implement minimal edits to the existing code.

---

Fix the /api/jobs/merge-teams endpoint so it never returns "current transaction is aborted..." and correctly handles the teams_goalserve_team_id_unique constraint.

Context:
Calling merge-teams currently returns 500 with:
"current transaction is aborted, commands ignored until end of transaction block"
Previously it also threw:
"duplicate key value violates unique constraint teams_goalserve_team_id_unique"

Requirements:
1) Refactor merge-teams to use Drizzle's db.transaction(async (tx) => { ... }) ONLY.
   - No manual BEGIN/COMMIT.
   - No catching errors inside the transaction and continuing.
   - If anything fails, throw so Drizzle rolls back.

2) Preflight (BEFORE starting tx):
   - Load keepTeam and removeTeam from teams by id.
   - Determine desiredGoalserveTeamId:
       - If keepTeam.goalserveTeamId is null and removeTeam.goalserveTeamId exists -> we want to move it to keep
       - Otherwise keep keepTeam.goalserveTeamId
   - If desiredGoalserveTeamId exists, check if ANY other team (id not in [keep, remove]) already has that goalserveTeamId.
     - If yes, return 409 with a helpful message listing that conflicting team id+name+slug+goalserveTeamId.

3) In the transaction, do updates in this safe order:
   a) If moving goalserveTeamId from remove -> keep:
      - First set removeTeam.goalserveTeamId = null
      - Then set keepTeam.goalserveTeamId = desiredGoalserveTeamId
   b) Update matches.homeTeamId and matches.awayTeamId from removeTeamId -> keepTeamId
   c) Optionally normalize keep team display name/slug/league if needed (keep as-is for now unless already implemented)
   d) If deleteRemoved === true: delete the remove team row after match updates

4) Error handling:
   - Outside tx, catch once.
   - Map conflict/preflight failures to 409.
   - Otherwise return 500 with a clean error message.
   - Never leak "current transaction is aborted..." again.

5) Keep auth middleware the same: requireJobSecret("GOALSERVE_SYNC_SECRET")
6) Keep route path and request body shape unchanged.

After changes:
- Restart dev server.
- Re-run the exact curl merge request.

---

We already use Drizzle ORM and have an existing schema with Teams, Matches, etc.

Please add a new snapshot-based Standings schema.

Create two new tables:

1) standings_snapshots
- id (primary key)
- leagueId (string or int)
- season (string)
- stageId (string, nullable)
- asOf (timestamp)
- source (string, default "goalserve")
- payloadHash (string, nullable)
- createdAt (timestamp, default now)

Add indexes:
- (leagueId, season, asOf desc)

2) standings_rows
- id (primary key)
- snapshotId (foreign key → standings_snapshots.id, cascade on delete)
- teamId (foreign key → teams.id)
- teamGoalserveId (string)
- position (int)
- points (int)
- played (int)
- won (int)
- drawn (int)
- lost (int)
- goalsFor (int)
- goalsAgainst (int)
- goalDifference (int)
- recentForm (string, nullable)
- movementStatus (string, nullable)
- qualificationNote (string, nullable)

Home stats:
- homePlayed (int)
- homeWon (int)
- homeDrawn (int)
- homeLost (int)
- homeGoalsFor (int)
- homeGoalsAgainst (int)

Away stats:
- awayPlayed (int)
- awayWon (int)
- awayDrawn (int)
- awayLost (int)
- awayGoalsFor (int)
- awayGoalsAgainst (int)

Add indexes:
- (snapshotId, position)

Use Drizzle conventions consistent with the rest of the codebase.
Do not modify existing tables.

---

Add a new POST-only job endpoint secured by x-sync-secret (GOALSERVE_SYNC_SECRET):

POST /api/jobs/upsert-goalserve-standings?leagueId=<id>&season=<optional>

Requirements:
- Reject GET requests
- Validate x-sync-secret header against GOALSERVE_SYNC_SECRET
- leagueId is required
- season is optional

Fetch Goalserve standings using:
https://www.goalserve.com/getfeed/${GOALSERVE_FEED_KEY}/standings/${leagueId}.xml?json=true

If season is provided, append &season=<value>

Parsing rules:
- Parse JSON response
- standings.timestamp → parse "DD.MM.YYYY HH:mm:ss" into Date as asOf
- tournament.league, tournament.season, tournament.stage_id
- tournament.team[] array

Team resolution:
- For each team row, resolve team via teams.goalserveTeamId === team.id
- If ANY team is missing, return HTTP 409 with:
  - missingTeamIds
  - missingTeamNames
  - leagueId
  - season
- Do NOT create teams automatically in v1

Insert logic:
- Wrap in a single transaction
- Create a standings_snapshots record
- Insert all standings_rows linked to snapshotId
- Store parsed ints (Goalserve values are strings)

Optional optimisation:
- Compute payload hash
- If hash matches most recent snapshot for leagueId+season, skip insert and return "no change"

Response:
- leagueId
- season
- asOf
- insertedRowsCount
- snapshotId

Add logging:
[StandingsIngest] leagueId=<id> season=<season> rows=<count>

Keep implementation consistent with existing Goalserve match ingestion jobs.

---

Add a public read endpoint:

GET /api/standings?leagueId=<id>&season=<optional>&asOf=<optional>

Behaviour:
- leagueId is required
- season defaults to current season if omitted
- asOf:
  - if provided, return the latest snapshot <= asOf
  - if omitted, return latest snapshot for leagueId+season

Query logic:
- Find matching standings_snapshots row
- Join standings_rows ordered by position ASC
- Join teams table to include:
  - team name
  - slug
  - crestUrl (if exists)

Response shape:
{
  snapshot: {
    leagueId,
    season,
    stageId,
    asOf
  },
  table: [
    {
      position,
      team: { id, name, slug, crestUrl },
      played,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDifference,
      points,
      recentForm,
      movementStatus,
      qualificationNote,
      home: {...},
      away: {...}
    }
  ]
}

Ensure:
- Results are cached safely (if existing cache helper exists)
- 404 returned if no snapshot found

---

Add a debug-only job endpoint:

POST /api/jobs/debug-goalserve-standings?leagueId=<id>&season=<optional>

Requirements:
- Secured by x-sync-secret
- Fetch the Goalserve standings feed (same URL as ingestion)
- Do NOT write to DB
- Return:
  - leagueId
  - season
  - fetchedAt
  - tournament metadata
  - first 3 team rows (id, name, position)
  - list of team ids that do NOT resolve to teams.goalserveTeamId

This endpoint is for diagnostics only.

---

We have a failing job endpoint:
POST /api/jobs/upsert-goalserve-standings?leagueId=1204

It returns:
{"ok":false,"error":"ts.match is not a function"}

This indicates our timestamp parsing is calling `.match()` on a non-string.

Please fix the standings ingestion so that timestamp parsing is robust and uses the correct field.

Requirements:

1) Locate where ts is read and parsed (likely `parseGoalserveTimestamp(ts)`).
   - Ensure we read `payload.standings.timestamp` (NOT `tournament.timestamp`).
   - In the Goalserve standings payload, timestamp is like: "24.01.2026 03:17:40".

2) Make the timestamp parser defensive:
   - Accept `string | undefined | null | Date`.
   - If ts is a Date, return it.
   - If ts is not a string, throw a clear error like:
     "Invalid standings.timestamp type: <typeof>"

3) Parse format "DD.MM.YYYY HH:mm:ss" into a JS Date in UTC (or server timezone consistently), using explicit parsing (do not rely on Date.parse).

4) Improve error reporting in the job response:
   - include a `debug` object with:
     - `timestampRaw`
     - `timestampType`
     - `payloadTopKeys` (Object.keys(payload))
     - `standingsKeys` (Object.keys(payload.standings || {}))

5) Do not change any DB schema, just fix parsing + debugging.

After fixing, rerun the same job and it should insert 20 rows for leagueId=1204.

---

Our standings ingestion job currently returns:
{"ok":false,"leagueId":"1204","season":"","insertedRowsCount":0,"error":"No team rows in standings"}

This indicates we are reading the wrong JSON path and/or not normalizing Goalserve object/array variants.

Please update /api/jobs/upsert-goalserve-standings to correctly locate tournament + team rows.

Ground truth (from curl):
payload shape is:
{
  "standings": {
    "timestamp": "DD.MM.YYYY HH:mm:ss",
    "tournament": {
      "season": "2025/2026",
      "stage_id": "...",
      "team": [ { id, name, position, overall/home/away/total... }, ... ]
    }
  }
}

Required changes:

1) Resolve standings root safely:
const s = payload?.standings ?? payload

2) Resolve tournament safely:
const tRaw = s?.tournament
const t = Array.isArray(tRaw) ? tRaw[0] : tRaw

3) Resolve teams safely:
const teamRaw = t?.team
const teams = Array.isArray(teamRaw) ? teamRaw : (teamRaw ? [teamRaw] : [])

4) Use these for metadata:
season = t?.season || ""
stageId = t?.stage_id || null
leagueId = t?.id || t?.gid || request leagueId

5) If teams is empty:
Return ok:false with a debug object:
- payloadTopKeys = Object.keys(payload||{})
- standingsKeys = Object.keys(s||{})
- tournamentType = typeof tRaw + (Array.isArray(tRaw) ? " array" : "")
- tournamentKeys = Object.keys(t||{})
- teamType = typeof teamRaw + (Array.isArray(teamRaw) ? " array" : "")
- teamCount = teams.length

6) Do not change DB schema. Only fix parsing + add debug info.

---

We have a Tables page (/tables) that shows standings.

Please upgrade the standings table UI to:
1) Add a "Form" column using standings row field recentForm (e.g. "DDWWW").
2) Render recentForm as 5 small rounded pills: W=green, D=amber, L=red.
3) Desktop table should default to a clean set of columns:
   Pos | Team | Pts | GD | Form
   - Pts should be bold.
   - GD should show + for positive.
4) Mobile should be ruthless:
   - Default row layout: Pos | Team | Pts (no horizontal scroll)
   - Show only last 3 form pills inline (optional) OR hide form inline and show on expand (choose the best UX).
   - Tap/click a row expands it to show:
     - P (played)
     - GD
     - Full Form (5 pills)
     - (Optional) W/D/L line in small text
5) Add subtle "zone" indicator on the far-left of each row:
   - Positions 1-4: a thin green-ish left border
   - Position 5: thin amber left border (optional)
   - Bottom 3: thin red left border
   - Others: transparent
   Keep this subtle (not loud).
6) Use existing team info in the row (crest if available, name, slug) and keep current styling consistent.
7) Do not change navigation or filters; only table rendering and row expansion behaviour.

Implementation notes:
- Use a reusable component, e.g. <StandingsTable /> and <FormPills form="DDWWW" />
- Make sure accessibility: row expansion should be keyboard accessible; add aria-expanded and button semantics.
- Keep it performant (no heavy re-renders).

---

IMPORTANT: Do NOT run automated end-to-end testing, “Testing your app”, screenshot/video capture, or broad verification loops.
Do NOT explore the UI beyond the specific change requested.
Do NOT run test suites unless explicitly asked.
Stop after code changes + summary.

We implemented FormPills and upgraded the tables UI. However, I want to remove any reliance on "updated mock data" in the production rendering path.

Tasks:
1) Ensure the LeagueTable/Standings table component reads `recentForm` from the real standings API response only.
2) If `recentForm` is missing/null/empty, FormPills should render a subtle placeholder (e.g. "—") or render nothing (choose one approach consistently).
3) Remove or isolate mock standings data so it is not used by the live /tables page. If mock data exists, keep it only in dev/demo/test files and not in the production component path.
4) Do NOT change styling or layout otherwise.

Return:
- Which files were modified
- Exactly where mock data was removed/isolated
- A 4-bullet manual verification checklist for /tables (desktop + mobile)

---

IMPORTANT: Do NOT run automated end-to-end testing, “Testing your app”, screenshot/video capture, or broad verification loops.
Do NOT explore the UI beyond the specific change requested.
Do NOT run test suites unless explicitly asked.
Stop after code changes + summary.

We have /tables now fetching real standings data via useQuery.

Please implement two small improvements:

1) Form column consistency:
- On DESKTOP table: if recentForm is null/undefined/empty, render a subtle placeholder "—" (muted text) so the column doesn't look broken.
- On MOBILE compact view: it's okay to render nothing unless expanded; when expanded, if missing, show "—" next to the Form label.

2) Query behaviour:
- In the useQuery call fetching /api/standings:
  - set staleTime to 5 minutes
  - set refetchOnWindowFocus to false
  - keep existing loading/error UI intact

Do not change layout, columns, colors, or expand behaviour otherwise.

Return:
- files changed
- a 3-bullet manual verification checklist

---

IMPORTANT: Do NOT run automated end-to-end testing, “Testing your app”, screenshot/video capture, or broad verification loops.
Do NOT explore the UI beyond the specific change requested.
Do NOT run test suites unless explicitly asked.
Stop after code changes + summary.

Bug: /tables shows “No standings data available” because the UI passes season as "2025/26" but standings snapshots store season as "2025/2026".
API confirms:
- /api/standings?leagueId=1204 returns data
- /api/standings?leagueId=1204&season=2025/26 returns {"error":"No standings snapshot found"...}

Please implement client-side season normalization before calling /api/standings:

1) Add helper normalizeSeason(input: string | null | undefined): string | undefined
Rules:
- If input matches "YYYY/YY" (e.g. 2025/26), convert to "YYYY/YYYY+1" => "2025/2026"
- If input matches "YYYY-YY" (e.g. 2025-26), convert to "YYYY/YYYY+1"
- If input already matches "YYYY/YYYY", return as-is
- Otherwise return input unchanged

2) In client/src/pages/tables.tsx (where useQuery fetches /api/standings), pass the normalized season in the query params.
If normalized season is undefined, omit the season param.

3) Keep existing UI states. Only change request params / season handling.

Return:
- files changed
- the normalizeSeason function code
- 3 manual verification steps (no automated testing)

---

IMPORTANT: Do NOT run automated end-to-end testing, “Testing your app”, screenshot/video capture, or broad verification loops.
Do NOT run test suites unless explicitly asked.
Stop after code changes + summary.

Bug confirmed via Network tab:
- /api/standings?leagueId=1204&season=2025/2026 returns 200 OK with JSON:
  { snapshot, table: [...] }
- UI still shows "No standings data available".

This means the rendering condition is incorrect.

Please fix client-side rendering logic in the Tables page:

1) Treat the API response shape as:
   - data.snapshot
   - data.table (array)

2) Update the "no data" condition so it ONLY renders when:
   - request succeeded (not loading, not error)
   - AND Array.isArray(data.table)
   - AND data.table.length === 0

3) Ensure the table renders when:
   - Array.isArray(data.table)
   - AND data.table.length > 0

4) Do NOT gate rendering on:
   - data.standings
   - data.rows
   - data.data
   - or any nested property that doesn't exist

5) If request fails (non-2xx), show an error message instead of the "no data" message.

Do not change styling, layout, or API calls.

Return:
- files changed
- the exact conditional logic used for:
  loading / error / no-data / render-table

---

IMPORTANT: Do NOT run automated end-to-end testing, “Testing your app”, screenshot/video capture, or broad verification loops.
Do NOT run test suites unless explicitly asked.
Stop after code changes + summary.

Bug: Tables UI shows "Team undefined" for every row, even though /api/standings returns team objects.

API row shape:
{
  position: number,
  team: { id: string, name: string, slug: string, crestUrl: string|null },
  played, won, drawn, lost, goalsFor, goalsAgainst, goalDifference, points, recentForm
}

Please fix the client mapping (mapApiToTableRow) so that:
- team name uses apiRow.team.name
- team slug uses apiRow.team.slug
- crest uses apiRow.team.crestUrl (fallback to null)
- remove any fallback label like "Team undefined" unless team is genuinely missing

Do not change table layout/styling.

Return:
- files changed
- the updated mapping function
- 2 manual verification steps

---

IMPORTANT: Do NOT run automated end-to-end testing, “Testing your app”, screenshot/video capture, or broad verification loops.
Do NOT run test suites unless explicitly asked.
Stop after code changes + summary.

Change request: On /tables, desktop should be data-enriched by DEFAULT (no click-to-expand on desktop).
Row expansion can remain MOBILE-only.

Implement responsive table columns:

1) Desktop (>= md breakpoint):
Render full standings columns:
Pos | Team | P | W | D | L | GF | GA | GD | Pts | Form
- Pts bold
- GD shows + for positive and subtle tint
- Form uses existing FormPills (5 pills)
- Keep zone indicator left border logic

2) Mobile (< md breakpoint):
Keep compact default:
Pos | Team | Pts
- Keep mobile expand/tap behaviour to show:
  P, W/D/L, GF/GA, GD, Form (5 pills)

3) Do NOT require desktop users to click rows to see core stats.
4) Keep styling consistent with current design system.

Return:
- files changed
- the exact breakpoint used (e.g. md)
- 4 manual verification steps (desktop vs mobile)

---

IMPORTANT: Do NOT run automated end-to-end testing, “Testing your app”, screenshot/video capture, or broad verification loops.
Do NOT run test suites unless explicitly asked.
Stop after code changes + summary.

Bug: Standings UI shows correct team names and recentForm, but ALL numeric stats are 0 (P/W/D/L/GF/GA/GD/Pts).
This is a standings ingestion mapping issue.

Goalserve standings JSON team row keys (strings):
- overall: { gp, w, d, l, gs, ga }
- total: { p, gd }
- home: { gp, w, d, l, gs, ga }
- away: { gp, w, d, l, gs, ga }
- recent_form: string like "DDWWW"

Please update server/jobs/upsert-goalserve-standings.ts mapping so snapshot rows use:

played = toInt(team.overall.gp)
won = toInt(team.overall.w)
drawn = toInt(team.overall.d)
lost = toInt(team.overall.l)
goalsFor = toInt(team.overall.gs)
goalsAgainst = toInt(team.overall.ga)
goalDifference = toInt(team.total.gd, goalsFor - goalsAgainst)
points = toInt(team.total.p)

homePlayed = toInt(team.home.gp) etc
awayPlayed = toInt(team.away.gp) etc

Add helper:
function toInt(value: unknown, fallback = 0): number { ... }

Also ensure we correctly read recent form:
recentForm = team.recent_form ?? team.recent_form?.toString() ?? team.recent_form?? (handle variants)
(Do not break existing recentForm storage.)

After changing mapping:
- recompute hash based on the normalized numeric values too (so it won’t incorrectly "skipped: true")
- rerun ingestion for leagueId=1204 should create a new snapshot (insertedRowsCount > 0).

Return:
- files changed
- a before/after mapping example for Arsenal showing real numbers
- the curl command to re-run ingestion (no automated tests)

---

IMPORTANT:
- Do NOT run automated end-to-end testing, “Testing your app”, screenshot/video capture, or broad verification loops.
- Do NOT run test suites unless explicitly asked.
- Make only the minimal code changes required, then stop with a short summary and which files changed.

Goal:
Fix the relegation zone left-border indicator on the /tables League Table. Currently positions 18 and 19 show red, but position 20 (e.g. Wolves) does NOT show red. This is a logic bug.

Required behaviour (Premier League):
- Positions 1–4 => Champions League zone (green left border)
- Position 5 => Europa League zone (amber left border)
- Positions 18–20 => Relegation zone (red left border)
- Others => transparent (no visible border)

Implementation requirements:
1) Locate where the “zone indicator” / left border class is computed in:
   client/src/components/tables/league-table.tsx (or the exact current file that renders table rows).
2) Replace any existing relegation logic that depends on team count, array length, or totalTeams (anything like position >= totalTeams - 2, etc).
3) Use explicit position checks instead:
   - champions: position >= 1 && position <= 4
   - europa: position === 5
   - relegation: position >= 18
4) Ensure the left border class is applied to every row consistently (desktop and mobile).
   - Use border-l-4 plus:
     - emerald for champions
     - amber for europa
     - red for relegation
     - transparent otherwise
5) Keep the rest of the table UI unchanged.

After changes:
- Provide a short summary.
- List the exact files modified and the key code snippet(s) you changed.
- Do not start any broad testing loop; only do a quick targeted check in code (no recordings).

---

REPLIT AI PROMPT (copy/paste)

Context:
We have a league standings table at /tables. Desktop shows full columns (Pos | Team | P | W | D | L | GF | GA | GD | Pts | Form). Mobile shows a compact layout.
Two UX bugs remain:
1) Relegation zone left border is showing for positions 18 & 19 but NOT for position 20.
2) Mobile: “Pts” is visually cut off on the right, and the whole table feels like it has a tiny horizontal “wiggle”/movement (like a scroll container) even though we don’t want that.

Requirements:
- Do NOT introduce any “desktop row expand” behavior. Desktop should be fully data-enriched by default.
- Keep current navigation/filters as-is. Only adjust table rendering/styling.
- Keep the existing FormPills behavior.
- No “Replit video test loops” / broad automated testing. Only do targeted verification: (a) confirm pos 20 shows red zone border, (b) confirm mobile Pts is not clipped, (c) confirm no horizontal wiggle on mobile.
- Make minimal changes and explain exactly what changed.

Work to do:
A) Fix relegation border for pos 20 reliably.
   - The most likely cause is the left border being applied to a <tr> or being clipped/overridden by Tailwind class ordering / overflow-hidden / rounded container.
   - Implement the zone indicator in a way that cannot fail on the last row:
     Option 1 (preferred): add a dedicated “zone stripe” element inside the first cell:
       - In each row, the first cell (Pos) should contain a wrapper div with `relative pl-3` and an absolutely positioned stripe:
         `<span aria-hidden className={cn("absolute left-0 top-0 h-full w-1 rounded-full", zoneStripeColor)} />`
       - Make sure the stripe spans full row height.
       - Ensure pos 18-20 use red.
     Option 2: use `before:` pseudo-element on the row container (NOT <tr>) if we’re not using semantic table row styling. But avoid <tr> borders.

   - Also ensure Tailwind class ordering can’t override the color:
     - Do not include a default `border-l-transparent` that could override later.
     - Or ensure the zone color class is always appended last.

B) Fix mobile Pts clipping.
   - Ensure the mobile row layout has enough right padding and the Pts column has a stable width:
     - Add `pr-4` (or similar) to the mobile row container / last cell.
     - Set the Pts cell to `text-right tabular-nums whitespace-nowrap` and a min width like `min-w-[3rem]`.
     - If we’re using a table on mobile, ensure the table has `w-full table-fixed` and cells allow shrinking: `min-w-0`.
   - Verify the “Pts” header and values are fully visible on iPhone-width.

C) Remove the “wiggle” / phantom horizontal scroll on mobile.
   - Find the wrapper that has `overflow-x-auto` / `overflow-auto` and is applied on mobile.
   - Make it `overflow-x-visible` on mobile and only allow horizontal scroll on desktop if needed:
     Example:
       - Wrapper: `overflow-x-visible md:overflow-x-auto`
   - Make sure nothing inside forces overflow on mobile (`min-w-[...]`, long strings). For mobile, enforce `w-full` and avoid `min-w` on the overall table.

Files:
- Most likely only: `client/src/components/tables/league-table.tsx`
- Keep changes focused.

After changes:
- Provide a short manual verification checklist (3 bullets max) and STOP. No long-running tests.

---

You are working in this repo. Implement live standings updates for the Tables page without requiring manual job triggers.

Goal:
- Matches page already updates live.
- Tables page should update automatically as games finish.
- Do NOT add broad automated testing or “video test loops”. Only do targeted manual verification notes.

Key requirements:
1) Add an auto-refresh mechanism to GET /api/standings that can (optionally) trigger a standings ingestion before returning data.
2) This MUST be safe:
   - No client secrets required.
   - Rate-limited per league+season to avoid hammering Goalserve.
   - If nothing changed, the existing hash/snapshot logic should make ingestion cheap (skips).
3) Update client Tables page to poll standings during live match periods (or just poll while the user is on /tables), and request auto-refresh.

Implementation details:

A) Server: Auto-refresh on /api/standings
- Locate the server route handler for GET /api/standings (likely in server/routes.ts or similar).
- Add optional query param: autoRefresh=1
- When autoRefresh=1:
  - Determine leagueId + season exactly as current handler already does.
  - Add an in-memory throttle map keyed by `${leagueId}:${season}` storing lastRunMs.
  - Only allow an auto-refresh attempt if:
      now - lastRunMs >= 60_000 (1 minute)  [or 120_000 if you prefer]
  - If allowed, call the existing standings ingestion logic directly (do not require x-sync-secret).
    - IMPORTANT: do not do an internal HTTP call; import/call the job function directly if possible.
    - Reuse the existing Goalserve fetch + parse + upsert snapshot logic in `server/jobs/upsert-goalserve-standings.ts`.
    - If that job currently expects to be invoked only via the secured endpoint, refactor the job module so it exports a function like:
        `export async function upsertGoalserveStandings({ leagueId, season }: { leagueId: string; season?: string })`
      and the secured endpoint just calls it.
  - Swallow auto-refresh errors (log them) and still return the last known snapshot/table, so UI never hard-fails because Goalserve is temporarily flaky.

B) Client: Poll standings while viewing /tables
- In client/src/pages/tables.tsx, update the standings useQuery:
  - Include `autoRefresh=1` in the request URL.
  - Add `refetchInterval` while on the Leagues tab and a league is selected:
      - refetchInterval: 60_000 (1 minute)
      - keep staleTime as-is or reduce to ~30s during live polling.
  - Keep `refetchOnWindowFocus: true` (or set to true) so switching back to the tab refreshes.
- Do NOT poll Cups/Europe paths yet (only leagues).

C) Manual verification notes only (no automated test runs)
Provide a short checklist:
1) Open /tables, Premier League, 2025/26 -> confirm request includes autoRefresh=1.
2) Confirm network calls repeat every 60s while staying on /tables.
3) Trigger a standings change by running the secured job once:
   POST /api/jobs/upsert-goalserve-standings?leagueId=1204 with x-sync-secret
   Then confirm within 60s the UI reflects the new snapshot (points/played etc).
4) Confirm rate-limit works: refreshing page repeatedly does NOT cause ingestion every time (server logs show at most once per minute per league+season).

Constraints:
- Keep code changes minimal and local.
- Do not change navigation or table UI/columns; only refresh behavior.
- Avoid any “run full test suite”, “record video”, or endless verification loops.

Deliverables:
- Modified server code exporting/reusing the job function + autoRefresh behavior in GET /api/standings.
- Modified client tables query adding autoRefresh and polling.
- A short manual verification checklist.

---

Goal: Add EFL Championship standings to the /tables page using the existing standings pipeline (GET /api/standings + autoRefresh=1 + polling). Do NOT add any “video testing” loops. Keep changes minimal and targeted.

Context:
- Premier League standings already work via /api/standings?leagueId=1204&season=YYYY/YYYY and client polling.
- There is a league id mapping helper in client/src/lib/league-config.ts.
- The /tables page uses the selected competition slug + season to build the standings request.

Tasks:

1) Add Championship mapping
- Update client/src/lib/league-config.ts to include Championship.
- Find the competition slug used for Championship in the Tables UI (likely "championship" or similar).
- Map that slug to Goalserve leagueId for Championship.
- If you are unsure of the correct Goalserve leagueId, add the mapping but also add a short developer note comment explaining it must match Goalserve.

2) Ensure /tables requests the correct leagueId for Championship
- When the user clicks the “Championship” tab, the network request to /api/standings must include the Championship leagueId and season normalized to “YYYY/YYYY”.
- Confirm the request URL includes autoRefresh=1.

3) Add a lightweight “dev verify” note (NO automated test loops)
- Add a short comment in docs/BUILD_LOG.md describing how to verify Championship:
  - Go to /tables → Championship → confirm request URL includes correct leagueId and season=YYYY%2FYYYY
  - Optional: trigger ingestion manually via the existing job endpoint with x-sync-secret
- Do not run any autoplay test recordings.

4) Manual ingestion (optional but helpful)
- If there is already a way to ingest standings for a league via /api/jobs/upsert-goalserve-standings?leagueId=..., confirm it works for Championship too (no code changes needed if it’s generic).
- Do NOT hardcode secrets anywhere.

Acceptance criteria:
- Clicking Championship shows a populated standings table (or a graceful “No standings data” card if Goalserve has no snapshot yet).
- No UI regressions on Premier League.
- No automated test loop / video generation.

Please implement the changes now.

---

IMPORTANT:
- Do NOT run automated end-to-end testing, screenshot/video capture, or long verification loops.
- Do NOT run test suites unless explicitly asked.
- Make minimal code changes and stop with a short summary + files changed.

Problem:
POST /api/jobs/upsert-goalserve-standings?leagueId=1205 fails with:
"Missing teams - cannot ingest standings until all teams exist"
It lists missingTeamIds and missingTeamNames (Championship clubs).

Goal:
For dev phase, standings ingestion should automatically upsert any missing teams from the standings payload BEFORE inserting standings rows. Then it should ingest standings normally.

Implementation requirements:
1) Update server/jobs/upsert-goalserve-standings.ts:
   - While parsing teamRows from Goalserve payload, collect:
     - goalserveTeamId (team.id)
     - team name (team.name)
   - Before inserting standings rows, ensure each referenced goalserveTeamId exists in our teams table.
   - For missing teams, UPSERT them:
     - name = team.name
     - slug = slugify(team.name) (same approach used elsewhere in the repo)
     - goalserveTeamId = team.id
     - competition/league link if your schema supports it; if not, just create team records.
   - After upserting, proceed with standings snapshot insert.

2) Keep the existing defensive checks, but change behavior:
   - Instead of returning an error when teams are missing, auto-create them and continue.

3) Ensure this change does NOT break Premier League (1204).
   - It should simply find all teams exist and continue as before.

4) Targeted verification only:
   - Re-run Championship ingest call; expect ok:true and insertedRowsCount (likely 24).
   - Then GET /api/standings?leagueId=1205&season=2025/2026 should return a table array.

Return:
- files changed
- summary of the team upsert logic
- the two curl commands to verify (POST ingest + GET standings)
- do not run broad tests or create test videos

---

You are working in the Football Mad repo.

Goal: Fix Championship standings so:
A) Team names never show as numeric Goalserve ids (e.g. "9227", "9240", "9363"). Every standings row must link to a real team record (teamId UUID), and team.name must be the proper team name.
B) Tables zone stripes + legend are league-specific. Premier League keeps current behaviour, but Championship uses:
   - 1st–2nd = Automatic Promotion (green)
   - 3rd–6th = Playoffs (amber)
   - Bottom 3 (22nd–24th) = Relegation (red)
   No Champions League / Europa League wording for Championship.

Implement with minimal disruption and keep existing PL working.

----------------------------
PART 1 — Server: Guarantee teamId mapping for ALL Goalserve teams
----------------------------

File: server/jobs/upsert-goalserve-standings.ts

Problem:
Some Championship rows are being saved with teamId = null, causing /api/standings to return team.name as the numeric Goalserve id.

Fix:
Introduce a helper that ALWAYS returns a UUID team id for a given goalserveTeamId, creating the team if missing, then selecting it back, and updating the in-memory map.

Requirements:
- Determine a reliable team display name from the Goalserve payload row.
- If team doesn't exist, insert into teams table with:
  - name: display name (NOT the numeric id)
  - slug: slugify(name)
  - goalserveTeamId: the numeric id string
- Handle race conditions using onConflictDoNothing, then SELECT to get the id.
- Update teamIdMap[goalserveTeamId] = uuid
- Use this function when building standings rows so teamId is never null.

Implementation guidance:

1) Add helpers near the top (or appropriate section):
- slugify(input: string): string
- toInt(...) already exists
- getTeamDisplayName(row: GoalserveTeamRow): string
  It should return the team name from the feed. Use the best available field(s) in priority order (depending on your actual Goalserve shape), e.g:
    row.name
    row.team?.name
    row.team_name
    row.club_name
  If nothing exists, fall back to goalserveTeamId (but this should be rare).

2) Add:
async function ensureTeamIdForGoalserveTeam(
  db,
  teamIdMap: Record<string,string>,
  goalserveTeamId: string,
  displayName: string
): Promise<string>

Pseudo:
- if (teamIdMap[goalserveTeamId]) return it
- try insert team { name: displayName, slug: slugify(displayName), goalserveTeamId }
  with onConflictDoNothing on goalserveTeamId (or the appropriate unique constraint you already use)
- then SELECT the team by goalserveTeamId
- if still not found, throw a descriptive error (this should never happen)
- set teamIdMap[goalserveTeamId] = team.id
- return team.id

3) When mapping teamRows into standings rows, do:
const goalserveTeamId = String(row.id ?? row.team?.id ?? row.team_id).trim()
const displayName = getTeamDisplayName(row)
const teamId = await ensureTeamIdForGoalserveTeam(db, teamIdMap, goalserveTeamId, displayName)

Then create standings row with teamId always set.

4) Re-run:
POST /api/jobs/upsert-goalserve-standings?leagueId=1205
Then GET /api/standings?leagueId=1205&season=2025/2026
Verify the response no longer contains:
  "team":{"id":null,"name":"9227",...}
All teams should have UUID ids and real names.

----------------------------
PART 2 — Client: League-specific zones + legend
----------------------------

Files:
- client/src/lib/league-config.ts
- client/src/components/tables/league-table.tsx
- (if needed) client/src/pages/tables.tsx (only to pass league slug/config through)

Approach:
Define “standings zones” in league-config, then render stripes + legend from that config.

1) In client/src/lib/league-config.ts:
Add a type:
type StandingsZone = { from: number; to: number; label: string; color: "emerald" | "amber" | "red" }

Add optional property to each league config:
standingsZones?: StandingsZone[]

Premier League zones should match current UI intent:
- 1–4: Champions League
- 5: Europa League
- 18–20: Relegation

Championship zones:
- 1–2: Automatic Promotion (emerald)
- 3–6: Playoffs (amber)
- 22–24: Relegation (red)

2) In client/src/components/tables/league-table.tsx:
Replace any hardcoded zone logic (pos <= 4, pos === 5, pos >= 18, etc.) with config-driven logic.

Implement:
function getZoneForPos(pos: number, zones?: StandingsZone[]) {
  if (!zones) return null
  return zones.find(z => pos >= z.from && pos <= z.to) ?? null
}

Stripe:
- Keep your robust stripe implementation (absolute stripe inside first cell).
- Determine stripe color class from zone.color:
  emerald -> bg-emerald-500/70
  amber   -> bg-amber-500/70
  red     -> bg-red-500/70
- If no zone, make stripe transparent.

Legend:
Render unique zone entries in order (as defined), showing the label and matching color.
For Championship, legend must show:
Automatic Promotion, Playoffs, Relegation
For PL, legend remains Champions League, Europa League, Relegation

3) Ensure LeagueTable receives zones:
Either:
- pass zones from Tables page (preferred): const league = getLeagueConfigBySlug(activeLeagueSlug); <LeagueTable zones={league.standingsZones} ... />
or
- LeagueTable can accept leagueSlug and look up config itself.

Do whichever matches existing architecture with minimal changes.

----------------------------
Verification checklist
----------------------------

Server:
- POST upsert-goalserve-standings?leagueId=1205 returns ok
- GET standings for 1205 shows all team ids are UUIDs and names are real club names (no numeric-only "9227"/etc)

Client:
- /tables -> Championship:
  - Rows 1–2 show green stripe
  - Rows 3–6 show amber stripe
  - Rows 22–24 show red stripe
  - Legend labels match Championship (no Champions League / Europa League)
- /tables -> Premier League remains unchanged.

Do not change production scheduling; this is dev-time live-ish behaviour only.

Make the edits, keep formatting consistent, and ensure TypeScript types compile.

---

Implement a safe dev-only purge + force reingest flow for standings snapshots, so we can replace earlier bad Championship snapshots that stored null teamIds (showing team names as numbers like "9227").

GOAL:
- Add a protected endpoint/job to purge standings snapshots for a given leagueId + season.
- Add a force mode to upsert-goalserve-standings so we can override the "skipped" optimization.
- After purge + ingest, the /api/standings response must have no team.id null and no numeric-only team.name values.

CHANGES REQUIRED:

A) Add purge endpoint (protected)
- In server/routes.ts (or wherever your job routes live), add:
  POST /api/jobs/purge-standings?leagueId=XXXX&season=YYYY/YYYY
  Requires header "x-sync-secret" to match GOALSERVE_SYNC_SECRET (same as other jobs).
- It should delete, in the correct order:
  1) standings rows for all snapshots matching leagueId+season
  2) standings snapshots matching leagueId+season
- Return JSON: { ok: true, leagueId, season, deletedSnapshotsCount, deletedRowsCount }

Notes:
- Use your existing DB layer. If your schema has tables like standings_snapshots + standings_rows, delete rows first, then snapshots.
- If your schema names differ, locate the tables used by upsert-goalserve-standings.ts and purge those.

B) Add force param to upsert-goalserve-standings
- In server/jobs/upsert-goalserve-standings.ts:
  - Accept query param force=1 from the route calling it (or accept an options arg).
  - If force=1, bypass "skipped" behavior and ALWAYS write a new snapshot + rows.

C) Ensure numeric team names never persist
- In getTeamDisplayName():
  - If the derived name is numeric-only (e.g. "9227"), treat as missing and fallback to `Team ${goalserveTeamId}`.
- When inserting teams, always store a non-numeric name (fallback as above).

ACCEPTANCE TEST:
1) Purge Championship standings:
   POST /api/jobs/purge-standings?leagueId=1205&season=2025/2026  (with x-sync-secret header)
2) Re-ingest with force:
   POST /api/jobs/upsert-goalserve-standings?leagueId=1205&force=1  (with x-sync-secret header)
3) GET /api/standings?leagueId=1205&season=2025/2026 should contain:
   - no `"id":null`
   - no `"name":"9227"` (worst case should be `"name":"Team 9227"` until we enrich)

Do not change client code in this prompt.

---

You are working in the Football Mad codebase.

Goal:
Enable League One and League Two standings in the Tables page using the same “near-live” autoRefresh + polling pipeline we already implemented for Premier League and Championship, with correct EFL-specific zones and legend.

Context:
- Standings are fetched via GET /api/standings?leagueId=XXXX&season=YYYY/YYYY&autoRefresh=1
- The client polls every 60s on /tables.
- server/jobs/upsert-goalserve-standings.ts already supports auto-creating missing teams, and we also have:
  - POST /api/jobs/purge-standings?leagueId=XXXX&season=YYYY/YYYY (x-sync-secret required)
  - POST /api/jobs/upsert-goalserve-standings?leagueId=XXXX&force=1 (x-sync-secret required)

Tasks:

A) League config: add standingsZones for League One + League Two
1) Open: client/src/lib/league-config.ts
2) Find existing league entries for “league-one” and “league-two”.
   - IMPORTANT: Do NOT guess goalserveLeagueId values.
   - Use the existing goalserveLeagueId from the file. If a league entry doesn’t exist, create it but only after checking if it exists elsewhere in the project (search for “league-one” and “league-two”).
3) Add standingsZones to each league config with these rules:

League One zones:
- Automatic Promotion: positions 1–2 (use emerald)
- Playoffs: positions 3–6 (use amber)
- Relegation: positions 21–24 (use red)
Legend labels must match these exactly.

League Two zones:
- Automatic Promotion: positions 1–3 (use emerald)
- Playoffs: positions 4–7 (use amber)
- Relegation: positions 23–24 (use red)
Legend labels must match these exactly.

Notes:
- We already have types StandingsZone and ZoneColor and a zones-driven legend in LeagueTable. Reuse the same structure used for ChampionshipZones/PLZones.
- Ensure LeagueTable receives zones from the currently selected league config (this should already exist). If it doesn’t, wire it the same way as Championship.

B) Tabs: ensure League One + League Two appear in the Tables UI
1) Open: client/src/data/tables-mock.ts
2) Ensure “League One” and “League Two” tabs exist with ids matching the league-config slugs (e.g. “league-one”, “league-two”).
   - If they already exist, do nothing.
   - If not, add them in the same style as Championship and Premier League.

C) Ingestion verification helpers (no new UI required)
1) Add a short note to docs/BUILD_LOG.md with the exact curl commands a dev can run to:
   - Purge standings for League One/Two for season 2025/2026
   - Force reingest standings for League One/Two
   Use placeholders like LEAGUE_ONE_ID and LEAGUE_TWO_ID, but also include a note telling the dev to copy the goalserveLeagueId values from client/src/lib/league-config.ts.

Example command format (keep consistent):
curl -sS -X POST \
  -H "x-sync-secret: $GOALSERVE_SYNC_SECRET" \
  "https://<replit-domain>/api/jobs/purge-standings?leagueId=LEAGUE_ONE_ID&season=2025/2026"

curl -sS -X POST \
  -H "x-sync-secret: $GOALSERVE_SYNC_SECRET" \
  "https://<replit-domain>/api/jobs/upsert-goalserve-standings?leagueId=LEAGUE_ONE_ID&force=1"

Same for League Two.

D) Acceptance checks
After implementing:
1) Navigate to /tables and click League One, then League Two.
2) Confirm the legend shows:
   - League One: Automatic Promotion, Playoffs, Relegation (no Champions League / Europa)
   - League Two: Automatic Promotion, Playoffs, Relegation
3) Confirm the left stripe highlights match the rules above.
4) Confirm the network requests include autoRefresh=1 and repeat ~every 60s on /tables.

Make only the necessary changes. Keep code consistent with existing patterns.

---

We discovered standings/1207 is Estonia Esiliiga (10 teams), so our League Two Goalserve leagueId mapping is WRONG.

Goal:
Find the correct Goalserve leagueId for:
- EFL League One
- EFL League Two
(and confirm Championship is 1205, Premier League is 1204)

Constraints:
- Do NOT run broad automated test loops.
- Keep verification targeted: small scripts, quick curls, small output.

Tasks:

1) Search our repo + docs for Goalserve standings IDs
- Scan any feed docs we have in the project (especially any file that looks like "full_package_feed.txt" or similar).
- Search for "League Two", "League 2", "EFL League Two", "EFL League 2", "Sky Bet League Two", "League One", "Sky Bet League One"
- Also search for "standings/" and "tournament" and "leagueId"

2) Add a tiny helper script (or just a list in code) that lets us quickly validate candidate IDs by curling Goalserve and printing:
- country
- tournament league name
- season
- team count
Example curl:
curl -sS "https://www.goalserve.com/getfeed/$GOALSERVE_FEED_KEY/standings/<ID>.xml?json=true" | head -n 30

We only need to validate a handful of candidates.

3) Once correct IDs are found:
- Update client/src/lib/league-config.ts mappings so:
  - league-one -> correct ID
  - league-two -> correct ID
- Ensure the standingsZones for League One and League Two match EFL:
  - Top 3 = Promotion (or top 3 with 4-7 playoffs depending on league rules — but for now keep it consistent with current EFL structure we are using in UI)
  - Playoffs positions as appropriate
  - Bottom 4 = Relegation (EFL League One/Two are typically bottom 4, not bottom 3)

But: before changing zones, confirm the team count is 24 and the league name matches.

4) Provide me with:
- The final confirmed leagueIds for League One and League Two
- The exact curl commands I can run to verify them (using my replit domain is not needed for Goalserve curls)
- Then make the minimal mapping change in league-config.ts.

Do not touch any other files unless required.

---

We have now confirmed correct Goalserve league IDs:
- Premier League: 1204
- Championship: 1205
- League One: 1206
- League Two: 1197  (IMPORTANT: 1207 is Estonia Esiliiga)

Goal:
Wire League Two properly end-to-end and ingest the correct standings snapshot, using our existing purge + force ingest flow.

Constraints:
- DO NOT run broad automated test loops or video-based testing.
- Keep changes minimal and targeted.
- Do not refactor unrelated files.

Tasks:
1) Update client/src/lib/league-config.ts:
   - league-two goalserveLeagueId must be "1197" (not 1207).
   - Ensure league-one remains "1206".

2) Confirm standingsZones are correct for EFL leagues:
   - Championship: 1-2 Automatic Promotion, 3-6 Playoffs, 22-24 Relegation (already done)
   - League One: 1-2 Automatic Promotion, 3-6 Playoffs, 21-24 Relegation
   - League Two: 1-3 Automatic Promotion, 4-7 Playoffs, 21-24 Relegation
   Implement/adjust zones in league-config.ts only.

3) Verify the tables UI picks up League Two correctly:
   - /tables → League Two should call /api/standings?leagueId=1197&season=2025%2F2026&autoRefresh=1

4) Provide me with the exact shell commands (using my Replit domain) to:
   - Purge the old wrong League Two snapshot for leagueId=1207 (Estonia)
   - Purge any existing League Two snapshot for leagueId=1197 (safe)
   - Force ingest standings for leagueId=1197
   - Fetch standings for leagueId=1197 and confirm 24 teams

Output:
- Summary of exactly what changed
- The final shell commands ready to copy/paste

---

Update League Two standings zones.

Context:
League Two (EFL) relegation is ONLY 2 teams: positions 23 and 24.
The rest of the League Two zones should remain:
- Automatic Promotion: positions 1-3
- Playoffs: positions 4-7
- Relegation: positions 23-24

Task:
1) In client/src/lib/league-config.ts, find the league config for slug "league-two".
2) Update standingsZones so the relegation zone uses startPos: 23 and endPos: 24 (NOT 21-24).
3) Do not change League One or Championship zones.
4) Ensure the legend and left-hand stripe rendering still uses the zones config (no hardcoding).
5) Return a short summary of exactly what changed.

After the change, /tables → League Two should show the red relegation highlight only for 23rd and 24th.

---

Goal: Add National League (England) standings support to the Tables page, including correct promotion/playoff/relegation zone highlighting as per Soccerway:
- 1st: Promoted
- 2nd–3rd: Playoff Semi-final
- 4th–7th: Playoff Quarter-final
- 21st–24th: Relegation (bottom 4)

Also: Add a small dev-only endpoint to preview Goalserve standings metadata (league name/country/season/team count) for a given goalserve leagueId, so we can confirm the correct leagueId before we ingest.

Changes:

1) client/src/lib/league-config.ts
- Add a new league config entry:
  slug: "national-league"
  name: "National League"
  (goalserveLeagueId: leave as a placeholder string for now e.g. "TODO_GOALSERVE_ID")
- Add standingsZones for National League:
  - { label: "Promoted", range: [1,1], color: "emerald" }
  - { label: "Playoff Semi-final", range: [2,3], color: "amber" }
  - { label: "Playoff Quarter-final", range: [4,7], color: "orange" }
  - { label: "Relegation", range: [21,24], color: "red" }

Make sure the zones system supports multiple different colours (we already use emerald/amber/red — add orange if not present, using Tailwind classes).

2) client/src/data/tables-mock.ts (or wherever the Tables league tabs are defined)
- Add "National League" as a selectable tab in the Leagues list, using id/slug: "national-league".
- Ensure it flows through the existing tables page logic the same way as PL/Championship/League One/League Two.

3) server/routes.ts
Add a DEV utility route to preview goalserve standings without ingesting:
GET /api/dev/goalserve/standings-preview?leagueId=XXXX
- Must require x-sync-secret header and reuse GOALSERVE_SYNC_SECRET to protect it.
- It should call Goalserve standings feed for that leagueId using the existing GOALSERVE_FEED_KEY env var.
- Parse enough to return:
  { ok: true, leagueId, country, leagueName, season, stageId, teamCount }
- If the response doesn’t look like standings data, return ok:false and include the raw top-level keys.

Important: Keep this endpoint lightweight and safe (no DB writes). It is for development only.

4) After wiring, update docs/BUILD_LOG.md with:
- The National League zone rules
- The new preview endpoint usage

Acceptance checks:
- National League appears in /tables.
- Zones render with the correct ranges and legend labels.
- Preview endpoint works and helps us find the correct goalserve leagueId.

---

Add a DEV-only API endpoint to search our competitions mapping so we can find Goalserve league IDs (e.g., National League).

Implement:
- File: server/routes.ts
- Add GET /api/dev/competitions/search?q=...&country=...&limit=...
- No auth required (DEV only)
- It should return JSON array results of competitions that match q (case-insensitive substring match).
- Include fields: { id, name, country, goalserveLeagueId } (or closest equivalents in our schema).
- If we don’t have a competitions table, search whatever mapping/store we used previously to discover League Two = 1197 and League One = 1206.
- Sort best matches first (name match + country match).
- Add a short note + example curl to docs/BUILD_LOG.md.

After this, I will call:
curl -sS "https://f04e3e83-5dee-4d43-ba21-fba6506a8e19-00-3rjffbqt7u6wn.spock.replit.dev/api/dev/competitions/search?q=national%20league&country=england"

---

Update National League standings config.

File: client/src/lib/league-config.ts

1) In the league config entry with slug: "national-league":
   - Set goalserveLeagueId to "1203" (Goalserve calls it "Conference")

2) Ensure standingsZones for National League match:
   - Promoted: positions 1-1
   - Playoff Semi-Final: positions 2-3
   - Playoff Quarter-Final: positions 4-7
   - Relegation: positions 21-24

3) Do NOT change existing League One / League Two / Championship / Premier League zones.

Output: short summary of changes only.

---

TASK: Standardise standings legend labels across the site for playoff wording + mobile friendliness.

CONTEXT:
Our league tables legend is config-driven via `standingsZones` in `client/src/lib/league-config.ts` and rendered dynamically in `client/src/components/tables/league-table.tsx`.

GOAL:
1) Use “Play Off” (two words) everywhere (instead of “Playoff” / “Playoffs”).
2) Shorten “Semi-final” to “SF” and “Quarter-final” to “QF” in legend labels (to keep the legend on one line on mobile).

CHANGES:
1) Open `client/src/lib/league-config.ts`.
2) For ALL zone labels that currently include:
   - “Playoff” or “Playoffs”  → replace with “Play Off”
   - “Semi-final” or “Semi-finals” → replace with “SF”
   - “Quarter-final” or “Quarter-finals” → replace with “QF”

EXAMPLES (apply this pattern everywhere relevant):
- "Playoff Semi-final"   → "Play Off SF"
- "Playoff Quarter-final" → "Play Off QF"
- "Playoffs Semi-finals"  → "Play Off SF"
- "Playoffs Quarter-finals" → "Play Off QF"

IMPORTANT:
- Do NOT change any zone position ranges or colours.
- This is label-only standardisation.
- Ensure National League zones end up as:
  - Promoted (1)
  - Play Off SF (2–3)
  - Play Off QF (4–7)
  - Relegation (bottom 4)

VERIFICATION:
- Load `/tables` and check:
  - National League legend shows: “Promoted”, “Play Off SF”, “Play Off QF”, “Relegation”
  - Mobile view legend is more compact (ideally one line, minimal wrapping)
- Sanity check Championship/League One/League Two legends for consistent “Play Off” wording.

DELIVERABLE:
Commit the change with a short message like:
“Standardise Play Off legend labels (SF/QF)”

---

You are working in the Football Mad codebase.

Goal: Add standings support for 4 “Big Euro” leagues on the Tables page:
- La Liga (Spain)
- Serie A (Italy)
- Bundesliga (Germany)
- Ligue 1 (France)

IMPORTANT:
- Do NOT guess Goalserve league IDs.
- Use the existing competitions search endpoint to discover IDs:
  GET /api/dev/competitions/search?q=<query>&country=<country>
- Then update client/src/lib/league-config.ts with the discovered goalserveLeagueId for each league.

Domain to use in verification commands:
https://f04e3e83-5dee-4d43-ba21-fba6506a8e19-00-3rjffbqt7u6wn.spock.replit.dev

Tasks:

1) Find the correct Goalserve IDs (do this first)
Run curl calls (or use server code knowledge) against:
  - /api/dev/competitions/search?q=la%20liga&country=spain
  - /api/dev/competitions/search?q=primera&country=spain
  - /api/dev/competitions/search?q=serie%20a&country=italy
  - /api/dev/competitions/search?q=bundesliga&country=germany
  - /api/dev/competitions/search?q=ligue%201&country=france
Pick the top-level main leagues (not cups, not B teams, not youth, not women).

2) Update league config
File: client/src/lib/league-config.ts
- Ensure these leagues exist as configs (slug/name/shortName):
  - la-liga / La Liga / LL
  - serie-a / Serie A / SA
  - bundesliga / Bundesliga / BUN
  - ligue-1 / Ligue 1 / L1
- Set goalserveLeagueId to the discovered value for each.
- Add standingsZones for each league (config-driven highlighting):
  Use “Euro default” zones for now (easy to tweak later):
    - Champions League: positions 1-4
    - Europa League: position 5
    - Conference League: position 6
    - Relegation: bottom 3 (or bottom 2 for Bundesliga if appropriate)
  NOTE: If you’re unsure for a league, set Relegation conservatively (bottom 3) and add a TODO comment.
  Zone objects should match the existing StandingsZone type and render cleanly in the legend.

3) Ensure the Tables UI shows them
File: client/src/data/tables-mock.ts
- Make sure these tabs exist (id must match slug):
  - la-liga
  - serie-a
  - bundesliga
  - ligue-1

4) Build log
File: docs/BUILD_LOG.md
- Add a short section: “Big Euro Leagues Standings”
- Record the final Goalserve IDs discovered.

5) Verification commands (print these at the end)
Provide commands for each league using the domain above:
A) Purge
POST /api/jobs/purge-standings?leagueId=<ID>&season=2025/2026
B) Force ingest
POST /api/jobs/upsert-goalserve-standings?leagueId=<ID>&force=1
C) Fetch snapshot
GET /api/standings?leagueId=<ID>&season=2025/2026

Use GOALSERVE_SYNC_SECRET header where required.

Acceptance:
- Each league appears on /tables and loads data after ingest.
- No team names render as numeric IDs.
- Legends render from standingsZones with short labels (keep them compact where possible).

---

You are working in the Football Mad codebase.

Goal: Fix Ligue 1 (France) standings zones on /tables to match Goalserve/Soccerway logic.

Context:
We ingest Ligue 1 via Goalserve leagueId=1221. The standings feed indicates:
- 1–3: "Promotion - Champions League (League phase)"
- 4: "Promotion - Champions League (Qualification)" (this is the CL playoff/qualifier spot)
- 5: "Promotion - Europa League (League phase)"
- 6: "Promotion - Conference League (Qualification)"
- 16: relegation playoff
- 17–18: relegation

Tasks:
1) Update the Ligue 1 standings zone config in:
   client/src/lib/league-config.ts

2) Ensure the highlighted rows + legend reflect:
   - Champions League: positions 1–3
   - Champions League Qual/Playoff: position 4
   - Europa League: position 5
   - Conference League: position 6
   - Relegation Play Off: position 16
   - Relegation: positions 17–18

Implementation detail:
- Find the existing Ligue 1 zones (likely called Ligue1Zones or similar).
- Change the ranges so CL is 1–3 (not 1–4), and create a separate single-position zone for 4 (CL qualification/playoff).
- Keep EL=5 and ECL=6.
- Keep relegation playoff=16 and relegation=17–18 as-is.

Acceptance criteria:
- On /tables > Ligue 1, the left-side zone markers/highlights match the rules above.
- Legend labels look sensible (e.g. "Champions League", "Champions League Qual.", "Europa League", "Conference League", "Relegation Play Off", "Relegation").
- No other leagues are affected.

After changes:
- Restart the dev server if needed.
- You do NOT need to re-ingest standings because this is only UI zoning.

Deliverable:
- Provide the exact diff for client/src/lib/league-config.ts.

---

// ===== Ligue 1 Standings Zones =====
const Ligue1Zones: StandingsZone[] = [
  { from: 1, to: 3, label: "Champions League", color: "emerald" },
  { from: 4, to: 4, label: "UCL Qual.", color: "cyan" },
  { from: 5, to: 5, label: "Europa League", color: "amber" },
  { from: 6, to: 6, label: "Conference League", color: "orange" },
  { from: 16, to: 16, label: "Relegation Play Off", color: "orange" },
  { from: 17, to: 18, label: "Relegation", color: "red" },
];

---

You are working in the Football Mad codebase (Replit). Goal: Add FA Cup (England) support to the Tables page under a new “Cups” tab, using Goalserve competitionId 1198, showing tournament progress grouped by round.

REQUIREMENTS
1) UI
- On /tables, add a top-level segment/tab called “Cups” alongside “Leagues” and “Europe” (match existing styling).
- Under Cups, add a selectable cup chip/tab: “FA Cup”.
- When FA Cup is selected, render a “Cup progress” view (NOT league standings).
- Cup progress view must show fixtures/results grouped by round (e.g., Third Round, Fourth Round, Fifth Round, Quarter-finals, Semi-finals, Final).
- Each match row shows: Home team, Away team, score (if played), kick-off datetime (if scheduled), and status (FT/HT/NS etc if available).
- Keep the UI responsive; on mobile, group headers + compact match rows.

2) Data + API
- Add a backend endpoint: GET /api/cup/progress?competitionId=1198&season=2025/2026
- This endpoint should fetch Goalserve data and return normalized JSON grouped by round.
- Use the existing Goalserve feed key env var + HTTP fetch pattern already used by standings ingestion.
- IMPORTANT: Do not require ingestion jobs for MVP; fetch live from Goalserve for now (we’ll cache later).

3) Goalserve feed
- Use a Goalserve cup/fixtures feed appropriate for FA Cup based on existing patterns in the repo.
- If the repo already has a “fixtures by league/competition” fetcher, reuse it.
- If not, implement a minimal fetcher in server:
  - Call Goalserve using competitionId=1198 and season when supported.
  - Parse JSON structure to extract:
    - round name (or stage/round label)
    - match list
    - teams
    - score
    - datetime
    - status
- Normalize round naming:
  - “Quarter-finals” (not “Quarter Finals”)
  - “Semi-finals”
  - “Final”
- Sort rounds in correct order (early rounds first, final last). Within a round, sort by datetime ascending.

4) Config / Wiring
- Add FA Cup to the client competition config:
  - id/slug: "fa-cup"
  - name: "FA Cup"
  - country: "England"
  - goalserveCompetitionId: "1198"
  - type: "cup"
- Ensure selecting “Cups → FA Cup” triggers the new endpoint and renders results.

5) QA / Verification
- Add a small dev helper curl in docs (or comment) to verify:
  curl -sS "$DOMAIN/api/cup/progress?competitionId=1198&season=2025/2026" | head -n 80
- Confirm /tables → Cups → FA Cup loads without errors and displays grouped rounds.

CONSTRAINTS
- Do NOT break existing Leagues tables.
- Keep the code style consistent with existing fetch hooks/components.
- Keep it MVP: no bracket graphics yet, no caching yet, no pagination yet.

IMPLEMENTATION HINTS (use if helpful)
- Create/extend a shared type like:
  CupRound { name: string; order: number; matches: CupMatch[] }
  CupMatch { home: { id? name }, away: { id? name }, score?: { home, away }, kickoff?: string, status?: string }
- Frontend: a <CupProgress /> component rendered only when active competition.type === "cup".
- Backend: place endpoint near other public API routes, and reuse existing Goalserve fetch util if present.

Deliver: Code changes only. After implementation, provide a short summary of files changed and how to test.

---

We have an FA Cup (Goalserve competitionId 1198) cups progress feature, but /api/cup/progress currently returns {"rounds":[]} because the backend is calling the WRONG Goalserve URL.

Goalserve soccer fixtures/results must use:
https://www.goalserve.com/getfeed/{GOALSERVE_FEED_KEY}/soccerfixtures/leagueid/{LEAGUE_ID}?json=true
(For cups like FA Cup 1198, the feed shape is tournament -> stage -> (week) -> match.)

PLEASE DO THIS:

1) Find the code that fetches Goalserve fixtures for /api/cup/progress (search for:
   - "/api/cup/progress"
   - "fixtures/"
   - "goalserve" + "competitionId"
   - "1198"
   - "getfeed" )

2) Replace any URL like:
   .../fixtures/{competitionId}.xml?json=true
   .../soccernew/fixtures/{competitionId}.xml?json=true
   .../fixtures/1198.xml?json=true
   with the correct soccer fixtures feed:
   https://www.goalserve.com/getfeed/${GOALSERVE_FEED_KEY}/soccerfixtures/leagueid/${competitionId}?json=true

3) Support optional season filtering:
   - If season is provided, add it as a query param:
     ?season=2025/2026&json=true
     (URL-encode the season value)
   - If season is not provided:
     ?json=true

4) Add a safety check before parsing:
   - If the response starts with "<" or contains "<html", treat it as an error and log a helpful message:
     "Goalserve returned HTML (likely wrong endpoint / auth / feed key)."
   - Return { competitionId, rounds: [] } with an error field OR throw a 502 with a clear message (your choice, but be consistent).

5) Parsing logic:
   - Handle BOTH shapes:
     a) results.tournament.stage[].week[].match[]
     b) results.tournament.stage[].match[]
   - Flatten matches into your internal model, then group by round using:
     - stage.name and/or stage.round and/or match.round / match.round_name (whatever exists in the JSON)
   - Keep your existing round ordering rules.

6) Update or add a dev verification command in your docs and/or comments:

   curl -sS "https://www.goalserve.com/getfeed/$GOALSERVE_FEED_KEY/soccerfixtures/leagueid/1198?json=true" | head -n 40

7) Re-test the app:
   - /api/cup/progress?competitionId=1198&season=2025/2026 should return non-empty rounds (assuming fixtures exist in that season)
   - /tables -> Cups tab should populate.

IMPORTANT: Do NOT change the standings work. Only fix the cup fixtures feed URL + parsing robustness.

---

TASK: Fix FA Cup round ordering collisions in /api/cup/progress.

CONTEXT:
The endpoint returns rounds with { name, order, matches }. Right now "1/8-finals" and "Quarter-finals" both map to order=6, causing unstable ordering. We want unique ordering for every main round.

REQUIREMENTS:
1) Locate the round normalization / ordering logic used by server endpoint GET /api/cup/progress (likely in server/routes.ts or a helper used by that route). Find the function that converts a round label into an "order" number (e.g. roundOrder(), normalizeRound(), getRoundOrder()).
2) Update the mapping so these round names produce UNIQUE order values in this sequence:
   - "1/128-finals" => -4
   - "1/64-finals"  => -3
   - "1/32-finals"  => -2
   - "1/16-finals"  => -1
   - "1/8-finals"   =>  0
   - "Quarter-finals" => 1
   - "Semi-finals"    => 2
   - "Final"          => 3
3) Keep existing support for qualifying rounds + “Proper” rounds (Extra Preliminary, Preliminary, 1st–4th Qualifying, First–Fifth Round Proper, etc). Do not break them.
4) Ensure sorting uses (order ASC, kickoff ASC) within each round group.
5) Add a tiny dev-only sanity log or comment showing the expected order list, but do NOT spam logs in production.

ACCEPTANCE TEST:
Run:
curl -sS "$DOMAIN/api/cup/progress?competitionId=1198&season=2025/2026" \
| grep -Eo '"name":"[^"]+","order":-?[0-9]+,"matches":\[' \
| sed -E 's/"name":"([^"]+)","order":(-?[0-9]+).*/\2\t\1/' \
| sort -n \
| nl -ba

Expected ordering:
-4 1/128-finals
-3 1/64-finals
-2 1/32-finals
-1 1/16-finals
 0 1/8-finals
 1 Quarter-finals
 2 Semi-finals
(And Final appears as 3 when present)

DELIVERABLE:
Commit the code change with a clear message like: "Fix FA Cup round ordering (unique orders for 1/8, QF, SF, Final)".

---

TASK: Finalise FA Cup round ordering + restore “First Round”..“Fifth Round” support.

CONTEXT:
In /api/cup/progress we normalise a round name then map it to an integer order via a roundOrder dictionary.
Bug: code used `roundOrder[key] || 99`, which breaks when the mapped order is 0 (e.g. "1/8-finals"), because 0 is falsy and becomes 99.
Also ensure standard FA Cup "First Round" through "Fifth Round" mappings are present.

DO THIS:
1) Find the round ordering logic used by GET /api/cup/progress (likely in server/routes.ts or a helper file).
2) Ensure normalisation + lookup use consistent casing:
   - EITHER make normalizeRoundName() return lowercased output
   - OR lowercase the lookup key: `const key = normalizedName.toLowerCase()`
   (Choose the cleanest + most consistent approach in the file.)
3) Restore/ensure these mappings exist (keys should match your chosen casing):
   - "first round"  -> order for First Round Proper (after qualifying)
   - "second round" -> order
   - "third round"  -> order
   - "fourth round" -> order
   - "fifth round"  -> order
   Keep the existing qualifying mappings too (Extra Preliminary, Preliminary, 1st–4th Qualifying, etc).
4) Fix the falsy-zero bug by replacing:
      `roundOrder[key] || 99`
   with:
      `roundOrder[key] ?? 99`
   so 0 is respected.
5) Ensure these fractional rounds map uniquely:
   - 1/128-finals => -4
   - 1/64-finals  => -3
   - 1/32-finals  => -2
   - 1/16-finals  => -1
   - 1/8-finals   => 0
   - Quarter-finals => 1
   - Semi-finals    => 2
   - Final          => 3
6) Remove any debug logging you added.
7) Update docs (replit.md or docs/BUILD_LOG.md – whichever you’re using) to note:
   - We use `??` not `||` because order can be 0.
   - List the round ordering table above.

ACCEPTANCE TEST:
export DOMAIN="https://f04e3e83-5dee-4d43-ba21-fba6506a8e19-00-3rjffbqt7u6wn.spock.replit.dev"

curl -sS "$DOMAIN/api/cup/progress?competitionId=1198&season=2025/2026" \
| grep -Eo '"name":"[^"]+","order":-?[0-9]+,"matches":\[' \
| sed -E 's/"name":"([^"]+)","order":(-?[0-9]+).*/\2\t\1/' \
| sort -n \
| nl -ba

Expected to include (in this order):
-4  1/128-finals
-3  1/64-finals
-2  1/32-finals
-1  1/16-finals
 0  1/8-finals
 1  Quarter-finals
 2  Semi-finals
(and Final as 3 when present)

DELIVERABLE:
Commit with message: "Fix FA Cup round ordering (use ??, restore First–Fifth Round mappings)".

---

We have spurious FA Cup data showing under late rounds (e.g. “quarter-finals” has 80+ fixtures with non-league teams). This is caused by Goalserve using “Quarter-finals/Semi-finals/Final” labels inside qualifying sub-stages, and our normalizeRoundName() collapses them into the same key as the main competition rounds.

Please fix /api/cup/progress round grouping + naming as follows:

1) While parsing Goalserve data, preserve stage context:
   - capture stageName (stage.name if available, else stage_id) for each match group.
   - capture rawRoundName from week.name / round.name / match.round where available.

2) Update normalizeRoundName so it returns a LOWERCASED normalizedRound.
   - keep current mappings for fractional rounds (1/128-finals, 1/64-finals, 1/32-finals, 1/16-finals, 1/8-finals) and First–Fifth Round, etc.
   - BUT for ambiguous labels ["quarter-finals","semi-finals","final"]:
        a) only return exactly those names when we’re confident it’s the main tournament round.
        b) otherwise return a disambiguated name that includes stage, e.g.:
           `${slug(stageName)} ${normalizedRound}`
           OR `qualifying ${normalizedRound}` when stageName indicates qualifying/preliminary.

3) Add a sanity guard using match counts:
   - If normalizedRound is "quarter-finals" and matchesInThatGroup > 8 => treat as non-main: rename to `qualifying quarter-finals` (or stage-prefixed).
   - If "semi-finals" and matches > 4 => treat as non-main.
   - If "final" and matches > 2 => treat as non-main.

4) Ensure ordering still works:
   - keep fractional order mapping: -4,-3,-2,-1,0
   - main quarter/semi/final orders: 1,2,3
   - any qualifying-stage “quarter-finals/semi-finals/final” should NOT share the same order bucket as the main ones; give them an order derived from stage (e.g. 50+) so they appear earlier or grouped separately, but never collide with main QF/SF/Final.

5) Frontend display:
   - Keep internal keys lowercase, but display labels nicely:
     - title case for “quarter-finals/semi-finals”
     - keep “1/128-finals” style as-is (or title-case it without breaking).
   - Result: the Cups tab should show realistic late-round sections (QF=~4 matches, SF=~2, Final=1), and qualifying sub-stage “quarter-finals” should no longer pollute them.

Add a small dev log (behind a DEBUG flag) that prints any round groups failing the sanity thresholds so we can confirm.

After changes, restart and verify by hitting:
  /api/cup/progress?competitionId=1198&season=2025/2026
and confirm “quarter-finals” is not huge and contains sensible teams.

---

You are working in my repo (Replit). Please update the FA Cup Cups feature so the UI uses my canonical 14-round naming and only shows valid FA Cup rounds.

GOAL
Fix /api/cup/progress (FA Cup: competitionId=1198) so rounds are grouped and displayed using ONLY these canonical round names, in this exact order:

Qualifying (6):
1) Extra Preliminary Round
2) Preliminary Round
3) First Qualifying Round
4) Second Qualifying Round
5) Third Qualifying Round
6) Fourth Qualifying Round

Proper (8):
7) First Round
8) Second Round
9) Third Round
10) Fourth Round
11) Fifth Round
12) Quarter-finals
13) Semi-finals
14) Final

KEY RULES
1) Round normalization must return one of the 14 canonical names above, or null (meaning discard).
2) Any stage/round name that does NOT map must be ignored (this prevents spurious “team names as rounds” and polluting knockout rounds).
3) Keep season support (?season=2025/2026) and the current working Goalserve endpoint logic that returns JSON (and keep the HTML detection guard).
4) Ensure ordering is stable by mapping canonical names to an explicit order 1..14.

MAPPING REQUIREMENTS
- Goalserve fractional rounds must map like this:
  - "1/128-finals" => "First Round"
  - "1/64-finals"  => "Second Round"
  - "1/32-finals"  => "Third Round"
  - "1/16-finals"  => "Fourth Round"
  - "1/8-finals"   => "Fifth Round"
  - "quarter-finals" => "Quarter-finals"
  - "semi-finals" => "Semi-finals"
  - "final" => "Final"
- Goalserve qualifying text mapping (case-insensitive, tolerate “1st/first”, hyphens, etc):
  - contains "extra preliminary" => "Extra Preliminary Round"
  - contains "preliminary" (but not "extra") => "Preliminary Round"
  - contains "first qualifying" or "1st qualifying" => "First Qualifying Round"
  - contains "second qualifying" or "2nd qualifying" => "Second Qualifying Round"
  - contains "third qualifying" or "3rd qualifying" => "Third Qualifying Round"
  - contains "fourth qualifying" or "4th qualifying" => "Fourth Qualifying Round"

IMPLEMENTATION NOTES
- Locate the code for /api/cup/progress in the server (likely server/routes.ts or similar).
- The parser currently iterates Goalserve shapes like:
  results.tournament.stage[].week[].match[]
  results.tournament.stage[].round[].match[]
  results.tournament.stage[].match[]
  Ensure we do NOT double-count matches if the same matches appear in more than one structure. Prefer a single canonical extraction path and dedupe by match id if needed.
- Build a dictionary keyed by canonicalRoundName -> matches[].
- For each match, decide the round name using the stage/round naming available in the feed; pass it through normalizeToCanonicalRound(name). If null, skip.
- Return JSON:
  { competitionId, season?, rounds: [{ name, order, matches: [...] }] }
  where name is the canonical display name and order is 1..14.
- Frontend: ensure the Cups tab displays the round name exactly as returned (these are already display-ready).
- Keep existing match sorting inside each round by kickoff datetime.

ADD A QUICK DEV NOTE
- Update docs/BUILD_LOG.md (or relevant doc) with:
  - the canonical round list
  - the mapping table for fractional rounds
  - the rule: “discard anything that doesn’t map”

ACCEPTANCE CHECKS (do these yourself after changes)
- Hitting /api/cup/progress?competitionId=1198&season=2025/2026 returns rounds ONLY from the canonical list above.
- No massive “Quarter-finals” buckets with 80+ matches.
- Fractional rounds appear under the correct “First Round / Second Round / …” naming.

After implementing, show me:
1) the files changed
2) the new normalize function (or relevant snippet)
3) a sample response (first 1-2 rounds) from /api/cup/progress for FA Cup

---

Goal: On Tables → Cups → FA Cup, show ALL fixtures per round, with each round collapsible/expandable as an accordion.

Context:
We already have /api/cup/progress returning canonical FA Cup round names and matches grouped by round, ordered correctly.

Requirements:
1) Replace the current “+X more fixtures” pattern with a proper Accordion UI.
2) Each round should be a collapsible/expandable section.
3) When expanded, render ALL matches in that round (no slicing/limit).
4) Default behaviour:
   - Expand the first round that is not fully completed (i.e. has any match status not in FT/AET/PEN).
   - If all rounds are completed, expand the latest round (highest order).
5) Each accordion header should display:
   - Round name (e.g. “Third Round”)
   - A right-aligned pill summarising the round state:
       - “Completed” if all matches are final
       - “In progress” if any match is live/HT/ET/etc
       - “Upcoming” if all matches are NS / Not Started
   - A smaller subtext like “32 fixtures” (or match count)
6) Inside the expanded panel:
   - Show the existing match rows (home/away, score if present, kickoff date/time, status badge).
   - Keep the current clean layout + spacing.
7) Keep it performant:
   - Use React state per round (or a single openRoundKey).
   - Use stable keys (match.id).
8) Use whatever UI kit is already in the repo (if shadcn/ui exists, use Accordion from it; otherwise implement a minimal accordion with button + conditional render).
9) Make sure the page height grows normally (no container with fixed height / overflow hidden). If there is a wrapper causing truncation, remove the fixed height or change to overflow-visible.

Deliverables:
- Update the CupProgress component (client/src/components/tables/cup-progress.tsx or wherever it lives).
- Ensure no match list is truncated.
- Keep the current styling consistent with Tables page.

After implementation, add a quick dev note in replit.md describing the accordion behaviour and default-open logic.

---

We already have FA Cup working via /api/cup/progress and the Cups UI accordion on /tables.
Now add the EFL Cup (Carabao Cup) using Goalserve competitionId=1199.

GOALS:
1) Add EFL Cup as an additional Cup tab/option next to FA Cup on the Tables page (Cups section).
   - Display name in UI: "EFL Cup" (optionally subtitle "Carabao Cup" in small text if you want, but keep it simple).
   - competitionId for API calls: 1199
   - season default: 2025/2026

2) Update the backend round canonicalization used inside /api/cup/progress so it supports BOTH:
   - FA Cup (1198) canonical 14-round naming (already implemented)
   - EFL Cup (1199) canonical 7-round naming:
     First Round
     Second Round
     Third Round
     Fourth Round
     Quarter-finals
     Semi-finals
     Final

3) IMPORTANT: keep FA Cup behaviour unchanged.
   - Only extend logic to support EFL Cup.
   - Reuse the existing endpoint shape:
     { competitionId, rounds: [{ name, order, matches: [...] }] }

BACKEND IMPLEMENTATION DETAILS:
- In server/routes.ts (or wherever /api/cup/progress is implemented):
  a) Detect competitionId:
     const competitionId = String(req.query.competitionId || "")
  b) Use a competition-specific normalizer:
     - normalizeToCanonicalRound_FA_CUP(name) -> existing
     - normalizeToCanonicalRound_EFL_CUP(name) -> new
  c) For EFL Cup mapping, handle Goalserve round/stage names likely to appear, case-insensitively, e.g.:
     "First Round", "1st Round", "Round 1" => "First Round"
     "Second Round", "2nd Round", "Round 2" => "Second Round"
     "Third Round", "3rd Round", "Round 3" => "Third Round"
     "Fourth Round", "4th Round", "Round 4" => "Fourth Round"
     "Quarter-finals", "Quarterfinals", "Quarter Finals", "QF" => "Quarter-finals"
     "Semi-finals", "Semifinals", "Semi Finals", "SF" => "Semi-finals"
     "Final" => "Final"
  d) Assign stable ordering for EFL Cup:
     First Round = 1
     Second Round = 2
     Third Round = 3
     Fourth Round = 4
     Quarter-finals = 5
     Semi-finals = 6
     Final = 7

- Ensure deduping remains (by match id) and that we do NOT double-parse stage.match and stage.round[].match duplicates.
- Keep the HTML-detection guard and season parameter support.

FRONTEND IMPLEMENTATION DETAILS:
- In client/src/components/tables/cup-progress.tsx (or current Cups component):
  a) Add a selector / tabs to switch between cups:
     - FA Cup (competitionId=1198)
     - EFL Cup (competitionId=1199)
  b) When selected, call /api/cup/progress?competitionId=...&season=2025/2026
  c) Keep the accordion UI behaviour: each round collapsible; show all fixtures per round when expanded.
  d) The API now returns display-ready canonical names, so don’t over-format beyond existing.

DOCS:
- Update replit.md:
  - Add EFL Cup support summary (id 1199)
  - Add EFL Cup canonical round list + ordering table.

VALIDATION:
- Add (or update) quick shell verification commands in replit.md:
  export DOMAIN=...
  curl -sS "$DOMAIN/api/cup/progress?competitionId=1199&season=2025/2026" > /tmp/eflcup.json
  node -e 'const d=require("/tmp/eflcup.json"); console.log("Rounds:", d.rounds.length); d.rounds.forEach(r=>console.log(r.order, r.name, r.matches.length));'

- Make sure /tables shows both cups and switching works.

Please implement all changes and keep them minimal and robust.

---

EFL Cup (competitionId=1199) is only returning Quarter-finals + Semi-finals.
This means earlier rounds are being discarded because normalizeToCanonicalRound_EFL_CUP is returning null.

Please update server/routes.ts (the /api/cup/progress endpoint) as follows:

1) Extend normalizeToCanonicalRound_EFL_CUP(name: string):
   - Always lowercase+trim once.
   - Map these variants (case-insensitive):

   FIRST ROUND:
   - "first round", "1st round", "round 1", "round1"
   - "1/64-finals", "1/64 final", "1/64-finals"
   - "round of 64", "last 64"

   SECOND ROUND:
   - "second round", "2nd round", "round 2", "round2"
   - "1/32-finals", "round of 32", "last 32"

   THIRD ROUND:
   - "third round", "3rd round", "round 3", "round3"
   - "1/16-finals", "round of 16", "last 16"

   FOURTH ROUND:
   - "fourth round", "4th round", "round 4", "round4"
   - "1/8-finals"

   QUARTER-FINALS:
   - contains "quarter" and "final" OR equals "qf"

   SEMI-FINALS:
   - contains "semi" and "final" OR equals "sf"

   FINAL:
   - equals "final"

2) Ordering for EFL Cup canonical rounds:
   1 First Round
   2 Second Round
   3 Third Round
   4 Fourth Round
   5 Quarter-finals
   6 Semi-finals
   7 Final

3) TEMPORARY SAFETY: Do not discard unknown EFL round names.
   - If competitionId===1199 and the round name doesn’t match any mapping:
     return "Unknown: " + originalName (preserve original as-is).
   - Give these unknown rounds a high order like 99 so they appear at the bottom.
   - This is just to surface what Goalserve is sending so we don’t lose matches.

4) Keep FA Cup (1198) behaviour unchanged.

After changes, restart and verify:
curl -sS "$DOMAIN/api/cup/progress?competitionId=1199&season=2025/2026" > /tmp/eflcup.json
node -e 'const d=require("/tmp/eflcup.json"); console.log("Rounds:", d.rounds.length); d.rounds.forEach(r=>console.log(r.order, r.name, r.matches.length));'

---

Update /api/cup/progress to support Spain Cup (Goalserve competitionId=1397) by mapping Goalserve fractional round names into Copa del Rey canonical rounds.

Context: Goalserve Spain Cup currently returns stage names:
- 1/128-finals (21 matches)
- 1/64-finals  (57 matches)
- 1/32-finals  (29 matches)
- 1/16-finals  (17 matches)
- 1/8-finals    (9 matches)
- Quarter-finals (5 matches)

Required changes:
1) Add a Spain Cup / Copa del Rey canonical round mapping inside normalizeToCanonicalRound() (or equivalent), activated when competitionId === "1397".
   Use these canonical display names + ordering:
   1 First Round
   2 Second Round
   3 Round of 32
   4 Round of 16
   5 Quarter-finals
   6 Semi-finals
   7 Final

2) Implement these exact mappings for competitionId 1397 (case-insensitive compare on the stage name, trim, toLowerCase):
   - "1/128-finals" => "First Round"
   - "1/64-finals"  => "Second Round"
   - "1/32-finals"  => "Round of 32"
   - "1/16-finals"  => "Round of 16"
   - "1/8-finals"   => "Quarter-finals"   (Copa del Rey: last 8)
   - any "quarter" + "final" => "Quarter-finals"
   - any "semi" + "final" => "Semi-finals"
   - "final" => "Final"

3) Keep existing FA Cup (1198) and EFL Cup (1199) mappings unchanged.

4) Unknown stages should remain as "Unknown: <OriginalName>" with order 99 (do not discard).

5) Keep match dedupe by match id across all parsed branches (stage.match, stage.round.match, stage.week.match) as it is now.

After changes:
- /api/cup/progress?competitionId=1397&season=2025/2026 should return 5 canonical rounds now (First Round, Second Round, Round of 32, Round of 16, Quarter-finals) and later will show Semi-finals/Final when they exist.
- Regression: FA Cup and EFL Cup outputs unchanged.
Restart the app after implementing.

---

TASK: Add Spain Cup (Copa del Rey, Goalserve competitionId=1397) round mapping to the existing /api/cup/progress endpoint.

⚠️ SCOPE RULES — DO NOT IGNORE
- ONLY modify the round normalization / canonical mapping logic used inside /api/cup/progress
- DO NOT refactor unrelated code
- DO NOT touch FA Cup logic
- DO NOT touch EFL Cup logic
- DO NOT add tests
- DO NOT run broad regression checks
- DO NOT change frontend files
- DO NOT rename functions
- DO NOT reorganize files
This is a small, surgical mapping addition only.

CONTEXT
Goalserve Spain Cup stages currently return names:
- 1/128-finals
- 1/64-finals
- 1/32-finals
- 1/16-finals
- 1/8-finals
- Quarter-finals (later Semi-finals, Final will appear)

REQUIRED: When competitionId === "1397", map these to canonical Copa del Rey rounds:

Order  Name
1      First Round
2      Second Round
3      Round of 32
4      Round of 16
5      Quarter-finals
6      Semi-finals
7      Final

MAPPINGS (case-insensitive):
"1/128-finals" → "First Round"
"1/64-finals"  → "Second Round"
"1/32-finals"  → "Round of 32"
"1/16-finals"  → "Round of 16"
"1/8-finals"   → "Quarter-finals"
contains "quarter" + "final" → "Quarter-finals"
contains "semi" + "final"    → "Semi-finals"
"final" exactly              → "Final"

Anything else:
Return "Unknown: <original name>" with order 99 (do not discard).

IMPORTANT:
- Keep existing FA Cup (1198) and EFL Cup (1199) logic exactly as-is
- Keep match deduplication logic unchanged
- Do not alter ordering logic for other competitions

After implementing, just save. Do not perform extra analysis or testing.

---

const GOALSERVE_CUP_IDS: Record<string, string> = {
  "fa-cup": "1198",
  "efl-cup": "1199",
  "copa-del-rey": "1397",
  // or "spain-cup": "1397" depending on your slug
};

---

Do NOT run full regression tests. Do NOT add new tests. Keep changes minimal.

Bug: /tables → Cups → Copa del Rey shows “Cup data not available for this competition.”
CupProgress only shows that when competitionId is missing. It calls:
const competitionId = getGoalserveCupId(cupSlug);

Task:
- Update client/src/lib/cup-config.ts so getGoalserveCupId() returns the Goalserve ID "1397" for the Copa del Rey tab’s slug.
- Ensure the slug used by the Cups tab (e.g. "copa-del-rey" or "spain-cup") is mapped to "1397".
- No backend changes.

Manual check only:
- Refresh /tables → Cups → Copa del Rey
- Confirm it now fetches /api/cup/progress?competitionId=1397&season=2025/2026 and renders rounds.

---

We are continuing work on the Football Mad cup progress system.

IMPORTANT WORKING RULES:

• The user is NOT editing files directly.
• Return ALL code updates as ONE Replit AI prompt in a single copy-paste code block.
• DO NOT perform full regression testing.
• DO NOT refactor existing FA Cup or EFL Cup logic.
• DO NOT touch unrelated competitions.
• DO NOT add debugging frameworks, logging systems, or extra endpoints.
• Frontend testing will be done manually by the user.

CURRENT STATE:

• FA Cup working
• EFL Cup working
• Copa del Rey (competitionId = 1397) is ingested and displays rounds
• Semi-final fixtures are not appearing yet
• Canonical round system and accordion UI already implemented
• Empty canonical rounds are already supported and must remain

TASK:

Focus ONLY on Copa del Rey parsing inside the existing /api/cup/progress backend logic.

We need to ensure that when Goalserve provides semi-final fixtures, they are correctly captured and assigned to the canonical "Semi-finals" round.

STEPS:

1. Within the Goalserve cup parsing logic, add support for ALL of the following structures when competitionId === 1397:

   • stage.match[]
   • stage.round[].match[]
   • stage.week[].match[]

   Ensure matches from any of these nesting patterns are collected and passed into the existing round-mapping pipeline.

2. Stage Name Normalisation

   When deriving the round name from Goalserve stage/round/week labels, ensure that any label containing:

   • "semi"
   • "semi-final"
   • "semi finals"
   • "semifinal"
   • "semi-final 1st leg"
   • "semi-final 2nd leg"

   (case insensitive)

   is normalised to the EXACT canonical round name:

   "Semi-finals"

   This must plug into the EXISTING canonical round mapping system (do not rewrite it).

3. Do NOT change:

   • UI code
   • Canonical round definitions
   • FA Cup logic
   • EFL Cup logic
   • Any other competition parsing
   • Existing handling of empty rounds

4. Do NOT remove or filter out unknown rounds. Only improve match extraction and semi-final name normalisation.

OUTPUT REQUIREMENT:

Return ONE backend code update prompt only.
Do not include explanations outside the code block.
```}

---

We are continuing work on the Football Mad cup progress system.

IMPORTANT WORKING RULES:

• The user is NOT editing files directly.
• Return ALL code updates as ONE Replit AI prompt in a single copy-paste code block.
• DO NOT perform regression testing.
• DO NOT refactor FA Cup or EFL Cup logic.
• DO NOT touch unrelated competitions.
• DO NOT add logging, debug endpoints, or test scripts.

CURRENT STATE:

• FA Cup working correctly with full canonical rounds
• EFL Cup working correctly
• Copa del Rey (competitionId = 1397) only shows early rounds
• Later rounds (Quarter-finals, Semi-finals, Final) are missing entirely
• Empty canonical rounds must still be displayed in the UI accordion

TASK:

Ensure Copa del Rey uses the SAME canonical round seeding behaviour as FA Cup so that ALL expected knockout rounds exist even if they have zero matches yet.

Specifically for competitionId = 1397:

The following canonical rounds MUST always be present in the output:

• First Round
• Round of 32
• Round of 16
• Quarter-finals
• Semi-finals
• Final

These rounds should be created even if no matches are assigned yet.

DO NOT modify:
• UI code
• Existing FA Cup logic
• Existing EFL Cup logic
• Canonical round definitions

Only ensure Copa del Rey passes through the same canonical round creation path as FA Cup inside /api/cup/progress.

OUTPUT REQUIREMENT:

Return ONE backend code update prompt only.
No explanations outside the code block.

---

We are continuing work on the Football Mad cup progress system.

IMPORTANT WORKING RULES:

• The user is NOT editing files directly.
• Return ALL code updates as ONE Replit AI prompt in a single copy-paste code block.
• DO NOT perform regression testing.
• DO NOT refactor FA Cup or EFL Cup logic.
• DO NOT touch unrelated competitions.
• DO NOT add logging, debug endpoints, or test scripts.
• Do NOT change UI behaviour.

CURRENT STATE:

• Copa del Rey (competitionId = 1397) now shows: First Round, Round of 32, Round of 16, Semi-finals, Final
• Quarter-finals is missing from the canonical round output (and therefore missing from the UI)

TASK:

Backend only: ensure Copa del Rey canonical rounds ALWAYS include "Quarter-finals" in the correct order between "Round of 16" and "Semi-finals", even when it has 0 fixtures.

Also ensure any Goalserve labels containing "quarter" (case-insensitive), including:
- "Quarter-finals"
- "Quarterfinals"
- "Quarter Final"
- "QF"
normalize to the EXACT canonical round name:
"Quarter-finals"

Do NOT modify:
• UI code
• Canonical round system for other competitions
• FA Cup logic
• EFL Cup logic

OUTPUT REQUIREMENT:

Return ONE backend code update prompt only.
No explanations outside the code block.

---

We are continuing work on the Football Mad cup progress system.

IMPORTANT WORKING RULES:

• The user is NOT editing files directly.
• Return ALL code updates as ONE Replit AI prompt in a single copy-paste code block.
• DO NOT perform regression testing.
• DO NOT refactor FA Cup or EFL Cup logic.
• DO NOT touch unrelated competitions.
• DO NOT add logging, debug endpoints, or test scripts.
• Do NOT change UI behaviour.

CONTEXT / EVIDENCE (Goalserve Copa del Rey 1397 stage names):

Goalserve soccerfixtures/leagueid/1397 contains stages:
- 1/128-finals
- 1/64-finals
- 1/32-finals
- 1/16-finals
- 1/8-finals
- Quarter-finals
(and later likely Semi-finals, Final)

TASK (backend only, /api/cup/progress only):

For competitionId = 1397 (Copa del Rey), update ONLY the round/stage label normalisation so these Goalserve stage names map to our canonical rounds:

Mappings (case-insensitive, ignore whitespace/punctuation):

- "1/128-finals"  -> "First Round"
- "1/64-finals"   -> "Second Round"   (if your Copa canonical list does not include Second Round, add it ONLY for Copa 1397 seeding)
- "1/32-finals"   -> "Round of 32"
- "1/16-finals"   -> "Round of 16"
- "1/8-finals"    -> "Round of 16"    (Copa’s 1/8-finals is the last-16 stage shown on Soccerway)
- Anything containing "quarter" OR exact "1/4-finals" -> "Quarter-finals"
- Anything containing "semi" -> "Semi-finals"
- Anything containing "final" but NOT semi-final -> "Final"

Important: this mapping must apply whether the label comes from:
- stage.name
- round.name
- week.name
(or any equivalent label field you currently use for cup round naming)

Also ensure Copa del Rey canonical seeding list includes at least:
First Round, Round of 32, Round of 16, Quarter-finals, Semi-finals, Final
(and include Second Round ONLY if you are mapping 1/64-finals to it; otherwise map 1/64-finals to First Round and keep the canonical list unchanged).

CONSTRAINTS:

• Do NOT modify UI.
• Do NOT modify FA Cup/EFL Cup logic.
• Keep changes scoped to competitionId 1397 normalisation / seeding only.

OUTPUT REQUIREMENT:

Return ONE backend code update prompt only.
No explanations outside the code block.

---

We are continuing work on the Football Mad cup progress system.

IMPORTANT WORKING RULES:

• The user is NOT editing files directly.
• Return ALL code updates as ONE Replit AI prompt in a single copy-paste code block.
• DO NOT perform regression testing.
• DO NOT refactor FA Cup or EFL Cup logic.
• DO NOT touch unrelated competitions.
• DO NOT add logging, debug endpoints, or test scripts.
• Do NOT change UI behaviour.

CURRENT ISSUE (Copa del Rey 1397 only):

Spain/Goalserve use fractional labels that refer to NUMBER OF TIES:
- "1/16-finals" = 16 matches = 32 teams = Round of 32
- "1/8-finals"  = 8 matches  = 16 teams = Round of 16

Our current normaliser is incorrectly mapping these such that 1/16-finals and 1/8-finals are being merged into "Round of 16" (API shows Round of 16 has 24 fixtures).

TASK (backend only, /api/cup/progress only):

For competitionId = 1397 ONLY, update round/stage name normalization to the following exact mappings (case-insensitive, ignore punctuation/whitespace):

- "1/16-finals"  -> "Round of 32"
- "1/8-finals"   -> "Round of 16"
- "1/4-finals" or anything containing "quarter" -> "Quarter-finals"
- anything containing "semi" -> "Semi-finals"
- anything containing "final" but NOT semi-final/quarter-final -> "Final"

Also ensure:
- "1/32-finals" continues to map to "Round of 32" ONLY if your system already uses that as the earliest displayed stage; otherwise do NOT force it into Round of 32 if it would create duplicates. (Keep existing behaviour for earlier rounds; the key fix is splitting 1/16 and 1/8 correctly.)

Important:
Apply these mappings no matter whether the label comes from stage.name, round.name, or week.name.

CONSTRAINTS:

• Do NOT modify UI.
• Do NOT modify FA Cup/EFL Cup logic.
• Keep changes scoped to competitionId 1397 normalization only.

OUTPUT REQUIREMENT:

Return ONE backend code update prompt only.
No explanations outside the code block.

---

We are continuing work on the Football Mad cup progress system.

IMPORTANT WORKING RULES:

• The user is NOT editing files directly.
• Return ALL code updates as ONE Replit AI prompt in a single copy-paste code block.
• DO NOT perform regression testing.
• DO NOT refactor FA Cup or EFL Cup logic.
• DO NOT touch unrelated competitions.
• DO NOT add logging, debug endpoints, or test scripts.
• Do NOT change UI behaviour or components.

GOAL:

For Copa del Rey ONLY (competitionId = 1397), mirror Goalserve/Soccerway stage naming in the UI labels by overriding the round "name" returned by /api/cup/progress — while keeping the existing canonical round ordering + mapping logic intact.

REQUIREMENTS:

1) Do NOT change how matches are extracted or grouped.
2) Do NOT change canonical ordering logic.
3) ONLY change the display label for Copa del Rey in the API response.

IMPLEMENTATION:

After the backend has built the final `rounds` array for /api/cup/progress, and ONLY when competitionId === "1397" (or 1397), override `round.name` using this mapping:

- "First Round"      -> "1/128-finals"
- "Second Round"     -> "1/64-finals"
- "Round of 32"      -> "1/16-finals"
- "Round of 16"      -> "1/8-finals"
- "Quarter-finals"   -> "Quarter-finals"  (leave as-is)
- "Semi-finals"      -> "Semi-finals"     (leave as-is)
- "Final"            -> "Final"           (leave as-is)

Notes:
- Apply the override only if the round exists in the output (do not create new rounds here).
- Keep the `order` field unchanged so the accordion order stays correct.
- Keep the `matches` arrays unchanged.

OUTPUT REQUIREMENT:

Return ONE backend code update prompt only.
No explanations outside the code block.

---

We are continuing work on the Football Mad cup progress system.

IMPORTANT WORKING RULES:

• The user is NOT editing files directly.
• Return ALL code updates as ONE Replit AI prompt in a single copy-paste code block.
• DO NOT perform regression testing.
• DO NOT refactor FA Cup or EFL Cup logic.
• DO NOT touch unrelated competitions.
• DO NOT add logging, debug endpoints, or test scripts.
• Do NOT change UI behaviour or components.

CURRENT ISSUE:

We added a Copa del Rey display-name override that renames "Round of 32" -> "1/16-finals" etc.
This is misleading because the underlying buckets are not a 1:1 match to Goalserve stages and fixture counts don’t align.
Goalserve for competitionId=1397 provides explicit stage names:
1/128-finals, 1/64-finals, 1/32-finals, 1/16-finals, 1/8-finals, Quarter-finals (+ later)

TASK (Copa del Rey 1397 only):

1) REMOVE the Copa del Rey display-name override that renames Round of 32/16 into fractional labels.

2) Instead, define a Copa-del-Rey-specific canonical round list that mirrors Goalserve stage names EXACTLY, in this order:
- "1/128-finals"
- "1/64-finals"
- "1/32-finals"
- "1/16-finals"
- "1/8-finals"
- "Quarter-finals"
- "Semi-finals"
- "Final"

3) Update the Copa del Rey normalization/mapping so that stage/round/week labels map 1:1 onto those canonical names:
- exact/contains "1/128" -> "1/128-finals"
- exact/contains "1/64"  -> "1/64-finals"
- exact/contains "1/32"  -> "1/32-finals"
- exact/contains "1/16"  -> "1/16-finals"
- exact/contains "1/8"   -> "1/8-finals"
- contains "quarter" or "1/4" -> "Quarter-finals"
- contains "semi" -> "Semi-finals"
- contains "final" but not semi/quarter -> "Final"

4) Keep the existing “empty rounds are allowed and displa

---

We are continuing work on the Football Mad cup progress system.

IMPORTANT WORKING RULES:

• The user is NOT editing files directly.
• Return ALL code updates as ONE Replit AI prompt in a single copy-paste code block.
• DO NOT perform regression testing.
• DO NOT refactor existing cup parsing or canonical systems.
• DO NOT touch unrelated competitions.
• DO NOT add logging, debug endpoints, or test scripts.
• Do NOT change UI behaviour/components.

ISSUE:

In Cups → Copa del Rey (and potentially other cups), seeded rounds with 0 fixtures (e.g., Semi-finals, Final) are being marked as "Completed" in the UI. This is wrong — empty rounds should NOT be completed.

TASK (backend only):

In /api/cup/progress response generation, update the round status computation so that:

1) If a round has 0 matches, it MUST NOT be marked completed.
   - Treat it as "Upcoming" (or whatever non-completed state the API already supports),
   - But do not alter the UI; just ensure the API flags/state make the pill not show as Completed.

2) Keep existing behaviour for rounds that have matches:
   - Completed only when ALL matches are finished (FT, AET, Pen., etc.)
   - Upcoming/In progress as currently implemented.

CONSTRAINTS:

• Make this change minimal and safe.
• Do NOT change match extraction or round naming logic.
• Ideally implement as a single guard in the existing “round isCompleted / status” logic:
   - if matches.length === 0 => isCompleted = false (and status = "Upcoming" if applicable)

OUTPUT REQUIREMENT:

Return ONE backend code update prompt only.
No explanations outside the code block.

---

We are continuing work on the Football Mad cup progress system.

IMPORTANT WORKING RULES:

• The user is NOT editing files directly.
• Return ALL code updates as ONE Replit AI prompt in a single copy-paste code block.
• DO NOT perform regression testing.
• DO NOT refactor existing FA Cup or EFL Cup logic.
• DO NOT touch unrelated competitions.
• DO NOT add logging, debug endpoints, or test scripts.
• Do NOT change UI behaviour/components.

ISSUE:

In EFL Cup view, an extra bucket appears at the bottom: "Unknown: Preliminary" with fixtures.
This is coming from Goalserve round/stage labels that are not part of the EFL Cup canonical rounds, and our system currently allows unknown rounds.

TASK (backend only, surgical, EFL Cup only):

In /api/cup/progress (or the helper that builds rounds), add an EFL Cup specific filter:

- Determine the competitionId used for EFL Cup in this endpoint (use the existing constant / mapping already in code; do NOT guess a new id).
- ONLY when competitionId matches EFL Cup:
    - If a round name is unknown (i.e., would be labeled "Unknown: ...") AND the raw label contains any of:
      "prelim", "preliminary", "qualifying", "qualification"
      (case-insensitive),
      then DROP that round entirely (do not include it in the response).
    - Do not drop any canonical rounds.
    - Do not drop other unknown rounds unless they match those keywords.
- For all other competitions, keep existing behaviour (unknown rounds allowed).

CONSTRAINTS:

• Keep this minimal and localized.
• Do NOT change canonical mappings for FA Cup / EFL Cup.
• Do NOT change UI.

OUTPUT REQUIREMENT:

Return ONE backend code update prompt only.
No explanations outside the code block.

---

We are continuing work on the Football Mad cup progress system.

IMPORTANT WORKING RULES:
• The user is NOT editing files directly.
• Return ALL code updates as ONE Replit AI prompt in a single copy-paste code block.
• DO NOT perform full regression testing.
• DO NOT refactor existing FA Cup / EFL Cup / Copa del Rey logic.
• DO NOT touch unrelated competitions.
• DO NOT modify UI components or styling.
• Keep changes minimal and localized.

TASK:
Add Coppa Italia (Goalserve competitionId = 1264) to the existing system.

1) client/src/lib/cup-config.ts
- Add a new cup config entry for Coppa Italia:
  slug: "coppa-italia"
  name: "Coppa Italia"
  shortName: "CI"
  goalserveCompetitionId: "1264"
  country: "Italy"
- Do NOT change existing entries.

2) server/routes.ts (the /api/cup/progress handler)
- Add a new flag:
  const isCoppaItalia = competitionId === "1264";
- Add COPPA_ITALIA_CANONICAL_ROUNDS that mirrors Goalserve-native stage names and ordering:
  1/64-finals (order 1)
  1/32-finals (order 2)
  1/16-finals (order 3)
  1/8-finals  (order 4)
  Quarter-finals (order 5)
  Semi-finals (order 6)
  Final (order 7)

- Add a Coppa Italia round normalizer used only when isCoppaItalia === true:
  Rules:
   • if name contains "1/64" -> "1/64-finals"
   • if name contains "1/32" -> "1/32-finals"
   • if name contains "1/16" -> "1/16-finals"
   • if name contains "1/8"  -> "1/8-finals"
   • if name contains "quarter" or equals "qf" -> "Quarter-finals"
   • if name contains "semi" -> "Semi-finals"
   • if name contains "final" (but NOT semi) -> "Final"
  Keep case-insensitive matching and preserve existing behavior for unknown rounds (do not remove unknown rounds).

- Ensure the canonical seeding logic for Coppa Italia includes all canonical rounds even if there are 0 fixtures (Semi-finals and Final will likely be empty right now because Goalserve hasn’t provided them yet).

- Do NOT alter the canonical systems for FA Cup, EFL Cup, or Copa del Rey.

OUTPUT REQUIREMENT:
Return ONE backend+config code update prompt only. No explanations outside this block.

---

We are enhancing cup fixtures to include kick-off time.

RULES:
• Backend only
• Do NOT change UI
• Do NOT modify round mapping logic
• Apply to ALL competitions

TASK:

In /api/cup/progress match parsing:

Currently we store:
  kickoff: match.date

Goalserve match nodes contain:
  date="27.01.2026"
  time="20:00"

Update the match mapping so we return:

kickoffDate: ISO formatted date (YYYY-MM-DD)
kickoffTime: HH:mm (24-hour)

Implementation details:

1. When reading a match node, extract:
   const rawDate = match.date
   const rawTime = match.time

2. Convert date from DD.MM.YYYY → YYYY-MM-DD

3. Return in the match object:

{
  id,
  home,
  away,
  score,
  kickoffDate,
  kickoffTime,
  status
}

4. If time is missing, set kickoffTime to null.
5. Do NOT remove existing fields yet.
6. Do NOT touch other endpoints.

Return a single backend code update.

---

We are continuing work on the Football Mad cup progress system.

IMPORTANT WORKING RULES:
• Single backend-only change
• Do NOT change UI
• Do NOT refactor cup logic
• No extra endpoints/logs/tests

TASK:
Fix kickoffDate/kickoffTime parsing for cup matches. Goalserve XML attributes are exposed by our parser using "@_date", "@_time", "@_formatted_date", and "@_id" (underscore), not "@date"/"@time".

In server/routes.ts inside the existing parseMatch function (around line ~2170):

1) Update rawDate/rawTime extraction to check BOTH underscore and non-underscore keys, in this priority:
   rawDate: m["@_date"] || m["@date"] || m.date || ""
   rawTime: m["@_time"] || m["@time"] || m.time || ""

2) Update kickoff field so it never incorrectly falls back to time-only:
   kickoff: m["@_formatted_date"] || m["@formatted_date"] || m["@_date"] || m["@date"] || m.date || undefined

3) Keep the existing DD.MM.YYYY -> YYYY-MM-DD conversion, but ensure it uses the fixed rawDate.

4) kickoffTime should be set from rawTime when it contains ":"; else null.

Do not change anything else.

Return a single code update.

---

We need to fix kickoffDate/kickoffTime extraction in the cup progress endpoint across ALL cup competitions.

CONSTRAINTS:
- Backend only (server/routes.ts)
- Do NOT change UI
- Keep changes minimal and localized to cup progress parsing
- No logging, no refactors outside this block

PROBLEM:
kickoffDate only shows for upcoming fixtures, and kickoffTime is null for all matches. This indicates our parsed Goalserve match objects are not using a single consistent attribute prefix. Attributes may appear as:
- node[key]
- node["@"+key]
- node["@_"+key]
- node["@"]?.[key]
- node["$"]?.[key]

FIX:
In server/routes.ts inside the cup progress handler, directly above parseMatch, add a small helper:

function getAttr(node: any, key: string): string | null {
  if (!node || typeof node !== "object") return null;
  const direct = node[key];
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const at = node[`@${key}`];
  if (typeof at === "string" && at.trim()) return at.trim();

  const atUnderscore = node[`@_${key}`];
  if (typeof atUnderscore === "string" && atUnderscore.trim()) return atUnderscore.trim();

  const atObj = node["@"]?.[key];
  if (typeof atObj === "string" && atObj.trim()) return atObj.trim();

  const dollarObj = node["$"]?.[key];
  if (typeof dollarObj === "string" && dollarObj.trim()) return dollarObj.trim();

  return null;
}

Also add helper:
function toIsoFromDotDate(d: string | null): string | null {
  if (!d) return null;
  const s = d.trim();
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

Then update parseMatch to use getAttr() for date/time (and only date/time if you want to keep minimal):
- rawDate = getAttr(m, "date")  (string or null)
- rawTime = getAttr(m, "time")  (string or null)
- formattedDate = getAttr(m, "formatted_date")
- formattedTime = getAttr(m, "formatted_time")

Set:
- kickoffDate = toIsoFromDotDate(rawDate) ?? toIsoFromDotDate(formattedDate) ?? null
- kickoffTime = (rawTime && rawTime.includes(":") ? rawTime : (formattedTime && formattedTime.includes(":") ? formattedTime : null))

Also fix kickoff field so it never becomes time-only:
kickoff: formattedDate || rawDate || undefined

Leave the existing kickoff field in place (backward compatible), but ensure it is always a date string when present.

Do not change anything else.
Return one backend code update.

---

Frontend only. Update the cup progress UI to display kickoff date + time for EVERY match row (completed and upcoming).

File: client/src/components/tables/cup-progress.tsx

1) Find where a match row is rendered (where home/away names + score/status are shown).

2) Add a small right-aligned meta line that always renders, using:
- match.kickoffDate (YYYY-MM-DD) -> display as DD.MM.YYYY (or keep YYYY-MM-DD if you prefer minimal)
- match.kickoffTime (HH:mm)

Example display: "12.08.2025 • 18:45" (time optional if null)

3) Do NOT only show this meta line for Not Started/upcoming. It must appear for FT/AET/PEN as well.

4) Do not change the backend. Do not change other pages. Keep styling subtle (same style as existing date on upcoming rows).

---

Update the cup progress UI status pills to use human-friendly labels (Full-Time, Half-Time, etc.) instead of short Goalserve codes, while preserving the underlying status code for logic.

Scope: UI only (do NOT change the backend API response shape).

Where:
- Find the component that renders each cup fixture row + the small status pill on the right.
- It’s likely in: client/src/components/tables/cup-progress.tsx (or a child component it uses).

Requirements:
1) Create a small pure function (or const map) near the pill rendering code:
   - Input: rawStatus: string | null | undefined
   - Output: { label: string; variant: "completed" | "upcoming" | "live" | "neutral" } (variant can be optional if you already have styling)

2) Map these statuses to full words (case-insensitive, trim spaces):
   - "FT" => "Full-Time"
   - "HT" => "Half-Time"
   - "AET" => "After Extra Time"
   - "PEN." or "PEN" or "Pen." => "Penalties"
   - Keep "LIVE" as "LIVE"
   - Keep minute values like "23'" or "90+2'" unchanged (detect with regex like /^\d{1,3}(\+\d{1,2})?'\s*$/)

3) Do NOT change:
   - the existing logic that determines whether the round is Completed vs Upcoming
   - the date/time formatting line (kickoffDate/kickoffTime display)
   - any backend fields

4) Styling:
   - Slightly increase the pill horizontal padding ONLY if needed so “Full-Time” and “Half-Time” don’t feel cramped (e.g. px-3 instead of px-2), but keep height consistent.

5) Add a safe fallback:
   - If status is missing/empty, show "Not Started" (or keep existing “NOT STARTED” label if you already render that separately)
   - If status is unknown, show it as-is.

Deliverable:
- Make the change, run the app, and confirm the status pills now show “Full-Time”, “Half-Time”, “After Extra Time”, and “Penalties” where applicable.

---

We are refining the match card UI in the cup progress tables.

GOAL:
Improve alignment and spacing of the match status pill and kickoff info on the right-hand side of each fixture row.

FILES TO EDIT:
The component that renders each match row inside the Cup Progress table (look for where status, kickoffDate, and kickoffTime are displayed together).

CHANGES REQUIRED:

1️⃣ STACK STATUS + DATE/TIME VERTICALLY

Currently the layout is side-by-side. 
Change the right-hand container to a vertical flex layout so it becomes:

[ Status Pill ]
[ Date • Time ]

Implementation:
- Wrap the status pill and kickoff text in a parent div
- Apply: flex flex-col items-center text-right (desktop)
- On mobile keep items-end if needed, but ensure vertical stacking

Example container classes:
`flex flex-col items-end md:items-center gap-1`

2️⃣ CENTER THE STATUS PILL ABOVE THE DATE/TIME

The pill should sit visually centered over the date/time block.

Implementation:
- Remove any `ml-auto` or side alignment on the pill
- Add `self-center` to the pill element
- Ensure the parent container uses `items-center`

3️⃣ SLIGHTLY REDUCE PILL SIZE (ESPECIALLY MOBILE)

We want the pill to feel lighter now that it says:
Full-Time / Half-Time / Penalties

Adjust:
- Reduce horizontal padding: from `px-3` → `px-2.5`
- Reduce vertical padding slightly: from `py-1.5` → `py-1`
- On small screens use slightly smaller text:

Add responsive sizing:
`text-xs sm:text-sm`

So final pill classes should look like:
`px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium`

4️⃣ DO NOT CHANGE COLORS OR LOGIC

Do NOT modify:
- Status mapping logic (Full-Time, Half-Time, Penalties etc)
- Backend data
- Date/time formatting

This is purely a layout + spacing refinement.

RESULT:
Each match row right side should visually look like:

        [ Full-Time ]
        09.01.2026 • 19:30

Clean, centered, compact, and balanced.

---

Goal: Update the match status pill text in the UI so “After Extra Time” is shortened to “AET”.

This is a FRONTEND TEXT CHANGE ONLY.

Steps:

1. Find the function or mapping that converts match status codes into display labels for the status pill.
   Likely files/folders:
   - client/src/components/tables/
   - client/src/components/matches/
   - client/src/lib/
   Look for names like:
   - getMatchStatusLabel
   - formatMatchStatus
   - renderStatusPill
   - statusMap

2. Locate the rule that currently maps the status "AET" to the label "After Extra Time".

   It may look like:
   case "AET":
     return "After Extra Time";

   OR

   if (status === "AET") {
     label = "After Extra Time";
   }

3. Change ONLY the display label so it returns "AET" instead:

   case "AET":
     return "AET";

   OR

   if (status === "AET") {
     label = "AET";
   }

IMPORTANT CONSTRAINTS:
- Do NOT change backend status values
- Do NOT change API responses
- Do NOT change any logic that checks for status === "AET"
- Do NOT modify pill styling (colour, size, spacing)
- This is strictly a UI text change

Expected result:
Status pills should display:
- Full-Time
- Half-Time
- Penalties
- AET
instead of “After Extra Time”

---

We need to properly support penalty shootout scores in the cup match UI and API.

Right now, matches that go to penalties are showing the shootout score as the main match score. We want to:

1) Keep the normal football score (after 90 mins or after extra time) as the main score
2) Store penalty shootout scores separately
3) Show penalty scores in the UI as a small secondary line like: "Pens: 3–2"

-----------------------------------
BACKEND CHANGES (API / parsing)
-----------------------------------

Update the CupMatch type to include penalties:

type CupMatch = {
  id: string;
  home: { id?: string; name: string };
  away: { id?: string; name: string };
  score: { home: number; away: number } | null;        // 90/ET score ONLY
  penalties?: { home: number; away: number } | null;   // shootout score
  kickoff?: string;
  kickoffDate?: string | null;
  kickoffTime?: string | null;
  status: string;
};

-----------------------------------
PARSING LOGIC (Goalserve feed)
-----------------------------------

Inside parseMatch, we already extract normal scores into:

const homeScore = ...
const awayScore = ...

These must ALWAYS represent the match score (after 90 or ET).

Now add penalty parsing WITHOUT overwriting score.

Look for penalty-related attributes on the match node (m) such as:
- pen_home, pen_away
- homepen, awaypen
- pscore, pen_score
- or similar variants

Implement a helper:

const getPenaltyScore = (m: any, side: "home" | "away"): number | null => {
  const keys = side === "home"
    ? ["@pen_home", "@homepen", "@penalty_home", "@ps_home"]
    : ["@pen_away", "@awaypen", "@penalty_away", "@ps_away"];

  for (const k of keys) {
    if (m[k] != null && m[k] !== "") return parseInt(String(m[k]), 10);
  }
  return null;
};

Then inside parseMatch:

const penHome = getPenaltyScore(m, "home");
const penAway = getPenaltyScore(m, "away");

const penalties =
  penHome != null && penAway != null
    ? { home: penHome, away: penAway }
    : null;

When building the match object:

const match: CupMatch = {
  id: ...,
  home: ...,
  away: ...,
  score: hasScore ? {
    home: parseInt(String(homeScore), 10),
    away: parseInt(String(awayScore), 10),
  } : null,
  penalties,   // <-- NEW FIELD
  kickoff,
  kickoffDate,
  kickoffTime,
  status,
};

IMPORTANT:
Do NOT ever replace score with penalties. Score is always the football score.

-----------------------------------
FRONTEND CHANGES (Tables / Cup UI)
-----------------------------------

In the match row component where we render score and date/time:

1) Keep rendering the normal score exactly as now:
   Home Team   X
   Away Team   Y

2) If match.penalties exists, render a small secondary line on the right under the date/time:

Example:

09.01.2026 • 19:30
Pens: 3–2

Implementation idea (React/TSX style):

{match.penalties && (
  <div className="text-xs text-gray-500 mt-1">
    Pens: {match.penalties.home}–{match.penalties.away}
  </div>
)}

Style it smaller than the main date/time and aligned with that block.

-----------------------------------
RESULT
-----------------------------------

For a penalties match like:
Wigan vs Barrow
2–2 after ET
Wigan win 3–2 on pens

UI should show:

Wigan      2
Barrow     2

[status pill: Penalties]

09.01.2026 • 19:30
Pens: 3–2

---

We need to fix penalty-shootout handling in Cup Progress.

CURRENT PROBLEM
- Penalties matches are not parsing/displaying correctly.
- UI should show the normal match score like every other fixture, and then show the penalty shootout score in brackets to the RIGHT of each team’s score (not under the date/time).

TARGET UI (example)
Wigan        2 (3)
Barrow       2 (2)
[status pill: Penalties]

Non-penalty matches remain unchanged:
Wigan        2
Barrow       2

--------------------------------------------
1) BACKEND: parse + return penalty scores WITHOUT overwriting match score
--------------------------------------------

In server/routes.ts (the /api/cup/progress route), update CupMatch:

type CupMatch = {
  id: string;
  home: { id?: string; name: string };
  away: { id?: string; name: string };
  score: { home: number; away: number } | null;               // normal (90/ET) score
  penalties?: { home: number; away: number } | null;          // shootout score
  kickoff?: string;
  kickoffDate?: string | null;
  kickoffTime?: string | null;
  status: string;
};

In parseMatch, implement robust extraction for BOTH:
- normal score
- penalty score

Create helpers near parseMatch:

function toIntOrNull(v: any): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function getAny(m: any, keys: string[]): any {
  for (const k of keys) {
    const v =
      m?.[k] ??
      m?.[`@_${k}`] ??
      m?.[`@${k}`] ??
      m?.["@"]?.[k] ??
      m?.["$"]?.[k];
    if (v != null && String(v).trim() !== "") return v;
  }
  return null;
}

Then inside parseMatch:

// Detect shootout via status OR presence of penalty fields
const rawStatus = String(getAny(m, ["status"]) ?? m?.["@status"] ?? m?.status ?? "").trim();
const isPensStatus =
  /pen/i.test(rawStatus) || rawStatus === "Pen." || rawStatus === "PEN" || rawStatus === "Pen";

// Penalty shootout scores (try many likely key variants)
const penHome = toIntOrNull(getAny(m, ["pen_home", "homepen", "penalty_home", "ps_home", "pens_home", "penalties_home"]));
const penAway = toIntOrNull(getAny(m, ["pen_away", "awaypen", "penalty_away", "ps_away", "pens_away", "penalties_away"]));

const hasPens = penHome != null && penAway != null;

// Normal match scores:
// IMPORTANT: in some feeds, the main score fields get overwritten by shootout scores when status is penalties.
// So: if penalties are present OR status indicates penalties, try "full time / after extra time" fields FIRST.
const normalHomeScore = toIntOrNull(getAny(m, [
  "ft_homescore", "ft_home_score", "home_score_ft", "score_home_ft",
  "aet_homescore", "aet_home_score", "home_score_aet",
  "homescore", "home_score"
]));
const normalAwayScore = toIntOrNull(getAny(m, [
  "ft_awayscore", "ft_away_score", "away_score_ft", "score_away_ft",
  "aet_awayscore", "aet_away_score", "away_score_aet",
  "awayscore", "away_score"
]));

// Existing team-level scores (current behaviour)
const homeTeam = m.hometeam || m.localteam || {};
const awayTeam = m.awayteam || m.visitorteam || {};

const teamHomeScore = toIntOrNull(homeTeam["@score"] ?? homeTeam["@_score"] ?? homeTeam.score ?? m["@homescore"] ?? m["@_homescore"] ?? m.homescore);
const teamAwayScore = toIntOrNull(awayTeam["@score"] ?? awayTeam["@_score"] ?? awayTeam.score ?? m["@awayscore"] ?? m["@_awayscore"] ?? m.awayscore);

// Choose final "score" values:
// If penalties detected, prefer normalHomeScore/normalAwayScore if present; otherwise fall back to team scores.
// Never set score to penalty scores.
const finalHome = (isPensStatus || hasPens) ? (normalHomeScore ?? teamHomeScore) : teamHomeScore;
const finalAway = (isPensStatus || hasPens) ? (normalAwayScore ?? teamAwayScore) : teamAwayScore;

const hasScore = finalHome != null && finalAway != null;

const penalties = (hasPens ? { home: penHome!, away: penAway! } : null);

Then build match:

score: hasScore ? { home: finalHome!, away: finalAway! } : null,
penalties,

Also: DO NOT change any FA Cup / EFL Cup canonical mapping logic.

Finally, add a tiny temporary debug only for Penalties matches (remove once confirmed):
If (isPensStatus && !hasPens) log the match id + Object.keys(m) so we can see what the feed calls the penalty fields.

--------------------------------------------
2) FRONTEND: show penalty score in brackets beside each team score (NOT under date/time)
--------------------------------------------

Find the cup match row renderer (likely in client/src/components/tables/cup-progress.tsx or a child component it uses).

Where the score is displayed for each team, change the score rendering to:

- Main score: match.score?.home / match.score?.away (unchanged)
- If match.penalties exists, render bracket values next to the score for each team:
  Home:  {homeScore} <span className="text-xs text-gray-500 ml-1">({penHome})</span>
  Away:  {awayScore} <span className="text-xs text-gray-500 ml-1">({penAway})</span>

Example TSX snippet:

const homeScore = match.score?.home;
const awayScore = match.score?.away;
const penHome = match.penalties?.home ?? null;
const penAway = match.penalties?.away ?? null;

Then in UI:

<div className="...">
  <span className="...">{homeScore ?? ""}</span>
  {penHome != null && <span className="text-xs text-gray-500 ml-1">({penHome})</span>}
</div>

and similarly for away.

Do NOT move/duplicate penalties into the right-hand date/time block anymore.
Date/time block stays just date + kickoff time.

--------------------------------------------
3) EXPECTED RESULT
--------------------------------------------

- For normal matches: no brackets.
- For penalties matches: normal score shown as the main score, penalties shown in brackets next to each score.
- Status pill remains “Penalties”.

Make the change minimal/localised and keep existing UI layout/spacing unless required for the bracket display.

---

We need to fix penalty shootout parsing for /api/cup/progress.

Problem:
- Matches with status "Pen." / "Penalties" are currently showing the shootout score as the main match score (e.g. Wigan 3–2 Barrow).
- We want the main score to be the FT/AET score (e.g. 2–2), and show shootout score in brackets (e.g. (3) and (2)) beside each team score.
- Right now penalties are not being returned (match.penalties is null/undefined), so UI can’t show brackets.

Goal:
1) Add TEMP debug logging to capture the parsed match object for ONE penalties match (so we can see exact fields Goalserve provides).
2) Implement robust extraction using the REAL fields we observe:
   - normalScore: FT/AET (90/120) score
   - penaltyScore: shootout score
3) Return both:
   - score = normalScore
   - penalties = penaltyScore
4) Frontend: show penalties in brackets next to each team’s score, not in the date/time area.

---------------------------------------
BACKEND CHANGES (server/routes.ts)
---------------------------------------

A) Add helpers near parseMatch:

- toIntOrNull(v)
- parseScorePair(str) -> {home, away} | null
   - Accept formats like "2-2", "2 : 2", "2–2"
- getAllKeysDeep(obj) (optional) for debugging
- safeJson(obj) with truncation to avoid enormous logs

B) In parseMatch(m, roundName):

1) Identify penalties matches:
   const status = getAttr(m,"status") || ...
   const isPens = /pen/i.test(status) || status === "Pen." || status === "PEN";

2) TEMP DEBUG:
   If isPens, log:
   - match id
   - status
   - Object.keys(m)
   - any obvious score-ish fields (keys containing "score", "pen", "result", "ft", "aet")
   - stringify a trimmed version of m (max 4kb)
   Make it conditional so we don’t spam:
   - only log the FIRST penalties match per request (use a local boolean loggedPenMatch)

3) Extract penalty shootout score:
   Try in this order:
   - If there is any field (attr or prop) that looks like a penalties score string (keys include "pen", "ps", "shootout"):
       parseScorePair(value)
   - If there is a child node like m.penalty or m.penalties or m.shootout with home/away fields:
       extract ints from there
   If found, set:
     penalties = {home, away}

4) Extract NORMAL score (FT/AET):
   For penalties matches, do NOT trust the existing homescore/awayscore because those may be the shootout score.
   Try in this order:
   - any explicit FT/AET score string fields (keys include "ft", "aet", "final", "result" but NOT "pen")
       parseScorePair(value)
   - team score fields if they look plausible (homeTeam/@score etc)
   - fallback to existing homescore/awayscore only if nothing else exists

5) Return CupMatch with:
   score: {home, away} (normal FT/AET)
   penalties: {home, away} (shootout) OR null

Also ensure CupMatch interface includes:
  penalties?: { home: number; away: number } | null;

C) Once confirmed working, remove or gate the debug logging behind an env flag like DEBUG_CUP_PENALTIES=true.

---------------------------------------
FRONTEND CHANGES (client/src/components/tables/cup-progress.tsx)
---------------------------------------

Where each team score is rendered:
- Continue showing match.score.home and match.score.away as the main score
- If match.penalties exists, show bracket value beside the team score:

Home: 2 (3)
Away: 2 (2)

IMPORTANT:
- Do NOT show penalty info under the date/time block anymore.
- Date/time block remains date + kickoff time.

Example rendering:
{homeScore}
{penHome != null && <span className="ml-1 text-xs text-muted-foreground">({penHome})</span>}

Do similarly for away.

---------------------------------------
VERIFY
---------------------------------------

1) Hit:
  /api/cup/progress?competitionId=1199
Find a penalties match and confirm JSON includes:
  "score": {"home":2,"away":2}
  "penalties": {"home":3,"away":2}
  "status":"Pen."

2) UI shows:
Wigan 2 (3)
Barrow 2 (2)
and the pill shows "Penalties".

Proceed with clean commit and remove debug logs or guard them behind env flag.

---

Update DFB Pokal (Goalserve competitionId 1226, "Germany Cup") round naming to mirror Goalserve labels exactly (end-user friendly), not fraction-style labels.

Background:
We previously mapped Copa del Rey style to fraction labels (1/32-finals etc.) and it looked wrong. For DFB Pokal we want the UI round headers to be whatever Goalserve provides (e.g. "First Round", "Second Round", "Round of 16", "Quarter-finals", "Semi-finals", "Final").

Changes required:
1) In server/routes.ts (cup progress endpoint), remove/disable any DFB Pokal-specific mapping that converts round names into "1/32-finals", "1/16-finals", "1/8-finals", etc.
2) Keep only a minimal normalization function for display (safe + generic):
   - Trim whitespace
   - Convert common variants to one canonical Goalserve-style label ONLY when they are clearly the same meaning:
     * "Quarterfinals" -> "Quarter-finals"
     * "Semifinals" -> "Semi-finals"
   - Otherwise preserve the raw stage/round name from Goalserve.
3) Ensure ordering still works:
   - If we have a canonical ordering system for cups, add a DFB Pokal order map that uses Goalserve round labels:
     "First Round", "Second Round", "Round of 16", "Quarter-finals", "Semi-finals", "Final"
   - If a round label is unknown, place it after known rounds but preserve relative order.
4) Do not impact other competitions (FA Cup, EFL Cup, Coppa Italia, Copa del Rey). Scope changes to competitionId 1226 (or slug "dfb-pokal"/"germany-cup" depending on our config).
5) Verify by calling /api/cup/progress?competitionId=1226 and confirm round group headers returned by the API match Goalserve labels (not fraction labels).

Deliverables:
- Code changes only (server side).
- No UI changes needed unless the UI had hardcoded fraction labels; if so, remove that and render the API-provided roundName.

---

Fix DFB-Pokal cup progress showing "Cup data not available" and implement correct round naming.

Goal:
- DFB-Pokal tab should show fixtures grouped by rounds.
- Use Soccerway-style round names (First Round, Second Round, Round of 16, Quarter-finals, Semi-finals, Final).
- Goalserve feed for DFB Pokal is "Germany Cup" competitionId = 1226.

Steps:

1) client/src/lib/cup-config.ts
- Add/verify a config entry for DFB-Pokal:
  - slug: "dfb-pokal"
  - name: "DFB-Pokal"
  - shortName: "DFB"
  - country: "Germany"
  - goalserveCompetitionId: "1226"
- Ensure it is included in the Cups list used by the Tables page tabs (same as FA Cup / EFL Cup / Copa del Rey / Coppa Italia).

2) server/routes.ts
- Ensure the /api/cup/progress endpoint recognises competitionId 1226 as a supported cup.
  - Add an isDfbPokal flag (similar to isCoppaItalia / isCopaDelRey etc) OR include 1226 in the existing cup allow-list.
  - Make sure the handler does NOT return the "Cup data not available" response for 1226.

3) Round name normalisation for DFB-Pokal (1226)
Goalserve provides fraction labels for early rounds. Map them to user friendly names:
  - "1/32-finals" -> "First Round"
  - "1/16-finals" -> "Second Round"
  - "1/8-finals"  -> "Round of 16"
  - Preserve "Quarter-finals", "Semi-finals", "Final" (normalise minor variants: "Quarterfinals" -> "Quarter-finals", "Semifinals" -> "Semi-finals")
Implement:
  - DFB_POKAL_CANONICAL_ROUNDS order map:
      First Round: 1
      Second Round: 2
      Round of 16: 3
      Quarter-finals: 4
      Semi-finals: 5
      Final: 6
  - normalizeToCanonicalRound_DFB_POKAL(rawRoundName: string): string
  - Only apply this normaliser when competitionId === "1226" (don’t affect other competitions).

4) Round seeding / “show empty rounds”
- Ensure Semi-finals and Final appear even if Goalserve hasn’t populated matches yet (same approach as Coppa Italia):
  - Seed all canonical rounds in the response with an empty array if missing.

5) Validate
- Add a quick log or temporary debug output to confirm that the parsed stages/round names exist for 1226.
- Run:
  - curl /api/cup/progress?competitionId=1226
  - Confirm response contains 6 rounds with correct names and match counts (First Round 32, Second Round 16, Round of 16 8, Quarter-finals 4, and seeded empty for Semi-finals + Final if not yet available).

6) Frontend
- Confirm DFB-Pokal tab uses competitionId 1226 from cup-config.
- No special UI changes required beyond showing returned round titles.

Deliverable: commit the changes in the above files and confirm DFB-Pokal no longer shows "Cup data not available".

---
Add MVP support for 3 new domestic cups in Football Mad:

- Scottish Cup (Goalserve: Scotland “FA Cup”) => competitionId 1371
- Scottish League Cup (Goalserve: Scotland “League Cup”) => competitionId 1372
- Coupe de France (Goalserve: France “France Cup”) => competitionId 1218

GOALS
1) Backend: /api/cup/progress?competitionId={1371|1372|1218} returns cup rounds + matches (kickoffDate/kickoffTime/status + penalties logic already in place).
2) Frontend: add these cups to Tables → Cups tabs so users can switch between them.
3) Round naming: do NOT “prettify” fraction labels into “Round of 64” etc. Mirror Goalserve labels by default. Only introduce a canonical ordering map if the round order is wrong.

BACKEND (server/routes.ts)
A) Add competition flags similar to other cups:
- isScottishCup: competitionId == "1371"
- isScottishLeagueCup: competitionId == "1372"
- isCoupeDeFrance: competitionId == "1218"

B) Ensure these competitions are treated as cups by the existing cup progress endpoint (same code path as FA Cup / Copa etc).
- If the endpoint currently only allows a fixed set of competitionIds, extend the allowlist to include 1371, 1372, 1218.

C) Ordering / seeding:
- First try with no new canonical mapping: keep Goalserve roundName strings as-is and sort using existing logic.
- If Coupe de France / Scottish cups come back in a weird order (e.g. 1/8-finals above 1/16-finals), add canonical round ordering that PRESERVES the label text:
  Example mapping keys like "1/64-finals", "1/32-finals", "1/16-finals", "1/8-finals", "Quarter-finals", "Semi-finals", "Final" etc, with numeric order values.
- Only seed empty rounds if the UI needs them (optional). Do not change other competitions.

FRONTEND (cup-config)
D) Add 3 cup entries where FA Cup / EFL Cup / DFB-Pokal etc are defined:
- Scottish Cup:
  slug: "scottish-cup"
  name: "Scottish Cup"
  shortName: "SCO"
  goalserveCompetitionId: "1371"
  country: "Scotland"
- Scottish League Cup:
  slug: "scottish-league-cup"
  name: "Scottish League Cup"
  shortName: "SLC"
  goalserveCompetitionId: "1372"
  country: "Scotland"
- Coupe de France:
  slug: "coupe-de-france"
  name: "Coupe de France"
  shortName: "CDF"
  goalserveCompetitionId: "1218"
  country: "France"

E) Make sure the Cups tab UI renders these alongside the existing cups and that selecting each triggers the correct API call using goalserveCompetitionId.

VALIDATION (run after)
1) curl and sanity check:
- /api/cup/progress?competitionId=1371
- /api/cup/progress?competitionId=1372
- /api/cup/progress?competitionId=1218
Confirm each returns rounds and matches.
2) Open Tables → Cups and confirm the 3 new tabs render and show fixtures.
3) Confirm penalties formatting and AET/Full-Time labels still work.

Make minimal changes. Do not regress existing cups.

---

Update the Cups navigation/tab order and labels in the Tables → Cups section.

TARGET TAB ORDER:
FA Cup | EFL Cup | Scottish Cup | Scottish League Cup | Copa del Rey | Coppa Italia | DFB-Pokal | Coupe de France

TASKS:

1) Find the frontend cup configuration file where cup tabs are defined (likely cup-config.ts or similar).

2) Reorder the cups array to exactly match this order:
   - FA Cup
   - EFL Cup
   - Scottish Cup
   - Scottish League Cup
   - Copa del Rey
   - Coppa Italia
   - DFB-Pokal
   - Coupe de France

3) Ensure Scottish League Cup uses:
   name: "Scottish League Cup"
   shortName / tabLabel: "Scottish League Cup"

   (Do NOT shorten this to "League Cup" to avoid confusion with the EFL Cup.)

4) Do NOT change:
   - slugs
   - goalserveCompetitionId values
   - any backend logic

5) Verify:
   - Tabs render in this order on the Cups page
   - Active state still works
   - Switching season still works
   - Mobile layout doesn’t wrap awkwardly (reduce padding if needed, but keep labels intact)

Make minimal, safe UI-only changes.

---

Replit AI — please make these backend-only changes to cup round naming.

Goal:
1) Scottish Cup should follow the SAME round naming style as the FA Cup (First Round, Second Round, Third Round, Fourth Round, Quarter-finals, Semi-finals, Final).
2) Scottish League Cup ONLY: rename the knockout start round so that Goalserve’s “1/8-finals” displays as “Second Round” (NOT “1/8-finals”). Quarter-finals / Semi-finals / Final stay as-is.

Context:
- Scottish Cup Goalserve competitionId = 1371
- Scottish League Cup Goalserve competitionId = 1372
- We already filter out “Regular season” for Scottish League Cup (keep that behaviour).

What to change (Backend):
A) Add a Scottish Cup normalizer that maps Goalserve fraction labels to FA-Cup style:
- "1/128-finals" -> "First Round"
- "1/64-finals"  -> "Second Round"
- "1/32-finals"  -> "Third Round"
- "1/16-finals"  -> "Fourth Round"
- "1/8-finals"   -> "Quarter-finals"   (IMPORTANT: this is matches=8, i.e. round-of-16, but we want FA Cup style and you asked “same convention as FA Cup” — so treat it as the next named round. If you prefer “Fifth Round” instead, implement that instead and keep Quarter-finals as the next stage when it appears.)
- If Goalserve ever returns "Quarter-finals", "Semi-finals", "Final", keep them as those exact labels.
- If any other round label appears, pass it through unchanged.

B) Ensure Scottish Cup round ordering uses the canonical FA Cup style order:
First Round -> Second Round -> Third Round -> Fourth Round -> Quarter-finals -> Semi-finals -> Final
Seed empty rounds (Semi-finals, Final) if needed so the UI is consistent even before fixtures exist.

C) Add a Scottish League Cup specific normalizer:
- "1/8-finals" -> "Second Round"
- Keep "Quarter-finals" as "Quarter-finals"
- Keep "Semi-finals" as "Semi-finals"
- Keep "Final" as "Final" (seed if missing)
- Continue to ignore/filter “Regular season” stages.

D) Wire these normalizers into the normalizer selection logic:
- If competitionId === 1371 use normalizeToCanonicalRound_SCOTTISH_CUP
- If competitionId === 1372 use normalizeToCanonicalRound_SCOTTISH_LEAGUE_CUP

E) Update any “canonical rounds” / “max matches” maps used for sanity guards for these two cups so they reflect the NEW labels (e.g., Scottish League Cup should expect “Second Round” instead of “1/8-finals”).

Frontend:
- No frontend changes required (it will just render the new round names returned by the API).

Acceptance checks:
1) Scottish Cup now shows “First Round / Second Round / Third Round / Fourth Round …” instead of fraction labels.
2) Scottish League Cup shows “Second Round” instead of “1/8-finals”.
3) Existing cups (FA Cup, EFL Cup, Copa del Rey, Coppa Italia, DFB-Pokal, Coupe de France) remain unchanged.

---

Replit AI — please fix Scottish League Cup “Final mislabelled as Semi-finals” edge case in the backend.

Problem:
In Scottish League Cup (competitionId 1372), Goalserve sometimes labels the Final match as stage/round “Semi-finals”, resulting in 3 matches under “Semi-finals” and no “Final” card.

Goal:
If competitionId === 1372 AND after normalisation/grouping:
- There is a “Semi-finals” round containing 3+ matches
- AND there is NO “Final” round (or Final is empty)
Then:
- Move exactly ONE match (the latest by kick-off datetime) from “Semi-finals” into a new “Final” round.
- Keep the remaining two matches in “Semi-finals”.
- Ensure the “Final” round is included in the canonical ordering for Scottish League Cup (Second Round, Quarter-finals, Semi-finals, Final) and appears even if seeded empty.

Implementation detail:
1) Find the place in the cup endpoint where matches are already parsed and grouped into rounds (after normalizeToCanonicalRound_SCOTTISH_LEAGUE_CUP runs).
2) Add a post-processing step ONLY for competitionId 1372:
   - let semis = rounds["Semi-finals"] (array)
   - let final = rounds["Final"] (array)
   - if (semis?.length >= 3 && (!final || final.length === 0)):
       - pick the match with the greatest kickoff datetime:
         - use match.datetime if available
         - else combine match.date + match.time
       - remove it from semis
       - push it into rounds["Final"]
3) Keep everything else unchanged (don’t affect other cups).

Acceptance checks:
- Scottish League Cup shows Semi-finals with 2 fixtures, plus a Final card containing the moved fixture.
- Other competitions unaffected.
- If Goalserve later starts returning a proper Final stage, do nothing (no duplicate moving).

---

You are working inside the Football Mad codebase (frontend + backend) that currently supports “Tables > Cups” with Goalserve soccerfixtures feeds and round normalizers.

We are now implementing the “Tables > Europe” tab for:
- Champions League (UCL)
- Europa League (UEL)
- Conference League (UECL)

IMPORTANT: Do this ONE competition at a time. Start with Champions League only.
Also IMPORTANT: UCL uses the NEW FORMAT (league phase), so the frontend UI must change vs the old group-stage layout.

Use Goalserve feeds. Prefer JSON output by adding ?json=1 where supported.

Reference endpoints patterns:
- Mapping list: /soccerfixtures/data/mapping
- Fixtures by league: /soccerfixtures/leagueid/{ID}
- Standings: /standings/{leagueId}.xml (if json is supported, use ?json=1; if not, parse XML server-side)
(These are consistent with the provided Goalserve endpoints sheet.)

PHASE 1 (Backend) — Champions League support
1) Add competition IDs:
   - Locate UCL / UEL / UECL IDs using the mapping feed and store them in config. (Do NOT hardcode guesses; fetch mapping and search for “Champions League”, “Europa League”, “Europa Conference League”.)
   - Add these IDs to the backend competition registry similarly to cups.

2) Create a Europe API endpoint:
   - New route: GET /api/europe/:slug?season=YYYY%2FYYYY (or same season selector format used by cups)
   - Response should include:
     {
       competition: { slug, name, country: "Europe", goalserveCompetitionId },
       season: "2025/2026",
       phases: [
         {
           type: "league_phase",
           name: "League Phase",
           standings: [...],
           matchdays: [
             { matchday: 1, matches: [...] },
             ...
           ]
         },
         {
           type: "knockout",
           rounds: [
             { name: "Knockout Play-offs", matches: [...] },
             { name: "Round of 16", matches: [...] },
             { name: "Quarter-finals", matches: [...] },
             { name: "Semi-finals", matches: [...] },
             { name: "Final", matches: [...] }
           ]
         }
       ]
     }

3) Parsing rules (UCL):
   - UCL “League Phase”:
     - Standings: fetch from Goalserve standings endpoint for that competition ID.
     - Fixtures: from soccerfixtures/leagueid/{ID}; group by matchday (often “Round”, “Matchday”, or “stage/round” attributes — inspect the feed and implement robust parsing).
   - Knockout:
     - Detect and group by stage names from Goalserve (“Knockout Round Play-offs”, “Round of 16”, etc. — implement a mapping table if Goalserve labels differ).
   - Reuse existing match parsing logic (score, ft_score/et_score/pen_score, status chips like FT/AET/Penalties) — this must work exactly like cups.

4) Sanity guards:
   - Avoid duplicate matches across phases.
   - Sort matchdays numerically; sort matches by date/time.
   - If standings are missing, still return fixtures (and vice-versa), but include empty arrays.
   - Log useful debug info for stage/round label discovery (only in dev).

PHASE 2 (Frontend) — New Europe UI (UCL only)
1) Add “Europe” tab next to “Leagues” and “Cups” in Tables page.
2) Under “Europe” show sub-tabs:
   - Champions League (only for now; keep config ready for UEL/UECL later but hidden behind a feature flag or TODO)
3) UCL page layout:
   - Section A: “League Phase”
     - Left/Top: Standings table (rank, team, played, W/D/L, GF, GA, GD, points)
     - Right/Below: Matchday selector (Matchday 1..N) + list of matches for selected matchday
   - Section B: “Knockout”
     - Simple MVP: collapsible round cards (like cups) for each knockout round, listing matches
     - (Do NOT attempt a full bracket visual yet; just clean round cards)

4) UX requirements:
   - Must be responsive (mobile friendly): standings scrolls horizontally if needed.
   - Match lists reuse existing match row UI (home/away, score, penalty brackets).
   - Keep the existing season dropdown working.

PHASE 3 (Follow-ups AFTER UCL works)
- Add Europa League and Conference League using the same Europe UI and backend structures.
- If their formats mirror the league-phase system, reuse; otherwise adjust.

DELIVERABLES
- Code changes in backend + frontend.
- Update docs (BUILD_LOG.md / DECISIONS.md / PROMPTS.md) with:
  - competition IDs discovered
  - parsing assumptions about labels (matchday/stage)
  - any mapping tables added
- Provide a quick checklist for manual testing:
  - League phase standings render
  - Matchday switching works
  - Knockout rounds show when present
  - Penalties/AET chips still correct

START NOW:
- Step 1: Identify the UCL ID from mapping feed and add it to config.
- Step 2: Build backend endpoint returning league_phase + knockout structure.
- Step 3: Build frontend Europe tab and UCL layout.

Do not change existing Cups behavior.

---

You are working in the Football Mad Replit project.

Goal: Improve Tables > Europe > Champions League matchday UX:
1) Extend the Matchday selector beyond MD1–MD8 to include knockout stages:
   - MD1–MD8
   - PO (Knockout Play-offs)
   - L16 (Round of 16)
   - QF (Quarter-finals)
   - SF (Semi-finals)
   - Final (one long pill that spans the full row width on desktop)
   Keep the “rows of 6” layout for desktop.

2) In the fixture list on the right:
   - For past matchdays (anything before the current matchday), show RESULTS (scores + status pill like Full-Time / AET / Penalties).
   - For the current/upcoming matchday, keep date + kickoff time as it is now.
   - If a past match is missing scores, fall back to showing date/time.

Implementation details (do this without adding regression video testing):
A) Identify the Europe UI component (likely something like `client/src/components/tables/europe-progress.tsx` or similar) that renders:
   - the Matchday selector buttons
   - the right-hand “Matchday X” fixture list

B) Add stage-aware matchday options:
   - Introduce an array like:
     [
       { key: "MD1", label: "MD 1", type: "league", md: 1 },
       ...
       { key: "MD8", label: "MD 8", type: "league", md: 8 },
       { key: "PO",  label: "PO",   type: "ko",  round: "Knockout Play-offs" },
       { key: "L16", label: "L16",  type: "ko",  round: "Round of 16" },
       { key: "QF",  label: "QF",   type: "ko",  round: "Quarter-finals" },
       { key: "SF",  label: "SF",   type: "ko",  round: "Semi-finals" },
       { key: "F",   label: "Final",type: "ko",  round: "Final", isFinalPill: true }
     ]
   - Render them in the existing grid (6 columns on desktop).
   - For the Final button, make it span all 6 columns (e.g. `col-span-6`) and render label “Final”.

C) Wire selector state:
   - When a league MD is selected: show fixtures for that matchday from the league-phase matchday data (same as today).
   - When a KO option is selected: show fixtures from the knockout data for that round (you already parse and expose knockout rounds from the backend endpoint).
   - If a KO round has multiple legs/dates, just list all matches in that round in the same right-hand list.

D) Determine “current matchday”:
   - Compute `currentMatchday` as the highest MD that has at least one match with status NOT “Not Started” (or has a FT/AET/PEN status / a score present).
   - If none started, currentMatchday = 1.

E) Past MD results display:
   - In the right-hand match list item component:
     - If `selected` is a league MD and `selectedMd < currentMatchday`, render:
       - Home team + away team (as now)
       - Scoreline: `homeScore - awayScore` (use FT score; if penalties present show brackets like you implemented in cups: `2 (4)` / `2 (3)` and status pill “Penalties”)
       - Status pill: Full-Time / AET / Penalties / Half-Time where applicable (reuse existing status-to-label mapping from cups if possible).
     - Else (selectedMd >= currentMatchday): keep date + kickoff time display.
     - If score fields are missing, fall back to date/time.

F) Keep styling consistent:
   - Reuse existing shadcn Button styling used for the current MatchdaySelector.
   - Don’t change the overall layout: left standings, right matchday selector + match list.

G) Add a tiny sanity check:
   - Ensure selecting PO/L16/QF/SF/Final does not break when knockout data is empty (show “No fixtures yet” message).

H) Update docs (short):
   - Add a note to docs/BUILD_LOG.md and docs/DECISIONS.md describing:
     - added KO stage pills to the matchday selector
     - past matchdays now show results
     - Final pill spans full row

After changes, quickly manual test:
- MD1 shows results (if started) or date/time if not
- MD8 shows upcoming fixtures with date/time
- PO/L16/QF/SF/Final tabs render and don’t crash even if empty
- Past MDs show scores + status pill when available

---

Fix runtime crash in Europe > Champions League caused by null scores.

Error:
Cannot read properties of null (reading 'home')
at client/src/components/tables/europe-progress.tsx around line ~161:
{match.score!.home}

Goal:
- Never use non-null assertions on match.score or match.penalties.
- Only render numeric scores when they exist.
- For upcoming fixtures (no score), show no score (or a dash), but DO NOT crash.

Steps:
1) Open: client/src/components/tables/europe-progress.tsx
2) Find the MatchRow component and the section that currently renders:
   {match.score!.home}
   {match.score!.away}
   and penalties like:
   match.penalties!.home / match.penalties!.away
3) Replace score rendering with safe guards:

Implementation details (do exactly this pattern):
- Create safe local vars at top of MatchRow:
  const homeScore = match.score?.home;
  const awayScore = match.score?.away;
  const homePen = match.penalties?.home;
  const awayPen = match.penalties?.away;

- Define:
  const hasScore = Number.isFinite(homeScore) && Number.isFinite(awayScore);
  const hasPenalties = Number.isFinite(homePen) && Number.isFinite(awayPen);

- Wherever the UI currently renders the score, change it to:
  {hasScore ? homeScore : null}
  {hasScore ? awayScore : null}

- Wherever penalties are rendered, change it to:
  {hasPenalties ? ` (${homePen})` : null}
  {hasPenalties ? ` (${awayPen})` : null}

- Ensure "displayScore" logic (if present) uses `hasScore` instead of checking status alone.
  Example:
    const displayScore = hasScore || match.status === "Full-Time" || match.status === "AET" || match.status === "Penalties";
  becomes:
    const displayScore = hasScore;

  (Optional, but preferred) If you still want to show a placeholder for finished matches with missing score, use:
    const displayScore = hasScore;
    const scoreFallback = "–";
    and render fallback only when status indicates finished:
    const isFinished = ["Full-Time","AET","Penalties"].includes(match.status ?? "");
    show scoreFallback when isFinished && !hasScore.

4) Save, let Vite reload, confirm:
- Europe > Champions League loads without crashing
- Upcoming fixtures show date/time and team names even if score is missing
- Finished fixtures still show scores (and penalties in brackets when present)

Do not add/enable regression video testing.
Keep changes minimal to europe-progress.tsx only.

---

You are working in the Football Mad Replit project.

Add ONE more UX improvement to Tables > Europe > Champions League:

I) Remove “scroll within a scroll” on the right-hand Matchday fixtures/results panel.
Goal: The matchday fixtures block on the right should extend down the page so all fixtures are visible via normal page scroll (no internal overflow scrolling).

Implementation:
1) Find the container that renders the right-hand column (Matchdays selector + Matchday fixtures list) in the Europe tab component (likely `client/src/components/tables/europe-progress.tsx` or similar).
2) Identify where the fixtures list is constrained (common culprits):
   - `max-h-*`
   - `h-*`
   - `overflow-y-auto` / `overflow-auto`
   - a parent `flex` container with `min-h-0` + `overflow-y-auto`
3) Remove the internal scroll behavior:
   - Remove any `max-h-*` / fixed `h-*` on the fixtures list container.
   - Remove `overflow-y-auto` / `overflow-auto` on the fixtures list container (and any parent wrapper causing it).
   - Ensure the fixtures list container uses natural height: `h-auto` and no overflow rules.
4) Keep layout stable:
   - The right-hand column should still sit beside the standings on desktop.
   - On smaller screens, it can stack as it does today.
5) Sanity check:
   - With “Matchday 1” selected (18 matches), you should be able to scroll the PAGE and see the entire list without a nested scroll area.
   - Ensure the card borders/padding remain consistent.

Please implement this alongside the earlier changes (KO pills, past MD results display, Final full-width button), without adding regression video testing.

Update docs briefly (BUILD_LOG.md / DECISIONS.md): “Removed nested scroll on Europe matchday fixtures panel; fixtures now use page scroll.”

---

Fix Europe UCL layout stretching + make matchday fixtures show scores for completed matchdays.

PROBLEMS:
A) Layout: left “Standings” card is stretching vertically (empty space at bottom). This happens because the parent grid aligns items as stretch, so the left card matches the height of the right column.
B) Scores: matchday list shows “–” even for Full-Time matches. Frontend is fine; backend is likely not populating match.score/home/away for Europe endpoint.

GOALS:
1) Prevent the Standings card from stretching to match the right column height.
2) Matchday fixtures should show results for completed matchdays (FT/AET/Pens) and date/time for upcoming.
3) No “scroll within a scroll” inside the right-hand match list: the match list should expand naturally down the page (page scroll only).

PART 1 — FRONTEND LAYOUT FIX
File: client/src/components/tables/europe-progress.tsx

Find the main 2-column layout wrapper (the grid that contains Standings on the left and Matchdays/Match list on the right).
- Add Tailwind alignment so grid items don’t stretch:
  - Add `items-start` to the grid container.
- Ensure the cards don’t force equal heights:
  - Remove any `h-full` / fixed heights from the Standings card wrapper.
  - Add `h-fit` (or just omit height) on the left card container if needed.

Also remove internal scrolling on the match list:
- Find the match list container (often something like `max-h-[...] overflow-y-auto`).
- Remove `max-h-*` and `overflow-y-auto` so the list grows naturally.

Expected result: the left table card height fits its content; right column grows with fixtures; no nested scroll.

PART 2 — BACKEND SCORE PARSING FIX
We need to ensure /api/europe/:slug returns match objects with:
- score: { home: number|null, away: number|null }
- penalties?: { home: number|null, away: number|null } (when applicable)

File: server/routes.ts (or wherever the /api/europe/:slug endpoint parser is)

Do this:
1) Locate Europe match parsing (where you map Goalserve match XML -> JS match object).
2) Implement robust extraction of FT scores and penalties from Goalserve fields.
   Goalserve can store scores in multiple places. Check in this order:

For FT (90/120) score:
- Try match attributes: ft_score (often "2-1" or separate home/away) if present.
- Try team attributes: localteam ft_score / visitorteam ft_score if present.
- Try match attribute: score (often "2-1") ONLY if it represents FT (not penalty result).
- If you find a "X-Y" string, parse it safely.

For penalties:
- Try match attribute: pen_score (often "4-3")
- Or team attributes: localteam pen_score / visitorteam pen_score
- Parse "X-Y" safely into {home, away}

AET:
- If et_score exists and ft_score absent, you may treat et_score as the main score for AET matches (still store in score.home/away)

IMPORTANT:
- Never overwrite FT score with penalty score.
- Status hints: if status indicates penalties, FT/AET score should still be the actual match score (often 0-0, 1-1, etc.), and penalties stored separately.

3) Add a small debug log (temporary) for when status is FT/AET/Penalties but score is still missing:
   console.warn("[EUROPE] Missing score", { id, status, scoreAttr, ft_score, et_score, pen_score })

4) Confirm the endpoint returns scores:
- For completed matchdays (e.g. MD1-MD7 in your screenshot), match.score.home/away should be numbers.
- For upcoming MD8, match.score should be null and UI shows date/time.

PART 3 — QUICK SANITY CHECK
- Run the app and open Tables > Europe > Champions League
- Choose MD1: you should see numeric results (and penalties in brackets if present)
- Choose MD8: you should see upcoming fixtures with date/time
- Verify no internal scroll in match list, and the standings card no longer stretches.

Do NOT add regression video testing. Keep changes limited to europe-progress.tsx and the Europe endpoint parsing in backend.

---

UI polish for Europe > Champions League matchday header.

GOAL
Move the "18 matches" text onto the same horizontal line as "Matchday X":
- "Matchday X" left aligned
- "18 matches" right aligned
This saves vertical space and makes the fixtures panel feel more compact.

FILE
client/src/components/tables/europe-progress.tsx

WHAT TO CHANGE

1) Find the section rendering the match list header.
It likely looks something like:

  <div className="mb-3">
    <h3 className="text-lg font-semibold">
      Matchday {selectedMatchday}
    </h3>
    <p className="text-sm text-muted-foreground">
      {fixtures.length} matches
    </p>
  </div>

2) Replace that block with a single flex row:

  <div className="mb-3 flex items-center justify-between">
    <h3 className="text-lg font-semibold">
      Matchday {selectedMatchday}
    </h3>
    <span className="text-sm text-muted-foreground">
      {fixtures.length} matches
    </span>
  </div>

3) Make sure spacing below still looks right:
- Keep mb-3 (or mb-4 if that matches other card headers)
- Do NOT change the match list below this block.

RESULT

Before:
Matchday 1
18 matches

After:
Matchday 1                                 18 matches

More compact, cleaner, and consistent with the standings table density.

Do not change any logic or data fetching — layout only.

---

UI density tweak for Europe > Champions League fixtures list.

GOAL
Reduce the font size of the team names in the matchday fixtures list so they match the standings table text size.

This makes the right column feel more like a compact results panel and less oversized.

FILE
client/src/components/tables/europe-progress.tsx

WHAT TO CHANGE

1) Find the component rendering each fixture row.
You will see two team names per match, something like:

  <div className="flex justify-between">
    <div className="flex flex-col">
      <span className="font-medium">{match.homeTeam}</span>
      <span className="font-medium">{match.awayTeam}</span>
    </div>

2) Reduce the text size to match the standings table.

Replace `font-medium` only with a smaller text size + normal weight:

  <span className="text-sm font-normal">{match.homeTeam}</span>
  <span className="text-sm font-normal">{match.awayTeam}</span>

3) If the score is styled similarly (like bold + large), slightly reduce that too for balance:

Before:
  <span className="font-bold">{match.score.home}</span>

After:
  <span className="text-sm font-semibold">{match.score.home}</span>

Do the same for away score.

4) Do NOT change spacing between rows or the Full-Time badge — only typography.

RESULT

Before:
Large team names dominating the right panel.

After:
Team names visually match the density of the standings table on the left, making the two columns feel like one unified layout.

---

We need a small layout improvement in the Champions League fixtures list.

FILE:
client/src/components/tables/europe-progress.tsx

GOAL:
Right-align the score column so the numbers form a clean vertical line next to the "Full-Time / AET / Live" status pill.

Currently the team names and scores are stacked, but the scores are left-aligned and visually drift.

CHANGES:

Inside the MatchRow component, find the layout that renders:

- Home team name
- Away team name
- Score
- Status pill

Update the row layout to use a two-column flex layout:

LEFT SIDE (unchanged)
• Team names stacked vertically

RIGHT SIDE (new alignment)
• A right-aligned vertical score column
• Status pill to the right of the scores

IMPLEMENTATION:

Wrap the right side in a flex container aligned to the end:

<div className="flex items-center justify-between">
  {/* LEFT — Teams */}
  <div className="flex flex-col text-sm">
    <span>{match.homeTeam}</span>
    <span>{match.awayTeam}</span>
  </div>

  {/* RIGHT — Score + Status */}
  <div className="flex items-center gap-3">
    {hasScore && (
      <div className="flex flex-col items-end text-sm tabular-nums leading-5">
        <span className="w-6 text-right">{homeScore}</span>
        <span c

---

UI polish update for Europe fixtures list.

FILE:
client/src/components/tables/europe-progress.tsx

GOAL:
Right-align the score numbers in each fixture row so they form a clean vertical column next to the status pill (Full-Time / AET / etc).

CHANGES:

1. Locate the match row layout inside the fixtures/matchday list. It currently has:
   - Left side: Home team / Away team (stacked)
   - Right side: Scores + status pill

2. Wrap the score block in a fixed-width, right-aligned container.

Replace the current score rendering block with:

<div className="flex items-center justify-end gap-3 min-w-[64px] text-right">
  {displayScore && (
    <div className="flex flex-col items-end leading-tight font-semibold tabular-nums">
      <span data-testid={`text-home-score-${match.id}`}>
        {match.score?.home ?? "–"}
      </span>
      <span data-testid={`text-away-score-${match.id}`}>
        {match.score?.away ?? "–"}
      </span>
    </div>
  )}
</div>

3. Ensure the outer row uses `justify-between` so:
   - Teams stay left
   - Score block + status pill stay right

Example row structure:

<div className="flex items-center justify-between gap-4">
  {/* LEFT: Teams */}
  <div className="flex flex-col text-sm">
    <span>{match.homeTeam}</span>
    <span>{match.awayTeam}</span>
  </div>

  {/* RIGHT: Score + Status */}
  <div className="flex items-center gap-3">
    [SCORE BLOCK HERE]
    <StatusPill ... />
  </div>
</div>

4. Add `tabular-nums` to the score container for perfect vertical number alignment.

5. Do NOT change any data logic — layout only.

RESULT:
Scores form a clean vertical line aligned with the status pills across

---

UI polish update for Europe fixtures list.

FILE:
client/src/components/tables/europe-progress.tsx

GOAL:
Right-align the score numbers in each fixture row so they form a clean vertical column next to the status pill (Full-Time / AET / etc).

CHANGES:

1. Locate the match row layout inside the fixtures/matchday list. It currently has:
   - Left side: Home team / Away team (stacked)
   - Right side: Scores + status pill

2. Wrap the score block in a fixed-width, right-aligned container.

Replace the current score rendering block with:

<div className="flex items-center justify-end gap-3 min-w-[64px] text-right">
  {displayScore && (
    <div className="flex flex-col items-end leading-tight font-semibold tabular-nums">
      <span data-testid={`text-home-score-${match.id}`}>
        {match.score?.home ?? "–"}
      </span>
      <span data-testid={`text-away-score-${match.id}`}>
        {match.score?.away ?? "–"}
      </span>
    </div>
  )}
</div>

3. Ensure the outer row uses `justify-between` so:
   - Teams stay left
   - Score block + status pill stay right

Example row structure:

<div className="flex items-center justify-between gap-4">
  {/* LEFT: Teams */}
  <div className="flex flex-col text-sm">
    <span>{match.homeTeam}</span>
    <span>{match.awayTeam}</span>
  </div>

  {/* RIGHT: Score + Status */}
  <div className="flex items-center gap-3">
    [SCORE BLOCK HERE]
    <StatusPill ... />
  </div>
</div>

4. Add `tabular-nums` to the score container for perfect vertical number alignment.

5. Do NOT change any data logic — layout only.

RESULT:
Scores form a clean vertical line aligned with the status pills across all fixtures.

---

GOAL
In the Champions League “Fixtures” list (Tables > Europe), right-align the score numbers so they sit in a neat vertical line close to the status pill (Full-Time/AET/Penalties/etc). Keep everything else as-is.

WHERE
client/src/components/tables/europe-progress.tsx
Look for the fixture list row component (likely MatchRow) and the section rendering:
- home/away team names
- the score numbers (currently rendering as separate stacked numbers)
- the status pill on the far right

WHAT TO CHANGE
1) Restructure the row layout into 3 clear columns:
   - Left: team names (stacked)
   - Middle: score column (stacked), RIGHT-ALIGNED, fixed/min width so all scores line up
   - Right: status pill (and date/time if present)

2) The score column should:
   - use text-right
   - have a fixed width (e.g. w-6 / w-8 / min-w-[24px]) so single digits don’t wobble
   - be positioned immediately to the left of the status pill with a small gap (e.g. gap-3)
   - remain vertically centered relative to the team names block

3) Implementation suggestion (choose one):
   A) Use a grid wrapper for the right-hand side:
      grid grid-cols-[1fr_auto_auto] items-center gap-3
      where col2 is scores (text-right w-8) and col3 is pill.
   B) Or use flex:
      a parent flex items-center justify-between
      with a right-side flex items-center gap-3 containing:
        - score block (text-right w-8)
        - status pill

4) Ensure the score column only renders when scores exist, but DOES NOT break alignment:
   - If score missing, render “–” or keep the space with an empty placeholder in the score column so the pill column stays aligned.

DONE WHEN
- On desktop and mobile, the score numbers form a straight vertical line down the list.
- The status pill column is aligned consistently.
- No other layout regressions in the EuropeProgress view.

---

Update the Europe standings table to use the same “trimmed on mobile” layout as the Premier League league table.

Context:
- Current issue: Tables > Europe > Champions League shows the full wide table on mobile, causing horizontal overflow and hiding the Points column.
- Desired behaviour: On mobile, show a trimmed table like Premier League (Pos, Team, Pts always visible). Other columns should be hidden on small screens and only appear on larger breakpoints.

Tasks:
1) Find the existing league table component/layout used for Premier League mobile (search for the table headers/cells that show “Pos”, “Team”, “Pts” and hide other columns using responsive classes like `hidden md:table-cell` / `hidden lg:table-cell`).
2) Apply the SAME responsive approach to the Europe standings table in:
   - `client/src/components/tables/europe-progress.tsx`
3) Implementation detail (acceptable approaches):
   A) Best: reuse the same shared table component used by Premier League if it exists (preferred for consistency).
   B) Otherwise: update the Europe standings table markup to match Premier League’s responsive column visibility:
      - Always visible: Pos (#), Team, Pts
      - Hidden on mobile (show from md or lg upwards): P, W, D, L, GF, GA, GD (and any other stats columns)
      - Ensure header cells and row cells use the same breakpoint rules so alignment stays correct.
4) Ensure there is no horizontal overflow on mobile:
   - Remove/avoid forcing min-width wide tables on small screens
   - If a wrapper uses `overflow-x-auto`, keep it only if necessary, but the goal is to not require horizontal scroll for Europe standings.
5) Don’t change the desktop/tablet layout beyond matching the existing breakpoints pattern already used in Premier League tables.
6) After change: verify on mobile viewport that “Pts” is visible and team names aren’t unnecessarily forced to two lines due to overflow.

Output:
- Only modify the relevant Europe standings table code (and optionally import/reuse the shared league table component if found).
- Keep everything else (matchday fixtures UI, tabs, colours) unchanged.

---

Replit AI — please update the Champions League (Tables > Europe) standings on MOBILE to match the exact same “trimmed + expandable row” UI we already use for Tables > Leagues (e.g. Premier League).

Goal:
- On small screens, Champions League standings must NOT render the full desktop table.
- It should render the SAME mobile standings component/pattern as Premier League:
  - Collapsed row shows: Pos | Team | Pts | chevron
  - Expanding reveals: P, W/D/L, GF/GA, GD, Form (exact same layout/typography as PL mobile)
  - Preserve the existing zone colouring/indicator logic (Top 8 / 9–24 / 25+) in a way consistent with PL mobile (e.g. left border/stripe or row tint — whichever PL uses).

Where to change:
- client/src/components/tables/europe-progress.tsx (Champions League Europe tab UI)
- DO NOT change the backend.

Implementation steps:
1) Find the exact mobile league table component currently used on Tables > Leagues (Premier League).
   - Search in client/src/components (and client/src/pages if needed) for the Premier League standings render.
   - Look for a component that renders the collapsed “Pos / Team / Pts” row with a chevron, and expands to show:
     - P:
     - W/D/L:
     - GF/GA:
     - GD:
     - Form:
   - This is the component/pattern we must reuse (or copy 1:1) so Europe behaves identically.

2) Reuse that existing mobile component for Champions League standings.
   - If the PL standings page uses a shared component like <MobileStandingsTable />, <StandingsMobile />, <LeagueTableMobile />, etc:
     - Import it into europe-progress.tsx and pass Champions League standings data into it.
   - If it’s not a reusable component and is embedded inline:
     - Extract it into a shared component (preferred), then use it in BOTH places OR clone it into europe-progress.tsx without altering behaviour.

3) Data mapping (very important):
   - Map the UCL standings row fields into the exact shape the mobile component expects:
     - pos / rank
     - team name (and badge if the PL view shows it)
     - points
     - played
     - won, drawn, lost
     - goalsFor, goalsAgainst
     - goalDiff
     - form (whatever format the PL mobile uses; if it expects an array of W/D/L, convert accordingly)
   - Ensure null safety: don’t assume any field exists without fallback.

4) Responsive behaviour must match Premier League:
   - On mobile (same breakpoint as PL), show ONLY the mobile trimmed table.
   - On md+ (desktop/tablet), keep the existing full standings table that Europe currently shows.
   - Implement with the same Tailwind approach used in PL (e.g. hidden md:block / md:hidden) so we don’t introduce a new breakpoint style.

5) Keep the rest of the Europe page unchanged:
   - Fixtures panel and matchday buttons remain exactly as-is.
   - No layout regressions.

Acceptance checks:
- iPhone width: Champions League standings looks identical in structure to Premier League standings (collapsed rows + expand for details + form).
- Points column is visible without horizontal scrolling.
- Team names are less likely to wrap (because we’re no longer forcing the full desktop table).
- Desktop remains unchanged.

Deliverable:
- Commit the changes with a clear message like:
  “Europe UCL: use existing mobile standings UI (trimmed + expandable) like PL”

---

Replit AI — fix the “Scheduled” fixture layout regression in Champions League fixtures list (Tables > Europe > Champions League) WITHOUT changing the new score alignment for completed matches.

Issue:
- For upcoming fixtures (latest matchday), we used to render:
  - A “Scheduled” (or “Not Started”) pill on the RIGHT
  - And directly UNDER it (same right alignment), the date + kick-off time
  - The pill + date/time were vertically stacked and visually centred as a unit.
- After the score alignment changes, the date/time block is no longer appearing in that stacked right-aligned position (and may be missing/misaligned).

Goal:
- Restore the previous upcoming-fixture right column layout:
  - Right column = a vertical stack aligned right:
    1) Status pill (Scheduled/Not Started/Upcoming)
    2) Date + KO time (e.g. “16 Sep 19:00”) underneath
  - Both items aligned to the right edge, and the date/time centred under the pill (as before).

Constraints:
- Keep the new scoreline alignment for finished matches (scores right-aligned near the Full-Time/AET pill).
- Only affect fixtures that are NOT finished (i.e. scheduled / not started / in future).
- No backend changes.

Where:
- client/src/components/tables/europe-progress.tsx
  - Find the fixture row renderer (MatchRow or equivalent) used in the right-hand “Fixtures” list.

Implementation detail:
1) Detect “upcoming” fixtures (no final score to show) using the same conditions already used to decide displayScore:
   - If match.status is Scheduled/Not Started/Upcoming (or if displayScore is false), treat as upcoming.
2) For upcoming fixtures, render the right side as:
   - <div className="flex flex-col items-end gap-1 text-right">
       <StatusPill ... />
       <div className="text-xs text-muted-foreground">
         {formattedDateTime}
       </div>
     </div>
   - Ensure formattedDateTime uses the same formatter function as before (don’t change formatting).
3) For finished fixtures, keep the current right side layout that includes:
   - score column (right aligned) and the status pill (Full-Time/AET etc).

Acceptance:
- Upcoming matchday fixtures show NO scores.
- Upcoming fixtures show pill + date/time stacked on right, date/time underneath pill.
- Finished fixtures remain unchanged with the new score alignment.

---

Replit AI — tiny UI tweak: centre the “Scheduled” pill over the date/time in the right-hand Fixtures list (UCL Europe tab)

Context:
- Tables > Europe > Champions League
- In the right-hand “Fixtures” list, for upcoming matches we render:
  - a “Scheduled” pill
  - date + kick-off time beneath (e.g. “28 Jan 20:00”)
- This is now right-aligned correctly, but the pill should be visually centred above the date/time (not flush-right).

Goal:
- Keep the whole upcoming “meta” block anchored to the right edge of the row.
- Within that block, centre the pill horizontally relative to the date/time width.

Where:
- client/src/components/tables/europe-progress.tsx
  - In the upcoming fixture branch (where we show Scheduled + date/time), update the right-side container.

Change:
1) Keep the outer wrapper right-aligned in the row (do NOT change overall row layout):
   - It should still sit at the far right of the fixture row.

2) Inside that wrapper, make an inner container that:
   - sizes to its content (shrink-to-fit)
   - centres children (pill and date/time) within that content width

Example structure:

<div className="flex justify-end">
  <div className="inline-flex flex-col items-center gap-1 text-right">
    <StatusPill ... />
    <div className="text-xs text-muted-foreground">
      {formattedDateTime}
    </div>
  </div>
</div>

Notes:
- The key is the outer `flex justify-end` (anchors to right),
  plus inner `inline-flex ... items-center` (centres pill over date/time).
- Do not affect finished matches (scores + Full-Time/AET layout stays exactly as-is).

Acceptance:
- Upcoming fixtures: pill appears centred over the date/time while the whole block remains right-aligned in the row.
- Finished fixtures unchanged.

---

Replit AI — Set Europe (UCL) default “Fixtures” view to the latest stage that actually has matches

Goal
- On Tables > Europe > Champions League, when the page loads (or when season/competition changes), the right-hand Fixtures panel should default to the **latest** stage that has any matches (results or scheduled fixtures).
- “Latest” should respect the existing stage order:
  MD1 → MD2 → … → MD8 → PO → L16 → QF → SF → Final
- If a URL/query selection already exists (e.g. ?stage=MD7), DO NOT override it.

Where
- client/src/components/tables/europe-progress.tsx

What to change
1) Identify where the selected stage/matchday is stored (likely something like `selectedStage`, `selectedMatchday`, `selectedKey`, etc.) and where it’s initialised (probably defaulting to "MD1").

2) After data loads successfully, compute the “latest available stage”:
   - Build an ordered list of stage keys:
     const STAGE_ORDER = ["MD1","MD2","MD3","MD4","MD5","MD6","MD7","MD8","PO","L16","QF","SF","Final"];
   - Build a map of stageKey -> matches[] from the API response you already have in this component.
     - League phase matchdays: MD1..MD8 (whatever exists in data)
     - Knockout: PO, L16, QF, SF, Final (only if present)
   - Find the last stage in STAGE_ORDER where `matches?.length > 0`.

3) Set default selection ONLY when:
   - data is loaded
   - and there is NO stage in the URL (or whatever “controlled by query param” mechanism you have)
   - and the user hasn’t already manually selected something this render cycle

Implementation pattern (adapt names to your code)
- Add a helper:

const STAGE_ORDER = ["MD1","MD2","MD3","MD4","MD5","MD6","MD7","MD8","PO","L16","QF","SF","Final"];

function getLatestAvailableStage(stageMatches: Record<string, any[] | undefined>) {
  for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
    const key = STAGE_ORDER[i];
    if ((stageMatches[key]?.length ?? 0) > 0) return key;
  }
  return "MD1"; // safe fallback
}

- In the component, after you have `data`:
  - construct `stageMatches` (whatever structure your data already provides)
  - compute `latestStage = getLatestAvailableStage(stageMatches)`

- Then in a `useEffect`:

useEffect(() => {
  if (!data) return;

  const stageFromUrl = /* read from query param if you have it, e.g. searchParams.get("stage") */;
  if (stageFromUrl) return;

  const latestStage = getLatestAvailableStage(stageMatches);

  // only set if current selection is empty / default OR if it’s not a valid stage with matches
  setSelectedStage(latestStage);

  // if you keep the selection in the URL, update it here too:
  // setSearchParams(prev => { prev.set("stage", latestStage); return prev; });

}, [data /* plus anything needed like season/slug */, /* stageMatches dependency if memoised */]);

Notes / Acceptance
- On load, if MD8 has matches, it should land on MD8.
- If MD8 has no matches but MD7 does, land on MD7.
- If matchdays have no matches but PO/L16/etc do, land on the latest knockout stage with matches.
- If the user deep-links with ?stage=MD3, keep MD3.
- No behaviour changes for other tabs/cups.

Please implement this cleanly with minimal re-renders (useMemo for stageMatches if needed), and keep existing UI/URL patterns consistent with the component.

---

GOAL
Unify round navigation across all competitions (Leagues + Europe) using ONE reusable “RoundToggle” (prev/next arrows + label + date range). Replace the current Europe MD button grid with the toggle. Add the same toggle to domestic league tables (Tables > Leagues) and show a right-hand fixtures/results sidebar in the same layout style as UCL. Default the selected round to the latest round that has any matches (FT/LIVE/SCHEDULED) for that competition/season.

CONSTRAINTS
- Keep existing styling conventions (shadcn Button, existing Card layouts, dark mode).
- Do not reintroduce scroll-within-scroll for the fixtures list. The fixtures card should expand naturally down the page.
- The label should vary by competition:
  - Europe (UCL/UEL/UECL): “Matchday”
  - Domestic leagues: “Matchweek”
  - (Leave cups for later)
- Use the same MatchRow rendering we already have (score alignment + status pill + scheduled date/time centred under pill).
- Do not break existing Cups behaviour.

BACKEND CHANGES
1) Create a shared helper to compute “rounds” from matches:
   - Input: array of matches (with date/time, status, round/matchday label)
   - Output: rounds[] sorted ascending, where each round has:
     { key: string, index: number, label: string, startDate?: string, endDate?: string, matchesCount: number, hasAnyMatches: boolean }
   - Determine round key from existing fields used today for Europe (matchday/stage/round). Reuse the same parsing logic you used for UCL matchdays.
   - startDate/endDate should be min/max of match kick-off times for that round (if available).
   - hasAnyMatches true if matchesCount > 0.

2) Europe endpoint:
   - Update GET /api/europe/:slug to return:
     {
       competition, season,
       standings,
       rounds,               // computed
       matchesByRound: { [roundKey]: Match[] },
       latestRoundKey        // computed as last round with matchesCount>0, else last round
       knockout (existing)
     }
   - Ensure matchesByRound includes league-phase MD1..MD8 and knockout buckets if present (PO, L16, QF, SF, Final) using existing logic.
   - IMPORTANT: Some matches may have null scores. Avoid runtime errors (no non-null assertions like match.score!.home). Always guard score objects.

3) League (domestic) tables endpoint:
   - Extend the existing league tables endpoint used by Tables > Leagues (whatever route currently powers standings) to also return:
     rounds, matchesByRound, latestRoundKey
   - If the league tables endpoint currently only returns standings:
     - Fetch that league’s fixtures/results feed for the season (same provider/Goalserve source you already use elsewhere).
     - Group into rounds (matchweek) using the round label field available in the feed.
   - Keep the existing response fields intact; only add new fields.

FRONTEND CHANGES
4) Create a reusable component:
   - File: client/src/components/shared/round-toggle.tsx
   - Props:
     - labelType: "Matchday" | "Matchweek"
     - rounds: Array<{ key,label,startDate?,endDate?,matchesCount }>
     - value: string
     - onChange: (key: string) => void
   - UI:
     - Row with left chevron button, centered label (“Matchday 8” / “Matchweek 23”), right chevron button
     - Under the centered label, show date range if start/end exist (e.g. “28 Jan – 29 Jan”). If same day, show single date.
     - Disable prev/next at ends.
     - Keep it compact and consistent with the app styling.

5) Update EuropeProgress:
   - Replace the MD button grid entirely with RoundToggle.
   - Use rounds + latestRoundKey from API.
   - Default selection:
     - If URL query param exists (e.g. ?round=MD8) use it if valid
     - else default to latestRoundKey
   - When selection changes, update URL query param (shallow) and render matches from matchesByRound[selectedKey].
   - Keep the “Fixtures” header card.
   - Ensure the fixtures list renders ALL matches without internal scrolling.
   - Keep scheduled pill centred above date/time (vertical stack aligned center/right block like it was before). For FT/LIVE results, keep the new right-aligned score column close to the status pill.

6) Update Tables > Leagues layout to mirror the Champions League page:
   - Desktop (lg+):
     - Two-column grid: Standings left, Fixtures right.
     - Fixtures right has the RoundToggle at top, then the Matchday/Matchweek fixture list card below (same as Europe).
   - Mobile:
     - Keep the existing trimmed league table UI (Pos/Team/Pts with expandable row details).
     - Under the table, render the fixtures section:
       - RoundToggle
       - Match list for selected round
   - LabelType for leagues = “Matchweek”.

7) Default selection logic (shared):
   - Implement a helper on FE:
     - pickDefaultRound(rounds, latestRoundKey) => latestRoundKey if present/valid else last round key else first.
   - Use it for both Europe and Leagues.

TESTING / QA
8) Manual test checklist:
   - Europe > Champions League:
     - Lands on latestRoundKey by default (MD8 in current season)
     - Prev/next navigates correctly
     - Scheduled matches show pill centered above “28 Jan 20:00” (or whatever time) aligned right block
     - Finished matches show score right aligned near status pill
   - Tables > Leagues:
     - Mobile view shows trimmed table + expandable details like Premier League already does
     - Fixtures section shows Matchweek toggle + fixtures list
   - No runtime errors when score is null.

IMPLEMENTATION NOTE
- Reuse the existing MatchRow rendering logic from europe-progress where possible; refactor into a shared MatchRow component if it helps, but avoid large rewrites.
- Make the smallest, safest changes necessary.

DELIVERABLES
- Working RoundToggle component
- EuropeProgress uses RoundToggle
- League Tables page uses RoundToggle + fixtures sidebar on desktop, fixtures section on mobile
- Backend returns rounds + matchesByRound + latestRoundKey for Europe and Leagues
- No regressions to Cups

---

BUGFIX TASK
On Tables > Leagues (Premier League etc) the Matchweek toggle UI renders but prev/next doesn’t change the fixtures list, and the label shows “Matchweek 0”. We also want the default selection to start at Matchweek 1 and auto-land on the latest matchweek that has SCHEDULED fixtures.

PLEASE IMPLEMENT THE FOLLOWING CHANGES:

1) FIX “MATCHWEEK 0” (BACKEND NORMALISATION)
- Find the code that builds the league rounds / matchweeks (whatever creates rounds[] and matchesByRound for leagues).
- Ensure matchweek numbering starts at 1.
  - If the feed returns round numbers starting at 0, add +1 for display/label AND for the round key.
  - If the feed returns strings like “Matchweek 0” or “Round 0”, normalise to 1.
- Output keys must be stable and consistent. Use a key like `MW{n}` where n starts at 1.
- Ensure rounds[] is sorted numerically by n.

2) DEFAULT SELECTED MATCHWEEK (BACKEND)
- In the league tables API response, add:
  - latestScheduledRoundKey: the highest MW that contains at least one match with status SCHEDULED (or equivalent in our status enum)
  - latestActiveRoundKey: fallback highest MW that contains any matches at all (FT/LIVE/SCHEDULED)
- Keep existing latestRoundKey if you already have it, but ensure the new scheduled-first default is available.

3) DEFAULT SELECTED MATCHWEEK (FRONTEND)
- In the league tables page/component that renders the right-side Fixtures panel:
  - selectedRound should initialise like:
    a) if URL has ?round=... and it exists in rounds -> use it
    b) else use latestScheduledRoundKey if valid
    c) else use latestActiveRoundKey if valid
    d) else use last round in rounds[]
- After setting the default, write it to the URL query param (?round=MWxx) to keep state on refresh.

4) MAKE TOGGLE BUTTONS ACTUALLY WORK (FRONTEND)
- In RoundToggle component:
  - Prev/Next must call onChange with the adjacent round key.
  - Disable buttons correctly at ends.
- In the parent component:
  - onChange must update selectedRound state
  - and update URL query param
  - and the fixtures list must render from matchesByRound[selectedRound]
- IMPORTANT: fix any memoisation bugs:
  - If you’re using useMemo/useCallback, ensure dependencies include rounds and selectedRound.
  - Ensure selectedRound is updated when the API data changes (e.g., season switch).

5) QUICK QA
- Premier League 2025/26:
  - Toggle shows “Matchweek 1” minimum, never 0.
  - Page defaults to the latest matchweek with scheduled fixtures.
  - Prev/next updates the fixtures list and the “Matchweek X” title + match count.
  - URL query updates and refresh preserves selection.

DELIVERABLE
- Commit all changes needed across backend + frontend.
- Keep UI layout exactly as it is now; only fix the toggle behaviour and default selection logic.

---

MATCHWEEK TOGGLE STILL BROKEN — FIX + INSTRUMENT

Context:
Tables > Leagues (Premier League etc) has a “Fixtures” sidebar with a Matchweek toggle (prev/next). The UI renders, but clicking prev/next does NOTHING (no change in the list, no title change). We need it fully wired.

Please do the following in the client:

1) ADD TEMP DEBUG LOGGING (remove once fixed)
- In the Matchweek toggle component, add a console.log when:
  - prev is clicked
  - next is clicked
  - onChange is called
  Log: { action: 'prev'|'next'|'select', currentKey, nextKey, roundsLength }
- In the parent component that owns state (Tables league page / league-progress component), add console.log when:
  - selectedRound changes
  - data (rounds/matchesByRound) changes
  Log: { selectedRound, availableRoundKeys: rounds.map(r=>r.key), hasMatches: !!matchesByRound[selectedRound] }

2) ENSURE THERE IS A SINGLE SOURCE OF TRUTH FOR SELECTED ROUND
- In the parent component, implement:
  const [selectedRound, setSelectedRound] = useState<string | null>(null)
- Only this state controls:
  - the highlighted matchweek in the toggle
  - the “Matchweek X” heading
  - the fixtures list data source

3) WIRE PREV/NEXT CORRECTLY
- In the toggle, accept props:
  - rounds: Array<{ key: string; label: string; dateRange?: string }>
  - selectedKey: string
  - onChange: (key: string) => void
- Implement prev/next by finding current index:
  const idx = rounds.findIndex(r => r.key === selectedKey)
  prev -> if idx > 0 call onChange(rounds[idx-1].key)
  next -> if idx < rounds.length-1 call onChange(rounds[idx+1].key)
- Disable prev/next at ends.

4) FIX THE “KEY MISMATCH” BUG (MOST LIKELY CAUSE)
- Right now the UI displays “Matchweek 0” and the rounds probably use numbers while matchesByRound uses strings (or vice versa).
- Standardise the key format in the CLIENT before rendering:
  Create a helper:
    const normaliseRoundKey = (k: unknown) => String(k).startsWith('MW') ? String(k) : `MW${String(k)}`
  Ensure:
    - rounds keys are normalised (e.g. MW1, MW2...)
    - selectedRound always stores a normalised key
    - matchesByRound is accessed with the normalised key
  If matchesByRound is keyed by numbers (0,1,2) instead, then do the opposite:
    - create normaliseRoundIndex = (key: string) => parseInt(key.replace('MW',''),10)
    - access matchesByRound[roundIndex]
  IMPORTANT: pick ONE and make rounds + selection + lookup consistent.

5) REMOVE STALE MEMO ISSUES
- If fixtures list is computed with useMemo, ensure dependencies include:
  [selectedRound, matchesByRound, rounds]
- If you do derivedSelectedRound in useMemo, ensure it reruns when query params OR data changes.

6) URL SYNC (OPTIONAL BUT NICE)
- When onChange fires, update URL query param ?mw=MWxx
- On first load, initialise from URL if present and valid.

7) ACCEPTANCE TEST
- Clicking prev/next must change:
  - the toggle highlight
  - the “Matchweek X” heading
  - the fixtures list rows
- Console logs should show correct keys and that matchesByRound[selectedRound] resolves.
- After confirmed, remove or gate console logs behind a dev flag.

Deliverable:
- Commit working toggle behaviour. Keep layout unchanged.

---

Fix Tables > Leagues sidebar matchweek label + toggle logic.

IMPORTANT:
DO NOT run tests, scripts, browsers, or automated verification.
DO NOT add testing code.
ONLY modify application source code related to matchweek navigation and display.
I will test manually.

Bug:
Sidebar header shows “Matchweek 1” but the fixtures shown are clearly from a later week (e.g. MW23).
This means the UI label is using array index instead of the real matchweek key, and/or matchesByRound keys are being grouped incorrectly so only one round appears.

Scope:
Find the component that renders the right-hand “Fixtures” sidebar on the Tables page for domestic leagues (Premier League etc). It contains:
- Prev/Next chevrons
- “Matchweek X” title
- Date range
- Fixtures list

Fix requirements:

1) Build rounds from REAL DATA KEYS
- Use: const roundKeys = Object.keys(matchesByRound ?? {})
- Treat matchweek keys like "MW23"
- Extract number: const n = parseInt(String(key).match(/(\d+)/)?.[1] ?? "", 10)
- Ignore invalid numbers
- Sort ascending by n
- Create:
  normalizedKey = `MW${n}`
  originalKey = key
- Build map: normalizedKey -> originalKey

2) Selected round state must store NORMALIZED KEY (e.g. "MW23")
- When fetching matches, resolve originalKey from the map
- NEVER use array index as the matchweek id

3) Matchweek label must come from the key, NOT index
- Display: Matchweek ${number extracted from selectedRound}
- Never show “Matchweek 0”
- Never use index+1

4) Default selection must be the latest real matchweek
- On load or when data changes:
  - Find highest week number that has matches
  - Fallback: highest week number
- If URL param exists (?mw=MWxx), validate it first

5) Prev/Next navigation must move through the sorted normalized keys
- Find current index using normalized key
- Prev = index - 1
- Next = index + 1
- Disable correctly at boundaries

6) Keep layout and styling exactly the same
Only fix data handling, key normalization, label logic, and toggle behaviour.

Optional debug logs are allowed ONLY if wrapped in a condition like:
if (new URLSearchParams(window.location.search).get("debug") === "1")

Deliverable:
Working matchweek toggle using real matchweek numbers (e.g. MW23 shows “Matchweek 23”), correct default to latest week, and proper prev/next behaviour.

---

We just found the key detail: the EPL fixtures XML includes `<week number="1"> ... <week number="38">`, but the JSON form we’re currently using doesn’t surface any round/matchweek labels. That’s why the Matchweek toggle shows “1” while displaying MW23 data, and why it won’t navigate.

IMPORTANT RULES:
- Do NOT run regression tests, videos, test suites, or extra scripts.
- Make surgical changes only: fix matchweek toggles + correct matchweek labeling and default selection.
- No refactors, no unrelated formatting.

TASK
1) Backend: ensure the leagues fixtures API returns a proper list of matchweeks derived from Goalserve XML `<week number="X">` containers.
2) Frontend: make the matchweek toggle work by using the backend-provided matchweeks list (not guessed), and:
   - Always label as “Matchweek X”
   - Start at Matchweek 1 on the far-left
   - Default to the latest Matchweek that has fixtures or results (i.e., any matches at all), prefer the latest that is not entirely in the future if you can infer it.
3) Keep existing UI layout; only fix the logic.

IMPLEMENTATION DETAILS

A) BACKEND (server/routes.ts or wherever the leagues/fixtures endpoint is)
- Locate the endpoint used by the Leagues tab sidebar (the one feeding matchweek fixtures).
- Change the Goalserve fetch for league fixtures to pull XML (NO `?json=1`) so we can read `<week number="...">`.
  Example:
    https://www.goalserve.com/getfeed/${GS_KEY}/soccerfixtures/leagueid/${leagueId}
- Parse XML using the same parser already used elsewhere (fast-xml-parser or equivalent) with attributes enabled.
- Extract weeks from the payload:
  - Find the container that holds `<week number="X">` nodes (it appears directly under the league fixtures feed).
  - For each week node:
      weekNumber = attribute "number"
      matches = any `<match ...>` children (support single object or array)
  - Reuse the existing match parsing logic (teams, score, status, kickoffDate, kickoffTime, penalties, etc.)
- Return a response shape that includes:
  {
    leagueId: "...",
    matchweeks: [
      { number: 1, label: "Matchweek 1", matches: [...] },
      ...
      { number: 38, label: "Matchweek 38", matches: [...] }
    ],
    defaultMatchweek: <number>
  }
- defaultMatchweek logic:
  - Choose the greatest weekNumber where matches.length > 0.
  - If you can detect “future-only” weeks: prefer the greatest week where at least one match status is not "Not Started"/"NS" OR (kickoffDate <= today in Europe/London). If that’s too risky, just use greatest week with matches.
- IMPORTANT: Do not break Europe/UCL logic. This change is for league matchweeks only (Leagues tab), not cups and not /api/europe.

B) FRONTEND
- Find the league matchweek sidebar/toggle component you recently added (prev/next buttons and “Matchweek X” label).
- Update it to use `matchweeks` returned from the backend:
  - Build an ordered array of week numbers from the response.
  - The displayed label is the selected week’s label from the API (or `Matchweek ${n}`).
  - Prev/next should navigate the index inside that array.
  - Disable prev when at index 0, disable next at last index.
- Default selection:
  - If URL has ?matchweek=, use it (parse int).
  - Else use `defaultMatchweek` from API.
- Ensure the fixtures list updates when selected matchweek changes.
- Ensure the label matches the selected data (no more MW1 showing MW23).

C) QUICK FIX FOR YOUR GREP WARNING (optional, no effect on app)
- Ignore; it was a shell quoting issue and not part of app.

DELIVERABLE
- Make the code changes only. Do NOT run tests/videos. Do NOT add debug logs.

After changes, the user will manually verify:
- Matchweek label matches the fixtures shown
- Prev/next toggles actually change matchweek and fixtures
- Default lands on latest matchweek with data

---

/**
 * ONE-CLICK DROP-IN: Normalize + group fixtures into matchweeks/matchdays across:
 * - Domestic leagues (Goalserve XML uses <week number="X">)
 * - Europe comps (often uses matchday/round/stage labels)
 *
 * What you get:
 * - rounds: ["MW1","MW2",...]
 * - matchesByRound: Record<"MWx", Match[]>
 * - defaultSelectedRound: latest round with fixtures/results (never MW0)
 * - helpers for prev/next navigation
 *
 * ✅ No testing scripts. Just paste into your Tables page (or a shared util).
 */

// --- Types are optional; keep as `any` if your match shape varies
type AnyMatch = Record<string, any>;

const toInt = (v: any): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
};

// Try many fields because Goalserve shapes vary by endpoint/competition
const extractRoundNumber = (m: AnyMatch): number | null => {
  // Most important: leagues via soccerfixtures/leagueid use "week" (often nested or as attr)
  // Common patterns:
  // - m.week = "23"
  // - m["@week"] = "23"
  // - m.week?.["@number"] = "23" (rare)
  // - m.round, m.matchday, m.stage, etc (Europe/cups)
  const candidates = [
    m.week,
    m["@week"],
    m.week_number,
    m.weekNo,
    m.weekno,
    m.week?.number,
    m.week?.["@number"],

    m.matchweek,
    m.matchday,
    m["@matchday"],
    m.round,
    m["@round"],
    m.round_id,
    m.round_number,

    // sometimes embedded strings like "Matchweek 23" / "Round 23"
    m.round_name,
    m.week_name,
    m.name,
    m["@name"],
  ];

  for (const c of candidates) {
    const n = toInt(c);
    if (n !== null && n > 0) return n;

    // If it's a label string, try to parse a number out of it
    if (typeof c === "string") {
      const s = c.trim();
      const match = s.match(/(?:mw|md|matchweek|matchday|round|week)\s*([0-9]{1,3})/i);
      if (match?.[1]) {
        const parsed = toInt(match[1]);
        if (parsed !== null && parsed > 0) return parsed;
      }
    }
  }

  return null;
};

const extractMatchDateTime = (m: AnyMatch): { date?: string; time?: string } => {
  // for your sidebar header range + sorting
  // common Goalserve shapes:
  // m["@date"]="2026-01-24" m["@time"]="15:00"
  // or m.date, m.time
  const date = (m["@date"] ?? m.date ?? m.match_date ?? "").toString().trim() || undefined;
  const time = (m["@time"] ?? m.time ?? m.match_time ?? "").toString().trim() || undefined;
  return { date, time };
};

const isFinishedOrScheduled = (m: AnyMatch): boolean => {
  // Use whatever you already use. This is conservative.
  const status = String(m["@status"] ?? m.status ?? "").toLowerCase();
  return (
    status.includes("scheduled") ||
    status.includes("not started") ||
    status.includes("fixture") ||
    status.includes("ft") ||
    status.includes("full") ||
    status.includes("finished") ||
    status.includes("played") ||
    status.includes("half") ||
    status.includes("live") ||
    // if no status but it has teams, keep it
    (!!(m.localteam || m.visitorteam || m.hometeam || m.awayteam))
  );
};

export function buildMatchweekModel(allMatches: AnyMatch[]) {
  // 1) Filter out junk
  const matches = (allMatches ?? []).filter((m) => m && typeof m === "object" && isFinishedOrScheduled(m));

  // 2) Group by normalized key MW{n}
  const matchesByRound: Record<string, AnyMatch[]> = {};
  for (const m of matches) {
    const n = extractRoundNumber(m);
    if (!n) continue;

    const key = `MW${n}`;
    if (!matchesByRound[key]) matchesByRound[key] = [];
    matchesByRound[key].push(m);
  }

  // 3) Sorted round keys by numeric
  const rounds = Object.keys(matchesByRound)
    .map((k) => ({ k, n: toInt(k.replace("MW", "")) ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => a.n - b.n)
    .map((x) => x.k);

  // 4) Determine default: latest round that has ANY matches (or prefer latest scheduled if present)
  //    Strategy:
  //    - pick latest round that contains a "scheduled" match, else latest round
  let defaultSelectedRound = rounds[rounds.length - 1] ?? null;

  const hasScheduled = (m: AnyMatch) => {
    const status = String(m["@status"] ?? m.status ?? "").toLowerCase();
    return status.includes("scheduled") || status.includes("not started") || status.includes("fixture");
  };

  for (let i = rounds.length - 1; i >= 0; i--) {
    const r = rounds[i];
    const arr = matchesByRound[r] ?? [];
    if (arr.some(hasScheduled)) {
      defaultSelectedRound = r;
      break;
    }
  }

  // 5) Sort matches within each round by date/time (optional but nice)
  for (const r of rounds) {
    matchesByRound[r].sort((a, b) => {
      const A = extractMatchDateTime(a);
      const B = extractMatchDateTime(b);
      const adt = `${A.date ?? ""} ${A.time ?? ""}`.trim();
      const bdt = `${B.date ?? ""} ${B.time ?? ""}`.trim();
      return adt.localeCompare(bdt);
    });
  }

  // 6) Prev/Next helpers (use these in your toggle)
  const getRoundIndex = (roundKey: string) => rounds.indexOf(roundKey);

  const getPrevRound = (roundKey: string) => {
    const idx = getRoundIndex(roundKey);
    if (idx <= 0) return null;
    return rounds[idx - 1];
  };

  const getNextRound = (roundKey: string) => {
    const idx = getRoundIndex(roundKey);
    if (idx < 0 || idx >= rounds.length - 1) return null;
    return rounds[idx + 1];
  };

  const roundLabel = (roundKey: string, labelPrefix = "Matchweek") => {
    const n = toInt(roundKey.replace("MW", ""));
    return `${labelPrefix} ${n ?? ""}`.trim();
  };

  return {
    rounds, // ["MW1",...]
    matchesByRound, // { MW23: [...] }
    defaultSelectedRound, // e.g. "MW23"
    getPrevRound,
    getNextRound,
    roundLabel,
  };
}

/**
 * QUICK USAGE (example):
 *
 * const model = useMemo(() => buildMatchweekModel(fixtures), [fixtures]);
 * const [selectedRound, setSelectedRound] = useState<string | null>(null);
 *
 * useEffect(() => {
 *   if (!selectedRound && model.defaultSelectedRound) setSelectedRound(model.defaultSelectedRound);
 * }, [selectedRound, model.defaultSelectedRound]);
 *
 * const fixturesForRound = selectedRound ? (model.matchesByRound[selectedRound] ?? []) : [];
 *
 * const prev = selectedRound ? model.getPrevRound(selectedRound) : null;
 * const next = selectedRound ? model.getNextRound(selectedRound) : null;
 *
 * // Buttons:
 * // disabled={!prev} onClick={() => prev && setSelectedRound(prev)}
 * // disabled={!next} onClick={() => next && setSelectedRound(next)}
 *
 * // Label:
 * // model.roundLabel(selectedRound ?? "MW1", "Matchweek")
 */

---

You are working in my Replit project (Football Mad). IMPORTANT: do NOT run tests, do NOT generate regression videos, do NOT add test scripts, do NOT add debug endpoints/log spam. I will manually test in the UI and with curl.

GOAL:
1) Fix Premier League “no fixtures” in Tables > Leagues sidebar Matchweek toggle by building matchesByRound from Goalserve EPL XML week blocks (<week number="1..38">) and returning MW1..MW38 correctly.
2) Fix Conference League Matchday toggle so it can toggle backwards (ensure rounds are sorted and navigation uses correct ordering).

CONSTRAINTS:
- Surgical edits only.
- Keep existing UI layout.
- No refactors across unrelated areas.

BACKEND FIX (Premier League / leagues in general):
In server/routes.ts, find the existing league standings/fixtures API that Tables > Leagues uses (the response object that includes standings + matchesByRound + defaultMatchweek; tables.tsx reads standingsData?.matchesByRound and standingsData?.defaultMatchweek).

Update that endpoint so that for leagues it builds matchesByRound from Goalserve soccerfixtures XML (NOT json=1):
- Determine the Goalserve league id already used for the league standings (for EPL it’s 1204).
- Fetch: https://www.goalserve.com/getfeed/${GOALSERVE_FEED_KEY}/soccerfixtures/leagueid/${LEAGUE_ID}
- Parse XML using the same XML parser approach already used elsewhere in routes.ts (fast-xml-parser or existing helper).
- Extract week blocks:
  - The structure is: <week number="1"> ... <match ...> ... </match> ... </week>
  - In parsed object form it may look like: tournament.week[] with @number, and each week has match (array or single).
- For each week:
  - roundKey = `MW${weekNumber}`
  - parse each match using the existing match parsing helper you already built for cups/europe (use robust getAttr/getAny style that checks @_, @, direct keys, etc).
  - Ensure each match includes:
    id, home{id,name}, away{id,name}, score (null if no score), status, kickoffDate (YYYY-MM-DD), kickoffTime (HH:mm or null)
  - Put into matchesByRound[roundKey] array.

Return in the league endpoint response:
- rounds: array of { key: "MW1", label: "Matchweek 1", order: 1 } ... up to the last week present in the XML.
- matchesByRound: Record<string, LeagueMatchInfo[]>
- defaultMatchweek: pick the most sensible “current/latest” week:
  - Choose the highest MW where at least one match has status NOT in ["FT","AET","Pen.","PEN","After Extra Time","Full-Time"] (i.e. upcoming/in progress), OR where kickoffDate is within the next 14 days from today.
  - If none match that, fall back to the highest MW that has any matches.
This prevents defaulting to MW38 just because it exists.

IMPORTANT: Do not break Europe endpoints; this change is ONLY for the Leagues endpoint used by tables.tsx.

FRONTEND FIX (Conference League toggle backwards):
In client/src/components/tables/europe-progress.tsx:
- Ensure the rounds list used for the RoundToggle is ALWAYS sorted in chronological order:
  - Matchdays: MD1..MD8 ascending
  - Then KO stages: PO, L16, QF, SF, Final (or whatever keys you already use) in proper order
- Ensure RoundToggle “prev” and “next” operate on that sorted array (no reverse ordering that would prevent going back).
- Do NOT change layout, just ensure the ordering + index math is correct so you can go backwards on Conference League.

SMALL SAFETY:
In client/src/pages/tables.tsx (Leagues tab):
- Keep the existing “Priority: URL param > defaultMatchweek from API > last round”.
- Ensure leagueRounds derives from the API rounds keys (MW1..MW38) and is sorted numerically ascending.
- Ensure if selectedRound is empty, it sets to `MW${defaultMatchweek}` if present.

DELIVERABLE:
Make the edits and ensure:
- EPL now shows fixtures and toggles across MW1..MW38.
- Conference League can toggle backwards across matchdays that exist.
Do not run tests. Do not add scripts. I will verify manually.

---

DO NOT run tests, regression videos, or long QA scripts. Just implement the change.

We already have /api/standings returning matchesByRound MW1..MW38 for EPL, but each match has home/away name "TBD" and score null even when status is FT. The Goalserve EPL XML uses:
<match ... status="FT" date="DD.MM.YYYY" time="HH:mm">
  <localteam name="West Ham" score="3" ft_score="3" et_score="" pen_score="" id="9427" />
  <visitorteam name="Sunderland" score="1" ft_score="1" et_score="" pen_score="" id="9384" />
</match>

Fix the LEAGUE fixtures parsing inside /api/standings so it correctly reads localteam/visitorteam (and also keep existing hometeam/awayteam support for other feeds).

Implementation details (server/routes.ts or wherever league fixtures parsing happens):
1) When building LeagueMatchInfo (or equivalent), set:
- home.name from localteam['@_name'] OR localteam['@name'] OR localteam.name OR localteam['name'] (same for away via visitorteam)
- home.id from localteam['@_id'] OR localteam['@id'] OR localteam.id (same for away)
2) Score parsing:
- If status indicates played (FT, AET, Pen., etc.) OR localteam/visitorteam have score/ft_score:
  - Prefer ft_score if present and non-empty, else score.
  - Set match.score = { home: int, away: int } (or homeScore/awayScore depending on your model).
3) Kickoff:
- Keep existing kickoffDate/kickoffTime logic (it’s already correct).
4) Ensure we never default home/away to "TBD" if a name exists on localteam/visitorteam.
5) Do not change any UI in this prompt.

After change, calling /api/standings?leagueId=1204&season=2025/2026 should produce matches where MW23 sample has:
home.name "West Ham", away.name "Sunderland", score {home:3, away:1}, status "FT".

---

You are Replit AI working inside this repo. Make ONLY the code changes described below, keep them surgical, and DO NOT run any automated tests or long “testing scripts”. Just implement + let me manually verify in the browser.

GOAL
1) Premier League (and all leagues) should default to the “current” matchweek (or next upcoming), NOT MW38.
2) League fixtures list should show a status badge (Full-Time / Live / Scheduled etc) like Europe, for consistency.

CONTEXT (what we know is true)
- Goalserve EPL fixtures XML uses <week number="X"> and match has attributes like: <match date="24.01.2026" time="12:30" status="FT"> and <localteam name="West Ham" score="3" .../> <visitorteam name="Sunderland" score="1" .../>
- /api/standings already returns matchesByRound keyed MW1..MW38 and also returns defaultMatchweek.
- Frontend tables page uses: client/src/pages/tables.tsx and selects default with:
  const defaultMatchweek = standingsData?.defaultMatchweek ?? 1;
  const defaultKey = `MW${defaultMatchweek}`;
- Europe UI shows status chips (Full-Time etc). Leagues should too.

PART A — BACKEND: smarter defaultMatchweek
Find the /api/standings endpoint implementation (server side). It currently sets defaultMatchweek in a “max round number” way or similar.
Replace that with date-aware logic:

Definition:
- “Now” = current server time.
- A match is “upcomingOrLive” if:
  - status indicates live/playing OR
  - kickoff datetime is >= now OR
  - status is empty/unknown but kickoff datetime is >= now
- Choose defaultMatchweek as:
  1) the LOWEST MW number that contains any upcomingOrLive match
  2) else (season over): the HIGHEST MW number that contains any matches
  3) else fallback 1

Implementation details:
- Parse kickoff datetime from the match object you already build (kickoffDate + kickoffTime). If kickoffTime missing, treat as 00:00.
- Normalize statuses:
  - FT => finished
  - HT or a minute like "67'" or "LIVE" => live
  - anything else => scheduled/unknown
- IMPORTANT: do NOT break Europe/Cups behaviour. Only change the league standings response defaultMatchweek selection, using the already-produced matchesByRound object.

PART B — BACKEND: ensure match objects include proper names + scores
Right now leagues are sometimes showing “TBD 0-0 TBD”. We already proved the XML has name/score on attributes:
- localteam name="West Ham" score="3"
- visitorteam name="Sunderland" score="1"
Ensure your XML parsing maps those attributes into the API match objects:
- match.home.name = localteam@name (or name)
- match.away.name = visitorteam@name (or name)
- match.homeScore / awayScore OR a score object should be populated when status indicates played (FT, LIVE, HT) if score attributes exist.
- Preserve match.id from <match id="..."> attribute.
- Preserve status from <match status="...">.

Do not invent “TBD” unless the source name is truly missing.

PART C — FRONTEND: show status badge in league fixtures list
In client/src/pages/tables.tsx (or whichever component renders the league fixtures list on the right), add a status badge like Europe:
- If match.status is FT => show “Full-Time”
- If match.status is HT => show “Half-Time”
- If match.status indicates live (e.g. contains "'" or equals LIVE) => show “Live”
- Else show “Scheduled” (or show nothing for scheduled if you prefer, but user asked for consistency so better to show Scheduled)

Also:
- If match is FT/HT/LIVE and scores exist, show the score (homeScore-awayScore).
- If Scheduled and no scores, show kickoff time as it does now.

Use the existing Badge component pattern already used in Europe (search for “Full-Time” or Badge usage in europe-progress.tsx and mirror that style in the league fixtures rendering).

PART D — QUICK CHECKS (no automated testing, just reasoning)
- Default landing on Premier League should pick the current/next matchweek based on dates, not MW38.
- MW toggle left/right should still work.
- League fixtures should no longer be “TBD 0-0 TBD” (they should show real teams and scores where available).
- Status badge should display on league fixtures rows similar to Europe.

DELIVERABLE
- Apply edits and save files.
- Print a short summary of which files you changed and the key logic change.
- Do NOT run tests, do NOT run long scripts, do NOT add debug spam logs.

---

Implement the UI changes below ONLY. Keep it surgical. Do NOT run tests or long scripts; I will verify manually.

GOAL
League fixtures (Tables > Leagues) should match this layout:
- For completed/live matches: show a status pill (Live + minute if available, Half-Time, Full-Time) ABOVE the row.
- The scoreline should be inline between team names (Home 2–1 Away).
- For scheduled matches: remove status pill entirely and replace score with kickoff time inline between team names (Home 15:00 Away).
- Remove “Scheduled” pill completely.

SCOPE
Update the League fixtures rendering in: client/src/pages/tables.tsx (or wherever LeagueMatchRow / league fixtures list is defined).
Do not change Europe components unless you must.

REQUIREMENTS

1) STATUS PILL (only for Live/HT/FT)
- Render a pill ONLY when status indicates: Live, Half-Time, Full-Time (or equivalents currently supported).
- Put the pill in its own line ABOVE the row content (aligned nicely, not inside the scoreline).
- For Live: include minute if available (examples: "Live 67'", "Live 90+2").
  - Extract minute from any of:
    - match.minute
    - match.time
    - match.status if it contains digits like 67 or 90+2 (use a regex)
  - If no minute is found, use “Live”.
- Keep existing variants/styling for Live/HT/FT; just reposition and improve label text.

2) ROW CONTENT (single line)
- Always render: Home team name — middle — Away team name
- Middle section rules:
  a) If match is completed/live/HT:
     - show score inline, e.g. "2 - 1"
     - Use existing score fields already in the model (don’t invent).
  b) If match is scheduled (no FT/HT/Live):
     - show kickoff time inline instead of score, e.g. "15:00"
     - If kickoffTime missing, fall back to "TBC".
- Remove any "Scheduled" text/badge anywhere.

3) ORDERING (keep from previous instruction if already implemented)
- Ensure matches within a selected matchweek are sorted by kickoff datetime ascending before rendering.
- kickoff datetime = kickoffDate + kickoffTime (use 00:00 if missing).

4) KEEP EXISTING DATA MODEL
- Do not change API contracts.
- Only adjust frontend presentation + minor helper functions.

DELIVERABLE
- Update the relevant component(s).
- Keep styling consistent with existing UI (spacing, typography).
- Output a short summary: files changed + what changed.

---

You are working in this repo. Make surgical changes only. Implement the following fixes end-to-end and ensure the app builds.

GOAL
- Leagues fixtures widget should only show pills for: LIVE(+minute if available), HT, FT, PSTP.
- Scheduled fixtures should NOT show a pill. Instead:
  - For scheduled fixtures: show the kickoff TIME in the middle (replacing scoreline).
  - Show the DATE label above the row (e.g. "Sun 1 Feb") whenever needed to avoid ambiguity (especially if the round spans multiple dates).
- Postponed fixtures should show a PSTP pill (and still show the fixture teams). If kickoff date/time is present, show it as normal, but the PSTP pill must communicate postponement.
- Default matchweek selection must be per-league and must NOT be skewed by postponed fixtures. Postponed (PSTP) matches must not count as "upcoming/live" when picking the default round.
- Matchweek header date range must not be distorted by postponed fixtures. When calculating the header range, ignore postponed fixtures unless the entire round is postponed.
- IMPORTANT: Fix/avoid the React hooks error "Rendered more hooks than during the previous render" by ensuring no hooks (useMemo/useEffect/useState) are declared inside nested render functions or conditionals.

FILES TO CHANGE
1) server/routes.ts (or wherever /api/standings is implemented)
2) client/src/pages/tables.tsx (league fixtures widget rendering + header date range)
(Only touch other files if absolutely necessary.)

BACKEND CHANGE (server/routes.ts)
In the logic that computes defaultMatchweek (or default round key):
- Introduce helpers:
  - isLiveStatus(status): true for values like "LIVE", "HT", "1H", "2H", "ET", "BT" etc if you currently support these
  - isFinishedStatus(status): true for "FT", "AET", "PEN" etc
  - isPostponedStatus(status): true for "PSTP" plus any Goalserve postponed variants you see in the codebase
- When selecting the default round:
  - Sort round keys ascending by their numeric part (MW1..MW46 etc)
  - Find the earliest round that has ANY match that is (LIVE) OR (scheduled in the future) BUT NOT postponed:
    - A match counts as "scheduled/upcoming" if kickoff >= now AND NOT isPostponedStatus(status) AND NOT isFinishedStatus(status)
    - A match counts as "live" if isLiveStatus(status) AND NOT isPostponedStatus(status)
  - If none found, fall back to the latest round that has any match (season completed scenario)
- Return defaultMatchweek consistently as a number (e.g. 24), derived from the chosen MW key.
- Keep response compatibility: do not remove existing fields like matchesByRound, rounds, leagueRounds, etc.

FRONTEND CHANGE (client/src/pages/tables.tsx)
A) Remove any useMemo/useEffect/useState from nested render helpers (e.g. renderLeaguesContent). If there’s currently a useMemo inside a function, replace it with a plain const calculation.

B) Add status helpers for league fixture rows:
- isLeagueMatchPostponed(status): status indicates PSTP
- formatLeagueStatusShort(status, minute?): return "LIVE 63'" for live, "HT" for half-time, "FT" for full-time, "PSTP" for postponed. Keep it short like the screenshot (FT).
- Decide pill variant mapping (neutral/secondary is fine). We only render a pill for LIVE/HT/FT/PSTP.

C) Row layout rules for the Fixtures list (right-side widget):
- For completed/live/postponed matches:
  - Show pill ABOVE the row, centered (like current FT pill).
  - Show team names left/right with the scoreline in the middle for completed/live.
  - For postponed: show teams + (optionally) show time in the middle if kickoff time exists, otherwise "TBD". Do NOT show a score.
- For scheduled matches:
  - No pill.
  - Put kickoff TIME in the middle (replacing scoreline).
  - Show a DATE label above the row when needed:
    - If the round contains fixtures across multiple dates (ignoring postponed), show the date label for each scheduled fixture row (e.g. "Sun 1 Feb").
    - If all scheduled fixtures are on the same day, you may show the date label once above the first scheduled fixture row (or still per-row; either is acceptable, but must prevent the "16:30 then 20:00 looks same day" confusion).

D) Matchweek header date range (the small text under "Matchweek X"):
- Currently it’s getting stretched (e.g. "6 Sept – 10 Feb") because a postponed fixture has a far-future kickoff.
- Fix by computing the range using NON-postponed fixtures first:
  - Consider matches where kickoffDate exists AND NOT isLeagueMatchPostponed(status)
  - If that list is empty (entire round postponed), fall back to using all matches with kickoffDate
- Use min/max of that list to build the range:
  - If same day: show single date (e.g. "1 Feb")
  - If multiple days: show "31 Jan – 2 Feb"
- Ensure the per-row date labels (above scheduled fixtures) use the same date formatting (e.g. "Sun 1 Feb").

E) Minute display for LIVE:
- If your match object has minute/timer anywhere, append it like "LIVE 63'". If not available, show "LIVE" only.

TESTS / MANUAL CHECKS
- Premier League should still default correctly.
- Championship / League One / League Two should now default to their actual current round (not inherited from ?round=MW24).
- Postponed fixtures should show PSTP pill and should not distort round header date range.
- No hooks error overlay.

DELIVERABLE
- Implement the changes with clean, readable code.
- After changes, print a short summary of what you changed and where.

---

You are working in a repo with a backend route /api/standings that returns matchesByRound and a default/latest round key. We have an issue: in lower leagues (Championship/League One/League Two), postponed fixtures remain tagged to their original matchweek, so our current “pick earliest round with any upcoming match” logic defaults to very early matchweeks (e.g., MW7) if a postponed game is replayed months later. This also causes the matchweek date label to show huge ranges like “6 Sep – 10 Feb”.

Implement the following fixes:

PART A — Backend: robust default round selection
File: server/routes.ts (or wherever /api/standings is implemented)

1) Replace the current default matchweek selection logic with a “cluster around now” approach:

- Parse kickoff datetime from match.kickoffDate + match.kickoffTime (if time missing, assume "00:00").
- Define helper functions:
  - isLiveStatus(status): true for statuses like "LIVE","HT","1H","2H" (keep existing live detection)
  - isPostponedStatus(status): true for "PSTP","POSTP","PPD" (include whatever exists in our feed)
  - parseKickoffDatetime(match): returns Date|null
- Define a scoring window around now:
  - windowStart = now - 24 hours
  - windowEnd   = now + 72 hours
  (this intentionally ignores single postponed games weeks/months away)

For each round key in matchesByRound:
- Build an array of matches for that round.
- Compute:
  - liveCount = matches where isLiveStatus(status)
  - inWindowCount = matches where kickoffDateTime exists AND kickoff between windowStart and windowEnd
  - score = (liveCount * 1000) + (inWindowCount * 10)
- Choose the round with the HIGHEST score.
- Tie-breaker: choose the round whose nearest kickoff datetime is closest to now.

Fallbacks:
- If ALL rounds have score = 0:
  - Find the next upcoming kickoff across ALL rounds (kickoff >= now) and select that match’s round.
  - If no future matches exist, select the latest round (highest MW number) that has any matches.

Return fields should remain backward compatible:
- Keep returning latestRoundKey/latestScheduledRoundKey/latestActiveRoundKey if they exist today
- Add/keep a single “defaultRoundKey” (or whatever the frontend uses) that uses the new selection algorithm

IMPORTANT: Do not let a single postponed fixture weeks/months away force the default round.

PART B — Frontend: matchweek header date label
File: client/src/pages/tables.tsx (fixtures side widget)

We currently show a matchweek “range” under the Matchweek title (min date – max date). This looks wrong for EFL because rearranged fixtures create huge spans.

Change the label rule:
- Compute minKickoffDate and maxKickoffDate for matches in the selected round (ignore matches with null kickoffDate).
- If min/max are the same day: show that single day (e.g., "Sun 1 Feb")
- If the span is <= 3 days: show range (e.g., "31 Jan – 2 Feb")
- If span is > 3 days: show "Various dates" (or "Multiple dates")
This should fix “6 Sep – 10 Feb” style labels.

PART C — Frontend: show PSTP pill
In the fixtures list row rendering:
- Add a status pill for postponed matches, showing "PSTP" (or "Postponed" if we prefer short vs long; use PSTP for consistency with FT)
- For postponed matches:
  - Show the pill above the row (same position as FT)
  - Keep the center value as kickoff time if we have it; if time is missing, show "TBC"
  - Do NOT treat postponed as scheduled in a way that hides its status
- Ensure existing FT/HT/LIVE behaviour remains unchanged.

PART D — Regression checks
- Premier League should still default correctly (current MW)
- Championship/League One/League Two should default to the matchweek that has the bulk of fixtures in the next 72 hours (or live)
- The matchweek date label should not show massive ranges; should show "Various dates" when appropriate
- Postponed matches should display PSTP pill

Make changes surgically, keep styling consistent with existing shadcn Badge usage, and do not introduce conditional hooks (avoid useMemo inside conditional renders).

---

We are simplifying the Tables page product logic.

DECISION:
Only these competitions should show a round-based fixtures widget:

• Premier League → label: “Matchweek”
• Champions League → label: “Matchday”
• Europa League → label: “Matchday”
• Conference League → label: “Matchday”

ALL OTHER LEAGUES (Championship, League One, League Two, National League, etc) should NOT use any Matchweek/Matchday/Round logic.

Instead, they should show:
• League table as normal
• Fixtures list in simple chronological order (upcoming + recent)
• NO round header
• NO round navigation arrows
• NO “Matchweek X” or “Round X” labels

---

FRONTEND CHANGES (tables page)

1. Create a helper:

const competitionRoundMode = (leagueSlug: string) => {
  if (leagueSlug === "premier-league") return "matchweek";
  if (["champions-league","europa-league","conference-league"].includes(leagueSlug)) return "matchday";
  return null;
};

2. Use this to conditionally render the round widget:

const roundMode = competitionRoundMode(activeLeagueSlug);

If roundMode === null:
  • Hide the entire Fixtures round header block
  • Hide round navigation chevrons
  • Hide round label
  • Instead, render fixtures as a flat list sorted by kickoff datetime:
      - Upcoming first (ascending date)
      - Then recent completed matches (descending date)
  • Keep existing fixture row design (status pill, scoreline, kickoff time)

If roundMode !== null:
  • Keep existing Matchweek / Matchday widget exactly as-is
  • Only change the label text dynamically:
      roundMode === "matchweek" → "Matchweek"
      roundMode === "matchday" → "Matchday"

3. Remove any logic that tries to compute default rounds for non-PL / non-European competitions.

4. Make sure this does NOT affect:
  • Premier League matchweek navigation
  • European matchday navigation

---

BACKEND CHANGES

1. Do NOT compute or return "latestRoundKey" or "latestActiveRoundKey" for leagues other than:
   • Premier League
   • Champions League
   • Europa League
   • Conference League

2. For all other leagues, just return fixtures normally without grouping logic.

---

GOAL RESULT

• Premier League still shows “Matchweek 24”
• Champions League shows “Matchday 6”
• Championship, League One, League Two etc:
   → Show fixtures list only
   → No Matchweek header
   → No broken date ranges

Keep all existing styles.
Make minimal changes.
Add comments explaining this is an intentional product decision.

---

We are simplifying the Tables page further.

DECISION:
Only these competitions should show the right-hand fixtures column (Upcoming Fixtures + Recent Results):

• Premier League
• Champions League
• Europa League
• Conference League

ALL OTHER leagues/competitions should NOT show the right-hand column at all.

EXPECTED UI:
- For excluded leagues, the league table becomes full-width (use the space where the right column used to be).
- Remove/hide BOTH cards: “Upcoming Fixtures” and “Recent Results”.
- Remove/hide any container/wrapper spacing reserved for the right column so there is no blank gap.
- Keep the top tabs/filters unchanged.

IMPLEMENTATION:
1) Create a helper like:

const hasFixturesSidebar = (leagueSlug: string) =>
  leagueSlug === "premier-league" ||
  ["champions-league","europa-league","conference-league"].includes(leagueSlug);

2) In tables page layout:
- If hasFixturesSidebar(activeLeagueSlug) is true:
   render current 2-column layout (table left + fixtures sidebar right) unchanged.
- Else:
   render a 1-column layout (table only) and DO NOT render the fixtures sidebar components at all.

3) Make minimal changes; do not alter Premier League or European competitions behaviour.

Add short comment in code explaining this is an intentional product decision until round logic is improved.

---

Bug: Championship standings missing 4th place (Ipswich). The UI shows 1,2,3,5...
We confirmed /api/standings uses leftJoin(teams), so the API is not dropping rows.
The ingestion job server/jobs/upsert-goalserve-standings.ts is skipping rows when teamId cannot be mapped:
  console.warn(`[StandingsIngest] Skipping row for gsTeamId=... - no teamId found`);

Fix: NEVER skip a standings row just because teamId is missing. Insert it with teamId = null and preserve teamName from Goalserve.

Steps:
1) Open server/jobs/upsert-goalserve-standings.ts and locate the code path that builds rowsToInsert / standingsRows entries.
2) Find the block that does:
   - if (!teamId) { console.warn(...); continue; }
3) Replace it so that we still create/insert the standings row with:
   - teamId: null
   - teamGoalserveId: gsTeamId (still stored)
   - teamName: the name from the Goalserve feed (store this in standingsRows if not already)
   - position, played, wins, draws, losses, goalsFor, goalsAgainst, goalDifference, points, recentForm, etc.

4) Ensure the public endpoint /api/standings returns a teamName even when no team join exists:
   - In server/routes.ts where /api/standings selects fields from standingsRows and leftJoin(teams),
     include a teamName field using a safe fallback:
       teamName: coalesce(teams.name, standingsRows.teamName)
   - (If standingsRows.teamName doesn’t exist in schema, add it to @shared/schema and populate it during ingest.)

Deliverable:
- After running standings ingest for leagueId=1205, Championship table shows contiguous positions including 4th.
- No standings rows are skipped because teamId is missing.
- Keep UI unchanged.

---

We need to add a safety check to prevent incomplete Goalserve standings tables from being saved.

GOAL:
Abort the standings ingestion if Goalserve returns fewer teams than expected for a league (for example, 23 instead of 24 in the Championship). This prevents broken tables overwriting good data.

FILE TO EDIT:
server/jobs/upsert-goalserve-standings.ts

INSTRUCTIONS:

1. Locate where the team rows from the Goalserve standings feed are parsed into an array.
   It will look something like:
   const teamRows = ...

2. Immediately AFTER that logic (before any DB writes or snapshot inserts), add this guard:

// 🚨 SAFETY CHECK: Prevent saving incomplete standings tables
const MIN_EXPECTED_TEAMS: Record<string, number> = {
  "1204": 20, // Premier League
  "1205": 24, // Championship
  "1206": 24, // League One
  "1207": 24, // League Two
};

const minTeams = MIN_EXPECTED_TEAMS[leagueId] || 10;

if (teamRows.length < minTeams) {
  console.warn(
    `[StandingsIngest] ABORTED — leagueId=${leagueId} season=${season} teams=${teamRows.length} (expected at least ${minTeams})`
  );

  return {
    ok: false,
    skipped: true,
    reason: "Too few teams returned from Goalserve feed — possible partial data",
    teamCount: teamRows.length,
  };
}

3. Do NOT change any other logic.
   Do NOT modify hashing, inserts, updates, or mapping logic.
   We are only adding this safety guard.

EXPECTED RESULT:
If Goalserve ever returns a partial standings table, ingestion will abort and the previous valid snapshot will remain live.

---

We are doing a SMALL UI CLEANUP only.

🚫 DO NOT run regression tests  
🚫 DO NOT generate preview videos  
🚫 DO NOT simulate user flows  
🚫 DO NOT create test files  
🚫 DO NOT run Playwright, Cypress, or any browser automation  
🚫 DO NOT run the app after editing  

I will manually test after deployment.

Only edit the specified files and stop.

====================================================
TASK: Remove the unused "Overall" dropdown
====================================================

This is a DESIGN CLEANUP ONLY.
It must NOT affect standings data, Goalserve ingestion, or table rendering.

FILES TO EDIT:
client/src/components/tables/tables-filters.tsx  
client/src/pages/tables.tsx

----------------------------------------------------
STEP 1 — UPDATE tables-filters.tsx
----------------------------------------------------

1. Remove ANY state related to table view, for example:
   - tableView
   - setTableView

2. Remove props related to table view:
   - tableView
   - onTableViewChange
   - topTab (if only used for Overall/Home/Away)

3. Delete the dropdown JSX that renders:
   "Overall", "Home", "Away"

4. Ensure the component ONLY renders:
   - Season dropdown

Example final structure:

return (
  <div className="flex items-center gap-3">
    <SeasonDropdown ... />
  </div>
);

----------------------------------------------------
STEP 2 — UPDATE tables.tsx
----------------------------------------------------

1. Remove any state like:
   const [tableView, setTableView] = useState("overall");

2. Remove props being passed into TablesFilters:
   tableView={tableView}
   onTableViewChange={setTableView}
   topTab={...}

3. Ensure TablesFilters is used like:

<TablesFilters
  season={season}
  onSeasonChange={setSeason}
/>

----------------------------------------------------
IMPORTANT RULES
----------------------------------------------------

DO NOT:
- Change LeagueTable component
- Change API calls
- Change standings mapping
- Change Goalserve logic
- Add tests
- Run tests
- Run preview browser
- Generate test videos

Only edit the two files listed and stop.

----------------------------------------------------
EXPECTED RESULT
----------------------------------------------------

• "Overall" dropdown disappears  
• Season selector remains  
• Table still loads exactly the same data  
• No change to standings behaviour  
• No tests or previews executed  

---

We need the Season dropdown on the Tables page to control ALL leagues/cups/europe tables, and to update the SEO URL.

🚫 DO NOT run regression tests
🚫 DO NOT generate preview videos
🚫 DO NOT add tests or run Playwright/Cypress
I will test manually after deployment.

CURRENT URL FORMAT:
 /tables/{league-slug}/{season}
Example: /tables/championship/2023-24

GOAL BEHAVIOUR:
- Selecting a season updates the URL and becomes the single source of truth.
- Switching competition tabs keeps the same season.
- The page fetches standings for (activeLeagueSlug + season) every time.
- Season selection must apply globally (Leagues/Cups/Europe tabs).

FILES LIKELY INVOLVED:
client/src/pages/tables.tsx
client/src/components/tables/tables-filters.tsx
client/src/lib/urls.ts (if it has builders)
client/src/lib/league-config.ts (for goalserveLeagueId mapping)
server/routes.ts (/api/standings already supports season param)

IMPLEMENTATION REQUIREMENTS:

1) Tables page should read `leagueSlug` and `season` from the route (React Router).
   - If season is missing, redirect to current season (e.g. 2025-26).
   - Season is stored as URL segment like "2023-24" (not "2023/24").

2) Season dropdown:
   - Displays labels like "2025/26", "2024/25", etc.
   - On change, NAVIGATE to `/tables/${activeLeagueSlug}/${newSeasonSlug}`
     where seasonSlug is "YYYY-YY" (e.g., 2024-25).

3) Competition tabs (Premier League, Championship, etc.):
   - On change, NAVIGATE to `/tables/${newLeagueSlug}/${currentSeasonSlug}`.
   - Do NOT reset season on league change.

4) Data fetch:
   - Wherever tables.tsx calls the API for standings, include season from URL.
   - Use goalserveLeagueId from league-config for the active league slug.
   - Call `/api/standings?leagueId=${goalserveLeagueId}&season=${seasonParam}`

5) Season param normalization:
   - The API expects a season string consistent with what standings ingestion uses.
   - Implement a small helper:
       seasonSlugToApiSeason("2024-25") => "2024-25" (or whatever server expects)
   - Keep it consistent across client and server. Avoid mixing "2024/25" vs "2024-25" in requests.

DELIVERABLE:
- Season dropdown updates the URL.
- Switching between leagues/cups/europe retains the season.
- Standings shown match the selected season (once backfilled).
- No change to fixtures sidebar rules.

---

We need to backfill Goalserve standings for previous seasons so the Tables season dropdown works.

🚫 DO NOT run regression tests
🚫 DO NOT generate preview videos
🚫 DO NOT add tests or run Playwright/Cypress
I will test manually after deployment.

DATA MODEL:
We store standings in standingsSnapshots + standingsRows.
The public endpoint /api/standings reads the latest snapshot for (leagueId, season).

GOAL:
Create a dev-only backfill job that ingests standings for a list of leagueIds and seasons:
- 2024-25
- 2023-24
- 2022-23
(leave 2025-26 as normal current)

FILES:
server/jobs/upsert-goalserve-standings.ts (already exists)
server/routes.ts (add a dev-only endpoint)

IMPLEMENTATION:

1) Add a new job file:
   server/jobs/backfill-standings.ts

2) It should:
   - Accept:
       seasons: string[] (default ["2024-25","2023-24","2022-23"])
       leagueIds: string[] (default the leagueIds we support on Tables, read from config or a hardcoded list for now)
       force: boolean (default true)
   - For each (leagueId, season):
       await upsertGoalserveStandings(leagueId, { seasonParam: season, force: true })
   - Log progress and return a summary:
       total, okCount, failCount, failures[]

3) Add a DEV endpoint in server/routes.ts:
   GET /api/jobs/backfill-standings
   Query params:
     seasons=2024-25,2023-24,2022-23
     leagues=1204,1205,1206,1207,... (optional)
     force=true|false
   If params omitted, use defaults.

4) IMPORTANT:
   - Respect the new “too few team rows” safety guard we added earlier.
   - Backfill should not overwrite good data with incomplete snapshots.

DELIVERABLE:
- Calling /api/jobs/backfill-standings will ingest historical snapshots for the chosen seasons/leagues.
- After running it, selecting a prior season in Tables shows the correct standings.

---

REPLIT AI PROMPT — FOOTBALL MAD (Tables)

Goal: 
1) Remove the useless “Overall” dropdown from the Tables page UI.
2) Make season selection actually work for backfilled seasons (2024/25, 2023/24, 2022/23) across all supported leagues/cups on /tables/{league-slug}/{season}.
3) IMPORTANT: Do NOT run regression tests, Playwright/Cypress, or generate test videos. No automated UI testing. I will test manually post-deploy.

Context / current behaviour:
- URLs are structured: /tables/{league-slug}/{season} (no query params for league/round).
- Tables always show “latest standings” for the selected season (not by matchweek).
- When selecting a previous season, the UI currently shows “Failed to load standings”.
- Curling /api/standings with season params returns 404: “No standings snapshot found”.
- Server is running on port 5000 in dev.

Work to do:

A) Remove the “Overall” dropdown (UI cleanup)
- Find where the right-side top filters are rendered (likely client/src/components/tables/tables-filters.tsx and/or client/src/pages/tables.tsx).
- Remove the “Overall” Select / Dropdown entirely from the UI.
- Remove any related state/props like tableView / onTableViewChange / topTab etc if still present.
- Ensure the header row only shows the Season dropdown on the right.

B) Fix season switching + backfill (so /tables/* works for older seasons)
We need two fixes:
1) Normalize season formats consistently (UI label, URL season segment, API season query).
2) If a standings snapshot doesn’t exist yet for (leagueId + season), the API should ingest it on-demand (one time), then return it.

B1) Season normalization
- In the UI, the dropdown shows: 2025/26, 2024/25, 2023/24, 2022/23.
- The URL uses: /tables/{league}/{season} where season should be “YYYY-YY” like “2024-25” or “2024-25” (match current pattern “2025-26”).
- The API (/api/standings) should receive a season string that the DB + Goalserve ingest agree on.
Implement a shared helper (client + server safe) e.g.:
- toSeasonSlug("2024/25") -> "2024-25"
- fromSeasonSlug("2024-25") -> a canonical seasonKey for storage/queries, e.g. "2024-2025"
- toGoalserveSeasonParam("2024-25" or "2024/25" etc) -> "2024-2025" OR "2024/2025" (whatever your ingest expects). Pick ONE canonical format and use it everywhere.
Where to put it:
- client/src/lib/season.ts (and optionally a shared copy in shared/ if you already share helpers)

Update routing / state:
- When season dropdown changes:
  - Update the URL to /tables/{activeLeagueSlug}/{seasonSlug}
  - Trigger fetch using season derived from the URL (single source of truth).
- On page load:
  - Parse season from URL and set dropdown accordingly.

B2) API: On-demand ingest when snapshot missing
In server/routes.ts in GET /api/standings:
- Currently, it looks up the latest snapshot for (leagueId + season). If none exists, it returns 404.
Change it to:
1) Try to find a snapshot.
2) If none found:
   - Call upsertGoalserveStandings(leagueId, { seasonParam: normalizedSeason, force: true })
   - Then query again for the snapshot.
   - If still none, return 404 with a clearer error (include leagueId + season + normalizedSeason used).
3) If found, return standings rows as normal.

Notes:
- Keep throttling sensible (you already have STANDINGS_REFRESH_COOLDOWN_MS). For the “no snapshot” case, allow a one-time ingest attempt even if cooldown is present, but do NOT loop or repeatedly hammer Goalserve.
- Make sure the season stored on standingsSnapshots/standingsRows matches whatever season string you query by.
- Log one line when doing the backfill ingest so we can see it in console.

C) Manual verification steps (NO automated tests)
After code changes, do ONLY these quick manual/dev checks (no test frameworks):
1) Start dev server.
2) Open:
   - /tables/premier-league/2025-26 (should work)
   - Switch season dropdown to 2024/25 → URL becomes /tables/premier-league/2024-25 and table loads.
   - Repeat for Championship.
3) Confirm “Overall” dropdown is gone.

Deliverables:
- Commit-ready code changes implementing A + B.
- No Playwright/Cypress. No snapshots/videos.
- If you add any new helper, keep it tiny and well-named.

Go implement now.

---

We have rolled back to a commit where 2025/26 matchweeks/matchdays worked correctly. 
Your job is ONLY to add season-based gating. 

🚫 DO NOT:
- run regression tests
- generate test files
- add test frameworks
- run Playwright/Cypress
- create screenshots or videos
- add CI configs
- refactor unrelated code

Only modify the specific backend logic described below.

==================================================
PRODUCT RULES (MUST MATCH EXACTLY)
==================================================

1) Any season older than 2025/26 (e.g. 2024/25, 2023/24, 2022/23):
- Return TABLE-ONLY everywhere
- DO NOT include any of these keys in API responses:
  rounds
  matchesByRound
  defaultMatchweek
  latestRoundKey
  latestScheduledRoundKey
  defaultMatchweekReason
- DO NOT fetch Goalserve XML for these seasons

2) Season 2025/26 ONLY:

• Premier League (leagueId = "1204")
  - Keep existing matchweek + fixtures behaviour

• Champions League, Europa League, Conference League
  - Keep existing matchday + navigation behaviour

• All other leagues
  - Table-only (no matchweek/matchday, no XML fetch)

==================================================
BACKEND CHANGES (MINIMAL DIFFS ONLY)
==================================================

FILE: server/routes.ts

Inside:
app.get("/api/standings", async (req, res) => {

Add near the top:

const CURRENT_SEASON = "2025-2026";
const isCurrentSeason = seasonNorm === CURRENT_SEASON;
const isPremierLeague = leagueId === "1204";
const includeRounds = isCurrentSeason && isPremierLeague;

--------------------------------------

Wrap ALL Goalserve XML + week parsing logic inside:

if (includeRounds) {
   // EXISTING XML + rounds + matchesByRound code
}

If includeRounds is false:
- Do NOT fetch XML
- Do NOT compute rounds
- Do NOT compute matchesByRound

--------------------------------------

When building the response JSON:

Always return:
{
  snapshot,
  table
}

ONLY attach:
rounds
matchesByRound
defaultMatchweek
etc

WHEN includeRounds === true

For older seasons these keys must be COMPLETELY OMITTED (not empty, not null).

==================================================
EUROPE ENDPOINTS
==================================================

Find endpoints handling Champions League, Europa League, Conference League.

Add:

const includeMatchdays = seasonNorm === "2025-2026";

Only compute and return matchday fixtures when includeMatchdays === true.
Older seasons must return standings only.

==================================================
VERIFICATION COMMANDS (DO NOT ADD TEST FILES)
==================================================

# 2024/25 PL → should return 0
curl -s "http://localhost:5000/api/standings?leagueId=1204&season=2024/25" | grep -c '"rounds"'

# 2025/26 PL → should return >=1
curl -s "http://localhost:5000/api/standings?leagueId=1204&season=2025/26" | grep -c '"rounds"'

==================================================
IMPORTANT
==================================================

• Do NOT change working 2025/26 behaviour
• Do NOT add logging noise
• Do NOT modify frontend
• Do NOT introduce new config files
• Only small guarded conditionals

Implement exactly this and stop.

---

You are working in the Football Mad codebase.

Goal: Fix Conference League (and all Europe tables) Matchday navigation.
Current bug: Landing on Matchday 8 is correct, but clicking back from MD8 does nothing; clicking forward from MD8 jumps to MD1. We need numeric ordering and non-wrapping prev/next navigation.

Constraints:
- Do NOT run regression tests.
- Keep existing UI/UX (same buttons, same label "Matchday X").
- Fix should apply to Europe pages (UCL/UEL/UECL) where matchday navigation is shown.

What to do:
1) Find the client-side component that renders the Europe "Fixtures" Matchday selector (the one with left/right chevrons and the "Matchday X" label) on the Tables page.
   - Search in /client for "Matchday", "matchday", "fixtures", "ChevronLeft", "ChevronRight", or "No fixtures yet".
2) Ensure matchday keys are handled numerically, not lexicographically, and the array is stable:
   - If matchdays are strings like "MD8" or "matchday_8", parse the number.
   - Create a helper:
     - extractMatchdayNumber(keyOrLabel: string): number
     - sort matchdays by that number ascending.
3) Compute currentIndex safely:
   - const idx = sortedMatchdays.findIndex(md => md.key === selectedKey) (or compare on number)
   - If idx === -1, set idx to last index (so default is latest matchday).
4) Fix navigation:
   - Prev should go to idx-1 ONLY if idx > 0, otherwise do nothing (or keep disabled).
   - Next should go to idx+1 ONLY if idx < sortedMatchdays.length-1, otherwise do nothing (or keep disabled).
   - Remove any modulo/wrap logic that jumps from last -> first or first -> last.
5) Ensure the selected matchday state updates correctly and triggers fixtures re-render.

Acceptance checks (manual, no tests):
- Conference League 2025/26 loads on Matchday 8.
- Clicking left goes MD8 -> MD7 -> MD6 ... -> MD1.
- Clicking right from MD1 goes to MD2 etc.
- Clicking right from MD8 does NOT wrap to MD1.
- The left chevron is disabled on MD1, right chevron disabled on the last matchday.

Implement the change cleanly with a small helper and minimal code churn.
After implementing, tell me:
- The file(s) you edited
- The exact logic used to sort and navigate

---

You are working in the Football Mad codebase.

Decision: Remove ALL Matchday/Matchweek/fixtures panels from the Tables tab. Tables tab should show STANDINGS ONLY across all competitions and seasons.

Constraints:
- Do NOT run regression tests.
- Keep other areas (e.g. Matches page) untouched.
- Tables page layout should remain clean: Standings card should expand to full width (or use existing responsive layout).
- Do not break existing API consumers; but it’s OK to stop requesting/using rounds/matchesByRound/matchdays on the Tables page.

Tasks:

A) CLIENT (UI) — remove Fixtures/Matchday panel from Tables tab
1) Find the Tables page component(s) that render:
   - the right-hand "Fixtures" card
   - the Matchday/Matchweek navigation (chevrons and label)
   - the "No fixtures available / No fixtures yet" state
2) Remove those UI blocks entirely from the Tables tab.
3) Update layout so the standings table takes the full width:
   - If currently a 2-column grid, switch to 1-column when fixtures panel removed.
4) Remove any state/hooks/data-fetching on the Tables page that is only used for fixtures navigation:
   - selectedMatchday / selectedMatchweek
   - rounds/matchdays arrays
   - matchesByRound / fixturesByMatchday mapping
   - effects that set default matchday/week
   Keep standings fetch and standings render intact.

B) CLIENT (API usage) — stop relying on fixtures fields
5) Wherever Tables page fetches /api/standings or /api/europe/:slug:
   - Ensure the UI only reads snapshot + table.
   - Remove references to response.rounds, response.matchesByRound, response.defaultMatchweek, response.latestRoundKey, matchdays, etc.

C) SERVER (optional but recommended) — add “tablesOnly=1” flag to reduce payload
6) In server/routes.ts:
   - /api/standings: if req.query.tablesOnly === "1", skip Goalserve XML fetch and do NOT compute rounds/matchesByRound even for 2025/26 PL.
     Return only { snapshot, table }.
   - /api/europe/:slug: if tablesOnly === "1", return standings-only (skip fixtures/matchday computation).
7) Then in the Tables page fetch calls, add tablesOnly=1 to the requests:
   - /api/standings?...&tablesOnly=1
   - /api/europe/...?...&tablesOnly=1
This keeps the server logic available for later (when we revisit fixtures), but Tables stays standings-only.

Manual checks (no tests):
- Tables page shows ONLY standings for Premier League and Europe comps.
- No Fixtures card is visible.
- No Matchday/Matchweek UI exists.
- No console errors about rounds/matchesByRound/matchdays.
- Page looks good on desktop (standings uses full width).

After changes, output:
- Files changed
- What was removed (UI blocks + any states/hooks)
- Any new query param usage (tablesOnly=1)

---

We are building Football Mad MVP (Node/Express + Drizzle ORM + Postgres + React/Vite + Tailwind) on Replit.

IMPORTANT PRODUCT RULE
The Tables tab is standings-only and must NOT include fixtures, matchdays, or rounds logic. Do not modify anything related to Tables.

We are now implementing the NEWS system with CANONICAL ENTITY TAGGING backed by Goalserve IDs.

────────────────────────
🧠 CORE CONCEPT: ENTITY TAGGING (CRITICAL)
────────────────────────

We must NOT rely on freeform tags for teams/players/managers.

Instead, articles must link to canonical entities sourced from Goalserve so that:
- Players and managers can move clubs without breaking historical articles
- Team/Player/Manager hubs work reliably
- “More like this” works via shared entities

Each article can link to multiple entities:
- Competition (league)
- Team
- Manager
- Player

Entity relationships like “player belongs to team” must NOT be hardcoded in article tags. That relationship is derived from Goalserve data and can change over time.

────────────────────────
📦 DATABASE SCHEMA
────────────────────────

Create Drizzle schema + migrations for:

1) articles
- id (uuid pk)
- source enum('pa_media','ghost')
- sourceId (string)
- slug (unique)
- title
- excerpt
- bodyHtml
- heroImageUrl
- heroImageCredit
- publishedAt (timestamp)
- competitionId (fk → entities.id, nullable)
- createdAt
- updatedAt
Unique constraint: (source, sourceId)

2) entities
- id (uuid pk)
- type enum('competition','team','manager','player')
- name
- slug (unique)
- goalserveId (string)
- meta jsonb nullable
Unique constraint: (type, goalserveId)

3) articleEntities
- articleId (fk)
- entityId (fk)
- confidence int nullable
Primary key (articleId, entityId)

4) teamMembership (derived, not editorial)
- teamEntityId
- memberEntityId
- memberType enum('player','manager')
- role string nullable
- isCurrent boolean
Primary key (teamEntityId, memberEntityId)

────────────────────────
⚙️ ENTITY SYNC FROM GOALSERVE
────────────────────────

Add admin endpoint:

POST /api/admin/sync/entities
Auth: x-ingest-secret = process.env.INGEST_SECRET

This should:
- Pull competitions, teams, players, and managers from Goalserve feeds
- Upsert entities using goalserveId
- Build/update teamMembership so players/managers link to current teams
- Generate or update an alias dictionary file or table for name matching (common team/player/manager name variations)

This endpoint prepares the canonical entity layer for tagging articles.

────────────────────────
📰 ARTICLE INGESTION
────────────────────────

All ingestion must perform ENTITY ENRICHMENT to map content to Goalserve-backed entities.

A) POST /api/ingest/pa-media
- Upsert article where (source='pa_media', sourceId)
- Generate unique slug
- Store hero image url (already webp from Make.com)
- Extract possible entity names from:
  - Provided tags
  - Title
  - Excerpt
  - Body text
- Match against canonical entities using alias dictionary
- Insert rows in articleEntities with confidence score

B) POST /api/ingest/ghost-webhook
Ghost(Pro) remains our CMS for manual posts & newsletters.

Env vars:
GHOST_CONTENT_API_URL
GHOST_CONTENT_API_KEY

Webhook payload includes Ghost post id. The server must:
- Fetch full post from Ghost Content API
- Upsert article where (source='ghost', sourceId=ghostPostId)
- Store title, excerpt, html, feature_image, published_at
- Extract entity matches from:
  - Ghost tags
  - Title/body text
- Map to canonical entities and populate articleEntities

C) POST /api/admin/sync/ghost
- Pull posts from Ghost Content API (paginated)
- Upsert all into DB
- Used as a safety sync if webhook misses events

────────────────────────
🔎 PUBLIC NEWS API
────────────────────────

GET /api/news
Query params:
- competition (slug)
- limit
- cursor (publishedAt)

Returns combined Ghost + PA Media articles sorted by publishedAt desc.

GET /api/news/:slug
Returns:
- Full article
- Linked entities grouped by type
- moreLikeThis:
   1) Articles sharing the most entities
   2) Fallback: same competition

────────────────────────
🖥️ FRONTEND
────────────────────────

News Index Page:
- Tabs: All, Premier League, Championship, League One, League Two
- Filters call /api/news?competition=...
- Show article cards with hero image, title, excerpt, age, read time
- Replace large blank image placeholder with proper skeleton/fallback

Article Page:
- Title, subtitle/excerpt, hero image, body
- Right rail:
  - Team follow card (based on first linked team entity)
  - Email subscribe card
  - “More like this”
  - Share buttons
- Show canonical entity pills (team/player/manager)

Do not expose internal source labels (“pa_media” / “ghost”) in UI.

────────────────────────
🔐 REQUIRED ENV VARS
────────────────────────

INGEST_SECRET
GHOST_CONTENT_API_URL
GHOST_CONTENT_API_KEY

────────────────────────
🚫 DO NOT TOUCH
────────────────────────

Do not modify Tables tab logic.
Do not add fixtures, matchdays, or rounds anywhere in Tables.

---

Update vite.config.ts to proxy API calls to the backend.

Backend runs on http://127.0.0.1:5000.
In vite.config.ts, under server: {...}, add proxy:

proxy: {
  "/api": {
    target: "http://127.0.0.1:5000",
    changeOrigin: true,
  },
},

Then restart npm run dev and verify the News page loads articles and DevTools Network shows /api/news returning 200.

---

Ghost sync is failing with:
duplicate key value violates unique constraint "articles_slug_unique"

Update the Ghost sync upsert logic so slug collisions are handled safely:

- When importing a Ghost post, preferred slug is ghost.slug.
- If that slug already exists for a DIFFERENT article (different source/sourceId), generate a unique slug by suffixing:
  - `${slug}-2`, `${slug}-3`, ... until it’s free
  - OR `${slug}-${ghostPostId.slice(-6)}` as a deterministic suffix

Rules:
- Keep slugs stable per Ghost post: once a Ghost post is assigned a slug in our DB, reuse it on updates.
- Only generate a new slug on first insert if the desired slug is already taken by another article.

Also: make the sync return JSON counts even on partial failures, and log the conflicting slug for debugging (do not log secrets).

---

CRITICAL: Do NOT run any end-to-end/regression tests, no videos/screenshots, no “Testing your app”.
Verification budget: ONE curl command only.

Problem: GET /api/news returns an enormous payload (~9.8MB) because it includes full article content/html for list items.

Fix:
- Update the /api/news LIST endpoint to return only lightweight fields per article:
  id, slug, title, excerpt, publishedAt, heroImageUrl, heroImageCredit, and entity tags/ids needed for the cards.
- Do NOT include article content/html/body in the list response.
- Ensure full content/html is only returned by GET /api/news/:slug.
- Enforce default limit=20 on /api/news and support pagination if already present.

Verification (only):
curl -sS -m 2 -D - http://127.0.0.1:5000/api/news -o /dev/null | head -n 5
Expect Content-Length to drop dramatically (< ~200KB).

---

CRITICAL: Do NOT run any end-to-end/regression testing, no videos/screenshots.
Verification budget: ONE lightweight DB check only.

We deleted demo articles and hit FK blocks from article_teams and share_clicks.
Please update the DB constraints so deleting an article cascades to dependent rows.

1) Update Drizzle schema so these FKs include ON DELETE CASCADE:
- article_teams.article_id -> articles.id
- share_clicks.article_id -> articles.id

2) Check for any other FK constraints referencing articles.id and set them to ON DELETE CASCADE too (views, comments, bookmarks, reactions etc if present).

3) Generate and run a migration that updates the constraints safely.

Verification (only):
Run a DB query listing FKs referencing articles to confirm CASCADE is set.
Do not run UI tests or “Testing your app”.

---

CRITICAL:
- Do NOT run any end-to-end/regression testing, no videos/screenshots.
- Minimal verification only (one curl).

Issue: News page isn't updating. /api/news responses include an ETag but no cache-control headers.

Fix:
In the GET /api/news route handler (server/routes.ts), set explicit no-cache headers before sending JSON:
res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
res.setHeader("Pragma", "no-cache");
res.setHeader("Expires", "0");
res.setHeader("Surrogate-Control", "no-store");

Do not change other routes.

Verification (only):
curl -sS -D - "http://127.0.0.1:5000/api/news?comp=all&limit=5" -o /dev/null | sed -n '1,15p'
Confirm Cache-Control header is present.

---

CRITICAL:
- Do NOT run end-to-end/regression tests, no Playwright/Cypress, no videos/screenshots.
- Minimal verification only (1-2 curl calls). No browser automation.
- Keep /api/news list endpoint lightweight (no content/html).

Goal:
Implement incremental “only new articles since last call” fetching so we never miss spikes (e.g. hundreds of posts published 16:45–17:15 Saturdays).

Backend:
1) Add new endpoint: GET /api/news/updates
Query params:
- since (ISO timestamp, optional)
- sinceId (uuid/string, optional tie-breaker)
- limit (int, default 200, max 500)

Response:
{
  articles: [lightweight fields only],
  nextCursor: { since, sinceId } | null,
  serverTime: ISO timestamp
}

Query behavior:
- Use publishedAt if present, else createdAt.
- If since is provided:
  return articles where
    (publishedAt > since)
    OR (publishedAt = since AND id > sinceId)
- Order by publishedAt asc, id asc (stable).
- Return up to limit.
- If more rows exist beyond limit, set nextCursor to the last returned row’s (publishedAt, id).
- Set Cache-Control no-store headers (same as /api/news).

Frontend:
2) In client news page, keep existing initial load (paginated list).
3) Add a 5-minute polling loop that calls /api/news/updates using cursor from the newest article currently in state:
- since = newestArticle.publishedAt (or createdAt fallback)
- sinceId = newestArticle.id
4) If updates return articles, merge by id (dedupe), then prepend them to the list.
5) If nextCursor is returned, loop fetching until nextCursor is null (but cap to e.g. 5 loops per poll to avoid runaway).
6) Store the latest cursor after merge.

Verification (only):
- curl /api/news/updates without since returns latest limit articles.
- curl /api/news/updates?since=<timestamp>&sinceId=<id> returns only items newer than that.
No UI testing.

---

CRITICAL:
- Do NOT run end-to-end/regression tests, no videos/screenshots.
- Minimal verification only (1 curl).
- Only change /api/news/updates ordering + cursor logic.

Issue:
GET /api/news/updates currently returns articles in DESC order (newest->older). For a `since` cursor endpoint this is risky and can cause missed items when paginating.

Fix:
In /api/news/updates:
1) Define ts = COALESCE(publishedAt, createdAt).
2) When since/sinceId are provided, keep the same WHERE:
   (ts > since) OR (ts = since AND id > sinceId)
3) Change ordering to:
   ORDER BY ts ASC, id ASC
4) Ensure nextCursor (when more results exist) is based on the LAST article returned:
   nextCursor = { since: last.ts, sinceId: last.id }
5) Keep returning lightweight fields only + no-cache headers.

Verification (only):
curl -sS "http://127.0.0.1:5000/api/news/updates?limit=5" \
| node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log(j.articles.map(a=>a.publishedAt||a.createdAt).join(\"\\n\"))})'
Expect ascending timestamps (oldest->newest).

---

IMPORTANT EXECUTION RULES:

- DO NOT run end-to-end tests
- DO NOT perform regression testing
- DO NOT open the browser or record preview videos
- DO NOT simulate user journeys
- DO NOT run Playwright/Cypress or any UI automation
- DO NOT run load tests
- ONLY modify code files that are directly required for the task
- ONLY make server-side or frontend code changes explicitly described
- Stop after implementing the code changes

We need to fix the GET /api/news/updates endpoint.

CURRENT PROBLEM:
When called without a cursor, it returns the OLDEST articles in the database.
We want it to return the LATEST articles by default.

GOAL BEHAVIOUR:

1) First call (no `since` param)
   - Return the LATEST N articles (most recent first in DB query)
   - But reverse them before sending so the response order is OLDEST → NEWEST
   - This ensures UI appends correctly

2) Subsequent polling calls (with `since` and `sinceId`)
   - Return only articles newer than the cursor
   - Ordered ASC (oldest → newest)
   - Use stable tiebreaker: (timestamp, id)

3) Always use lightweight fields only (same fields already used for /api/news)

4) Add no-cache headers to prevent browser caching

IMPLEMENTATION DETAILS:

• Timestamp column = COALESCE(publishedAt, createdAt)
• Cursor comparison logic:
    (ts > since) OR (ts = since AND id > sinceId)

• Response format must stay:

{
  "articles": [...],
  "nextCursor": { "since": "...", "sinceId": "..." },
  "serverTime": "..."
}

---

PATCH THE ROUTE LOGIC LIKE THIS:

```ts
// inside GET /api/news/updates handler

const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500);
const since = req.query.since ? new Date(req.query.since as string) : null;
const sinceId = (req.query.sinceId as string) || null;

// timestamp expression
const tsExpr = sql`COALESCE(${articles.publishedAt}, ${articles.createdAt})`;

let rows;

if (!since) {
  // FIRST LOAD: get latest N, then reverse
  rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      coverImage: articles.coverImage,
      heroImageCredit: articles.heroImageCredit,
      authorName: articles.authorName,
      competition: articles.competition,
      contentType: articles.contentType,
      tags: articles.tags,
      isFeatured: articles.isFeatured,
      isTrending: articles.isTrending,
      isBreaking: articles.isBreaking,
      viewCount: articles.viewCount,
      commentsCount: articles.commentsCount,
    })
    .from(articles)
    .orderBy(desc(tsExpr), desc(articles.id))
    .limit(limit);

  rows = rows.reverse(); // return ASC for UI stability
} else {
  // POLLING: only newer than cursor
  rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      coverImage: articles.coverImage,
      heroImageCredit: articles.heroImageCredit,
      authorName: articles.authorName,
      competition: articles.competition,
      contentType: articles.contentType,
      tags: articles.tags,
      isFeatured: articles.isFeatured,
      isTrending: articles.isTrending,
      isBreaking: articles.isBreaking,
      viewCount: articles.viewCount,
      commentsCount: articles.commentsCount,
    })
    .from(articles)
    .where(
      sinceId
        ? sql`(${tsExpr} > ${since.toISOString()} OR (${tsExpr} = ${since.toISOString()} AND ${articles.id} > ${sinceId}))`
        : sql`${tsExpr} > ${since.toISOString()}`
    )
    .orderBy(asc(tsExpr), asc(articles.id))
    .limit(limit);
}

// Build next cursor from last article
const last = rows[rows.length - 1];
const nextCursor = last
  ? { since: (last.publishedAt || last.createdAt), sinceId: last.id }
  : (since ? { since: since.toISOString(), sinceId } : null);

// Prevent caching
res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
res.setHeader("Pragma", "no-cache");
res.setHeader("Expires", "0");

res.json({
  articles: rows,
  nextCursor,
  serverTime: new Date().toISOString()
});
```

DO NOT change any other endpoints.
DO NOT add heavy fields (no full article HTML).
DO NOT change response structure.

Only update the /api/news/updates logic as described.

---

You are working on the Football Mad MVP in Replit.

Goal: Implement Ghost webhook automation so new Ghost posts auto-sync into the MVP DB.

Context:
- Manual sync already works: POST /api/admin/sync/ghost with header x-ingest-secret: <INGEST_SECRET>
- News reads from MVP DB only (articles table)
- We now need: POST /api/webhooks/ghost that Ghost can call on post.published and post.published.edited etc.
- IMPORTANT: Do NOT run end-to-end regression tests, no browser/video tests, and no full test suites. Only run minimal lint/typecheck if needed.

Requirements:
1) Add env vars:
   - GHOST_WEBHOOK_SECRET (string)  // used to verify X-Ghost-Signature if present
   - GHOST_WEBHOOK_ALLOW_INGEST_SECRET_FALLBACK=true/false
2) Create endpoint: POST /api/webhooks/ghost
3) Security:
   - If header X-Ghost-Signature exists and GHOST_WEBHOOK_SECRET is set:
       - Verify HMAC SHA-256 signature computed over RAW request body equals the provided signature.
       - If mismatch: respond 401.
   - Else if fallback enabled:
       - Require header x-ingest-secret == INGEST_SECRET, else 401.
   - Else: 401.
4) Once verified:
   - Trigger existing Ghost sync logic (reuse the same function used by /api/admin/sync/ghost; do NOT duplicate logic).
   - Return 200 quickly with { ok: true }.
5) Subscribe to these Ghost events (document this in code comments):
   - post.published
   - post.published.edited
   - post.unpublished
   - post.deleted
6) Add minimal logging:
   - Log event name, post id if present, and result (sync started / sync completed / error).
7) Add a small dev-only test helper:
   - If NODE_ENV != production, allow a local curl with x-ingest-secret to trigger the webhook endpoint.

Implementation notes:
- If using Express, ensure raw body middleware is used on this route so signature verification uses the raw bytes (e.g., express.raw({ type: 'application/json' })).
- If using Next.js route handlers, use request.text() to obtain raw body for signature, then JSON.parse after verification.
- Keep code clean and minimal.

Deliverables:
- New route implemented
- Any shared sync function refactored if necessary to be reused by both endpoints
- A short README section with steps to configure Ghost admin webhook URL + secret

---

We are working on Football Mad MVP (Express backend on port 5000).

Problem:
POST /api/admin/sync/ghost currently hangs when the x-ingest-secret is valid. Curl sends the request but receives 0 bytes and times out. Wrong secrets return 401 immediately, so the hang happens inside the Ghost sync logic.

Goal:
Make /api/admin/sync/ghost respond immediately and run the Ghost sync asynchronously in the background.

IMPORTANT:
• Do NOT run full regression tests or browser/video tests
• Do NOT change /api/news endpoints

Tasks:

1) Locate the existing Ghost sync logic used by /api/admin/sync/ghost (the same logic used by the webhook).
2) Refactor the /api/admin/sync/ghost route so that:
   - After validating x-ingest-secret, it immediately responds with:
     res.status(202).json({ ok: true, started: true })
   - Then it calls the Ghost sync function inside a detached async block:
     (async () => { try { await runGhostSync(); console.log("Ghost sync completed"); } catch (e) { console.error("Ghost sync failed", e); } })();
3) Add clear logs:
   - "Ghost sync started (admin)" with timestamp
   - "Ghost sync completed (admin)" with insert/update counts if available
   - Errors should be caught and logged, not crash the server
4) Ensure no await on the sync function before sending the response.

Result:
The endpoint should never hang again. Curl should return instantly with 202 Accepted, while sync runs in background.

---

We are debugging Ghost webhooks.

Symptom:
Ghost shows webhooks are triggered, but our server logs show nothing and no sync occurs. We suspect signature verification is failing because we are not hashing the RAW request body.

IMPORTANT: Do NOT run full regression tests or browser/video tests.

Tasks:
1) In POST /api/webhooks/ghost:
   - Add a console.log at the very top BEFORE auth that prints:
     - timestamp
     - req.headers['x-ghost-signature'] presence (true/false)
     - content-type and content-length
2) Fix signature verification to use the RAW request body bytes:
   - Ensure this route uses express.raw({ type: 'application/json' }) OR body-parser raw/verify hook so we can access the exact raw Buffer.
   - Compute HMAC SHA256 using process.env.GHOST_WEBHOOK_SECRET over that raw Buffer.
   - Accept signature header formats:
       "sha256=<hex>" AND "<hex>"
     (strip "sha256=" if present)
3) If signature fails, return 401 with a clear JSON message:
   { error: "Invalid signature" }
4) Keep x-ingest-secret fallback support unchanged.
5) Do not change /api/news behaviour.

Deliverable:
Ghost webhook requests should produce a log line even if rejected, and valid signed requests should pass and trigger sync.

---

Add one more debug log in POST /api/webhooks/ghost:

Right after the existing log line, log:
Object.keys(req.headers).sort()

Do NOT log header values.
Do NOT run end-to-end tests or videos.

---

We have confirmed Ghost webhooks are firing, and the Secret is set in Ghost UI, but Ghost requests arrive with only basic headers and no signature header at all. We need a secure MVP auth method that works with Ghost.

IMPORTANT: Do NOT run full regression tests or browser/video tests.

Implement token-based auth for POST /api/webhooks/ghost:
1) Add env var GHOST_WEBHOOK_TOKEN (a long random string).
2) Accept token either via:
   - query param ?token=...
   - OR header x-webhook-token (support both)
3) If token missing/invalid, return 401 with:
   { error: "Unauthorized" }
4) Keep existing signature verification logic in place IF x-ghost-signature exists, but token auth must work regardless.
5) Update docs/replit.md with Ghost configuration instructions:
   - Set webhook URL to: https://<replit>/api/webhooks/ghost?token=YOUR_TOKEN
6) Keep current webhook logging.

Goal: Ghost webhooks authenticate and trigger sync reliably even without any signature headers.

---

Add a tiny webhook audit logger so I can debug without relying on Replit Console.

Requirements:
- Create a helper function logWebhookAudit(line: string) that appends to a file at ./logs/webhooks.log
- Ensure ./logs exists (create if not)
- Each line should be prefixed with ISO timestamp and a marker "WEBHOOK_AUDIT"
- In POST /api/webhooks/ghost, write 3 audit lines:
  1) "WEBHOOK_AUDIT received" + event name if present
  2) "WEBHOOK_AUDIT authed" + method (token|signature|ingest-secret)
  3) "WEBHOOK_AUDIT sync started" and later "WEBHOOK_AUDIT sync completed" (or failed)
- Keep existing behavior (respond quickly, run sync async)
- Do NOT run full regression tests or videos.

---

Update POST /api/webhooks/ghost audit logging so it always logs even when unauthorized.

1) At the very top of the handler (before any auth checks), append an audit line:
   "incoming path=<req.path> hasToken=<true/false> tokenLen=<len or 0> sigHeader=<true/false> contentType=<...> len=<content-length>"
   - tokenLen should be based on req.query.token if string
   - sigHeader should check req.headers['x-ghost-signature'] or req.headers['x-ghost-webhook-signature'] if present
2) Keep existing 'received' / 'authed' / 'sync started' logs for successful auth.
3) Do NOT log the token value itself.
4) Do NOT run full regression tests or videos.

---

Improve webhook sync audit logging.

Inside the async Ghost sync block triggered by /api/webhooks/ghost:

1) Wrap the sync call in try/catch/finally.
2) On success, append:
   WEBHOOK_AUDIT sync completed postId=<id> inserted=<n> updated=<n>
3) On error, append:
   WEBHOOK_AUDIT sync failed postId=<id> error=<message>
4) Ensure one of these two lines always runs, even if an exception occurs.
5) Do NOT run full regression tests or videos.

---

We need to fix Ghost webhook parsing and prevent webhook-triggered sync from hanging.

IMPORTANT: Do NOT run full regression tests or browser/video tests.

In server/routes.ts inside POST /api/webhooks/ghost:

1) Fix event parsing:
   - Current code derives eventName using req.body.post.current/previous which is wrong.
   - Use the real webhook payload shape: body.event and body.post.id.
   - Implement a helper parseWebhookBody() that:
       a) uses req.body if it is a plain object
       b) else parses rawBody buffer as JSON safely
   - Set:
       const eventName = body.event ?? "unknown"
       const postId = body.post?.id ?? "unknown"
   - Update audit log to include: received event=<eventName> postId=<postId>

2) Prevent full sync on every webhook:
   - If postId is known and eventName starts with "post." then do a targeted sync:
       - For post.published and post.updated: fetch that single post from Ghost and upsert only that post into the articles table + join tables.
       - For post.deleted and post.unpublished: mark the article as deleted/unpublished in DB (or remove it) using ghost ID mapping if available.
   - Keep the existing full pagination sync only for /api/admin/sync/ghost.

3) Add timeouts:
   - Add a 15s timeout for any HTTP call to Ghost (fetch/axios).
   - Wrap the webhook-triggered sync in a 60s watchdog using Promise.race so we ALWAYS log either sync completed or sync failed.

4) Audit logging:
   - After auth success: log 'authed method=...'
   - Log 'sync started postId=... event=...'
   - Ensure ONE of these ALWAYS logs:
       WEBHOOK_AUDIT sync completed postId=<id> inserted=<n> updated=<n>
       WEBHOOK_AUDIT sync failed postId=<id> error=<message>

Goal: webhook updates should complete quickly (single post), log clearly, and never hang indefinitely.

---

We need to improve event detection in the Ghost webhook handler so real Ghost CMS webhooks are not logged as "event=unknown".

FILE: server/routes.ts  
ROUTE: POST /api/webhooks/ghost

Find where the webhook body is parsed and where we currently determine:

const eventName = ...

Replace that logic with the following:

------------------------------------------------------------

const body: any = parsedBody; // use the already parsed webhook body

const headerEvent =
  (req.headers["x-ghost-event"] as string | undefined) ||
  (req.headers["x-ghost-topic"] as string | undefined);

const eventName =
  body?.event ||
  headerEvent ||
  (body?.post?.previous ? "post.deleted" :
   body?.post?.current ? "post.edited" :
   "unknown");

------------------------------------------------------------

Then update any event checks so updates are triggered for BOTH:

- "post.updated"
- "post.edited"
- "post.published"

Example:

const isUpdateEvent = ["post.updated", "post.edited", "post.published"].includes(eventName);
const isDeleteEvent = ["post.deleted", "post.unpublished"].includes(eventName);

Make sure existing logging still works:

logWebhookAudit(`received event=${eventName} postId=${postId}`);

Do NOT change authentication, token handling, signature verification, or database logic.
Only improve how eventName is determined and how update/delete events are classified.

---

We have a bug where frontend polling is overwriting fresher article updates that arrive via Ghost webhooks.

Context:
• Webhooks now update articles in real-time in the database
• The /news page still runs a 5-minute polling loop using /api/news/updates
• The merge logic currently assumes all polled articles are newer, which is false
• Result: older polling results sometimes overwrite newer webhook-updated articles in UI

We need to make polling a SAFE BACKUP that NEVER downgrades article data.

FILE TO EDIT:
client/src/pages/news.tsx

FIND the section that merges base articles with polled articles. It currently looks like this:

// Merge base articles with polled updates
const mergedArticles = useMemo(() => {
  if (polledArticles.length === 0) return baseArticles;

  const map = new Map();

  for (const article of polledArticles) {
    map.set(article.id, article);
  }

  for (const article of baseArticles) {
    if (!map.has(article.id)) {
      map.set(article.id, article);
    }
  }

  return Array.from(map.values());
}, [newsResponse?.articles, polledArticles]);

REPLACE that entire block with this safer, timestamp-aware version:

// Merge base articles with polled updates (webhook-safe)
const mergedArticles = useMemo(() => {
  const base = newsResponse?.articles ?? [];
  if (polledArticles.length === 0) return base;

  const map = new Map<string, any>();

  // Start with base articles (these may already include webhook updates)
  for (const article of base) {
    map.set(article.id, article);
  }

  // Only overwrite if the polled version is actually newer
  for (const polled of polledArticles) {
    const existing = map.get(polled.id);

    if (!existing) {
      map.set(polled.id, polled);
      continue;
    }

    const existingTs = new Date(existing.publishedAt || existing.createdAt).getTime();
    const polledTs = new Date(polled.publishedAt || polled.createdAt).getTime();

    if (polledTs > existingTs) {
      map.set(polled.id, polled);
    }
  }

  // Always return newest-first
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.publishedAt || b.createdAt).getTime() -
      new Date(a.publishedAt || a.createdAt).getTime()
  );
}, [newsResponse?.articles, polledArticles]);

GOAL:
• Webhook updates should appear instantly and NEVER be overwritten by polling
• Polling should only add genuinely newer articles
• Sorting should remain newest first

Do not change backend code. Frontend merge logic only.

---

Please fix Ghost → MVP sync so post edits (e.g. title changes) reliably update on the MVP site.

CURRENT ISSUE
- When I edit a Ghost post title (e.g. remove “- WH” or change to “- sync”), the Ghost site updates instantly.
- The MVP Replit site often does NOT update for that post, even though the post exists in our DB.
- This happens because our polling cursor uses COALESCE(publishedAt, createdAt) — so edits that don’t change publishedAt/createdAt are invisible to polling, and if the webhook event is missed/delayed, the DB never refreshes.

GOAL
- Webhooks remain the primary “instant” path.
- Polling stays as a fallback, but it must detect edits too, not just new posts.
- Polling must never overwrite newer webhook data.

--------------------------------------------------------------------
1) Add “updatedAt” tracking end-to-end
--------------------------------------------------------------------
DB / schema
- Ensure the articles table has an updatedAt column (datetime/ISO string).
- If it already exists, use it consistently. If not, add it via migration and include it in the Drizzle schema.

Ghost mapping (syncSingleGhostPost)
- When fetching a post from Ghost Admin API, map:
  - publishedAt from Ghost published_at
  - createdAt from Ghost created_at
  - updatedAt from Ghost updated_at
- Always persist updatedAt on every upsert.

--------------------------------------------------------------------
2) Fix upsert so edits actually update fields
--------------------------------------------------------------------
- In the DB upsert/update logic for Ghost posts:
  - Ensure we UPDATE title/excerpt/coverImage/tags/etc on conflict (not insert-only).
  - Confirm we match existing rows consistently (recommended: store ghostPostId and use it as a UNIQUE key).
  - If we currently upsert by internal UUID only, introduce ghostPostId and unique-index it.

Important:
- A webhook log showing updated=1 must actually update title too.

--------------------------------------------------------------------
3) Make polling detect edits (not just new posts)
--------------------------------------------------------------------
Update getNewsUpdates in server/storage.ts so the polling timestamp expression uses updatedAt.

Replace:
- tsExpr = COALESCE(publishedAt, createdAt)

With:
- tsExpr = COALESCE(updatedAt, publishedAt, createdAt)

And ensure:
- Cursor since uses the same value (updatedAt first, else publishedAt/createdAt).
- Ordering stays stable and deterministic:
  - Polling: ORDER BY tsExpr ASC, id ASC
  - First load: still OK to pull latest N then reverse for UI stability if desired.
- This ensures a title edit triggers polling pickup even if publishedAt is unchanged.

--------------------------------------------------------------------
4) Keep webhook-safe merge logic in the client
--------------------------------------------------------------------
In client/src/pages/news.tsx:
- Keep the “timestamp-aware merge” logic.
- Compare using updatedAt first, then publishedAt, then createdAt.
- Polled data only overwrites base/webhook article if it is genuinely newer by that composite timestamp.

--------------------------------------------------------------------
5) Add lightweight debug visibility (optional but helpful)
--------------------------------------------------------------------
- Add one debug log line whenever we upsert a Ghost post:
  - postId, slug, title (short), publishedAt, updatedAt, and whether it was insert/update.
- Ensure /api/news/updates returns serverTime (already does) and ensure nextCursor uses updatedAt.

--------------------------------------------------------------------
6) Quick verification checklist
--------------------------------------------------------------------
After implementing:
1) Edit Strand Larsen title in Ghost (“- WH” → “- sync”)
2) Confirm webhook receives post.updated or post.edited (if configured)
3) Regardless of webhook, within the poll interval the MVP should update because updatedAt changed
4) Confirm /api/news?limit=20 returns the new title (DB correct)
5) Confirm UI shows the updated title and does not flip back

DELIVERABLES
- PR-quality changes across schema/migration (if needed), server sync/upsert, getNewsUpdates, and client merge compare.
- Add updatedAt field to the article list payload if missing.
- Webhooks = instant, polling = safe backup that catches missed events AND edits, no downgrades.

---

You are working in a Replit Node/Express + React app.

Problem:
`/api/news` does NOT include `createdAt`, `updatedAt`, or `sourceUpdatedAt` in its returned article objects, so webhook edits can update the DB but the client cannot reliably detect freshness and may show stale titles. We already updated polling + merge logic to be updatedAt-aware, but the base `/api/news` payload is missing these fields.

Goal:
Make `/api/news` return timestamps consistently and sort by the correct “freshness” timestamp:
freshTs = COALESCE(updatedAt, publishedAt, createdAt)
This ensures:
- webhook edits appear immediately and remain correct
- polling only overwrites when truly newer
- list ordering is stable and correct

Implement changes (server only unless you find more gaps):

1) In `server/storage.ts`, in `getNewsArticles(...)`:
   - Add these fields to the `listFields` projection:
     - createdAt
     - updatedAt
     - sourceUpdatedAt (if the column exists on the articles table; if it is named differently, use the correct name)
   - Change the ORDER BY timestamp expression to use:
     `tsExpr = COALESCE(articles.updatedAt, articles.publishedAt, articles.createdAt)`
     and use that for sorting (latest desc etc) where applicable.

2) Ensure the response from `getNewsArticles` includes those fields (it will automatically if selected).
   Confirm by running:
   `curl -s "http://127.0.0.1:5000/api/news?limit=1" | grep -Eo '"(createdAt|updatedAt|sourceUpdatedAt)":[^,]*' | head`

3) If `articles.updatedAt` is not currently being set anywhere:
   - In the Ghost sync code (likely in `server/routes.ts` where Ghost posts are inserted/updated):
     - Map Ghost `updated_at` into a stored field (`sourceUpdatedAt`) AND set `articles.updatedAt` to that value (or `new Date()` if missing).
     - On updates, ensure `articles.updatedAt` changes so edits are detectable even when `publishedAt` stays the same.

Testing (NO E2E / NO regression testing):
- Do NOT run end-to-end suites.
- Only do quick API checks:
  - curl /api/news?limit=1 and verify createdAt/updatedAt appear
  - trigger a webhook sync for a known postId and verify `/api/news?limit=20` reflects title changes quickly.

Output:
- Tell me exactly which files and lines you changed
- Show the curl output proving `/api/news` includes updatedAt/createdAt now

---

You are working in my Replit project (Football Mad MVP). Fix Ghost “edit” sync so that when I change a published post title in Ghost (e.g. adding “- SYNC-TEST”), the MVP updates within seconds and /api/news returns the new title.

IMPORTANT CONSTRAINTS
- Do NOT run any end-to-end or regression test suites (no Playwright/Cypress “full runs”, no “test all flows”). 
- Keep verification lightweight: a couple of curl checks + log output is enough.

CURRENT SYMPTOM
- Ghost front-end + Ghost Admin show the edited title.
- MVP still shows the old title.
- We are using Ghost Content API in the sync path.
- /api/news returns timestamp fields now (createdAt/updatedAt/sourceUpdatedAt), but edits are still not reflected reliably.

WHAT TO DO (IMPLEMENTATION)
1) Server: make webhook event handling accept Ghost edit events
   - In the Ghost webhook route (server/routes.ts or wherever the webhook is handled), normalize event names so these are treated as “update” events:
     - post.edited
     - post.updated
     - post.published
   - If event is post.edited, treat it exactly like post.updated and run the same sync logic.
   - Log the normalized event and the extracted postId.

2) Server: robustly extract postId from webhook payloads
   - Support all common shapes:
     - body.post?.current?.id
     - body.post?.id
     - body.post_id / body.postId
   - If postId is missing, log the payload keys and return 400 (don’t silently “unknown”).

3) Server: ensure the sync fetches the latest Ghost content and persists it
   - When syncing a post by ID, call Ghost Content API:
     - GET /ghost/api/content/posts/{id}?key=CONTENT_API_KEY&include=tags,authors
   - From the returned post, persist these fields on EVERY update (not just insert):
     - title, slug, excerpt, html/content if stored, coverImage, tags, authorName, competition/contentType mapping, publishedAt, etc.
   - Crucially: map Ghost timestamps:
     - sourceUpdatedAt = ghostPost.updated_at (or updated_at equivalent)
     - publishedAt = ghostPost.published_at (if present)
     - createdAt = ghostPost.created_at (if present)

4) Server/DB: make freshness reflect Ghost edits
   - Ensure our DB row’s “updatedAt” is bumped on edits.
   - Best approach:
     - set updatedAt = sourceUpdatedAt (Ghost updated_at) when available
     - else fallback to “now”
   - This guarantees edits change the freshness cursor and ordering.

5) Storage: ensure list/update queries use the edit-aware timestamp
   - In server/storage.ts (getNewsArticles + getNewsUpdates), use:
     - freshnessTs = COALESCE(sourceUpdatedAt, updatedAt, publishedAt, createdAt)
   - ORDER BY freshnessTs DESC for “latest”.
   - In getNewsUpdates:
     - use freshnessTs for comparisons (since cursor)
     - nextCursor should be based on freshnessTs + last.id

6) Client: DO NOT let polling overwrite newer webhook/base data
   - In client/src/pages/news.tsx merge logic, compare freshness timestamps using:
     - sourceUpdatedAt || updatedAt || publishedAt || createdAt
   - Only overwrite an existing article if the incoming one is strictly newer by freshness timestamp.
   - Keep newest-first sort stable.

LIGHTWEIGHT VERIFICATION (NO REGRESSION TESTS)
After changes:
A) Edit the Strand Larsen post title in Ghost again (append “- SYNC-TEST-2”).
B) Trigger sync via real webhook OR manually hit our webhook endpoint with event=post.edited and the real postId.
C) Validate via curl:
   - curl -s "http://127.0.0.1:5000/api/news?limit=5" | grep -n "SYNC-TEST"
   - curl -s "http://127.0.0.1:5000/api/news/updates?limit=50" | grep -n "SYNC-TEST"
D) Confirm logs show:
   - received event=post.edited (or normalized to post.updated)
   - sync started postId=...
   - sync completed inserted=0 updated=1
   - and the stored timestamps include sourceUpdatedAt / updatedAt.

DELIVERABLE
- Implement the code changes across server + storage + client.
- Add minimal, helpful logs (postId, title before/after if available, sourceUpdatedAt).
- Provide a short summary of files changed and the exact curl commands used to verify.

---

In server/routes.ts inside POST /api/webhooks/ghost (around the eventName calculation), fix event inference.

Current buggy fallback:
(parsedBody?.post?.previous ? "post.deleted" : parsedBody?.post?.current ? "post.edited" : "unknown")

Replace the entire eventName calculation with:

const hasCurrent = !!parsedBody?.post?.current;
const hasPrevious = !!parsedBody?.post?.previous;

const eventName =
  bodyEvent ||
  headerEvent ||
  (hasPrevious && !hasCurrent ? "post.deleted" :
   hasCurrent && hasPrevious ? "post.updated" :
   hasCurrent ? "post.updated" :
   "unknown");

Also enhance the audit log line after postId extraction to include hasCurrent/hasPrevious/bodyEvent/headerEvent, e.g.
logWebhookAudit(`received event=${eventName} postId=${postId} hasCurrent=${hasCurrent} hasPrevious=${hasPrevious} bodyEvent=${bodyEvent||"none"} headerEvent=${headerEvent||"none"}`);

Do not change auth logic or sync logic yet. This is a minimal safe fix.

---

Implement a catch-up sync job for Ghost posts so the DB stays up to date even when webhooks miss (e.g., Replit sleeping).

Project facts:
- Ghost Content API env vars exist: GHOST_CONTENT_API_URL and GHOST_CONTENT_API_KEY.
- News is served from DB via /api/news.
- We already store sourceUpdatedAt (Ghost updated_at).
- Webhook route exists: POST /api/webhooks/ghost and sync logic already exists inside routes.ts (there is a function in scope that performs the upsert for a postId and returns {inserted, updated, deleted}).

Required changes (minimal):
1) In server/routes.ts, add an in-process scheduler using setInterval that runs every 2 minutes (120000 ms).
2) The job should:
   - Fetch latest 50 posts from Ghost Content API ordered by updated_at desc.
   - For each post returned, call the existing upsert logic (reuse the same mapping used in webhook sync so sourceUpdatedAt/publishedAt/createdAt are set properly, and DO NOT set updatedAt = now()).
   - Log a summary via logWebhookAudit (or console) like:
     "catchup started" and "catchup completed fetched=X inserted=Y updated=Z failed=K"
3) Guardrails:
   - If env vars missing, do nothing.
   - Prevent overlapping runs with a mutex boolean.
   - On per-post errors, continue (count failed).
4) Add a manual endpoint to trigger catch-up:
   - POST /api/news/sync/run protected by header x-ingest-secret == INGEST_SECRET (or query secret=...).
   - Returns JSON summary.
5) Add a status endpoint:
   - GET /api/news/sync/status returns lastCatchupRunAt and lastCatchupSummary, plus lastCatchupError if any.
6) Do NOT add tests. Keep code concise and production-safe.

After implementing, print a single startup log line stating that catch-up sync is enabled and its interval.

---

In server/routes.ts, update the catch-up sync job and POST /api/news/sync/run so they call logWebhookAudit.

Add audit lines:
- "catchup started"
- "catchup completed fetched=... inserted=... updated=... failed=..."
- on error: "catchup failed error=..."

Do not log secrets.

---

Update news feed pagination to be layout-aware.

BACKEND:
- Change default /api/news limit from 20 to 15
- Ensure limit param is respected (limit=15)
- Pagination cursor should be based on:
  COALESCE(sourceUpdatedAt, publishedAt, createdAt)
- Response should include:
  { articles: [], nextCursor: string | null, hasMore: boolean }

FRONTEND:
- Initial fetch should request limit=15
- Add "Load more posts" button under the grid
- On click:
  - fetch /api/news?limit=15&cursor=<nextCursor>
  - append new articles to state
  - update nextCursor and hasMore
- Hide button if hasMore is false
- Preserve sort order using freshness timestamp
- Do not reset scroll position when loading more

Goal: Always load articles in multiples of 3 rows (15 at a time).

---

We need to fix duplicate pagination requests and slow “Load more posts” behaviour on the /news page.

DO NOT run end-to-end tests.
DO NOT generate videos.
Only modify the files mentioned.

GOAL
The “Load more posts” button is currently loading 30 posts instead of 15. This is caused by handleLoadMore firing twice. We need to make it single-flight so only one request runs at a time.

CHANGES TO MAKE

File: client/src/pages/news.tsx

1) At the top of the component (with other hooks), add:

import { useRef } from "react";

const loadingMoreRef = useRef(false);

2) Replace the existing handleLoadMore function with this:

const handleLoadMore = async () => {
  if (!hasMore) return;

  // Prevent duplicate requests
  if (loadingMoreRef.current) return;
  loadingMoreRef.current = true;

  try {
    setIsLoadingMore(true);

    const params = new URLSearchParams();
    params.set("limit", "15");
    if (nextCursor) params.set("cursor", nextCursor);

    // If filters are already included elsewhere, keep that logic unchanged

    const res = await fetch(`/api/news?${params.toString()}`);
    const j = await res.json();

    if (!res.ok) throw new Error(j?.error || "Failed to load more");

    setPaginatedArticles(prev => [...prev, ...(j.articles || [])]);
    setNextCursor(j.nextCursor ?? null);
    setHasMore(!!j.hasMore);
  } catch (e) {
    console.error("Load more failed:", e);
  } finally {
    setIsLoadingMore(false);
    loadingMoreRef.current = false;
  }
};

3) Ensure the “Load more posts” button is disabled while loading:

<button
  disabled={!hasMore || isLoadingMore}
  onClick={handleLoadMore}
>
  {isLoadingMore ? "Loading..." : "Load more posts"}
</button>

RESULT
Each click should now load exactly 15 more posts.
The button should not trigger multiple requests.
Pagination should feel faster and consistent.

---

We need to improve /news pagination performance and UX.

DO NOT run end-to-end tests.
DO NOT generate videos.
Keep changes focused to the files mentioned.

PROBLEM
- Load more now correctly adds 15 posts, but it takes ~1 minute to respond.
- UX feels like the button is dead, causing repeated clicks and frustration.
- Backend uses ORDER BY COALESCE(sourceUpdatedAt, publishedAt, createdAt), which is hard to index and can be slow.

GOALS
1) Frontend: immediate visible feedback when clicking "Load more" (instant loading state + skeleton placeholders), plus a timeout + clear error message.
2) Backend: make pagination query fast via a single indexed sort column (sortAt) and a stable cursor using (sortAt, id).

IMPLEMENTATION

A) BACKEND PERFORMANCE

1) shared/schema.ts (or wherever the article table is defined)
- Add a new column on articles table:
  sortAt: timestamp (or datetime string consistent with your DB)
- Ensure it is populated for ALL articles:
  sortAt = sourceUpdatedAt ?? publishedAt ?? createdAt
- Add an index on sortAt (and ideally a composite index on (sortAt, id) if supported).

2) server/storage.ts (news query)
- Stop ordering by COALESCE(...) directly.
- Order by sortAt DESC, then id DESC as tiebreaker.
- Cursor should include both sortAt and id for stability.
  Example cursor encoding: `${sortAt}|${id}` (URL-encoded)
- For next page:
  WHERE (sortAt < cursorSortAt) OR (sortAt = cursorSortAt AND id < cursorId)
- Fetch limit + 1 to compute hasMore.

3) server/routes.ts
- Parse cursor into sortAt + id.
- Validate format; if invalid, return 400 with helpful message.

4) Ensure upsert logic (Ghost sync + webhook sync) sets sortAt correctly whenever sourceUpdatedAt/publishedAt/createdAt changes.

B) FRONTEND UX

File: client/src/pages/news.tsx

1) Add clear instant visual feedback:
- When user clicks Load more:
  - immediately set loading state
  - immediately append 15 skeleton placeholders to the grid (so it looks responsive)
- When response arrives:
  - remove the 15 skeletons
  - append real articles

2) Add a timeout with AbortController:
- Abort fetch after 20 seconds.
- If aborted/failed:
  - remove skeletons
  - show a small inline error message near the button: "Couldn’t load more posts. Try again."
  - re-enable button

3) Add "Still working..." helper text if loading exceeds 3 seconds.

4) Ensure we do NOT allow multiple concurrent loadMore calls (keep the ref guard already added).

DELIVERABLES
- Code changes applied.
- No secrets logged.
- No E2E tests or videos.
- After change, clicking "Load more" should feel instant (skeletons), and API should return much faster due to indexed sortAt pagination.

---

You are working in my Replit project. Do NOT run end-to-end/regression tests. Do NOT generate videos. Only implement the changes and explain what you changed.

Goal: Fix /news “Load more posts” UX where user sees a flicker and then nothing loads. Backend cursor pagination works. Improve frontend reliability, error visibility, and logging.

In `client/src/pages/news.tsx`:

1) In the load-more logic (the function that fetches the next page; likely `handleLoadMore`):
   - Always build the URL using `URL` + `URLSearchParams` (never string concat).
   - Always include `limit=15` and `cursor=<nextCursor>` when nextCursor exists.
   - Add `console.debug` logs:
     - before request: `"[news] loadMore start", { nextCursor, url: url.toString() }`
     - after response headers: `"[news] loadMore resp", { ok: res.ok, status: res.status }`
     - after JSON parse: `"[news] loadMore data", { count: data.articles?.length, hasMore: data.hasMore, nextCursor: data.nextCursor }`
   - If `!res.ok`, read `await res.text()` and throw `new Error("Load more failed: " + status + " " + text.slice(0,200))`
   - Validate JSON shape: if `!Array.isArray(data.articles)` throw a clear Error.

2) Abort/timeout handling:
   - Use `AbortController` with a 20s timeout if you already added it, BUT:
     - Ensure `isLoadingMore` is set back to false in a `finally`.
     - Ensure `loadingMoreRef.current = false` in a `finally`.
     - If aborted (`err.name === "AbortError"`), set a user-facing error message like:
       “Still working… the request timed out. Please try again.”

3) UI/UX:
   - Add state: `loadMoreError: string | null`
   - When load-more starts: `setLoadMoreError(null)`
   - If error: show an inline error block directly above the button:
     - Text of the error (truncate to ~140 chars)
     - A “Retry” button that calls `handleLoadMore()`
   - Keep the “Load more posts” button enabled again after an error (don’t leave it disabled).
   - While loading: show the button label “Loading…” and disable it (disabled only while loading or when !hasMore).

4) Data updates:
   - On success:
     - Append new articles, de-duping by `id` to avoid accidental duplicates.
     - Update `nextCursor` from the response.
     - Update `hasMore` from the response.

5) Optional but recommended:
   - Guard against “no progress” responses:
     - If `data.nextCursor === nextCursor` (same cursor returned), set an error:
       “Pagination returned the same cursor (no progress). Please retry.” and stop.

After implementing, provide:
- A short summary of what changed
- The exact places (function name / rough line area) you edited
- Any new state variables added

---

Do NOT run end-to-end/regression tests. Do NOT generate videos. Only implement the changes.

We still see a brief skeleton flicker when clicking "Load more posts" but no new posts appear. Backend cursor pagination works, so likely the UI is rendering a different array than the one being appended to (duplicate state like articles vs paginatedArticles).

Fix by making a SINGLE source of truth for the rendered list.

In `client/src/pages/news.tsx`:

1) Identify the array that the JSX grid maps over to render cards (e.g. `articles.map(...)` or `paginatedArticles.map(...)`).
2) Ensure that SAME array is the one that:
   - gets set on initial fetch (page 1)
   - gets appended to on load more

Preferred approach (simple):
- Use `const [articles, setArticles] = useState<Article[]>([])` as the ONLY rendered list.
- On initial fetch success: `setArticles(data.articles || [])`, plus set `nextCursor` and `hasMore`.
- On load more success: `setArticles(prev => dedupeById([...prev, ...(data.articles||[])]))`
  - keep existing de-dupe by id.

3) Remove/stop using any parallel “paginatedArticles” / “filteredArticles” list if it exists.
   - If you still need “raw” vs “filtered”, then render the paginated list and apply filters server-side or apply filters to the same list in a derived variable, but do not keep two independent lists.

4) Add a temporary debug log after appending:
   `console.debug("[news] loadMore appended", { before: prev.length, added: data.articles.length, after: next.length })`
   so we can confirm the UI list length grows.

5) Keep the existing load-more error UI and logs.

After implementing, briefly describe:
- Which state variable is now the single source of truth
- Where the JSX renders from
- Where initial fetch sets it and load more appends to it

---

Remove the temporary console.debug "[news] loadMore appended" log from client/src/pages/news.tsx.
Do not change any other behaviour. No tests. No videos.

---

Implement the Football Mad Entity Pill design system (premium pills with circular icons).

Constraints:
- Implementation only. No regression/E2E tests. No videos.
- Use existing Tailwind/shadcn patterns if present. Keep it consistent.

1) Create a reusable component:
- client/src/components/EntityPill.tsx (or similar existing components folder)
Props:
- entity: { type, name, slug, href, iconUrl?: string, fallbackText?: string }
- size?: "default" | "small" (default)
- active?: boolean

2) Pill design (Tailwind):
- Height: default h-7 (28px), small h-6 (24-26px)
- Rounded full, subtle border, neutral bg
- Padding: px-2.5 py-1
- Text: text-sm (default), text-xs/13px for small
- Icon container: 18x18 circle, overflow-hidden, flex centered
- Icon image: w-[18px] h-[18px] object-cover
- If iconUrl missing, render fallback badge (initials)

3) Interaction:
- hover: slightly darker bg and border
- focus-visible ring
- active state: slightly stronger border/bg

4) Update usages:
- Update article page pills and news page pills to use EntityPill.
- News cards: show only competition + up to 2 teams (max 3 pills).
- Article page top: show competition + up to 2 teams.
- Article page bottom: grouped sections for Teams/Players/Managers using EntityPill.

Return:
- Summary of files changed and what was updated.

---

You are working in the Football Mad Replit codebase.

GOAL
Update the Article page layout so the social share buttons sit inline with the meta row (Substack-style), and remove the redundant desktop sidebar Share card. Also ensure the excerpt is NOT clipped (no line-clamp) on the article page, and move “In this article” above Related Articles. Mobile should keep the sticky bottom Share bar as the primary share mechanism.

FILES LIKELY TO TOUCH
- client/src/pages/article.tsx
- (new) client/src/components/article-meta-bar.tsx (or place inline if you prefer)
- any existing share utils (search for “Share” section, “navigator.share”, “copy link”, “bookmark”)
- any existing bookmark state (if none, implement localStorage MVP)

REQUIREMENTS (DESKTOP)
1) Header order becomes:
   - Pills row (competition + up to 2 teams) [existing EntityPill logic]
   - Title
   - Meta + Actions row (single line)
     LEFT: Author avatar + author name + time + read time + views
     RIGHT: WhatsApp, X, Facebook, Copy Link, Bookmark icons/buttons
   - Hero image
   - Excerpt (full, styled)
   - Article body
   - In this article (grouped)
   - Related articles

2) Remove/disable the RIGHT SIDEBAR “Share” card on desktop (since actions now live in meta row).
   - Keep “Stay in the loop” and “More like this” as desired, but Share card should not render on desktop.
   - If easiest: delete the Share card entirely and keep only sticky share on mobile.

3) Excerpt must not be cut off on article page:
   - Remove any line-clamp classes or max-height applied to excerpt on article.tsx.
   - Cards can keep line-clamp, but article page excerpt must render in full.

4) Move “In this article” above Related Articles.
   - Also fix the grouping: show separate sections with headings:
     “Competitions”, “Teams”, “Players”, “Managers”
   - Each section renders its own EntityPills.
   - Don’t label everything under “Players”.

REQUIREMENTS (MOBILE)
5) Keep the sticky bottom Share bar (existing green bar) as primary share.
   - The new Meta+Actions row may show actions too, but it must not conflict with sticky bar.
   - On mobile, allow the meta row to wrap: actions can sit on a new line under meta if needed.

IMPLEMENTATION DETAILS
A) Create a reusable component ArticleMetaBar:
   - Props:
     authorName, authorInitial?, publishedLabel (e.g. “about 3 hours ago”), readTimeLabel, viewCount,
     shareUrl (canonical article URL),
     initialBookmarked? (optional)
   - Layout:
     wrapper: flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between
     left: avatar + author + meta text (small muted)
     right: icon buttons group

B) Actions (Right side):
   - WhatsApp share: open URL like https://wa.me/?text=${encodeURIComponent(title + " " + url)}
   - X share: https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}
   - Facebook share: https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}
   - Copy: navigator.clipboard.writeText(url) + toast/snackbar (“Link copied”)
   - Bookmark: toggle state; for MVP store in localStorage keyed by article id or slug
     localStorage key suggestion: footballmad:bookmarks (JSON array of ids/slugs)
     Icon changes (outline vs filled) and toast (“Saved” / “Removed”)

C) Styling
   - Icon buttons: 36–40px rounded-full, hover:bg-muted, focus ring
   - Keep minimal and consistent with existing design system

D) Hook up in article.tsx
   - After Title, render <ArticleMetaBar ... />
   - Remove old Share card from sidebar (desktop)
   - Ensure excerpt block uses full text (no clamp) and optionally italic / tinted:
     class suggestion: text-muted-foreground italic leading-relaxed
   - Ensure “In this article” sections appear BEFORE Related Articles

E) Don’t trigger end-to-end regression runs or video recording; focus only on implementation and light local sanity checks.
   - Validate by running the app and visually confirming:
     - Desktop: actions inline with meta row, sidebar share card gone
     - Mobile: sticky share still works and doesn’t overlap content badly
     - Excerpt shows full text
     - In this article grouped correctly and positioned above related

DELIVERABLE
Make the changes, ensure build passes, and provide a brief summary of what changed and where.

---

Update the article page layout + entity grouping (no E2E tests, no videos, keep changes minimal and focused).

1) Add subtle dividers in client/src/pages/article.tsx:
- Add a thin horizontal divider between the Title and the Meta row (ArticleMetaBar).
- If an excerpt/standfirst is rendered, add a divider between the excerpt and the start of the article body.

2) Excerpt/standfirst rules:
- Only render the excerpt block if article.excerpt exists AND has non-whitespace content.
- Keep the current styling (slightly muted text + italic), but remove any truncation/line-clamp so it displays full text.
- If excerpt is empty, do not render the excerpt section at all (no blank spacing).

3) Fix “In this article” grouping so Teams and Managers appear correctly:
- In client/src/pages/article.tsx, build grouped arrays from a single normalized entities list.
- Use entity.type to bucket into:
  - competitions (type === "competition")
  - teams (type === "team")
  - players (type === "player")
  - managers (type === "manager")
- If current data uses inconsistent type values, add a lightweight normalization function that maps common variants:
  - "club" -> "team"
  - "person" -> if entity.role === "manager" then "manager" else "player"
  - "coach" -> "manager"
  - "league" or "tournament" -> "competition"
- Ensure Arsenal/Chelsea render under Teams, and Mikel Arteta renders under Managers (not Players).
- De-dupe entities by slug (or id) within each group.
- Render group headings in this order: Competitions, Teams, Players, Managers.
- Only render a group if it has at least 1 pill.

4) Keep mobile order sensible:
- “In this article” should remain above Related Articles.
- Do not move it below newsletter signup / share on mobile.

After changes:
- /news/:slug shows Title -> divider -> Meta row -> Hero -> Excerpt (if present) -> divider -> Body -> In this article (grouped correctly) -> Related Articles.

---

FOOTBALL MAD — Fix article page hierarchy, excerpt, entity grouping, and mobile share UX (NO E2E / NO video regression runs).

Context:
- Article page is /news/:slug (React + Tailwind)
- Entity pills exist (EntityPill component)
- Current problems:
  1) Excerpt is being cut off/truncated — must show full excerpt
  2) “In this article” grouping is wrong: Teams + Managers appear under Players
  3) Mobile UX: share icons appear in meta row AND there is a “Share this article” block AND sticky share bar (overkill)
  4) Mobile: “In this article” appears below newsletter/signup/share blocks — it must appear immediately after article body
  5) Cards only show competition pill — should show competition + up to 2 teams when available

Hard requirements:
- Do NOT add any hardcoded KNOWN_MANAGERS lists.
- Do NOT rely on Ghost tags for entity typing. Use our extracted entities / Goalserve-backed entity types.
- Do NOT run end-to-end/regression testing tools (Playwright/Cypress) or generate videos.
- Keep changes minimal and well-structured.

Tasks:

A) Make entity typing first-class (backend)
1) Update the server-side article/entity extraction so every pill entity includes a reliable type:
   - competition | team | player | manager
2) Ensure article payload includes these grouped arrays (or a single entities[] array with type field):
   - competition?: EntityData
   - teams: EntityData[]
   - players: EntityData[]
   - managers: EntityData[]
3) The typing source of truth:
   - If we already have an entities table with type/role, use that.
   - If we store people with a role (player/manager), use that role.
   - If we only have Goalserve IDs, infer via Goalserve entity category mapping (player vs coach/manager).
4) Ensure the News list API and Article API both return enough data for pills:
   - competition + up to 2 teams for cards
   - full grouped entities for article page

B) Fix excerpt truncation (frontend)
1) Find the excerpt rendering in client/src/pages/article.tsx.
2) Remove any tailwind classes like line-clamp-*, truncate, max-h, overflow-hidden that cause cut-off.
3) Render the excerpt as full text.
4) Add a rule: only show excerpt if it exists AND it is not effectively the same as the first paragraph of the body (simple heuristic is fine: compare normalized first ~140 chars). If duplicate, hide excerpt.

C) Correct article page layout and dividers
Desktop order:
- Pills row (competition + teamA + teamB)
- Title
- Divider
- Meta row with inline share icons + bookmark (Substack-style) (keep as-is on desktop)
- Hero
- Excerpt (if shown) styled muted + italic
- Divider (only if excerpt shown)
- Body
- Divider
- “In this article” grouped: Competitions, Teams, Players, Managers (only show group if it has items)
- Related articles

Mobile rules:
1) Hide the inline share icons/bookmark in the meta row on small screens (keep only author/time/read/views).
2) Remove the bottom “Share this article” block entirely on mobile (or remove it globally if redundant).
3) Keep the sticky bottom share bar as the ONLY share CTA on mobile.
4) Ensure “In this article” section appears immediately after the article body on mobile (before any newsletter/signup blocks).
   - If newsletter/signup is in right rail on desktop, keep it there; but on mobile it stacks, so position “In this article” before that stack.

D) Fix “cards only show competition pill”
1) In article-card.tsx (or wherever pills are computed), render:
   - competition pill always if present
   - plus up to 2 team pills if present (home/away or first two teams)
2) Use EntityPill with iconUrl when available.

E) Add small debug aids (optional)
- Add console.debug only behind a simple DEV guard (import.meta.env.DEV) if you need it. Remove noisy logs.

Deliverables:
- Implement changes with clean types in shared/schema.ts
- No hacks, no hardcoded manager lists
- Verify manually by loading:
  - /news page cards show competition + teams
  - An article shows correct grouping (Teams separate, Managers separate)
  - Excerpt not truncated
  - Mobile shows no inline share icons; sticky share remains; “In this article” is above newsletter/signup

---

You are working in the Football Mad Replit project.

GOAL
Fix two regressions on the Article page:

1) “In this article” only shows the Competition pill (Premier League) and no Teams / Players / Managers.
2) On mobile, the bookmark icon looks orphaned/out of place after hiding the inline share icons.

IMPORTANT
- Do NOT run end-to-end regression tests, do NOT generate videos, and do NOT run expensive test suites. Keep changes tight and verify with quick manual page refresh + console checks only.

WHAT’S HAPPENING (ROOT CAUSE)
- We recently switched “In this article” to rely on backend entity arrays: entityTeams/entityPlayers/entityManagers.
- Those arrays are empty for most articles right now because the junction tables aren’t populated yet (entity links not backfilled), so the UI loses pills.
- We need a graceful fallback: if backend entity arrays are empty, derive pills from the existing article tags/people/teams fields that already exist on the article payload.
- On mobile, we hid share icons but left bookmark inside the “actions” area, so it ends up alone and visually weird. We should reposition it into the meta row (right-aligned) on mobile.

IMPLEMENTATION PLAN (SMALL + SAFE)
A) Restore “In this article” pills with robust fallback
- File: client/src/pages/article.tsx
- Create a helper that builds four pill groups:
  - competitions
  - teams
  - players
  - managers
- Priority order:
  1) Use backend entity arrays if they contain any items.
  2) If ALL backend entity arrays are empty, fall back to legacy fields:
     - competition + other competitions/cups from article taxonomy/tags if present
     - teams from article team tags / known team fields (whatever exists in the payload today)
     - persons from article people tags, then split players vs managers by role if available; if role is NOT available, keep as “People” (or put all in Players for now but NOT mixing teams into players).
- Ensure we never mix Team pills into Players.
- Dedupe pills by `${type}:${slug}`.
- Keep ordering stable: Competitions → Teams → Players → Managers (only render a group if it has at least 1 pill).

B) Fix bookmark placement on mobile
- File: client/src/components/article-meta-bar.tsx
- On desktop (md+): keep the current layout (meta left, share+copy+bookmark right).
- On mobile (<md):
  - Hide share icons (as you already did), BUT render the bookmark button inline on the same row as the author/meta, aligned right (ml-auto).
  - It should not sit on a separate row by itself.
  - Add a subtle tooltip/title + aria-label for accessibility.

C) Quick verification
- Manually open one known article that has teams/people tags (e.g. the Jurrien Timber one).
- Confirm “In this article” shows:
  - Competitions: Premier League (+ Carabao Cup if available)
  - Teams: Arsenal, Chelsea
  - Players: Jurrien Timber, Kai Havertz
  - Managers: Mikel Arteta
- Confirm on mobile:
  - Meta row shows author/time/read/views on left; bookmark icon on the right.
  - No duplicate “Share this article” block (sticky share bar is enough).

DETAILED CODE CHANGES

1) client/src/pages/article.tsx
- Find where we currently build the “In this article” groups from:
  - article.competition
  - article.entityTeams / entityPlayers / entityManagers
- Replace that logic with something like:

  - const backendHasEntities =
      (article.entityTeams?.length || 0) +
      (article.entityPlayers?.length || 0) +
      (article.entityManagers?.length || 0) > 0;

  - Build pill arrays from backend if backendHasEntities.
  - Else build from legacy fields:
      - teams: derive from article.teams / article.teamTags / article.taxonomy?.teams (whatever exists)
      - people: derive from article.people / article.personTags / taxonomy persons
        - split managers vs players using role if present.
        - If role is missing, put into Players but only if it’s actually a person entity.
      - competitions: include article.competition plus any extra comps/cups present in taxonomy

- Convert everything into the same EntityData shape used by EntityPill:
  { type, name, slug, href, iconUrl?, fallbackText?, color? }

- Ensure hrefs match your routing:
  - Competition: `/competitions/${slug}` (or whatever your competition hub route is)
  - Team: `/teams/${slug}`
  - Player: `/players/${slug}`
  - Manager: `/managers/${slug}`
  (If your current app uses `/entity/...` routes, use those instead. Follow existing patterns in the codebase.)

- Dedupe function:
  - function dedupe(list) => Map key `${type}:${slug}`

- Render groups:
  - Competitions
  - Teams
  - Players
  - Managers

2) client/src/components/article-meta-bar.tsx
- Adjust the JSX so that on mobile the bookmark is part of the left meta row, not in a hidden right-side action row.
- Example approach:
  - Wrap the “left” portion in a flex row
  - Add bookmark button with `className="ml-auto md:hidden"` so it shows on mobile and aligns right.
  - Keep the full action button set wrapped in `className="hidden md:flex ..."` for desktop.

- Result:
  - Mobile: author/meta left, bookmark right
  - Desktop: author/meta left, share/copy/bookmark right

DO NOT TOUCH
- Backend schema or backfills in this prompt.
- Any long-running data jobs.
- Any E2E/regression suites.

Now implement A + B exactly as above, keeping the diff minimal and focused.

---

We hit a React hook-order crash: “Rendered more hooks than during the previous render” at client/src/pages/article.tsx around line ~610 where useMemo is called.

CAUSE
A hook (useMemo and/or new useQuery hooks) is being called conditionally or after an early return. On one render path the component returns before reaching that hook; on another render it reaches it, changing hook count/order.

GOAL
Fix hook order by ensuring ALL hooks (useQuery/useMemo/useEffect/etc) are invoked unconditionally at the top of the ArticlePage component before any returns.

CONSTRAINTS
- Keep changes minimal.
- Do NOT run end-to-end/regression tests.
- No video generation.
- Verify via quick refresh only.

DO THIS

1) Open client/src/pages/article.tsx and find the ArticlePage component.
2) Identify any early returns like:
   - if (isLoading) return ...
   - if (error) return ...
   - if (!article) return ...
3) Ensure every hook call is ABOVE those returns, including:
   - the useMemo that builds pills
   - any new useQuery calls for /api/players or /api/managers
   - any useEffect added for fallback logic

4) If we currently call useQuery conditionally (e.g. only when backend entities empty), refactor to call it ALWAYS but gate network with enabled:
   - const playersQuery = useQuery({ queryKey: ["players"], queryFn: fetchPlayers, enabled: !!article });
   - const managersQuery = useQuery({ queryKey: ["managers"], queryFn: fetchManagers, enabled: !!article });

5) Move the pills useMemo so it is ALWAYS executed:
   Example pattern:

   const article = articleQuery.data?.article;

   const players = playersQuery.data ?? [];
   const managers = managersQuery.data ?? [];

   const { articleTeams, competitionPills, playerPills, managerPills } = useMemo(() => {
     const tags = article?.tags ?? [];
     // build pills safely even if article is undefined
     return { articleTeams: [], competitionPills: [], playerPills: [], managerPills: [] };
   }, [article, players, managers]);

6) After hooks are defined, keep the render guards (loading/error/not found) as-is BELOW the hooks.

7) Make sure no hook is inside a block like:
   - if (article) { useMemo(...) }
   - if (fallback) { useQuery(...) }
   - return (...) before a hook later

RESULT
The overlay should disappear, and the article page should render again.

Finally, quickly refresh the Jurrien Timber article page and confirm it loads without the hook-order error.

---

You are working in the Football Mad Replit project.

Goal
On MOBILE only, shorten EntityPill labels for competitions + teams (e.g. [EPL] [ARS] [CHE]) while keeping full names on desktop/tablet. Keep accessibility: screen readers should still get the full entity name.

Implement with minimal risk:
- Extend the shared EntityPill component so it can optionally render a short label on small screens.
- Compute short codes for Team + Competition pills (prefer real codes from data if present; otherwise fallback).
- Apply this to the Article page header pills AND the “In this article” section.

Requirements
1) Update `client/src/components/entity-pill.tsx`
   - Add optional props:
     - `shortLabel?: string`
     - `responsiveLabel?: boolean` (default true when shortLabel is provided)
   - Rendering:
     - If `responsiveLabel && shortLabel`:
       - On small screens (<md): show `shortLabel`
       - On md+: show `entity.name`
     - Always set `title={entity.name}` and `aria-label={entity.name}` on the link/button wrapper.
     - Don’t change styling/layout otherwise (keep current pill sizing).
   - Example pattern:
     - `<span className="md:hidden">{shortLabel}</span>`
     - `<span className="hidden md:inline">{entity.name}</span>`
     - If no shortLabel, just render `entity.name` as today.

2) Update `client/src/pages/article.tsx`
   - Wherever you build the pill arrays (competitionPills, team pills, etc), add `shortLabel` values for:
     a) Teams:
        - Prefer any existing code/shortCode fields already available from backend entities if present (e.g. `team.shortCode`, `team.code`, `team.abbr` etc)
        - Else fallback to:
          - If name contains spaces, use first letter of first 3 words (e.g. “Manchester City” => “MCI”)
          - Else take first 3 letters uppercased (e.g. “Arsenal” => “ARS”)
     b) Competitions:
        - Add a small mapping for common comps (keep it local in article.tsx):
          - “Premier League” => “EPL”
          - “Championship” => “EFL”
          - “League One” => “L1”
          - “League Two” => “L2”
          - “Carabao Cup” => “CC”
          - “FA Cup” => “FAC”
          - “Champions League” => “UCL”
          - “Europa League” => “UEL”
          - “Conference League” => “UECL”
        - Fallback if not in map: create a 3–4 char acronym from first letters of words (ignore “the”, “and”, “of”)
   - Attach the computed shortLabel onto the `EntityData` you pass into EntityPill (you can extend the local `EntityData` type to include `shortLabel?: string` without breaking other uses).
   - When rendering EntityPill for competition/team pills (header + “In this article”), pass:
     - `shortLabel={entity.shortLabel}`
     - `responsiveLabel={true}`
   - Do NOT shorten Player/Manager names on mobile (keep full names).

3) Verify
   - Desktop: pills show full names exactly as now.
   - Mobile:
     - Header pills show e.g. EPL / ARS / CHE
     - “In this article” competition + teams show short codes
     - Players remain full names
   - Hover/links still work, titles show full names.

4) Keep changes scoped
   - Only touch `entity-pill.tsx` and `article.tsx` unless TypeScript forces a tiny shared type tweak.
   - No visual redesign; just label text switching.

After implementation, add a quick `console.debug` (temporary) in article.tsx that logs computed shortLabels for header pills, then remove it before finishing.

Make the changes now. Do NOT run end-to-end/regression tests. No video generation.

---

You are working in the Football Mad MVP Replit project. Implement Goalserve-powered MANAGER (coach) entities end-to-end (ingestion + DB + API + entity linking surface), following the existing patterns already used for competitions/teams/players.

GOALS
1) Ingest managers/coaches from the Goalserve feed (per team) and upsert them into the DB.
2) Maintain a relationship between managers and teams (current club).
3) Expose managers via API (list + by team).
4) Ensure article entity payloads can include entityManagers (already supported by the frontend) once junction rows exist.
5) Do NOT add E2E tests. Keep changes small, consistent with existing code style.

STEPS (DO THESE IN ORDER)

A) AUDIT EXISTING STRUCTURE
- Locate where Goalserve data is fetched + parsed (likely backend ingestion jobs/services).
- Identify how teams + players are currently seeded (e.g., “squads”, “teams”, “competition teams” ingestion).
- Identify DB layer (drizzle schema + storage.ts repository methods).
- Identify existing API routes file(s) where /api/news, /api/teams etc are defined.

B) DATABASE: MANAGERS TABLE + TEAM RELATION
1) If a managers table does NOT exist, create it using the same approach as teams/players:
   - columns (minimum):
     - id (string) => Goalserve manager/coach id if available; otherwise derive a stable id (see fallback rules below)
     - name (string, required)
     - country (string, nullable)
     - teamId (string, nullable) => current team (Goalserve team id)
     - slug (string, required) => slugified name (plus id suffix if needed for uniqueness)
     - updatedAt (timestamp)
     - createdAt (timestamp)
   - indexes:
     - unique on id
     - index teamId
     - index slug

2) If schema/migrations exist, add the migration; if project uses “drizzle push” style, update the schema accordingly.

C) INGESTION: EXTRACT MANAGER FROM GOALSERVE TEAM FEED
1) Find the existing team/squad ingestion that iterates teams.
2) For each team record fetched from Goalserve, attempt to extract coach/manager using these flexible rules (because Goalserve format can differ):
   - Look for fields/paths commonly used:
     - coach, manager, head_coach, trainer
     - within <team> node: <coach>, <manager>
     - sometimes nested: team.coach.name / team.manager.name
   - Capture:
     - managerId (Goalserve coach id if present)
     - managerName (string)
     - managerCountry (string if present)
3) UPSERT into managers table:
   - If managerId exists: use it as primary id.
   - If managerId is missing: derive id as:
     - `mgr_${teamId}_${normalizedName}` where normalizedName is slugified, ascii-normalized (strip accents), lowercased.
   - Always set teamId = current team’s Goalserve id.
   - Always compute slug:
     - slugify(name)
     - if slug already used by a different id, suffix with `-${id.slice(-6)}` or similar stable suffix.
4) Ensure ingestion is idempotent and safe:
   - If a manager changes team, update teamId (this is the whole point).
   - If a team feed returns no manager, do NOT delete existing managers; just skip update for that team.

D) STORAGE LAYER METHODS
In storage.ts (or equivalent repository):
- add methods:
  - upsertManager(manager)
  - upsertManagers(managers[])
  - getAllManagers()
  - getManagersByTeamId(teamId)
  - (optional) getManagerBySlug(slug)
Follow existing patterns used for players/teams (drizzle insert ... onConflictDoUpdate if available).

E) API ROUTES
In the API routes file:
- Add:
  - GET /api/managers => returns all managers (optionally supports ?teamId=)
  - GET /api/teams/:teamId/managers => returns managers for a team (or just support query param on /api/managers)
- Return minimal JSON:
  - [{ id, name, country, teamId, slug }]

F) ARTICLE ENTITY SUPPORT (DON’T GUESS MANAGERS)
- Remove any hardcoded KNOWN_MANAGERS logic if it still exists.
- Article page already expects entityManagers arrays when present.
- Ensure the article API response for a single article continues to include:
  - entityTeams, entityPlayers, entityManagers
- If a junction table for article-managers exists, leave as-is.
- If it does NOT exist, create article_managers junction table:
  - articleId, managerId
  - unique constraint on (articleId, managerId)
  - add storage methods to attach managers when importing/processing article tags (see next step).

G) OPTIONAL (BUT VERY VALUABLE): AUTO-LINK MANAGERS TO ARTICLES VIA TAG MATCHING
When building article entities (where you already link teams/players via tags):
- Add manager linking:
  - Normalize strings (lowercase + strip accents) so “Mikel Arteta” matches reliably.
  - Match tags against managers.name
  - Insert into article_managers junction (de-dupe)
This will immediately populate entityManagers for existing articles without manual work.

H) LOGGING + SAFETY
- Add console.debug logs behind an environment guard if one exists (e.g., DEBUG_INGESTION).
- Avoid breaking existing ingestion; if manager extraction fails for a team, catch and continue.

I) QUICK VERIFICATION (NO E2E)
- Add a quick manual check:
  - Run ingestion once
  - Hit /api/managers and confirm non-empty list (assuming Goalserve provides coach fields for at least some teams)
  - Verify a known team returns a manager (e.g., Arsenal => Arteta) if present in feed
  - Confirm no runtime errors in article page.

DELIVERABLES
- Implement code changes across:
  - drizzle schema/migration (if needed)
  - ingestion job/service
  - storage.ts methods
  - routes
  - article entity linking (optional step G highly recommended)
- Keep diffs clean and consistent with existing style.
- After implementation, print a short summary of files changed and how to verify (endpoints + sample curl).

IMPORTANT
- Do not invent fake Goalserve endpoints. Inspect the existing Goalserve fetch code and extend it to parse manager fields from the responses you already have.
- If the feed is XML, parse with the project’s existing XML parser. If JSON, follow that structure.
- Use accent-stripping normalization when matching names.

Now implement this.

---

In this Replit project, I need you to VERIFY (not assume) that Goalserve provides manager/coach data and that our sync job ingests it correctly.

DO THIS:

1) Add a small “Goalserve inspector” utility that fetches ONE known team payload and ONE league payload (whatever endpoints we already use for teams/players) and logs ONLY the relevant manager/coach fields.
   - Do NOT invent new endpoints. Find the exact Goalserve fetch code currently used for team/player ingestion and reuse those same functions/config/env vars.
   - For each fetched payload, console.log a compact object like:
     {
       teamId,
       teamName,
       managerCandidatePathsFound: [
         { path: "team.coach.name", value: "..." },
         { path: "team.manager", value: "..." }
       ]
     }
   - Search for common variants: coach, manager, head_coach, trainer (including nested name/id/country).

2) Add an admin-only API endpoint to run the inspector for a list of 5 Premier League teams (use existing team IDs already in our DB if possible).
   - Example: GET /api/admin/inspect-goalserve-managers?limit=5
   - Response should include the compact objects above.
   - Keep it safe: hide secrets; don’t dump full payloads.

3) Update the manager sync job so it uses the exact same parsing logic as the inspector:
   - Extract goalserveManagerId if present, else derive deterministic id.
   - Upsert managers and set currentTeamId/teamId.
   - Must be idempotent and must update teamId when a manager changes clubs.

4) Add a verification endpoint:
   - GET /api/admin/verify-managers
   - Returns:
     {
       managersCount,
       managersWithTeamCount,
       sample: [
         { id, name, currentTeamId/teamId, slug }
       ]
     }

5) After changes:
   - Run the inspector first and confirm manager fields exist in Goalserve responses.
   - Then run the sync job.
   - Then call /api/admin/verify-managers and confirm managersCount > 0.
   - If manager fields are NOT found in the responses we’re using, stop and report exactly what Goalserve returned (paths checked, none found) and recommend the correct existing feed in our codebase to use instead (team/squad endpoint).

IMPORTANT:
- Do not add E2E tests.
- Keep diffs minimal and follow existing patterns in routes/storage/jobs.
- Do not break existing team/player ingestion.
- Do not print full Goalserve payloads; only log/return the small extracted structures and found paths.

Implement now.

---

Implement “unlimited” entity pills in the Article footer, sorted by salience, with a clean UX (collapsed groups + “Show more”), while keeping card/header pills as [Competition][Team A][Team B] sourced from TAGS ONLY.

REQUIREMENTS (do exactly this):

A) Card pills + Article header pills (NO CHANGE IN BEHAVIOUR)
- Continue to render: [Competition] [Team A] [Team B]
- These MUST be derived from TAGS ONLY (via entityAliases → competitions + teams).
- Do NOT pull players/managers into the header/card pills.

B) “In this article” footer (UNLIMITED lists)
- Render 4 groups (only if group has items):
  1) Competitions
  2) Teams
  3) Players
  4) Managers
- Competitions/Teams: primarily from TAGS (via entityAliases).
- Players/Managers: from MENTION EXTRACTION (title + excerpt + body) matched against DB entities.
- No hard cap on number of pills in any footer group.

C) Salience sorting (so big lists still feel smart)
Compute a “salienceScore” per linked entity on the article:
- Base rules:
  +50 if entity name appears in TITLE (normalized match, accent-insensitive)
  +25 if appears in EXCERPT
  +10 if appears in first 300 words of BODY
  + (min(30, count * 3)) where count is number of occurrences in BODY (normalized, accent-insensitive)
- Use this score to sort within Players and Managers descending.
- For Teams and Competitions, sort tagged ones first; within tagged, optionally apply the same scoring; tie-break alphabetically.
- De-dupe by entity id.

D) Persist provenance + score on junction tables (so it’s fast + auditable)
For each junction table (articleTeams/articlePlayers/articleManagers/articleCompetitions):
- Ensure these columns exist (add via migration / drizzle):
  - source TEXT NOT NULL DEFAULT 'tag'   (values: 'tag' | 'mention' | 'manual')
  - sourceText TEXT NULL
  - salienceScore INTEGER NOT NULL DEFAULT 0
  - confidence REAL NULL (keep if already added; ok if unused for now)
- When linking from tags:
  - source='tag', sourceText=<original tag name>, salienceScore=0
- When linking from mentions:
  - source='mention', sourceText=<matched entity name>, salienceScore=<computed score>

E) Where to compute + store links
1) In the Ghost upsert/article processing pipeline in server/routes.ts (where we already:
   - upsert the article
   - call extractEntityMentions
   - insert into junction tables)
Do:
   i) Tag-based linking first (competitions + teams; and optionally players if tags include people)
  ii) Mention-based linking second for players/managers (and optionally teams/competitions if you want later; for now players+managers is enough)
 iii) Use onConflictDoUpdate to update salienceScore/source/sourceText when a link already exists.
      - Precedence: if an existing row is source='tag', DO NOT downgrade to 'mention'
      - But DO allow salienceScore to update if mention score is higher (store max).

2) Update /api/articles/:slug (or the existing article endpoint used by client/src/pages/article.tsx) to return:
- entityCompetitions[] with { id, name, slug, iconUrl?, shortName?, source, salienceScore }
- entityTeams[] same
- entityPlayers[] same
- entityManagers[] same
(Keep existing fields; just add these properties.)

F) Frontend UX: collapsed groups with “Show more”
In client/src/pages/article.tsx:
- “In this article” should appear immediately after the article body (already desired).
- For each group:
  - Show a single “collapsed” view by default:
    - desktop: show up to ~2 rows worth of pills using CSS line-clamp style layout (NOT a data cap)
    - mobile: show up to ~1 row worth
  - Then show a small button link: “Show more (N)” / “Show less”
    - This expands that group only.
- IMPORTANT: This is NOT a hard cap; it’s progressive disclosure.
- Keep your existing EntityPill component.
- Keep the new shortcodes on mobile (EPL/ARS/CHE etc) working as it currently does.

G) Verification steps (add to replit.md)
Provide curl commands to verify:
1) Article endpoint returns entityPlayers/entityManagers with non-zero salienceScore.
2) A known long roundup article shows many pills in each group.
3) Header pills remain comp+teams only.

CONSTRAINTS:
- Do NOT add E2E/regression tests.
- Do NOT enable Replit video/test generation.
- Keep diffs minimal and follow existing project patterns (storage.ts, routes.ts, schema.ts, migrations).
- Ensure all matching is accent-insensitive and case-insensitive (use the existing normalize helper if present; otherwise add a small normalizeText util used consistently).

Implement now.

---

You are working on Football Mad (React + Node/Express + DB). We have entity pills: Competitions, Teams, Players, Managers.

PROBLEM:
Premier League is showing as a default pill across /news cards, article header, and footer even when the article is about another competition (e.g. Carabao Cup) and "Premier League" is not mentioned. Also, pill order is inconsistent (mixed order).

GOAL:
Implement consistent, tag-first entity selection for cards + header, and tag-first + mention-supplemented grouping for the "In this article" footer.
Remove "league fallback pollution" so Premier League only shows when supported by tags or mentions.
Enforce stable ordering: Competitions → Teams → Players → Managers.

REQUIREMENTS / RULES:

A) NORMALIZATION + MATCHING
- Add a shared normalizeText(str) helper used everywhere:
  - lowercases
  - trims
  - removes diacritics (NFD) and non-alphanumerics except spaces
  - collapses whitespace
- Use it to match tags against known entity names/aliases.

B) BUILD ENTITY SETS (SOURCES + SCORING)
Create a single function on the server (preferred) or client (acceptable) that returns:
{
  competitions: Array<{id,name,slug,source,score}>,
  teams: Array<{id,name,slug,shortName,source,score}>,
  players: Array<{id,name,slug,source,score}>,
  managers: Array<{id,name,slug,source,score}>
}

Sources and scores:
- tag match: source="tag", score=100
- extracted entity mention (existing entity linking / articleEntities): source="mention", score=60
- article.competition fallback: source="fallback", score=10 (ONLY allowed if there are NO competition tags AND the competition is mentioned in body OR excerpt; otherwise DO NOT include it)
- NEVER include Premier League (or any competition) solely due to article.competition if it is not supported by tag or mention.

C) CARD + HEADER PILL SELECTION
Implement a helper selectTopPills(articleEntities):
- competitionPill: pick highest score competition (prefer tags). If multiple competitions have same score, pick the one that appears in tags first order.
- teamPills: pick up to 2 teams, highest score first (prefer tags). Stable order using score desc then name asc.
- optionalThirdPill: pick top player OR manager with highest score >=60 (mentions/tags only), else none.
Return pills in strict order: [Competition] [Team A] [Team B] [Optional Player/Manager].
On mobile, keep shortcodes (already implemented).

D) FOOTER ("IN THIS ARTICLE") GROUPS
Render 4 sections in this exact order, only if non-empty:
Competitions, Teams, Players, Managers.
Data rules:
- Competitions: include tag competitions + mention competitions. Exclude fallback competitions unless supported as per rule B.
- Teams: include tag teams + mention teams.
- Players/Managers: include mention entities; include tag entities only if they match real players/managers.

E) ORDER + DEDUPE
- Deduplicate by entity id (preferred) or normalized name fallback.
- Sorting within each group: score desc, then name asc.

F) FIX CURRENT REGRESSION:
- /news cards currently show Premier League as default. Remove this behavior.
- Article header currently shows Premier League even when Carabao Cup is the tag. Fix so Carabao Cup wins if tagged.
- Footer currently shows Premier League even when not mentioned. Fix using scoring rules above.

G) IMPLEMENTATION LOCATION
Preferred: do entity assembly server-side in the article API (e.g. getArticleWithEntities) so client only renders.
If you keep any logic client-side, keep it in one place and reuse for cards/header/footer.

H) TESTS / VERIFICATION (provide curl commands + expected behavior)
Add/confirm endpoints:
- GET /api/articles/:id (or slug) returns entities with sources+scores.
- Use existing INGEST_SECRET auth header for admin endpoints if needed.

Provide verification steps:
1) For the "Marc Guehi unable to play..." article, ensure:
   - Cards + Header show: [Carabao Cup] [Man City] [Marc Guehi] (player optional if detected strongly; if not, omit player)
   - NOT Premier League unless it is in tags or mentioned.
2) For a normal Arsenal Premier League article:
   - Shows [Premier League] [Arsenal] [Opponent if tagged] and footer includes relevant players/managers.

DELIVERABLES:
- Implement the fix.
- Point out the exact files changed.
- Provide 3-5 curl commands and what I should see.
- Ensure build passes and no hook-order errors (avoid conditional hooks; keep hooks stable).

Proceed without asking me questions. No E2E tests or videos.

---

You are working in the Football Mad Replit codebase.

GOAL
Fix 3 UX issues around entity pills:
1) Desktop news cards should show FULL pill labels (e.g. “Carabao Cup”, “Man City”) — NOT shortcodes.
2) Article header pills should remain SHORTCODES on mobile only (e.g. “CC”, “MCI”), but show FULL labels on desktop.
3) “In this article” footer:
   - Remove ALL “Show more” / clamping / collapsible behaviour (always show all pills).
   - Competitions + Teams should display FULL labels even on mobile.
   - Players + Managers can remain full labels (also fine).

CONSTRAINTS
- Do not change the entity selection/scoring logic (tag=100, mention=60, fallback=10 etc). Only change DISPLAY + footer behaviour.
- Keep the existing EntityPill look/shape; only adjust what text it renders.

IMPLEMENTATION PLAN
A) Add display options to EntityPill
- Update the EntityPill component to accept optional props:
  - `labelMode?: "full" | "short"`
  - `shortLabel?: string | null` (already often available as team.shortName; competitions may have a shortcode field or we can derive a fallback)
- Behaviour:
  - If labelMode === "short" and shortLabel exists => render shortLabel
  - Else render the full label (existing behaviour)
- Default labelMode should be "full" (so desktop naturally shows full unless explicitly set)

B) Create a tiny responsive hook/helper for “isMobile”
- Add `useIsMobile()` hook in `client/src/hooks/use-is-mobile.ts` (or similar) that returns boolean using `matchMedia("(max-width: 640px)")`
- Use it only where we need conditional labelMode (article header pills). Avoid using it everywhere.

C) Fix News card pills (desktop full)
- In `client/src/components/article-card.tsx` (or wherever your news card lives), ensure you DO NOT force labelMode="short".
- If you currently use shortcodes globally, remove that.
- Result: card pills render full labels on desktop; on mobile, it’s okay if they remain short OR full, but per requirement: desktop must be full.

D) Fix Article header pills (mobile shortcodes only)
- In `client/src/pages/article.tsx` where header pills are rendered:
  - Use `const isMobile = useIsMobile();`
  - Pass `labelMode={isMobile ? "short" : "full"}` to Competition + Team pills in the header.
  - Provide `shortLabel`:
    - Teams: use `team.shortName` if present, otherwise derive 3-letter from name.
    - Competitions: use existing shortcode if you have one; otherwise:
      - “Carabao Cup” => “CC”
      - “Premier League” => “EPL”
      - “Champions League” => “UCL”
      - “Europa League” => “UEL”
      - “Conference League” => “UECL”
      - Else derive initials (first letters of words, max 4)
  - IMPORTANT: This mobile-only shortcode behaviour is ONLY for the header pills row.

E) Remove “Show more” / clamping in “In this article”
- Locate the collapsible/clamping component introduced earlier (e.g. `CollapsibleEntityGroup` or any ResizeObserver overflow logic).
- Delete it OR refactor it to a simple `EntityGroup` that:
  - Renders group title + all pills, no measurement, no state, no toggles.
- In the footer:
  - Competitions group pills: force FULL labels always => `labelMode="full"`
  - Teams group pills: force FULL labels always => `labelMode="full"`
  - Players & Managers: render full labels (default) (no shortcodes)

FILES TO TOUCH (expected)
- `client/src/components/entity-pill.tsx` (or wherever EntityPill is)
- `client/src/hooks/use-is-mobile.ts`
- `client/src/components/article-card.tsx`
- `client/src/pages/article.tsx`
- Remove/refactor any footer clamping component (wherever it currently lives)

ACCEPTANCE TESTS
1) Desktop /news:
- Marc Guehi card shows pills: “Carabao Cup” and “Man City” (NOT “CC”, “MCI”).
2) Mobile article header:
- Header pills show shortcodes (e.g. “CC”, “MCI”).
3) Desktop article header:
- Header pills show full labels.
4) Mobile “In this article”:
- Competitions shows “Carabao Cup” (full), Teams shows “Man City” (full), Players/Managers show full names.
- No “Show more” links anywhere.

After changes, run the app and verify with the Marc Guehi article and /news list. No end to end testing, and no videos. 

---