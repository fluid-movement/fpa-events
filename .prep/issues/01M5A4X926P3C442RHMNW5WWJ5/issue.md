---
title: Calendar feed name lets a line break in the user's name inject iCalendar lines
kind: code
parent: 01M5A45SJ0DTHEX1G0R86JKXEJ
tags:
  - security
priority: low
---

Finding from the untrusted-upstream-data audit (01M5A45SJ0DTHEX1G0R86JKXEJ).

**Vulnerability.** The calendar feed names the calendar `FPA Events — ${owner.name}` (`src/routes/api/calendar/[token]/feed.ics/+server.ts:24-27`). ical-generator escapes CR/LF in event SUMMARY and LOCATION, but not in the calendar `name`, which it writes verbatim into both `NAME:` and `X-WR-CALNAME:`. A user name containing a line break therefore injects arbitrary iCalendar lines (extra properties, or a whole extra VEVENT) into the feed.

Where such a name comes from: legacy user names are copied verbatim by the import (`tools/migrate/src/migrate.ts:98-102`), and the profile form only trims the ends (`src/routes/settings/profile/data.remote.ts:10`), so a line break in the middle survives.

**Reproduce.** Pass a calendar name containing `\r\n` followed by a property line to `ical({ name })`: the property appears as its own line in `toString()` (checked with the installed ical-generator 11.1.2). With the app, set a user name containing a line break and fetch that user's `feed.ics`.

**Severity.** Low. The name in the feed is the owner's own, so the injection only reaches the owner's own calendar; a legacy name with a stray line break would at worst corrupt that user's feed.

**Blocks go-live?** No.

## Open questions
