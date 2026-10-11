## D1: Allow inline styles and any https image
date: 2026-10-11

`style-src 'unsafe-inline'`: Svelte, bits-ui and Leaflet write inline style attributes, and Kit leaves styles un-nonced when the directive contains it (a nonce would make browsers ignore it). Scripts, which are what an XSS needs, stay nonce-only plus Turnstile.
`img-src https:`: R2's public host is an env var that `svelte-options.js` cannot read at config time, and OSM tiles use several subdomains. Images cannot run code.
No `includeSubDomains` on HSTS: other freestyledisc.org hosts are not part of this app.
