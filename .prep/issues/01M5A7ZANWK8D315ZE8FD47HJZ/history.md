- 2026-10-22T12:58:38Z claude-code: Question 3 answered by the owner 2026-10-22: TURNSTILE_SECRET_KEY is set (non-blank).

- 2026-11-01T15:16:20Z claude-code: 2026-11-01 owner: Q1 Hetzner firewall fine; Q2 Hetzner backups active; Q3 Turnstile widget lists freestyledisc.org (covers events subdomain). Q4-8 (R2 host/key scopes, Mailgun key scope, proxy forwarded headers, GlitchTip members, Coolify analytics retention) deferred to after go-live; owner judged them unrelated to cutover.

- 2026-11-01T18:34:45Z edited by claude-code: parent

- 2026-11-02T11:32:05Z claude-code: 2026-11-02 owner: Q4 R2 - production still serves pictures from the r2.dev development endpoint (filed as 01M6E01JSVKZP1Z2VP2GXT51BY; token scope still unchecked); Q5 Mailgun - key left as it is, owner says the setup is fine; Q6 proxy - read via the Coolify MCP: the Traefik config has no forwardedHeaders settings (safe default) and DNS points straight at the Hetzner IP with no Cloudflare proxy in front. Q7 GlitchTip members and Q8 analytics retention still to answer.

- 2026-11-02T11:32:46Z claude-code: 2026-11-02 owner: Q7 GlitchTip - the owner is the only user and has set up authentication.

- 2026-11-02T12:41:01Z claude-code: 2026-11-02 owner: Q8 - turn Coolify traffic analytics off (full IPs for 395 days contradicted the privacy policy). Pending the owner flipping the setting; verify via get_server is_traffic_analytics_enabled.

- 2026-11-02T12:55:34Z claude-code: 2026-11-02 owner: analytics kept with anonymized IPs (/24 IPv4, /48 IPv6); privacy policy Server logs section now mentions the anonymized traffic statistics and short-lived proxy access log. Questions 1-8 answered or deferred.
