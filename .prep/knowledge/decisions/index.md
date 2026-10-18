# decisions

## Entries

* [Backups are Hetzner's VPS backups; no per-app database backup](/decisions/01M57FTWF3ZR0A2JYQ66TVTABT.md) - Production runs on a Hetzner VPS managed by Coolify, and Hetzner's paid VPS backups cover the whole server, Postgres included. Decided with the user on 2026-10-18 that this is a good enough backup strategy for now: no Coolify scheduled Postgres backup and no off-box S3 copy. Revisit if point-in-time recovery or a faster restore is ever needed.
* [One dark theme, no light mode](/decisions/dark-only-theme.md) - The app ships a single dark theme; no dark: variants, toggle or prefers-color-scheme handling.
* [Product scope relative to the Laravel app](/decisions/product-scope.md) - What was dropped (judging, divisions, membership), what was kept and rebuilt differently, and why there is no /admin area.
