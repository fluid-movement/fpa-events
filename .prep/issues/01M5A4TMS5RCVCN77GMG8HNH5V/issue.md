---
title: admin-role bypass tests post to dead form-action URLs and would pass without any guard
kind: code
parent: 01M5A34Y0620NBQFRA09MKZWNN
tags:
  - security
---

## Requirement

Found by the authorization audit (01M5A34Y0620NBQFRA09MKZWNN).

**Problem.** The "Direct action POST bypass attempts" in `tests/integration/admin-role.test.ts` (the four tests from line 117: non-owner and anonymous `deleteEvent`, non-owner and anonymous `addSchedule`) post through the local `postAction` helper (line 30) to `/events/<id>/admin?/deleteEvent` and `/events/<id>/admin/schedule?/addSchedule`. Those are legacy `+page.server.ts` action URLs. The routes export no `actions` any more — deleting and scheduling are remote functions — so Kit answers 405 Method Not Allowed before any app code runs. Verified on 2026-10-19 against a dev server: both URLs return `{"type":"error",…,"status":405}`.

The assertions (`type` is not `success`, the row is unchanged) therefore hold whatever the remote functions do: removing `requireEventOwner` from `deleteEvent` or `requireEventManager` from `addSchedule` would leave these tests green. The suite looks like it pins direct-call authorization of the manage area's writes, and it does not. (The cross-event tests in `tests/integration/schedule.test.ts` do hit the real remote forms via `postOverriding` and are fine.)

No vulnerability: the audit drove every manager remote function as a non-manager, a co-organizer and an anonymous caller and all refused. This issue is about the regression coverage that should hold them.

**Severity:** low (false assurance in the only gate before a production deploy). **Blocks go-live:** no.

## Acceptance

See criteria.

## Open questions
