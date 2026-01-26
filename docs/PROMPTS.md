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

