---
title: Enrich the player page with fpa-api profile data
kind: code
---

fpa-api's `GET /players/{id}` now carries `profile: { fields, updatedAt } | null` — historic
player data seeded from the old FPA WordPress site and edited in fpa-profiles (nickname, headline,
bio, playing since, how they started, career highlights, mentors, links, ...). Render it on
`/players/[playerId]` to show off a player's history.

- Most players will never have a profile. The page must look complete without one, and the
  existing output (header, stats, current standing, results) stays as it is; the profile is worked
  in around it.
- The data must never endanger the page: a missing, null or malformed `profile` (or any single
  field with an unexpected shape) renders nothing for that part, never an error.
- Render fields by value shape, not a fixed key list (new keys can appear without an API release):
  string → text (`bio` is Markdown, rendered sanitized), list of strings → names, list of
  `{ kind, url, label? }` → links (fall back to the URL's host).
- Mobile first; desktop should look great too.

## Open questions
