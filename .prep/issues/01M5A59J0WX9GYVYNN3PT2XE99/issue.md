---
title: Invite links are accepted on GET, so a cross-site navigation makes any signed-in user a co-organizer and reveals their email
kind: code
parent: 01M5A45SRVRT71JY7RKBHSZBWE
tags:
  - security
priority: high
---

Found by the data-exposure and abuse audit (01M5A45SRVRT71JY7RKBHSZBWE), 2026-10-19.

## Vulnerability

A co-organizer invite is accepted by a plain GET, with no confirmation. `src/routes/invite/[token]/+page.server.ts` lines 18-31: when a signed-in user loads `/invite/<token>`, the server load immediately upserts an `event_user` row with status `organizing` (turning any existing RSVP into an organizer seat) and redirects to the event.

Better Auth's session cookie is `SameSite=Lax`, which browsers send on top-level GET navigations from other sites. So any page a signed-in user visits can navigate them to an invite link (a link they click, or a script or meta redirect) and they become a co-organizer of an event they never chose.

Why it matters: the manage area's layout load (`src/routes/events/[id]/admin/+layout.server.ts` lines 33-43) returns every event_user row's name and email to the event's managers, and `AttendeeList`/`InviteSection` render them. An attacker who creates an event and issues its invite link can therefore learn the email address of any signed-in user they can get to open one URL, and the victim is left holding an organizer seat (and loses their RSVP on that event, if they had one). The link is reusable for 48 hours, so one link harvests many victims.

Kit's Origin check does not help: it covers non-GET requests only, and this write happens in a GET load. SvelteKit's `data-sveltekit-preload-data="hover"` (src/app.html) would also run the load on hover if an invite link were ever rendered as an in-app anchor; the rich-text sanitizer currently allows no `<a>`, so that path is closed today.

## How to reproduce (dev server on a free port)

1. As account A, create an event and copy its invite link from the Invites tab.
2. As account B (signed in, in another browser), open any page that sends the browser to that URL — or just open the URL.
3. B lands on A's event; A's Attendees and Invites tabs now list B with B's email. B never confirmed anything.

## Severity

Medium: a privacy leak (email address of any signed-in user, on one navigation) plus an unwanted state change, with no cost to the attacker beyond a verified account and one event.

Blocks go-live: I recommend fixing it before go-live. The fix is small and the leak hits real members' addresses once the domain switches.

## Fix direction

Make the GET load read-only: look up the link and show "You've been invited to co-organize <event> — Accept" with a remote `form()` that does the upsert. Remote forms are POSTs, so Kit's Origin check then refuses cross-site submissions. Keep the expiry and sign-in redirect as they are.

## Open questions
