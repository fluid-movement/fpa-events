# Laravel FPA App — Complete Feature Inventory

> Reference document for the SvelteKit rebuild at `events.freestyledisc.org`.
> Source: `/Users/azaharias/coding/web/fpa-app`

---

## 1. Authentication & User Management

**Routes:**

- `GET/POST /login` — sign in
- `GET/POST /register` — sign up
- `GET/POST /forgot-password` — request password reset
- `GET/POST /reset-password/{token}` — apply reset
- `GET /verify-email` / `GET /verify-email/{id}/{hash}` — email verification flow
- `GET/POST /confirm-password` — re-confirm password for sensitive actions
- `POST /logout`

**User model** (ULID primary key):

- Fields: `id`, `name`, `email`, `password`, `role` (enum: Admin | User), `email_verified_at`, `remember_token`
- Relationships: `hasMany(Event)`, `belongsToMany(Event)` with pivot `status`
- Methods: `initials()`, `isAdmin()`

**Middleware:** `IsAdmin` — aborts 403 if user is not authenticated or does not have Admin role

**Features:** email verification, password reset tokens, rate-limited login (5 attempts per throttle window), remember-me sessions

---

## 2. Events Management

**Routes:**

- `GET /events` — upcoming events calendar
- `GET /events/past/{year?}` — past events archive (filterable by year)
- `GET /events/{event}` — public event detail page
- `POST /events/create` — create event
- `POST /events/{event}/edit` — update event
- `GET/POST /events/{event}/admin/{tab?}` — tabbed event admin dashboard

**Event model** (ULID PK, ordered by `start_date`):

- Fields: `id`, `user_id`, `name`, `start_date`, `end_date`, `location`, `description`, `picture`, `picture_width`, `picture_height`
- Relationships: `belongsToMany(User)` with pivot `status`, `hasMany(Schedule)`, `hasMany(Division)`, `hasOne(EventMagicLink)`
- Observer: `EventObserver` — deletes R2 picture asset when event is deleted
- Computed properties: `attending_count`, `picture_url`, `day`, `month`, `year`

**Schedule model** (ULID PK, ordered by `start_date`):

- Fields: `id`, `event_id`, `name`, `start_date`, `end_date`, `description`, `location`, `longitude` (float), `latitude` (float)
- Computed: `time` — formatted time range string

**EventMagicLink model** (ULID PK):

- Fields: `id`, `event_id`, `expires_at` (48-hour window)
- Method: `isActive()`

**Enums:**

- `EventUserStatus`: Attending | Organizing
- `EventListType`: Upcoming | Past

**Policy (EventPolicy):**

- `admin()` — organizers or site admin
- `create()` — any authenticated user
- `update()` — organizers or site admin
- `delete()` — event creator or site admin
- `restore()`, `forceDelete()` — disabled

**EventCalendarService:**

- `getFormattedCalendar()` — groups events by year/month for calendar display
- `getArchiveYears()` — extracts unique years from past events for archive nav

**Features:**

- Create / edit / delete events
- Image upload to Cloudflare R2 (stores dimensions)
- Calendar view grouped by month
- Past events archive by year
- RSVP toggle (attending / not going)
- Magic link sharing for co-organizers (48hr expiry)
- Multi-organizer support via pivot table
- Attendee count display

---

## 3. Divisions & Competition Management

**Routes:**

- `GET/POST /division/{division}/edit/{step?}` — division setup wizard
- `GET /division/{division}/run` — view all pools with QR codes
- `GET /division/judge/{pool}` — mobile judging interface (accessed via QR)

**Division model** (ULID PK):

- Fields: `id`, `event_id`, `type` (enum), `teams_per_pool`, `advance_per_pool`
- Relationships: `belongsTo(Event)`, `hasMany(Round)`, `hasMany(Team)`

**Round model** (ULID PK):

- Fields: `id`, `division_id`, `name`
- Relationships: `belongsTo(Division)`, `hasMany(Pool)`

**Pool model** (ULID PK):

- Fields: `id`, `round_id`, `name`
- Relationships: `belongsTo(Round)`, `belongsToMany(Team)`

**Team model** (ULID PK, always eager-loads players):

- Fields: `id`, `division_id`
- Relationships: `belongsTo(Division)`, `belongsToMany(Player)`, `belongsToMany(Pool)` with pivot `sorting`

**Result model** (ULID PK):

- Fields: `id`, `pool_id`, `user_id` (judge), `team_id`, `judging_type` (enum), `data` (JSON)
- Relationships: `belongsTo(Pool)`, `belongsTo(User)`, `belongsTo(Team)`
- Methods: `getStrategy()`, `calculateScore()`

**Enums:**

- `DivisionType`: OpenPairs | MixedPairs | WomenPairs | OpenCoop | Individual | Other
  - `getPlayerCount()` — expected players per team (pairs = 2, coop = 3, individual = 1)
- `DivisionSetupSteps`: Teams | Rounds
- `RoundName`: Finals | SemiFinals | QuarterFinals | RoundOf16 | RoundOf32 | RoundOf64 | Default
  - `getRound(int)` — static factory, auto-assigns name by round position
- `JudgingSystemType`: Simple (1–9 integer scores) | CustomFields (arbitrary fields) | Vibes (thumbs up/down)

**DivisionBuilder service:**

- `generateFirstRound()` — calculates and creates pools based on team count
- `generateRound()` — creates a round with pools named alphabetically (A, B, C…)
- `moveTeamBetweenPools()` — manual team reassignment
- `shuffleTeamsInRound()` — randomize team-to-pool assignments
- `clearDivision()` — wipe rounds/pools and start over

**JudgingStrategyFactory** — factory/strategy pattern; returns correct `JudgingStrategyInterface` implementation based on `JudgingSystemType`

**PoolQrCodeService** — generates labeled PNG QR codes (using `endroid/qr-code`) pointing to the judge route for a given pool

**Features:**

- Multiple divisions per event (pairs, coop, individual, etc.)
- Automatic round/pool generation from team count
- Configurable pool sizes and advancement per pool
- Team management with multi-player support
- QR code per pool for judge access
- Three judging systems: Simple 1–9, Vibes, Custom Fields
- Round names auto-assigned by bracket depth
- Team shuffling and manual pool reassignment

---

## 4. Players & Membership Management

**Routes (admin only):**

- `GET /admin/members` — paginated, searchable member list
- `GET /admin/members/{player}` — edit member profile
- `POST /admin/members/create` — create new member

**Player model** (ULID PK):

- Fields: `id`, `user_id` (nullable — not all players have site accounts), `name`, `surname`, `email`, `year_of_birth`, `gender`, `country`, `city`, `freestyling_since`, `first_competition`, `member_number` (unique), `notes`
- Relationships: `belongsToMany(Team)`, `hasMany(ActiveYear)`
- Computed: `is_active` — true if player has an `ActiveYear` for the current year, or a previous year if today is September or later

**ActiveYear model:**

- Fields: `id`, `player_id`, `year`, `membership_type` (enum)

**MembershipType enum:** Standard | Platinum | Juniors | FirstTimer | Group

**Features:**

- Full player database separate from user accounts (a player record can exist without a site login)
- Membership type tracking per calendar year
- Unique member numbers
- Active status with September rollover logic
- Search and filter, pagination
- Historical membership records

---

## 5. Admin Features

**Routes:**

- `GET /admin/dashboard` — membership analytics dashboard
- `/admin/members/*` — full member CRUD (see section 4)

**Admin dashboard:**

- Total and active member counts
- Membership breakdown by type
- Membership trend charts over time

**Event admin tabs:**

- Attending — list of all attendees and their status
- Schedule — schedule item management
- Organizers — co-organizer list + magic link generation UI

---

## 6. User Profile & Settings

**Routes:**

- `GET /user/profile` — profile view page
- `GET /user/attending` — user's upcoming events with countdown timers
- `GET /user/organizing` — events user is organizing (upcoming/past tabs)
- `GET /settings/profile` — edit profile
- `GET /settings/password` — change password

---

## 7. Public Pages

- `GET /` — home page: hero (next event) + upcoming events grid
- `GET /rankings` — rankings view (data source not yet implemented)
- `GET /legal-notice` — legal notice / impressum

---

## 8. Third-Party Integrations

| Integration          | Purpose                                      |
| -------------------- | -------------------------------------------- |
| Cloudflare R2        | Image/asset storage                          |
| Google Geocoding API | Address → coordinates for schedule locations |
| Mailgun              | Transactional email delivery                 |
| Sentry               | Runtime error logging                        |
| Laravel Pulse        | Application performance monitoring           |
| endroid/qr-code      | Pool QR code image generation                |
| Spatie Geocoder      | PHP geocoding library wrapper                |

---

## 9. Data Model Relationships

```
User ──< Event           (event_user pivot: status = attending | organizing)
Event ──< Schedule
Event ──< Division
Event ──1 EventMagicLink

Division ──< Round
Division ──< Team

Round ──< Pool
Pool >──< Team           (pool_team pivot: sorting)

Team >──< Player         (player_team pivot)
Pool ──< Result
Result ──> User          (judge who submitted the result)
Result ──> Team          (team being judged)

Player ──< ActiveYear
User ──1 Player          (optional — not all players have accounts)
```

---

## 10. Known Incomplete Features in Laravel App

These exist in the codebase but are not fully implemented:

- **Custom Fields judging** — `JudgingSystemType::CustomFields` defined but no UI
- **Divisions admin tab** — commented out of `AdminTabs` enum
- **Contact page** — route defined but commented out
- **Results/scoring display** — `Result` model and `calculateScore()` exist but no final standings view
- **Rankings algorithm** — rankings page exists, no data source or algorithm defined
