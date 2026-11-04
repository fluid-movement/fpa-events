---
title: Crew membership, roles and invite links
kind: code
parent: 01M5EVT0B4G7G7V5AA15ZC5BWP
depends_on:
  - 01M6KP6JPAT43YSZ3K8MTVJD9K
  - 01M6KPQ5DQCST07RTCBYK5WYTR
---

crew_members(crew_id, user_id, role admin|member) with a unique index on user_id: one crew per user. Only admins edit, manage members and links.

- Invite links modeled on event_magic_links (expiry, multiple, revocable), on the crew management page; links join people as member only. Admins promote members separately.
- Opening an invite while in another crew offers to switch: leaving the old crew then joining, as one action, subject to the last-admin rule below.
- Last admin rule: the last admin cannot leave, be demoted, or delete their account until they have named another admin (prompt). If they are the only member, leaving deletes the crew after confirmation.
- Details page lists members with showName true and counts the rest ('+ N others'), same pattern as the event attendee list.
- Tests: authorization, one-crew-per-user, last-admin rule, switch flow, hidden-name counting.

## Open questions
