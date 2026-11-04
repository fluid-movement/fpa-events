---
type: decision
title: 'Crews: one crew per user, admin-only editing, showName flag'
description: A user belongs to at most one crew; only crew admins edit or manage anything and members are only listed. The last admin must name another admin before leaving or deleting their account (a sole member leaving deletes the crew). user.showAttendance becomes showName and also governs crew member lists. Hosted-by-crew is stored as events.crew_id with a per-event show_crew toggle, default on.
date: "2026-11-04"
scope:
  - src/routes/crews/**
---


