# Football Mad — Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing inspiration from leading sports platforms (ESPN, The Athletic, Sky Sports, BBC Sport) combined with modern web design principles. This platform requires high information density while maintaining visual engagement for daily habit formation.

## Typography

**Font Stack**:
- Headlines: `'Inter', sans-serif` (700, 800 weights) - Bold, modern, scannable
- Body: `'Inter', sans-serif` (400, 500, 600 weights) - Excellent readability
- Data/Stats: `'Inter', sans-serif` (500, 600 weights) - Consistent, clear

**Hierarchy**:
- Hero Headlines: `text-5xl md:text-6xl lg:text-7xl font-bold`
- Page Titles: `text-4xl md:text-5xl font-bold`
- Section Headers: `text-3xl font-bold`
- Article Titles: `text-2xl md:text-3xl font-bold`
- Card Headlines: `text-xl font-semibold`
- Body Text: `text-base leading-relaxed`
- Metadata/Labels: `text-sm font-medium uppercase tracking-wide`

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 3, 4, 6, 8, 12, 16, 20, 24**
- Component padding: `p-4 md:p-6 lg:p-8`
- Section spacing: `py-12 md:py-16 lg:py-20`
- Card gaps: `gap-6 md:gap-8`
- Tight spacing: `space-y-2` or `gap-2`

**Container Strategy**:
- Full-width sections: `max-w-7xl mx-auto px-4`
- Content max-width: `max-w-6xl`
- Reading width: `max-w-3xl`

## Core Components

### Navigation
- Sticky header with transparent-to-solid transition on scroll
- Primary nav: Horizontal menu (News, Matches, Teams, Transfers, Injuries, FPL, Community, Shop)
- Secondary: User menu + Follow Teams CTA
- Mobile: Slide-out drawer with team badges visible

### Homepage
**Hero Module**: Full-width featured article with large image (16:9 ratio), gradient overlay bottom-to-top, headline + excerpt + CTA overlaid on bottom third

**Content Grid**: 
- Primary: 3-column grid (lg) → 2-column (md) → 1-column (mobile)
- "For You" personalized feed: Vertical card stack with team badges
- Trending sidebar: Compact list with view counts
- Mix of card sizes: Featured (2-column span), Standard (1-column)

### Team Hubs
- Header: Team badge (large), name, follow button, quick stats bar
- Tabbed sections: Overview, Fixtures, Squad, Transfers, Injuries, Fans
- 2-column layout: Main feed (66%) + Sidebar (33%) with next match, recent transfers, injury list

### Match Pages
- Match header: Team badges (80px), vs, score/time, competition badge
- Timeline: Vertical event list with icons (goals, cards, subs)
- Predicted lineups: 4-4-2 formation visual (use grid positioning)
- Related articles: 3-column card grid

### Transfers & Injuries
- Data tables with sortable columns
- Reliability badges: A-tier (solid), B-tier (dashed), C/D-tier (dotted border)
- Confidence indicators: Progress bars or percentage badges
- Source chips: Pill-shaped with external link icon

### FPL Hub
- Countdown timer: Large digital display
- Player cards: Image, name, team badge, price, status indicator
- Grid layout: 4-column (lg) → 3-column (md) → 2-column (mobile)

### Community
- Post cards: Avatar, username, team badge, timestamp, content, engagement (likes/comments)
- Comment threads: Nested with left border indicators
- Filter tabs: All Teams, Following, Popular

### Shop
- Product grid: 4-column (lg) → 3-column (md) → 2-column (sm) → 1-column (mobile)
- Product cards: Image (square), title, price, team badge overlay
- Team-specific collections: Banner with club colors/crest
- Cart: Slide-out panel from right

## Images

**Hero Images**: Yes - Large hero on homepage (featured article), team hub headers (stadium/action shots), match pages (player moments)

**Image Specifications**:
- Homepage hero: 1920x1080, dark gradient overlay (bottom 40%)
- Article covers: 16:9 ratio, consistent sizing
- Team badges: 120x120 transparent PNGs
- Player photos: Square headshots, 300x300
- Product images: Square, 800x800
- Match action: 4:3 or 16:9 depending on context

**Image Placement**:
- Every article card must have cover image
- Team hubs: Header background (stadium) + badge overlay
- Products: Primary image + hover for variant
- Community posts: Optional user-uploaded images

## Visual Patterns

**Cards**: Rounded corners (`rounded-lg`), subtle shadow (`shadow-md`), hover lift effect (transform + shadow increase)

**Badges & Tags**: Pill-shaped (`rounded-full`), team-colored borders, uppercase small text

**Data Displays**: Clean tables with alternating row backgrounds, sticky headers, mobile: card transformation

**CTAs**: Primary actions use solid backgrounds with white text, Secondary use bordered ghost style

**Status Indicators**: 
- Injuries: Red (OUT), Amber (DOUBTFUL), Green (FIT)
- Transfers: Blue (RUMOUR), Green (CONFIRMED)
- Reliability: Gold (A), Silver (B), Bronze (C), Gray (D)

## Animations

**Minimal, purposeful only**:
- Nav sticky transition: 150ms ease
- Card hover: 200ms transform
- Tab switches: 150ms fade
- Loading states: Skeleton screens (no spinners)

## Accessibility

- Team badge images: Always include alt text with team name
- Data tables: Proper th/td structure with scope
- Forms: Labels paired with inputs, error states clearly indicated
- Focus states: Visible ring on all interactive elements

This design balances ESPN's information density with The Athletic's editorial polish, optimized for daily engagement and multi-content-type navigation.