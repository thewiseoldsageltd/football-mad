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

