# Football Mad – Architecture & Product Decisions

---

## URL as Single Source of Truth
Status: Adopted

- All filters, tabs, and navigation state derive from the URL
- Prevents UI desync
- Enables deep linking and shareable states
- Improves SEO and analytics clarity

---

## No `/latest` Route for Team Hubs
Status: Adopted

- Latest content is the default state of `/teams/[slug]`
- Avoids duplicate content URLs
- Simplifies routing and navigation
- Clean canonical structure

---

## useLocation Over useParams for Tabs
Status: Adopted

- `useParams` does not reliably re-render on nested route changes
- `useLocation().pathname` guarantees accurate tab state
- Eliminates edge cases when returning to default routes

---

## Filtered News Pages Set to noindex
Status: Adopted

- Prevents SEO dilution from infinite filter combinations
- Canonical URLs point to base competition pages
- Crawl budget focused on high-value content

---

## Subtle UI Polish Over Heavy Redesign
Status: Adopted

- Focus on:
  - Button lift
  - Visual hierarchy
  - Interaction feedback
- Avoided visual noise
- Preserves long-term brand flexibility

---

## Team Hubs as Core Platform Surface
Status: Adopted

- Team hubs are first-class destinations
- All team-related content routes through the hub
- Enables:
  - Team newsletters
  - Fan communities
  - Monetisation opportunities

---

## Modular Expansion Strategy
Status: Adopted

- Platform built in scalable modules
- Supports future expansion without re-architecture
- Enables:
  - Personalisation
  - Logged-in experiences
  - Multi-league growth

---

## Open Decisions (Future)
- Fan reputation / karma system
- Team-specific landing page strategy
- Homepage personalisation logic
- Merch and affiliate integration

---

## Guiding Principle
Optimise for long-term scalability, SEO safety, and product clarity over short-term hacks.

---

## PA Media / Ghost Migration Timing
Status: Deferred

- Decision: Do not integrate Ghost or PA Media ingestion during Phase 1.
- Rationale:
  - Platform schema still evolving
  - UX and navigation take priority
  - Existing FootballMad.co.uk pipeline is stable
- Plan:
  - Use seed content during platform build
  - Revisit ingestion in Phase 3 once routes and schemas are final

---

## Article Pages & Editorial Pills Ordering
Article pages will open at scroll top on route change and follow a Substack-style hierarchy: editorial pills → headline → meta → taxonomy → hero → body.

---

# Decisions — Day 2

## Injuries & Availability

### Percentage Badge
Decision: REMOVE
Reason:
- Duplicated information
- Inconsistent with rest of site
- Avatar initials are clearer and reusable

---

### Colour Coding
Decision: MATCH FPL COLOURS
- 75% → Amber
- 50% → Amber
- <50% → Red
Reason:
- Familiar to FPL users
- Reduces cognitive load
- Increases trust

---

### Injury Classification
Decision: SPLIT INTO FUNCTIONAL GROUPS
- Returning soon (75%)
- Coin flip (50%)
- Out (0%)
- Suspended
- Loans / Transfers

Reason:
- “Lowest %” sorting is not user-intuitive
- FPL players care about *decision relevance*, not absolutes

---

### Tabs vs Pills
Decision:
- Keep tabs
- Remove duplicate pills (Out / Loaned)

Reason:
- Tabs provide global filtering
- Pills duplicated logic and cluttered UI

---

## Team Data

### Team Naming
Decision: USE FAN-FRIENDLY NAMES
Examples:
- Bournemouth (not AFC Bournemouth)
- Man City / Man Utd
- Spurs / Wolves

Reason:
- Alphabetical clarity
- Matches fan language
- Cleaner UI

---

### Data Sources
Decision: HYBRID APPROACH
- Automated: FPL API, Wikidata
- Manual overrides allowed

Reason:
- Football data changes fast
- “Outdated” ≠ incorrect (e.g. interim managers)
- Editorial control required

---

## Engineering

### Null Safety
Decision: ALWAYS GUARD RENDERING
- Never index strings or arrays directly
- Introduced helper for team initials

Reason:
- Prevent back-navigation crashes
- Improve perceived stability

---

## UX Philosophy
Decision:
- Default to clarity over density
- Mirror official football products where possible (FPL)
- Reduce surprises

Status: LOCKED ✅

---

# DECISION LOG — Day 3

## Key decisions made

1. Reuse the FPL feed for global injuries

Decision: Yes

Rationale:

- Already trusted, factual, and in production use
- Avoids data duplication or conflicting injury states
- Enables automatic consistency between Team Hub and global views

2. Keep main nav label as “Injuries”

Decision: Yes

Rationale:

- Clear, universally understood navigation term
- Avoids discoverability issues

3. Rename page header to “Treatment Room”

Decision: Yes

Rationale:

- More editorial, football-native language
- Differentiates the page from raw data tables
- Aligns with Football Mad’s tone without sacrificing clarity

4. Replicate Team Hub injury card UI

Decision: Yes

Rationale:

- Proven, readable, and already familiar to users
- Speeds up development and reduces UX inconsistency

5. Park lineup pitch refinements

Decision: Yes

Rationale:

- Core logic was solid but last 5–10% is visual precision work
- Better handled by a developer or after a design reset
- Avoids sunk-cost iteration during a productive data win

---

# Day 5 – Decision Log (All)

## Navigation & UX Decisions
- Single sub-navigation pattern across the entire site.
- Injuries page locked in as the canonical reference.
- No mixed UI metaphors (bubbles vs brackets vs pills).

## Filtering Strategy
- Filters should sort immediately, not require confirmation.
- Mobile filters must avoid:
- - Scroll-within-scroll
- - Auto keyboard pop
- Hide unimplemented filter types rather than expose dead UI.

## Content Taxonomy
- News navigation is driven by real editorial entities, not arbitrary categories.
- Competition = primary navigation layer.
- Team + Player = secondary discovery layer.
- Category-style labels (Trending, Pick, Breaking) are editorial flags, not navigation primitives.

## Card vs Article Rules
- Card view = discovery → max 3 pills.
- Article view = depth → show all matched entities.
- Pills must always be meaningful and clickable.

## Technical Philosophy
- Prefer whitelisting allowed UI elements over blacklisting legacy ones.
- Remove legacy concepts fully rather than “hide most of the time”.

---

