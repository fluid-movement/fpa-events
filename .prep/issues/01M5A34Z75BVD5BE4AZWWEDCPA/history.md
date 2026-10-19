- 2026-10-19T12:52:09Z edited by claude-code: requirement

- 2026-10-19T13:03:33Z edited by claude-code: requirement

- 2026-10-19T13:18:19Z claude-code: From the legacy-data audit: find which host production serves R2 pictures from. If it is a subdomain of the app's domain, finding 01M5A4X8ZCM3JDSD66MKD07F34 (picture migration skips content-type checks) is more serious than low; add that to it.

- 2026-10-19T13:24:58Z claude-code: From the data-exposure audit: confirm TURNSTILE_SECRET_KEY is set in production (without it captcha is off everywhere); check for request limits at the proxy (Traefik/Coolify); the adapter-node build ignores a runtime ORIGIN and derives the origin from the Host header and protocol, so check what the proxy forwards.

- 2026-10-19T13:31:26Z claude-code: From the input/output audit: check BODY_SIZE_LIMIT is set in Coolify (adapter-node defaults to 512K, see 01M5A5KN8H0S977JQ72P7C1AAH); MAILGUN_API_KEY must be set (blank prints auth links to the log). Listing Coolify env keys was refused to the auditor.
