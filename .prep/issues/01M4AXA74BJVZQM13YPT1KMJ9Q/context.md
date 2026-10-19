Decision: [hero layout from stored size](/decisions/01M5A9DJJJ9FYA51X2AEM0BFDY.md). SvelteKit 3 and Svelte 5 runes; follow AGENTS.md (`#lib` imports, shared helpers, testing rules).

## Files

- `src/lib/utils/heroLayout.ts` (new) with `heroLayout(width: number | null | undefined, height: number | null | undefined): 'banner' | 'split' | 'unknown'`. `'unknown'` when either value is missing, not a finite number, or ≤ 0. Otherwise `width / height >= 1.4` → `'banner'`, else `'split'`. Export the threshold as a named constant.
- `src/lib/utils/heroLayout.test.ts` (new, Vitest, like the neighbouring `*.test.ts` in `src/lib/utils`): exactly 1.4 is banner, just below is split, 1600×700 banner, 1200×900 split, portrait split, square split, null/undefined/0/negative/NaN → unknown.
- `src/routes/events/[id]/+page.svelte`: the hero block is the `{#if event.picture}` div right after `<PageShell width="content">` (currently one `object-cover` image with `max-h-56 md:max-h-80` and a gradient overlay). `event.pictureWidth` / `event.pictureHeight` already reach the page. Derive `const layout = $derived(heroLayout(event.pictureWidth, event.pictureHeight))`.

## Layouts (Tailwind 4 classes, as used elsewhere on the page)

- **banner**: the image above `PageHeader`, full width of the shell, `w-full h-auto`, no `object-cover`, no max-height, so it is never cropped. Keep the rounded corners; drop the gradient overlay (it only existed to soften a cropped strip; nothing is overlaid on the image).
- **split** on `md:` and up: a two-column grid (`md:grid md:grid-cols-[minmax(0,1fr)_auto]` or similar, with a gap) where the left column holds the `PageHeader` block and the RSVP/attendee-peek block that follows it, and the right column holds the image at its natural ratio, `h-auto`, limited to roughly `md:max-h-96` / a sensible max width so a tall poster does not dominate, with `object-contain`. The tabs and everything after stay full width below the grid.
- **Below `md:`** (all layouts): one column. banner → image above the header, as above. split and unknown → the image comes after the PageHeader + RSVP block (title, date, location and RSVP stay first), `w-full`, `object-contain`, `max-h-[70vh]`, on a neutral background (`bg-muted`) that fills the unused width, rounded.
- **unknown**: on all widths the one-column arrangement with the image after the header block, `object-contain`, `max-h-[70vh]`, `bg-muted`.
- Render the image once per layout branch; do not render two copies and hide one with CSS (that downloads and announces the image twice). If the split layout's mobile and desktop positions differ, solve it with grid/order classes on one element, not two images.
- Always pass `width={event.pictureWidth}` and `height={event.pictureHeight}` when known (the existing attributes), so the browser reserves the aspect ratio before load; with `h-auto` and `w-full`/max constraints the ratio is kept. Keep `alt={event.name}`.

## Checks

- `npm run check`, `npx vitest run src/lib/utils/heroLayout.test.ts`, then `npm run test` and `npm run lint` on the changed files.
- Seed data already covers both shapes: 1600×700 and 1200×800 (banner), 1200×900 (split). No schema, migration or seed change.
- No new integration test (AGENTS.md: presentational layout is not tested); the existing `tests/integration/event-picture.test.ts` must still pass in review.
- Visual check is the reviewer's job: banner and split events at desktop and ~375px width.
