## D1: Sanitize on write and on read
date: 2026-10-07

Write-side alone leaves existing rows (and anything the migration imports) unsafe; read-side alone is what let this slip — every new reader has to remember it. Both, with the same whitelist.
