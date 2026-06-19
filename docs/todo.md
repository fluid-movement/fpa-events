# FPA Events — Implementation Todo

> See `context.md` for full project context, tech stack, patterns, and decisions.
> Work through items in order. Check off each item when done.

---

## 🔜 Current Focus — Polish & Seed Data

### Seed Data

- [ ] **Rewrite seed script** (`src/lib/server/db/seed.ts`) with realistic FPA-style data
  - ~15 users with real-looking freestyle player names
  - ~40 events spread across 2023, 2024, 2025, and 2026 — a believable mix of past and upcoming
  - Event names that sound like real FPA tournaments (e.g. "FPA World Championship", "Geneva Open", "Berlin Jam")
  - Real city/country locations (Geneva, Berlin, Portland, London, Tokyo…)
  - Meaningful descriptions (not lorem ipsum)
  - Some events with images (use placeholder URLs for now), most without
  - RSVP rows for some users on some events (`attending` status)
  - A few events with schedules (registration, competition day, finals)
  - One seeded admin user (use the real dev email address: zaharias.andre@googlemail.com)

### Home Page (`src/routes/+page.svelte`)

- [ ] **Upcoming events grid** — below the next-event hero, show the next 3–5 upcoming events as a grid of `EventCalendarCard`s
- [ ] **Event count stats** — small stat line: "X events this year · Y countries" (computed from DB)
- [ ] **Hero polish** — if the next event has a picture, show it in the hero card

### Event Calendar (`src/routes/events/+page.svelte`)

- [ ] **EventCalendarCard image thumbnail** — if event has a `picture`, show it as a header image on the card
- [ ] **Attendee count on card** — show "X attending" badge on each card
- [ ] **Empty state** — if no upcoming events, show a friendly empty state instead of a blank page

### Event Detail (`src/routes/events/[id]/+page.svelte`)

- [ ] **Cover image hero** — if event has a picture, show it full-width at the top of the detail page (currently only shown in a 2-col grid; make it more prominent)
- [ ] **Attendee list peek** — below the RSVP button, show avatars/names of the first few attendees ("Alice, Bob, and 4 others are attending")
- [ ] **Rich description rendering** — ensure Tiptap HTML renders correctly with proper typography styles
- [ ] **Schedule tab polish** — nicer timeline layout for schedule items

---

## Design System

- [ ] **Finalize color palette** — review swatches on `/design`, adjust oklch values in `src/routes/layout.css` until the palette feels right (primary blue, background levels, muted tones)
- [ ] **Typography** — pick and integrate a web font (suggested: DM Sans, Plus Jakarta Sans, or Geist). Add `@font-face` or Google Fonts import to `layout.css`. Adjust font weights/sizes in the type scale.
- [ ] **Style Button component** — review all variants and sizes on `/design`. Tune shadow, hover glow, active press, border-radius, and transitions in `src/lib/components/ui/button/button.svelte`
- [ ] **Style Input & Textarea** — tune border, focus ring, background, padding in `src/lib/components/ui/input/input.svelte` and `textarea/textarea.svelte`
- [ ] **Style Card component** — tune background, border, border-radius, shadow in `src/lib/components/ui/card/card.svelte`
- [ ] **Style Sheet (drawer)** — tune overlay, panel background, animation in `src/lib/components/ui/sheet/sheet-content.svelte`
- [ ] **Style Tooltip** — tune background, text, arrow, animation in `src/lib/components/ui/tooltip/tooltip-content.svelte`
- [ ] **Style Skeleton** — tune shimmer animation and color in `src/lib/components/ui/skeleton/skeleton.svelte`
- [ ] **Style Sidebar** — review sidebar on all pages, tune active state gradient, hover, and spacing in `src/lib/components/ui/sidebar/` and `src/lib/components/AppSidebar.svelte`
- [ ] **Add missing shadcn components** — install Badge, Table, Dialog via shadcn-svelte CLI (needed for member list, attendee table, delete confirmation)
- [ ] **Micro-interactions pass** — add transitions, hover lifts, and animations across components once base styles are set. Focus on: card hover, page transitions, form feedback.
- [ ] **Remove design page before launch** — delete `src/routes/design/` or add a production guard

---

## Phase 2 — Admin Role

- [x] **Add `role` column to `user` table**
- [x] **Extend event permissions** — admins can edit/delete any event
- [ ] **Create admin layout guard** — `src/routes/admin/+layout.server.ts`
  - Redirect to `/` with 403 if `locals.user?.role !== 'admin'`
- [ ] **`/admin/dashboard`** — membership analytics (deprioritised — do after Phase 3)

---

## Phase 3 — Players & Membership

### Schema

- [ ] **Add `players` table** to `src/lib/server/db/schema.ts`
  - Fields: `id` (ULID), `userId` (nullable FK→user), `name`, `surname`, `email` (nullable), `yearOfBirth` int (nullable), `gender` text (nullable), `country` (nullable), `city` (nullable), `freestylingSince` int (nullable), `firstCompetition` int (nullable), `memberNumber` text unique (nullable), `notes` (nullable), `createdAt`, `updatedAt`

- [ ] **Add `active_years` table** to schema
  - Fields: `id` (ULID), `playerId` FK→players (cascade), `year` int, `membershipType` text (`standard` | `platinum` | `juniors` | `firstTimer` | `group`), `createdAt`, `updatedAt`

- [ ] **Write and run Drizzle migration**

### Admin Member Management

- [ ] **`/admin/members`** — paginated, searchable member list
  - Table with columns: member number, name, country, active status, membership type
  - Search by name / email / member number
  - Filter by active / inactive
  - Pagination (20 per page)
  - "Create member" button

- [ ] **`/admin/members/create`** — create new player record

- [ ] **`/admin/members/[id]`** — edit player record
  - All biographical fields
  - Add / remove active year entries
  - Link to a user account (optional)

- [ ] **`/admin/dashboard`** — membership analytics
  - Total members count
  - Active members count (current year)
  - Breakdown by membership type
  - Year-over-year trend (simple bar or line chart)

### Player Self-Service

- [ ] **Allow users to view/edit their own player record** — linked via `players.userId`
  - Route: `/settings/membership` or `/dashboard/membership`
  - User can see their member number, membership type, active years
  - User can update biographical info (country, city, etc.)
  - User cannot change their own member number or membership type (admin only)

---

## Migration Prep (do before cutover)

- [ ] **Write data export script** for Laravel MySQL → JSON (one file per table)
- [ ] **Write data import script** for JSON → PostgreSQL via Drizzle
  - Normalise `status` casing: `Attending` → `attending`, `Organizing` → `organizing`
  - Preserve all ULIDs
  - Handle nullable fields
- [ ] **Verify bcrypt password compatibility** — test one known hash from Laravel against Better Auth sign-in
- [ ] **Point R2 bucket** — configure SvelteKit app env vars to use the same R2 bucket as Laravel
- [ ] **Test rich text content** — verify a few event descriptions render correctly after import
- [ ] **Smoke test** — after import, walk through: sign in, view event, RSVP, edit event, admin member list
