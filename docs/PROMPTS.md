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

