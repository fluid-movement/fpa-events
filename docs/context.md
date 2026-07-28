# FPA Events — Agent Context

> Point an agent at this file. It contains everything needed to understand the project and pick up the next todo item from `todo.md`.

---

## What This Project Is

A SvelteKit rebuild of the FPA (Freestyle Players Association) events platform, currently live at events.freestyledisc.org (Laravel app). The goal is feature parity + improvements, then a one-time cutover replacing the Laravel app. The audience is freestyle frisbee players who use the site to find, create, and manage events.

---

## Tech Stack

| Layer           | Technology                                                               |
| --------------- | ------------------------------------------------------------------------ |
| Framework       | SvelteKit 2 + Svelte 5 (runes syntax)                                    |
| Database        | PostgreSQL via Drizzle ORM                                               |
| Auth            | Better Auth 1.4                                                          |
| UI Components   | shadcn-svelte (Bits UI based) — source files in `src/lib/components/ui/` |
| Styling         | Tailwind CSS v4                                                          |
| Rich Text       | Tiptap 3                                                                 |
| Form Validation | Valibot                                                                  |
| IDs             | ULID                                                                     |
| Image Storage   | Cloudflare R2 (to be integrated)                                         |

---

## Critical Rules

- **Svelte 5 runes only** — use `$state`, `$derived`, `$props`, `$effect`. Never use legacy `let x; $: x = ...` reactive syntax.
- **Tailwind v4** — avoid dynamic class strings. Tailwind v4 purges classes it can't statically detect. Use `style=` attributes for truly dynamic values (e.g. CSS variables, runtime-computed colors).
- **shadcn components are owned** — edit `src/lib/components/ui/` files directly to change component styles. Do not fight the library with overrides.
- **No dark mode** — the app uses a single dark theme. There is no `dark:` variant to implement. Do not add a mode toggle.
- **ULIDs for all IDs** — use `import { ulid } from 'ulid'` for new record IDs.

---

## Project Structure

```
src/
├── routes/               # SvelteKit file-based routing
│   ├── +layout.svelte    # Root layout — sidebar + top nav
│   ├── +page.svelte/server.ts   # Home page
│   ├── events/           # Event listing, create
│   │   ├── [id]/         # Event detail, edit, admin
│   │   └── past/[year]/  # Past events archive
│   ├── attending/        # User's attending events (stub)
│   ├── organizing/       # User's organizing events
│   ├── dashboard/        # User dashboard (stub)
│   ├── invite/[token]/   # Magic link invite acceptance
│   ├── settings/         # Profile + password settings
│   ├── sign-in/          # Auth pages
│   ├── sign-up/
│   ├── forget-password/
│   ├── reset-password/
│   ├── rankings/         # Placeholder
│   ├── legal-notice/     # Static page
│   └── design/           # DEV ONLY — component showcase, not linked from nav
├── lib/
│   ├── components/
│   │   ├── ui/           # shadcn components (Button, Card, Input, etc.)
│   │   ├── AppSidebar.svelte
│   │   ├── EventCalendar.svelte
│   │   ├── EventCalendarCard.svelte
│   │   ├── RichTextEditor.svelte
│   │   ├── SidebarLogin.svelte
│   │   └── TopNavigation.svelte
│   ├── server/
│   │   ├── auth.ts       # Better Auth server instance
│   │   ├── db/
│   │   │   ├── index.ts  # Drizzle db instance
│   │   │   ├── schema.ts # All table definitions
│   │   │   └── seed.ts   # Dev seed data
│   │   └── utils/
│   │       └── events.ts # groupEventsByMonth(), getArchiveYears()
│   ├── auth-client.ts    # Better Auth client
│   └── utils.ts          # cn() helper
├── hooks.server.ts       # Populates locals.user + locals.session
└── app.d.ts              # TypeScript locals types
static/
├── fpa-logo-light.png
├── fpa-logo-dark.png
└── background.jpg
docs/
├── context.md            # This file
├── todo.md               # Ordered task list
└── laravel-features.md   # Full Laravel app feature reference
```

---

## Database Schema

File: `src/lib/server/db/schema.ts`

### Current Tables

**`user`** — Better Auth managed

- `id` text PK, `name` text, `email` text unique, `emailVerified` bool, `image` text, `createdAt`, `updatedAt`

**`events`**

- `id` text PK (ULID), `userId` FK→user, `name`, `startDate`, `endDate`, `location`, `description`, `picture` (nullable), `pictureWidth` int (nullable), `pictureHeight` int (nullable), `createdAt`, `updatedAt`

**`event_user`** (pivot)

- `id` int PK (auto), `eventId` FK→events (cascade delete), `userId` FK→user (cascade delete), `status` text (`attending` | `organizing`), `createdAt`, `updatedAt`
- Indexes on (userId, status, eventId), (eventId, userId, updatedAt), (eventId, status, updatedAt)

**`event_magic_links`**

- `id` text PK (ULID), `eventId` FK→events (cascade delete), `expiresAt` timestamp, `createdAt`, `updatedAt`

**`schedules`**

- `id` text PK (ULID), `eventId` FK→events (cascade delete), `name`, `startDate`, `endDate`, `description` (nullable), `location` (nullable), `longitude` real (nullable), `latitude` real (nullable), `createdAt`, `updatedAt`

**`session`, `account`, `verification`** — Better Auth internal tables

### Tables To Add (Phase 3)

**`players`**

- `id` text PK (ULID), `userId` FK→user nullable, `name`, `surname`, `email` (nullable), `yearOfBirth` int (nullable), `gender` text (nullable), `country` (nullable), `city` (nullable), `freestylingSince` int (nullable), `firstCompetition` int (nullable), `memberNumber` text unique (nullable), `notes` text (nullable), `createdAt`, `updatedAt`

**`active_years`**

- `id` text PK (ULID), `playerId` FK→players (cascade), `year` int, `membershipType` text (`standard` | `platinum` | `juniors` | `firstTimer` | `group`), `createdAt`, `updatedAt`

---

## Auth Pattern

Server-side: `event.locals.user` and `event.locals.session` are set by `hooks.server.ts` on every request via Better Auth.

Protecting a route:

```ts
// in +page.server.ts
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	if (!locals.user) redirect(302, '/sign-in');
	return { user: locals.user };
};
```

Checking the user in a form action:

```ts
export const actions = {
	myAction: async ({ locals, request }) => {
		if (!locals.user) redirect(302, '/sign-in');
		// ...
	}
};
```

Client-side auth client: `import { client } from '$lib/auth-client'`

---

## Form / Data Pattern

The project uses SvelteKit form actions for mutations and `+page.server.ts` load functions for reads.

For more complex pages, data fetching logic is extracted to `data.remote.ts` files alongside the route (see `src/routes/events/create/data.remote.ts`).

Validation uses Valibot schemas.

Example pattern:

```ts
// +page.server.ts
export const load = async ({ params, locals }) => {
	const event = await db.query.events.findFirst({
		where: eq(events.id, params.id)
	});
	if (!event) error(404);
	return { event };
};

export const actions = {
	update: async ({ request, locals, params }) => {
		if (!locals.user) redirect(302, '/sign-in');
		const data = await request.formData();
		// validate + write to db
	}
};
```

---

## Design System

### Theme

Single dark theme — no light/dark toggle. Colors are defined as CSS custom properties in `src/routes/layout.css` using oklch color space.

Key variables:

- `--background` — darkest blue (page background)
- `--card` — slightly lighter blue (card surfaces)
- `--sidebar` — same as card (sidebar background)
- `--primary` — cyan blue (matches FPA logo)
- `--foreground` — near-white text
- `--muted-foreground` — dimmed text for secondary info
- `--destructive` — red (delete/error actions)
- `--border` — white at 10% opacity

### Component Showcase

`/design` route (dev only, not linked from nav) — shows all UI components in all states. Use this page to style and preview components before using them in features.

### shadcn Components Available

`src/lib/components/ui/`:

- `button/` — variants: default, destructive, outline, secondary, ghost, link; sizes: sm, default, lg, icon
- `card/` — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction
- `field/` — Field, FieldLabel, FieldDescription, FieldError, FieldContent, FieldGroup, FieldSet
- `input/` — Input
- `textarea/` — Textarea
- `label/` — Label
- `range-calendar/` — RangeCalendar (date range picker)
- `separator/` — Separator
- `sheet/` — Sheet (slide-in drawer/modal)
- `skeleton/` — Skeleton (loading placeholder)
- `tooltip/` — Tooltip, TooltipTrigger, TooltipContent, TooltipProvider
- `sidebar/` — full sidebar system

### Custom Components

- `EventCalendar.svelte` — month-grouped event grid
- `EventCalendarCard.svelte` — individual event card (date, name, location)
- `RichTextEditor.svelte` — Tiptap WYSIWYG (bold, italic, H2, H3, lists)
- `AppSidebar.svelte` — main nav sidebar
- `SidebarLogin.svelte` — auth controls in sidebar footer
- `TopNavigation.svelte` — mobile top bar

### Micro-Interactions (in progress)

Buttons already have: shadow lift on hover, glow effect, press-down on active. Further micro-interactions to be added during the design pass.

---

## Design Decisions Log

| Decision           | Choice                                              | Reason                                                               |
| ------------------ | --------------------------------------------------- | -------------------------------------------------------------------- |
| Theme              | Dark only, no toggle                                | Consistent brand experience                                          |
| Primary color      | Cyan blue (`oklch(0.686 0.135 233)`)                | Matches FPA logo blue                                                |
| Component workflow | Style on `/design` page first, then use in features | Single source of truth                                               |
| IDs                | ULID                                                | URL-safe, sortable, matches Laravel app (preserves IDs on migration) |
| Auth               | Better Auth                                         | Full-featured, Drizzle adapter, bcrypt compatible with Laravel       |
| Image storage      | Cloudflare R2                                       | Already used by Laravel app, can point at same bucket                |
| Judging system     | Dropped                                             | Was never finished in Laravel, no one uses it                        |
| Divisions          | Dropped                                             | Tied to judging system                                               |
| Geocoding          | Deferred                                            | Fields stay in schema, no UI or API for now                          |
| Dark/light toggle  | Removed                                             | App commits to single dark theme                                     |

---

## Feature Scope (v1)

### In Scope

**Phase 1 — Events (current focus)**

- RSVP toggle (attending / not going) on event detail page
- `/attending` page — upcoming events with countdown + past attended events
- Event image upload to Cloudflare R2
- Event delete (creator or admin only)

**Phase 2 — Admin Role**

- `role` column on `user` table (`admin` | `user`)
- Admin layout guard for `/admin/*` routes
- Admins can edit/delete any event

**Phase 3 — Players & Membership**

- `players` and `active_years` tables
- `/admin/members` — searchable, paginated member list
- `/admin/members/create` and `/admin/members/[id]` — member CRUD
- `/admin/dashboard` — membership analytics
- Player self-service: users can manage their own membership record

### Out of Scope for v1

- Divisions / competition draw management (dropped)
- Judging system (dropped)
- Geocoding / map UI (deferred, fields in schema)
- Email notifications (deferred)
- Rankings algorithm (placeholder route only)
- Error monitoring / Sentry (deferred)

### V2 (post-launch)

- User dashboard with personal stats (ranking, membership, attended events)
- Public player profiles
- Rankings algorithm
- Notification system
- Multi-language support

---

## Migration Notes (for when we cut over)

- Laravel app: MySQL. SvelteKit app: PostgreSQL.
- Both use ULIDs — IDs carry over directly.
- Laravel bcrypt passwords are compatible with Better Auth (also bcrypt). Worst case: users click "forgot password".
- Event images: already on Cloudflare R2. Point SvelteKit app at the same bucket (config only).
- `event_user.status` needs casing normalised: Laravel uses `Attending`/`Organizing`, SvelteKit uses `attending`/`organizing`.
- Rich text: both apps store HTML — should be compatible.
- Dataset is small (<500 users), so a one-time import script is sufficient.
