# FPA Events — Implementation Todo

> See `context.md` for full project context, tech stack, patterns, and decisions.
> Work through items in order. Check off each item when done.

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
- [ ] **Style EventCalendarCard** — tune card appearance, date display, hover state in `src/lib/components/EventCalendarCard.svelte`
- [ ] **Add missing shadcn components** — install Badge, Table, Dialog via shadcn-svelte CLI (needed for member list, attendee table, delete confirmation)
- [ ] **Micro-interactions pass** — add transitions, hover lifts, and animations across components once base styles are set. Focus on: card hover, page transitions, form feedback.
- [ ] **Remove design page before launch** — delete `src/routes/design/` or add a production guard

---

## Phase 1 — Events

### RSVP / Attendance

- [ ] **RSVP toggle on event detail page** (`src/routes/events/[id]/+page.svelte`)
  - Add form action `rsvp` in `src/routes/events/[id]/+page.server.ts`
  - If user has `attending` row in `event_user` → delete it (un-RSVP)
  - If not → insert row with `status: 'attending'`
  - Load current RSVP status in the `load` function and pass to page
  - Show "Attending" / "Not Going" button state accordingly
  - Only show RSVP button if user is logged in and is not an organizer

- [ ] **Build `/attending` page** (`src/routes/attending/+page.svelte`)
  - Load all `event_user` rows for current user with `status: 'attending'`, join events
  - Split into upcoming (startDate >= now) and past
  - Upcoming: show countdown to next event (days/hours), then list remaining upcoming events
  - Past: list of past attended events
  - Requires auth — redirect to `/sign-in` if not logged in

### Event Image Upload

- [ ] **Set up Cloudflare R2 client** — create `src/lib/server/r2.ts`
  - Use `@aws-sdk/client-s3` (S3-compatible) with R2 endpoint, access key, secret from env
  - Export `uploadToR2(file: File, key: string): Promise<string>` returning the public URL
  - Add env vars: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

- [ ] **Add image upload to create event form** (`src/routes/events/create/`)
  - Add file input to `+page.svelte` (accept image/*)
  - In form action: extract file, validate type + size, upload to R2, store URL + dimensions in `events` table
  - Use `sharp` or read image dimensions from the uploaded file before storing
  - Store key as `events/{id}/{filename}`

- [ ] **Add image upload to edit event form** (`src/routes/events/[id]/edit/`)
  - Same as create but pre-fill existing image
  - On update: if new image uploaded, delete old R2 object, upload new one
  - If no new image provided, keep existing

- [ ] **Display event image** on event detail page and event cards
  - Show image in event detail header if `picture` is set
  - Show image thumbnail on `EventCalendarCard` if available
  - Use `pictureWidth` / `pictureHeight` for correct aspect ratio / layout shift prevention

### Event Delete

- [ ] **Add delete action** to event admin page (`src/routes/events/[id]/admin/+page.server.ts`)
  - Form action `delete`
  - Check: user must be event creator OR admin role
  - Delete R2 image if `picture` is set
  - Delete event row (cascades to schedules, event_user, magic_links)
  - Redirect to `/events` after deletion

- [ ] **Add delete button** to event admin UI
  - Show only to event creator / admin
  - Use a confirmation Dialog (shadcn) before submitting

---

## Phase 2 — Admin Role

- [ ] **Add `role` column to `user` table**
  - Add `role: text('role').notNull().default('user')` to `user` table in `src/lib/server/db/schema.ts`
  - Write and run Drizzle migration

- [ ] **Update `app.d.ts`** — add `role` to the `User` type in `locals`

- [ ] **Create admin layout guard** — `src/routes/admin/+layout.server.ts`
  - Redirect to `/` with 403 if `locals.user?.role !== 'admin'`

- [ ] **Extend event permissions** — in event edit/delete actions, also allow if `locals.user?.role === 'admin'`

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
