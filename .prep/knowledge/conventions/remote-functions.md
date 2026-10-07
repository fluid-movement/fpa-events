---
type: convention
title: Remote functions and shared helpers
description: How to write form()/query() remote functions, guard them, and which shared helpers to reuse.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:44:51Z
scope:
  - src/routes
  - src/lib/api
  - src/lib/server/utils
  - src/lib/server/eventForm.ts
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Remote functions and shared helpers

Every server write is a `form()` (or a `query()` for reads that a component
awaits) from `$app/server`, in a `*.remote.ts` file next to the route that uses
it, or in `src/lib/api/` when several routes share it. There are no form
actions and no `use:enhance`. `AGENTS.md` states the rule; this entry is the
how.

## Shape of a write

```ts
export const updateThing = form(v.object({ ... }), async (data) => {
	await requireEventManager(data.eventId);   // guard first
	await db.update(...);
	await someQuery(id).refresh();             // re-run queries the page awaits
	redirect(303, resolve('/somewhere'));      // optional
});
```

- The component spreads it on a form: `<form {...updateThing}>`. **Every
  field is built by `updateThing.fields.<name>.as(type, seed)`**. Kit 3 encodes
  the form id into each `name` and rejects hand-written inputs ("Form contained
  a field that wasn't created with form.fields.as(...)"). Components that
  render part of a form take the owning form's `fields` as a prop
  (`EventLocationInput`, `ImageUpload`, `VenueLocationPicker`,
  `RichTextEditor`, `ConfirmSubmit`).
- The `as()` seed is not a binding: Kit owns a visible field's value from the
  first keystroke. Read or write it through `fields.x.value()`, `.set()`,
  `.dirty()`, `.touched()`, `.issues()`, never a local `$state` mirror. Hidden
  fields are the exception and may be derived from JS state.
- Values arrive as strings and the Valibot schema parses them (e.g.
  coordinates via an explicit transform, because `Number('') === 0`). Unit
  tests stub fields with `src/test/form-fields.ts`.
- Route params are read with `getRequestEvent().params` when the form lives
  under a dynamic route (`toggleRsvp`, `updateEvent`).
- Submit buttons disable and relabel on `formAction.pending > 0`. The
  better-auth pages, which call the auth client directly, use a local `loading`
  flag instead.
- Errors: use `error(status, …)` from `@sveltejs/kit`, not a bare `throw new
Error`. A bare error reaches the client as a 500. A few older spots still
  throw bare errors (`getEvent`'s not-found, `requireTurnstile`, schedule time
  validation).
- Queries an fpa-api page awaits during SSR must not throw on an outage. They
  return an `ApiResult` (see `/components/fpa-api.md`).

## Guards

- In a `load`: `requireSignedIn(locals)` (307 to `/sign-in`).
- In a remote function: `requireSignedInRequest()` (302, so a POST becomes a
  GET), `requireEventManager(id)` or `requireEventOwner(id)`. Both return the
  event row. See `/conventions/authorization.md`.
- An event-scoped form must also scope its `WHERE` to the authorised event.
  Checking `data.eventId` and then writing by a row id alone lets the caller
  name another event's rows.

## Shared helpers to reach for

- Event lists: `listEventsWithAttendeeCount`, `withUserStatus`,
  `attendingEvents`, `organizingEvents`, `eventUserCounts`,
  `groupEventsByMonth`, `getArchiveYears` (`#lib/server/utils/events`). Never
  count attendees per event in a loop.
- Event form: `eventFormSchema`, `parsePictureFields`, `resolveEventLocationId`
  (`#lib/server/eventForm`), shared by create and edit.
- Dates: add a named formatter to `#lib/utils/dates`, not an inline
  `toLocaleDateString`.
- HTML: `sanitizeRichText`, `escapeHtml` (Leaflet popups), `stripHtml`.
- Destructive buttons: `<ConfirmSubmit>`. Signed-out pages: `<AuthCard>` +
  `<AuthForm>`. Leaflet: `loadLeaflet()`, `addOsmTiles()`,
  `enableTwoFingerPan()`.
