Tests only, no application code. Criterion 1 is already met by `describe.each([requireEventManager, requireEventOwner])` in `src/lib/server/authz.test.ts` (401/404/403/co-organizer). Add:
- `src/lib/server/remote-guards.test.ts`: registry of every `*.remote.ts` export with its required guard; fails on an unlisted export and when the guard call is missing or follows the first db access.
- `tests/integration/authz-lockin.test.ts`: non-manager replays of updateEvent, regenerateLink, createEventLocation (captureRemoteForm/callRemoteForm from `tests/integration/helpers/forms.ts`, with a positive control each); anonymous createEvent and anonymous upload-image 401.
- `tests/integration/schedule-access.test.ts`: leaf-only `__data.json` redirects for `/organizing` and `/settings/profile`.
Mutation-check each defense by removing it temporarily.
