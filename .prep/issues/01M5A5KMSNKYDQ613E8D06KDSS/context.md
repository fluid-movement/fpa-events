Shared request validation is in src/lib/server/validation.ts and remote-input.ts, invoked in hooks.server.ts before session lookup. It guards decoded paths and stored ULID/UUID parameters, remote base64/devalue payloads, keyed form IDs, binary headers/metadata, and native form body parsing. The already installed Kit devalue parser is reused; no package manifests, lockfiles or installed dependencies changed. NUL-free text schemas cover database/upstream remote inputs; requireEventAccess validates event IDs before database access. Archive years are bounded to 1970–9999. Kit field-parser diagnostics are handled in errors.ts, including framework-only stacks trimmed by Kit in dev. Expected errors bypass logging and GlitchTip; genuine callback faults stay reportable. Tests: validation.test.ts, remote-input.test.ts, errors.test.ts, hooks.server.test.ts, and tests/integration/malformed-input.test.ts (plus overlapping malformed-forms.test.ts). Owner: file the underlying Kit decoder errors upstream; run Playwright outside sandbox.

## Complete remote inventory

Every function below shares the request boundary checks and error hook. Eleven event manager/owner functions additionally share authz. Empty-input forms, boolean privacy fields, and the deletion password do not feed arbitrary raw strings into queries; password verification remains unchanged.

- `src/lib/api/calendar.remote.ts`: `regenerateToken`.
- `src/lib/api/players.remote.ts`: `getPlayerProfile`.
- `src/lib/api/rankings.remote.ts`: `getSeries`, `getRankings`, `getRatings`, `getScoringResults`.
- `src/lib/api/results.remote.ts`: `getResultEvents`, `getEventResults`.
- `src/routes/dev/emails/data.remote.ts`: `sendTestEmailForm`.
- `src/routes/events/[id]/admin/delete-event.remote.ts`: `deleteEvent`.
- `src/routes/events/[id]/admin/event-details.remote.ts`: `getEvent`, `updateEvent`.
- `src/routes/events/[id]/admin/invites/magic-links.remote.ts`: `generateLink`, `regenerateLink`.
- `src/routes/events/[id]/admin/schedule/locations.remote.ts`: `listEventLocations`, `createEventLocation`, `deleteEventLocation`.
- `src/routes/events/[id]/admin/schedule/schedule.remote.ts`: `addSchedule`, `updateSchedule`, `deleteSchedule`.
- `src/routes/events/[id]/data.remote.ts`: `toggleRsvp`.
- `src/routes/events/create/data.remote.ts`: `createEvent`.
- `src/routes/settings/account/data.remote.ts`: `deleteAccount`.
- `src/routes/settings/privacy/data.remote.ts`: `getPrivacySettings`, `setShowAttendance`.
- `src/routes/settings/profile/data.remote.ts`: `updateProfile`.

## Complete server route inventory

All routes below pass through the common request/error hooks. Event [id] and invite/calendar [token] parameters are validated there, including all admin children. The year route also calls parseArchiveYear. Upload POST catches malformed formData as JSON 400. Remaining routes have no untrusted database identifier/date parameter.

- `src/routes/+layout.server.ts`
- `src/routes/+page.server.ts`
- `src/routes/api/calendar/[token]/feed.ics/+server.ts`
- `src/routes/api/events/upload-image/+server.ts`
- `src/routes/attending/+page.server.ts`
- `src/routes/dashboard/+page.server.ts`
- `src/routes/events/+page.server.ts`
- `src/routes/events/[id]/+page.server.ts`
- `src/routes/events/[id]/admin/+layout.server.ts`
- `src/routes/events/[id]/admin/schedule/+page.server.ts`
- `src/routes/events/create/+page.server.ts`
- `src/routes/events/past/[year]/+page.server.ts`
- `src/routes/healthz/+server.ts`
- `src/routes/invite/[token]/+page.server.ts`
- `src/routes/organizing/+page.server.ts`
- `src/routes/settings/+layout.server.ts`
- `src/routes/settings/+page.server.ts`
- `src/routes/settings/profile/+page.server.ts`

Additional universal page routes /players/[playerId] and /results/[eventId] use the public remote queries; their NUL-bearing inputs are rejected by the shared text schema. Better Auth endpoints are handled by the library behind the same hooks; these fixes do not change its authentication behavior.
