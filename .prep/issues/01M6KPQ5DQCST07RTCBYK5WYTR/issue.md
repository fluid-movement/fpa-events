---
title: Rename user.showAttendance to showName
kind: code
parent: 01M5EVT0B4G7G7V5AA15ZC5BWP
---

The flag now governs name visibility in both event attendee lists and crew member lists. Rename user.show_attendance -> show_name (migration), update the settings UI label to say it applies to events and crews, the event attendee queries, seed.ts and tests. Behaviour unchanged: opted-out users still count towards totals.

## Open questions
