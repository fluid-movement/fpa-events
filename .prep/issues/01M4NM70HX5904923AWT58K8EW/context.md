Read-only fpa-api view; see [Rankings, results and player pages](/features/rankings-and-results.md)
and [fpa-api client](/components/fpa-api.md).

- `src/lib/api/players.remote.ts` — `getPlayerProfile` maps the API response into
  `PlayerProfileView` (`#lib/results/types`). Add a `bio` field built from `profile.profile`.
- `src/lib/server/fpa-api/types.ts` — model `profile` as `unknown`-ish (`PlayerEnrichment | null`),
  never trusted.
- New pure module `#lib/results/bio.ts`: `toPlayerBio(raw)` validates each field by shape and drops
  anything else; returns `null` when nothing usable is left. Unit-tested — this is the
  "never endanger the page" rule.
- `#lib/utils/html`: add a Markdown renderer (`marked` → `sanitize-html`) for `bio`, run on the
  server inside the query so the browser never ships the parser.
- `src/lib/components/results/PlayerProfilePanel.svelte` keeps its current output; nickname and
  "playing since" join the header meta, headline goes under the title, and a new
  `PlayerBio.svelte` section (bio, story fields, names, links) sits between "Current standing" and
  "Results".
- Profile field shapes (fpa-api `docs/INTEGRATION.md`, fpa-profiles `src/lib/profile/fields.ts`):
  string, string[], `{ kind, url, label? }[]`; `longtext` fields keep their line breaks.
