---
type: decision
title: One dark theme, no light mode
description: 'The app ships a single dark theme; no dark: variants, toggle or prefers-color-scheme handling.'
status: stable
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T12:08:19Z
scope:
  - src/routes/layout.css
  - src/app.html
---

# One dark theme, no light mode

The app ships a single dark theme ("Lit Glass"). Its colour tokens are defined
once on `:root` in `src/routes/layout.css` (oklch; primary cyan
`oklch(0.686 0.135 233)`, matching the FPA logo), with no `.dark` variant and no
mode toggle.

**Why:** one consistent brand look, and half the styling surface to maintain.

**How to apply:** do not add `dark:` variants, a theme switch, or
`prefers-color-scheme` handling. `mode-watcher` is still in `package.json` but
is imported nowhere; it is a leftover, not a hint to build a toggle. When
dynamic colour values are needed, use `style=` / CSS variables. Tailwind 4 only
emits classes it can see statically, so never build class names from strings.
