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
