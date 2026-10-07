---
title: Event card and schedule polish from the retired todo list
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - feature
  - ui
priority: low
---

Source: retired docs/todo.md "Event Calendar", "Event Detail" and "Geolocation Next Steps".

Three small UI improvements that never landed: event cards (`EventCalendarCard`) show the event's cover image as a header when it has one; event cards can show city and country from `event_locations` alongside the free-text location; the schedule on the event page gets a clearer timeline layout. Venue pins on a map are covered by the event-detail map issue.

## Open questions

- What should the schedule timeline look like — grouped by day with a vertical time rail, or something else?
