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

