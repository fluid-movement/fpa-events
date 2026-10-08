Single file: `src/routes/privacy-policy/+page.svelte`, rewritten in plain language. Facts checked against the code:

- No profile image upload exists; `user.image` is always NULL (`tools/migrate/src/migrate.ts` inserts NULL), though `events/[id]/+page.server.ts` still selects it.
- Attendee names are public to signed-out visitors unless `user.showAttendance` is off (Settings → Privacy); organizers always see everyone; opted-out users still count.
- Calendar feed: `src/lib/server/utils/calendar.ts` creates a secret token on first visit to Attending/Dashboard, `regenerateCalendarToken` invalidates the old URL; `api/calendar/[token]/feed.ics` serves it without sign-in.
- Account deletion (`settings/account/data.remote.ts`) removes the user, sessions, credentials, RSVPs and the events they created; event pictures on R2 are left behind (separate issue), so the policy must not promise "all data".
- Logs: `hooks.server.ts` logs error reference, method, route and user id; `email.ts` logs each recipient address. Coolify container logs are lost on redeploy.
- Processors: Hetzner (Germany), Mailgun EU region (`api.eu.mailgun.net`), Cloudflare R2 (endpoint has no EU jurisdiction, so no "stored in the EU" claim) and Turnstile (sign-up, sign-in, password reset, event create/edit), OSM tile servers (`#lib/leaflet`), Komoot Photon (browser-side, `#lib/geocoding`).
- Sessions: Better Auth defaults (7 days, refreshed on use); no custom config in `#lib/server/auth`.
