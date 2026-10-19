- 2026-10-19T12:52:09Z edited by claude-code: requirement

- 2026-10-19T13:03:33Z edited by claude-code: requirement

- 2026-10-19T13:18:19Z claude-code: From the legacy-data audit: find which host production serves R2 pictures from. If it is a subdomain of the app's domain, finding 01M5A4X8ZCM3JDSD66MKD07F34 (picture migration skips content-type checks) is more serious than low; add that to it.

- 2026-10-19T13:24:58Z claude-code: From the data-exposure audit: confirm TURNSTILE_SECRET_KEY is set in production (without it captcha is off everywhere); check for request limits at the proxy (Traefik/Coolify); the adapter-node build ignores a runtime ORIGIN and derives the origin from the Host header and protocol, so check what the proxy forwards.

- 2026-10-19T13:31:26Z claude-code: From the input/output audit: check BODY_SIZE_LIMIT is set in Coolify (adapter-node defaults to 512K, see 01M5A5KN8H0S977JQ72P7C1AAH); MAILGUN_API_KEY must be set (blank prints auth links to the log). Listing Coolify env keys was refused to the auditor.

- 2026-10-19T14:02:21Z claude-code: Partial (Codex, GPT-6-Astra; stopped at the OpenAI usage limit): findings 01M5A7AYJYD1909E7QXA91F97C, 01M5A7AYSP4BYF7T63NA98ERQJ; lock-in 01M5A7G873JKTHWX3PRGPNFTB5 filed without acceptance criteria. Codex could not use the Coolify MCP (approval policy never), so env keys, image, proxy, database role, backups and team access are unchecked, as is GlitchTip access control. Only passive DNS, port and header checks were done. No criterion checked.
