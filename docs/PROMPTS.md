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
